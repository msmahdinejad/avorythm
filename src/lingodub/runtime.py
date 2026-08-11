from __future__ import annotations

import asyncio
import time
from contextlib import suppress
from pathlib import Path
from typing import Any

from .audio import AudioEngine, DeviceCatalog, input_to_output_pcm, mix_pcm
from .config import ConfigStore
from .gemini import GeminiGateway
from .models import RuntimeState, Settings
from .recording import SessionRecorder
from .transcripts import TranscriptTracker


class DubRuntime:
    """Coordinates desktop capture, translation, playback, transcripts, and recording."""

    RESTART_FIELDS = {"target_language", "capture_device", "output_device", "voice", "voice_style"}

    def __init__(self, store: ConfigStore, recordings: Path) -> None:
        self.store = store
        self.recordings = recordings
        self.settings = self._with_device_defaults(store.load())
        self.state = RuntimeState()
        self.task: asyncio.Task[None] | None = None
        self.recorder: SessionRecorder | None = None
        self.gateway: GeminiGateway | None = None

    @staticmethod
    def _with_device_defaults(settings: Settings) -> Settings:
        catalog = DeviceCatalog.scan()
        capture_indices = {device.index for device in catalog.captures}
        output_indices = {device.index for device in catalog.outputs}
        return settings.model_copy(
            update={
                "capture_device": (
                    settings.capture_device
                    if settings.capture_device in capture_indices
                    else catalog.default_capture
                ),
                "output_device": (
                    settings.output_device
                    if settings.output_device in output_indices
                    else catalog.default_output
                ),
            }
        )

    def update_settings(self, settings: Settings) -> Settings:
        if self.state.running:
            old = self.settings.model_dump()
            new = settings.model_dump()
            if any(old[field] != new[field] for field in self.RESTART_FIELDS):
                raise RuntimeError("stop translation before changing device, language, or voice")
        self.settings = settings
        self.store.save(settings)
        self.store.apply_proxy(settings)
        return settings

    async def start(self) -> None:
        if self.task and not self.task.done():
            return
        if not self.store.get_api_key():
            raise ValueError("set Gemini API key first")
        self.state.error = ""
        self.state.status = "connecting"
        self.task = asyncio.create_task(self._run())

    async def stop(self) -> None:
        if self.task:
            self.task.cancel()
            await asyncio.gather(self.task, return_exceptions=True)
            self.task = None
        self.state.running = False
        self.state.status = "idle"
        if self.recorder:
            self.stop_recording()

    def start_recording(self) -> None:
        if not self.recorder:
            self.recorder = SessionRecorder(self.recordings)

    def stop_recording(self) -> str:
        if not self.recorder:
            return self.state.latest_recording
        folder = self.recorder.close()
        self.recorder = None
        self.state.latest_recording = folder.name
        return folder.name

    def snapshot(self) -> dict[str, Any]:
        return {
            **self.state.to_dict(),
            "recording": self.recorder is not None,
            "settings": self.settings.model_dump(),
        }

    async def _run(self) -> None:
        audio: AudioEngine | None = None
        workers: list[asyncio.Task[None]] = []
        try:
            assert self.settings.capture_device is not None
            assert self.settings.output_device is not None
            self.store.apply_proxy(self.settings)
            audio = AudioEngine(self.settings.capture_device, self.settings.output_device)
            self.gateway = GeminiGateway(self.store.get_api_key())
            send: asyncio.Queue[bytes] = asyncio.Queue(maxsize=10)
            original: asyncio.Queue[bytes] = asyncio.Queue(maxsize=10)
            dubbed: asyncio.Queue[bytes] = asyncio.Queue(maxsize=100)
            tts: asyncio.Queue[str] = asyncio.Queue(maxsize=20)
            async with self.gateway.connect(self.settings) as session:
                self.state.running = True
                self.state.status = "connected"
                workers = [
                    asyncio.create_task(self._capture(audio, send, original)),
                    asyncio.create_task(self._send(session, send)),
                    asyncio.create_task(self._receive(session, dubbed, tts)),
                    asyncio.create_task(self._mix(audio, original, dubbed)),
                    asyncio.create_task(self._tts(tts, dubbed)),
                ]
                done, _ = await asyncio.wait(workers, return_when=asyncio.FIRST_EXCEPTION)
                for worker in done:
                    if error := worker.exception():
                        raise error
        except asyncio.CancelledError:
            pass
        except Exception as error:
            self.state.error = str(error)
            self.state.status = "error"
        finally:
            for worker in workers:
                worker.cancel()
            if workers:
                await asyncio.gather(*workers, return_exceptions=True)
            if audio:
                audio.close()
            if self.gateway:
                await self.gateway.close()
                self.gateway = None
            self.state.running = False
            if self.state.status != "error":
                self.state.status = "idle"

    async def _capture(
        self,
        audio: AudioEngine,
        send: asyncio.Queue[bytes],
        original: asyncio.Queue[bytes],
    ) -> None:
        while True:
            raw = audio.capture()
            if raw is None:
                await asyncio.sleep(0.01)
                continue
            if self.recorder:
                self.recorder.write_original(raw)
            await send.put(raw)
            await original.put(input_to_output_pcm(raw))

    async def _send(self, session: object, queue: asyncio.Queue[bytes]) -> None:
        assert self.gateway
        while True:
            raw = await queue.get()
            try:
                await self.gateway.send_audio(session, raw)
            finally:
                queue.task_done()

    def _finish_transcript(
        self,
        translated: bool,
        result: tuple[str, float, float] | None,
        tts: asyncio.Queue[str],
    ) -> None:
        if not result:
            return
        text, start, end = result
        history = self.state.translated_history if translated else self.state.source_history
        history.append({"text": text, "start": start, "end": end})
        del history[:-30]
        if self.recorder:
            duration = max(0.6, end - start)
            recording_end = self.recorder.elapsed()
            self.recorder.subtitle(
                translated,
                text,
                max(0.0, recording_end - duration),
                recording_end,
            )
        if translated and self.settings.voice != "Native":
            with suppress(asyncio.QueueFull):
                tts.put_nowait(text)

    async def _receive(
        self,
        session: object,
        dubbed: asyncio.Queue[bytes],
        tts: asyncio.Queue[str],
    ) -> None:
        assert self.gateway
        source = TranscriptTracker()
        translated = TranscriptTracker()
        started = time.monotonic()
        async for event in self.gateway.events(session):
            now = time.monotonic() - started
            if event.source_text:
                result = source.update(event.source_text, event.source_finished, now)
                self.state.source_text = result[0] if result else source.partial
                self.state.source_lang = event.source_language
                self._finish_transcript(False, result, tts)
            if event.translated_text:
                result = translated.update(event.translated_text, event.translated_finished, now)
                self.state.translated_text = result[0] if result else translated.partial
                self.state.translated_lang = (
                    event.translated_language or self.settings.target_language
                )
                self._finish_transcript(True, result, tts)
            if event.turn_complete:
                self._finish_transcript(False, source.flush(now), tts)
                self._finish_transcript(True, translated.flush(now), tts)
            if event.audio and self.settings.voice == "Native":
                if self.recorder:
                    self.recorder.write_dubbed(event.audio)
                await dubbed.put(event.audio)

    async def _tts(self, texts: asyncio.Queue[str], dubbed: asyncio.Queue[bytes]) -> None:
        while True:
            text = await texts.get()
            try:
                if self.settings.voice == "Native" or not self.gateway:
                    continue
                raw = await self.gateway.synthesize(
                    text,
                    self.settings.voice,
                    self.settings.voice_style,
                )
                if self.recorder:
                    self.recorder.write_dubbed(raw)
                await dubbed.put(raw)
            finally:
                texts.task_done()

    async def _mix(
        self,
        audio: AudioEngine,
        original: asyncio.Queue[bytes],
        dubbed: asyncio.Queue[bytes],
    ) -> None:
        buffer = bytearray()
        chunk_bytes = 4_800
        while True:
            source = await original.get()
            try:
                while True:
                    try:
                        buffer.extend(dubbed.get_nowait())
                        dubbed.task_done()
                    except asyncio.QueueEmpty:
                        break
                translation = bytes(buffer[:chunk_bytes])
                del buffer[:chunk_bytes]
                translation += b"\0" * (chunk_bytes - len(translation))
                audio.play(
                    mix_pcm(
                        source,
                        translation,
                        self.settings.original_volume,
                        self.settings.dub_volume,
                    )
                )
            finally:
                original.task_done()
