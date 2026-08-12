from __future__ import annotations

import asyncio
import json
import re
import time
from collections.abc import AsyncIterator
from dataclasses import dataclass

import numpy as np
from google import genai
from google.genai import types
from pydantic import BaseModel, Field

from .constants import (
    FILE_TRANSLATION_MODEL,
    FILE_VOICE_MODEL,
    INPUT_RATE,
    LIVE_MODEL,
    OUTPUT_RATE,
)
from .models import Settings
from .transcripts import TranscriptTracker


def duration_seconds(value: object) -> float | None:
    if value is None:
        return None
    match = re.fullmatch(r"\s*([0-9]+(?:\.[0-9]+)?)s\s*", str(value))
    return float(match.group(1)) if match else None


def trim_stream_padding(
    raw: bytes,
    *,
    threshold: float = 96,
    padding_seconds: float = 0.25,
) -> bytes:
    """Remove the continuous silent tail emitted by Live Translate file sessions."""

    sample_count = len(raw) // 2
    if not sample_count:
        return b""
    samples = np.frombuffer(raw[: sample_count * 2], dtype="<i2").astype(np.float32)
    frame_size = OUTPUT_RATE // 50
    padded_count = ((sample_count + frame_size - 1) // frame_size) * frame_size
    if padded_count > sample_count:
        samples = np.pad(samples, (0, padded_count - sample_count))
    frames = samples.reshape(-1, frame_size)
    rms = np.sqrt(np.mean(frames * frames, axis=1))
    active = np.flatnonzero(rms >= threshold)
    if not active.size:
        return b""
    padding = round(padding_seconds * OUTPUT_RATE)
    end = min(sample_count, (int(active[-1]) + 1) * frame_size + padding)
    return raw[: end * 2]


def stream_tail_is_silent(
    raw: bytes | bytearray,
    *,
    seconds: float = 0.5,
    threshold: float = 96,
) -> bool:
    sample_count = round(seconds * OUTPUT_RATE)
    if len(raw) < sample_count * 2:
        return False
    tail = np.frombuffer(raw[-sample_count * 2 :], dtype="<i2").astype(np.float32)
    return bool(np.sqrt(np.mean(tail * tail)) < threshold)


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


class TranslationItem(BaseModel):
    id: int = Field(ge=0)
    text: str = Field(min_length=1)


@dataclass(frozen=True, slots=True)
class TextTranslation:
    texts: list[str]
    total_tokens: int


@dataclass(frozen=True, slots=True)
class Narration:
    audio: bytes
    transcript: str
    total_tokens: int


class NoTranslationError(TimeoutError):
    """The Live session completed without any translated content."""


def transient_live_error(error: Exception) -> bool:
    if isinstance(error, (TimeoutError, ConnectionError, OSError)):
        return True
    message = str(error).casefold()
    return any(
        marker in message
        for marker in (
            "no close frame",
            "keepalive ping timeout",
            "connection closed",
            "timed out",
            "1006",
            "1011",
        )
    )


class GeminiGateway:
    """The single Gemini 3.5 Live Translate protocol boundary."""

    def __init__(self, api_key: str) -> None:
        self.client = genai.Client(
            api_key=api_key,
            http_options=types.HttpOptions(
                async_client_args={"ping_interval": None},
            ),
        )

    def live_config(
        self,
        settings: Settings,
        *,
        manual_activity: bool = False,
    ) -> types.LiveConnectConfig:
        return types.LiveConnectConfig(
            response_modalities=[types.Modality.AUDIO],
            input_audio_transcription=types.AudioTranscriptionConfig(),
            output_audio_transcription=types.AudioTranscriptionConfig(),
            translation_config=types.TranslationConfig(
                target_language_code=settings.target_language,
                echo_target_language=False,
            ),
            realtime_input_config=(
                types.RealtimeInputConfig(
                    automatic_activity_detection=types.AutomaticActivityDetection(
                        disabled=True
                    )
                )
                if manual_activity
                else None
            ),
        )

    @staticmethod
    async def send_audio(session: object, raw: bytes) -> None:
        await session.send_realtime_input(  # type: ignore[attr-defined]
            audio=types.Blob(data=raw, mime_type=f"audio/pcm;rate={INPUT_RATE}")
        )

    @staticmethod
    async def events(session: object) -> AsyncIterator[LiveEvent]:
        while True:
            # The SDK's receive() iterator covers exactly one model turn. A Live
            # session can create several turns while continuous audio is streaming.
            async for response in session.receive():  # type: ignore[attr-defined]
                content = getattr(response, "server_content", None)
                usage = getattr(response, "usage_metadata", None)
                go_away = getattr(response, "go_away", None)
                source = getattr(content, "input_transcription", None) if content else None
                translated = (
                    getattr(content, "output_transcription", None) if content else None
                )
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
                    source_language=(getattr(source, "language_code", "") or "")
                    if source
                    else "",
                    source_finished=getattr(source, "finished", None) if source else None,
                    translated_text=getattr(translated, "text", "") if translated else "",
                    translated_language=(getattr(translated, "language_code", "") or "")
                    if translated
                    else "",
                    translated_finished=getattr(translated, "finished", None)
                    if translated
                    else None,
                    turn_complete=bool(getattr(content, "turn_complete", False))
                    if content
                    else False,
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
        received_translation = False
        async with self.connect(settings, manual_activity=True) as session:
            async def receive() -> None:
                nonlocal source_language, prompt_tokens, response_tokens, total_tokens
                nonlocal last_event_at, received_content, received_translation
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
                    received_translation = received_translation or bool(
                        event.audio or event.translated_text
                    )
            receiver = asyncio.create_task(receive())
            chunk_bytes = INPUT_RATE * 2 // 10
            try:
                await session.send_realtime_input(  # type: ignore[attr-defined]
                    activity_start=types.ActivityStart()
                )
                lead = b"\0" * round(INPUT_RATE * 2 * 0.4)
                await self.send_audio(session, lead)
                if realtime:
                    await asyncio.sleep(0.4)
                for offset in range(0, len(pcm), chunk_bytes):
                    chunk = pcm[offset : offset + chunk_bytes]
                    await self.send_audio(session, chunk)
                    if realtime:
                        await asyncio.sleep(len(chunk) / (INPUT_RATE * 2))
                # Live Translate may otherwise finalize before emitting the final
                # words of a bounded file segment. A short silent tail gives the
                # model an explicit utterance boundary without changing the source.
                tail = b"\0" * round(INPUT_RATE * 2 * 2.0)
                await self.send_audio(session, tail)
                if realtime:
                    await asyncio.sleep(2.0)
                await session.send_realtime_input(  # type: ignore[attr-defined]
                    activity_end=types.ActivityEnd()
                )
                last_event_at = time.monotonic()
                input_seconds = len(pcm) / (INPUT_RATE * 2)
                output_limit = round((input_seconds * 1.6 + 0.5) * OUTPUT_RATE) * 2
                deadline = last_event_at + max(14, input_seconds * 0.75 + 8)
                while not receiver.done():
                    now = time.monotonic()
                    # Transcriptions are independent of generation events and have no
                    # guaranteed ordering. Keep the receiver alive through a short idle
                    # grace period so text arriving after generationComplete is retained.
                    if received_translation and now - last_event_at >= 5:
                        break
                    if received_content and len(audio) >= output_limit:
                        break
                    if now >= deadline:
                        if not received_content:
                            raise NoTranslationError("Gemini Live returned no translation")
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
            audio=trim_stream_padding(bytes(audio)),
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

    def connect(  # type: ignore[no-untyped-def]
        self,
        settings: Settings,
        *,
        manual_activity: bool = False,
    ):
        return self.client.aio.live.connect(
            model=LIVE_MODEL,
            config=self.live_config(settings, manual_activity=manual_activity),
        )


class GeminiFileGateway:
    """Text translation and timestamp-sized speech generation for uploaded media."""

    def __init__(self, api_key: str) -> None:
        self.client = genai.Client(
            api_key=api_key,
            http_options=types.HttpOptions(async_client_args={"ping_interval": None}),
        )

    async def translate(
        self,
        texts: list[str],
        source_language: str,
        target_language: str,
    ) -> TextTranslation:
        if not texts:
            return TextTranslation([], 0)
        if source_language.split("-")[0] == target_language.split("-")[0]:
            return TextTranslation(texts.copy(), 0)
        prompt = json.dumps(
            {
                "source_language": source_language or "auto",
                "target_language": target_language,
                "segments": [{"id": index, "text": text} for index, text in enumerate(texts)],
            },
            ensure_ascii=False,
        )
        response = await self.client.aio.models.generate_content(
            model=FILE_TRANSLATION_MODEL,
            contents=prompt,
            config=types.GenerateContentConfig(
                system_instruction=(
                    "Translate every segment faithfully and naturally. Preserve names, numbers, "
                    "technical terms, tone, and intent. Do not summarize, explain, censor, merge, "
                    "or add information. Return exactly one item for every input id in the same "
                    "order."
                ),
                response_mime_type="application/json",
                response_schema=list[TranslationItem],
                temperature=0.1,
                thinking_config=types.ThinkingConfig(thinking_budget=0),
            ),
        )
        raw_items = response.parsed
        if not isinstance(raw_items, list):
            raise RuntimeError("Gemini returned an invalid translation response")
        items = [
            item if isinstance(item, TranslationItem) else TranslationItem.model_validate(item)
            for item in raw_items
        ]
        by_id = {item.id: item.text.strip() for item in items}
        if set(by_id) != set(range(len(texts))) or any(not value for value in by_id.values()):
            raise RuntimeError("Gemini omitted one or more translated segments")
        usage = getattr(response, "usage_metadata", None)
        tokens = int(getattr(usage, "total_token_count", 0) or 0)
        return TextTranslation([by_id[index] for index in range(len(texts))], tokens)

    async def narrate(self, text: str, language: str, voice_name: str) -> Narration:
        audio = bytearray()
        transcript_parts: list[str] = []
        total_tokens = 0
        config = types.LiveConnectConfig(
            response_modalities=[types.Modality.AUDIO],
            output_audio_transcription=types.AudioTranscriptionConfig(),
            speech_config=types.SpeechConfig(
                language_code=language,
                voice_config=types.VoiceConfig(
                    prebuilt_voice_config=types.PrebuiltVoiceConfig(voice_name=voice_name)
                ),
            ),
            system_instruction=(
                "You are a precise speech renderer. Speak exactly the supplied text once in a "
                "natural pace. Do not translate, paraphrase, answer, introduce it, or add any "
                "words."
            ),
            thinking_config=types.ThinkingConfig(thinking_budget=0),
        )
        async with self.client.aio.live.connect(model=FILE_VOICE_MODEL, config=config) as session:
            await session.send_realtime_input(text=text)
            async for response in session.receive():
                content = getattr(response, "server_content", None)
                model_turn = getattr(content, "model_turn", None) if content else None
                for part in getattr(model_turn, "parts", None) or []:
                    inline = getattr(part, "inline_data", None)
                    if inline and isinstance(inline.data, bytes):
                        audio.extend(inline.data)
                transcription = getattr(content, "output_transcription", None) if content else None
                if transcription and getattr(transcription, "text", ""):
                    transcript_parts.append(transcription.text)
                usage = getattr(response, "usage_metadata", None)
                total_tokens = max(
                    total_tokens,
                    int(getattr(usage, "total_token_count", 0) or 0),
                )
                if content and getattr(content, "turn_complete", False):
                    break
        rendered = trim_stream_padding(bytes(audio), threshold=64, padding_seconds=0.12)
        if not rendered:
            raise NoTranslationError("Gemini Live returned no narrated audio")
        return Narration(rendered, "".join(transcript_parts).strip(), total_tokens)

    async def close(self) -> None:
        await self.client.aio.aclose()
        self.client.close()
