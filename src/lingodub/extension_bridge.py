from __future__ import annotations

import asyncio
import json
import time
from contextlib import suppress
from pathlib import Path

from fastapi import WebSocket, WebSocketDisconnect

from .config import ConfigStore
from .gemini import GeminiGateway
from .models import ExtensionStart, Settings
from .recording import SessionRecorder
from .transcripts import TranscriptTracker


class ExtensionBridge:
    """Translates one captured browser-tab PCM stream per WebSocket."""

    def __init__(self, store: ConfigStore, recordings: Path) -> None:
        self.store = store
        self.recordings = recordings
        self.connections = 0
        self.recording_connections = 0
        self.latest_recording = ""
        self.source_text = ""
        self.translated_text = ""
        self.source_language = ""
        self.target_language = "fa"

    async def handle(self, websocket: WebSocket) -> None:
        origin = websocket.headers.get("origin", "")
        if not origin.startswith(("chrome-extension://", "edge-extension://", "moz-extension://")):
            await websocket.close(code=1008, reason="extension origin required")
            return
        await websocket.accept()
        gateway: GeminiGateway | None = None
        recorder: SessionRecorder | None = None
        self.connections += 1
        try:
            first = await websocket.receive_text()
            request = ExtensionStart.model_validate_json(first)
            if request.type != "start":
                raise ValueError("first message must be start")
            self.source_text = ""
            self.translated_text = ""
            self.source_language = ""
            self.target_language = request.target_language
            key = self.store.get_api_key()
            if not key:
                await websocket.send_json({"type": "error", "message": "api_key_missing"})
                return
            settings = Settings(
                target_language=request.target_language,
                original_volume=0,
                dub_volume=1,
                voice=request.voice,
                voice_style=request.voice_style,
            )
            if request.recording:
                recorder = SessionRecorder(self.recordings)
                self.recording_connections += 1
            self.store.apply_proxy(self.store.load())
            gateway = GeminiGateway(key)
            async with gateway.connect(settings) as session:
                await websocket.send_json({"type": "status", "status": "connected"})
                tasks = [
                    asyncio.create_task(self._input(websocket, gateway, session, recorder)),
                    asyncio.create_task(
                        self._output(websocket, gateway, session, settings, recorder)
                    ),
                ]
                done, pending = await asyncio.wait(tasks, return_when=asyncio.FIRST_COMPLETED)
                for task in pending:
                    task.cancel()
                await asyncio.gather(*pending, return_exceptions=True)
                for task in done:
                    error = task.exception()
                    if error and not isinstance(error, WebSocketDisconnect):
                        raise error
                if recorder:
                    folder = recorder.close()
                    self.latest_recording = folder.name
                    await websocket.send_json(
                        {
                            "type": "recording",
                            "folder": folder.name,
                            "download_url": f"/api/recordings/{folder.name}/all-outputs.zip",
                        }
                    )
                await websocket.send_json({"type": "status", "status": "stopped"})
        except WebSocketDisconnect:
            pass
        except Exception as error:
            with suppress(Exception):
                await websocket.send_json({"type": "error", "message": str(error)})
        finally:
            self.connections -= 1
            if recorder and not recorder.closed:
                folder = recorder.close()
                self.latest_recording = folder.name
            if recorder:
                self.recording_connections -= 1
            if gateway:
                await gateway.close()

    @staticmethod
    async def _input(
        websocket: WebSocket,
        gateway: GeminiGateway,
        session: object,
        recorder: SessionRecorder | None,
    ) -> None:
        while True:
            message = await websocket.receive()
            if message["type"] == "websocket.disconnect":
                raise WebSocketDisconnect()
            if raw := message.get("bytes"):
                if recorder:
                    recorder.write_original(raw)
                await gateway.send_audio(session, raw)
            elif text := message.get("text"):
                command = json.loads(text)
                if command.get("type") == "stop":
                    return

    async def _output(
        self,
        websocket: WebSocket,
        gateway: GeminiGateway,
        session: object,
        settings: Settings,
        recorder: SessionRecorder | None,
    ) -> None:
        translated_parts: list[str] = []
        source_tracker = TranscriptTracker()
        translated_tracker = TranscriptTracker()
        started = time.monotonic()
        async for event in gateway.events(session):
            if event.audio and settings.voice == "Native":
                if recorder:
                    recorder.write_dubbed(event.audio)
                await websocket.send_bytes(event.audio)
            if event.source_text:
                now = time.monotonic() - started
                completed = source_tracker.update(event.source_text, event.source_finished, now)
                if recorder and completed:
                    text, start, end = completed
                    recorder.subtitle(False, text, start, end)
                display_text = completed[0] if completed else source_tracker.partial
                self.source_text = display_text
                self.source_language = event.source_language
                await websocket.send_text(
                    json.dumps(
                        {
                            "type": "transcript",
                            "channel": "source",
                            "text": display_text,
                            "language": event.source_language,
                            "finished": event.source_finished,
                        },
                        ensure_ascii=False,
                    )
                )
            if event.translated_text:
                now = time.monotonic() - started
                completed = translated_tracker.update(
                    event.translated_text, event.translated_finished, now
                )
                if recorder and completed:
                    text, start, end = completed
                    recorder.subtitle(True, text, start, end)
                if completed:
                    translated_parts.append(completed[0])
                display_text = completed[0] if completed else translated_tracker.partial
                self.translated_text = display_text
                await websocket.send_text(
                    json.dumps(
                        {
                            "type": "transcript",
                            "channel": "translated",
                            "text": display_text,
                            "language": event.translated_language or settings.target_language,
                            "finished": event.translated_finished,
                        },
                        ensure_ascii=False,
                    )
                )
            if event.turn_complete:
                now = time.monotonic() - started
                for translated, tracker in (
                    (False, source_tracker),
                    (True, translated_tracker),
                ):
                    completed = tracker.flush(now)
                    if recorder and completed:
                        text, start, end = completed
                        recorder.subtitle(translated, text, start, end)
                    if translated and completed:
                        translated_parts.append(completed[0])
                if settings.voice != "Native" and translated_parts:
                    text = " ".join(translated_parts)
                    translated_parts.clear()
                    raw = await gateway.synthesize(
                        text,
                        settings.voice,
                        settings.voice_style,
                    )
                    if recorder:
                        recorder.write_dubbed(raw)
                    await websocket.send_bytes(raw)
