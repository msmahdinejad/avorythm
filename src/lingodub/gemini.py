from __future__ import annotations

import asyncio
import re
import time
from collections.abc import AsyncIterator
from dataclasses import dataclass

from google import genai
from google.genai import types

from .constants import INPUT_RATE, LIVE_MODEL
from .models import Settings
from .transcripts import TranscriptTracker


def duration_seconds(value: object) -> float | None:
    if value is None:
        return None
    match = re.fullmatch(r"\s*([0-9]+(?:\.[0-9]+)?)s\s*", str(value))
    return float(match.group(1)) if match else None


@dataclass(frozen=True, slots=True)
class LiveEvent:
    audio: bytes | None = None
    source_text: str = ""
    source_language: str = ""
    source_finished: bool | None = None
    translated_text: str = ""
    translated_language: str = ""
    translated_finished: bool | None = None
    turn_complete: bool = False
    generation_complete: bool = False
    prompt_tokens: int = 0
    response_tokens: int = 0
    total_tokens: int = 0
    go_away_seconds: float | None = None


@dataclass(frozen=True, slots=True)
class SegmentTranslation:
    audio: bytes
    source_text: str
    translated_text: str
    source_language: str
    prompt_tokens: int
    response_tokens: int
    total_tokens: int


class GeminiGateway:
    """The single Gemini 3.5 Live Translate protocol boundary."""

    def __init__(self, api_key: str) -> None:
        self.client = genai.Client(api_key=api_key)

    def live_config(self, settings: Settings) -> types.LiveConnectConfig:
        return types.LiveConnectConfig(
            response_modalities=[types.Modality.AUDIO],
            input_audio_transcription=types.AudioTranscriptionConfig(),
            output_audio_transcription=types.AudioTranscriptionConfig(),
            translation_config=types.TranslationConfig(
                target_language_code=settings.target_language,
                echo_target_language=False,
            ),
        )

    @staticmethod
    async def send_audio(session: object, raw: bytes) -> None:
        await session.send_realtime_input(  # type: ignore[attr-defined]
            audio=types.Blob(data=raw, mime_type=f"audio/pcm;rate={INPUT_RATE}")
        )

    @staticmethod
    async def events(session: object) -> AsyncIterator[LiveEvent]:
        async for response in session.receive():  # type: ignore[attr-defined]
            content = getattr(response, "server_content", None)
            usage = getattr(response, "usage_metadata", None)
            go_away = getattr(response, "go_away", None)
            source = getattr(content, "input_transcription", None) if content else None
            translated = getattr(content, "output_transcription", None) if content else None
            model_turn = getattr(content, "model_turn", None) if content else None
            audio_parts = [
                part.inline_data.data
                for part in (getattr(model_turn, "parts", None) or [])
                if getattr(part, "inline_data", None)
                and isinstance(part.inline_data.data, bytes)
            ]
            event = LiveEvent(
                audio=b"".join(audio_parts) or None,
                source_text=getattr(source, "text", "") if source else "",
                source_language=(getattr(source, "language_code", "") or "") if source else "",
                source_finished=getattr(source, "finished", None) if source else None,
                translated_text=getattr(translated, "text", "") if translated else "",
                translated_language=(getattr(translated, "language_code", "") or "")
                if translated
                else "",
                translated_finished=getattr(translated, "finished", None)
                if translated
                else None,
                turn_complete=bool(getattr(content, "turn_complete", False)) if content else False,
                generation_complete=bool(getattr(content, "generation_complete", False))
                if content
                else False,
                prompt_tokens=int(getattr(usage, "prompt_token_count", 0) or 0),
                response_tokens=int(getattr(usage, "response_token_count", 0) or 0),
                total_tokens=int(getattr(usage, "total_token_count", 0) or 0),
                go_away_seconds=duration_seconds(getattr(go_away, "time_left", None)),
            )
            if any(
                (
                    event.audio,
                    event.source_text,
                    event.translated_text,
                    event.turn_complete,
                    event.generation_complete,
                    event.total_tokens,
                    event.go_away_seconds is not None,
                )
            ):
                yield event

    async def translate_pcm(
        self,
        settings: Settings,
        pcm: bytes,
        *,
        realtime: bool = True,
    ) -> SegmentTranslation:
        source = TranscriptTracker()
        translated = TranscriptTracker()
        source_parts: list[str] = []
        translated_parts: list[str] = []
        audio = bytearray()
        source_language = ""
        prompt_tokens = response_tokens = total_tokens = 0
        started = time.monotonic()
        last_event_at = started
        received_content = False
        stream_complete = asyncio.Event()

        async with self.connect(settings) as session:
            async def receive() -> None:
                nonlocal source_language, prompt_tokens, response_tokens, total_tokens
                nonlocal last_event_at, received_content
                async for event in self.events(session):
                    last_event_at = time.monotonic()
                    now = time.monotonic() - started
                    if event.audio:
                        audio.extend(event.audio)
                    if event.source_text:
                        if finished := source.update(
                            event.source_text, event.source_finished, now
                        ):
                            source_parts.append(finished[0])
                        source_language = event.source_language or source_language
                    if event.translated_text and (
                        finished := translated.update(
                            event.translated_text, event.translated_finished, now
                        )
                    ):
                        translated_parts.append(finished[0])
                    prompt_tokens = max(prompt_tokens, event.prompt_tokens)
                    response_tokens = max(response_tokens, event.response_tokens)
                    total_tokens = max(total_tokens, event.total_tokens)
                    received_content = received_content or bool(
                        event.audio or event.source_text or event.translated_text
                    )
                    if event.turn_complete or event.generation_complete:
                        stream_complete.set()
                        break

            receiver = asyncio.create_task(receive())
            chunk_bytes = INPUT_RATE * 2 // 10
            try:
                for offset in range(0, len(pcm), chunk_bytes):
                    chunk = pcm[offset : offset + chunk_bytes]
                    await self.send_audio(session, chunk)
                    if realtime:
                        await asyncio.sleep(len(chunk) / (INPUT_RATE * 2))
                await session.send_realtime_input(audio_stream_end=True)  # type: ignore[attr-defined]
                last_event_at = time.monotonic()
                deadline = last_event_at + 30
                while not receiver.done():
                    now = time.monotonic()
                    if stream_complete.is_set() or (
                        received_content and now - last_event_at >= 3
                    ):
                        break
                    if now >= deadline:
                        if not received_content:
                            raise TimeoutError("Gemini Live returned no translation")
                        break
                    await asyncio.sleep(0.1)
                if receiver.done():
                    await receiver
            finally:
                if not receiver.done():
                    receiver.cancel()
                    await asyncio.gather(receiver, return_exceptions=True)

        finished_at = time.monotonic() - started
        if source_result := source.flush(finished_at):
            source_parts.append(source_result[0])
        if translated_result := translated.flush(finished_at):
            translated_parts.append(translated_result[0])
        return SegmentTranslation(
            audio=bytes(audio),
            source_text=" ".join(source_parts),
            translated_text=" ".join(translated_parts),
            source_language=source_language,
            prompt_tokens=prompt_tokens,
            response_tokens=response_tokens,
            total_tokens=total_tokens,
        )

    async def close(self) -> None:
        await self.client.aio.aclose()
        self.client.close()

    def connect(self, settings: Settings):  # type: ignore[no-untyped-def]
        return self.client.aio.live.connect(model=LIVE_MODEL, config=self.live_config(settings))
