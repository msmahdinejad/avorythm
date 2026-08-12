from __future__ import annotations

import asyncio
from dataclasses import dataclass
from pathlib import Path
from typing import Any

import httpx

from .media import TranscriptionChunk

GROQ_TRANSCRIPTION_URL = "https://api.groq.com/openai/v1/audio/transcriptions"


@dataclass(frozen=True, slots=True)
class TranscriptSegment:
    start: float
    end: float
    text: str

    @property
    def duration(self) -> float:
        return self.end - self.start


@dataclass(frozen=True, slots=True)
class Transcription:
    language: str
    segments: list[TranscriptSegment]


def parse_transcription(payload: dict[str, Any], chunk: TranscriptionChunk) -> Transcription:
    segments: list[TranscriptSegment] = []
    for raw in payload.get("segments") or []:
        text = str(raw.get("text") or "").strip()
        start = chunk.start + float(raw.get("start") or 0)
        end = chunk.start + float(raw.get("end") or start)
        midpoint = (start + end) / 2
        is_last = chunk.core_end == chunk.start + float(payload.get("duration") or 0)
        if text and midpoint >= chunk.core_start and (midpoint < chunk.core_end or is_last):
            segments.append(TranscriptSegment(max(0.0, start), max(start, end), text))
    return Transcription(str(payload.get("language") or ""), segments)


def merge_segments(
    segments: list[TranscriptSegment],
    *,
    maximum_seconds: float = 12,
    maximum_gap: float = 1.5,
) -> list[TranscriptSegment]:
    """Merge Whisper fragments into narration-sized, timestamped sentences."""

    merged: list[TranscriptSegment] = []
    for segment in segments:
        if not segment.text:
            continue
        previous = merged[-1] if merged else None
        if (
            previous
            and segment.start - previous.end <= maximum_gap
            and segment.end - previous.start <= maximum_seconds
        ):
            merged[-1] = TranscriptSegment(
                previous.start,
                segment.end,
                f"{previous.text} {segment.text}".strip(),
            )
        else:
            merged.append(segment)
    return merged


class GroqWhisperGateway:
    """Small HTTP boundary around Groq's OpenAI-compatible Whisper endpoint."""

    def __init__(self, api_key: str, *, client: httpx.AsyncClient | None = None) -> None:
        self.api_key = api_key
        self.client = client or httpx.AsyncClient(timeout=httpx.Timeout(180), trust_env=True)
        self.owns_client = client is None

    async def transcribe(self, path: Path, model: str) -> dict[str, Any]:
        data = path.read_bytes()
        for attempt in range(4):
            response = await self.client.post(
                GROQ_TRANSCRIPTION_URL,
                headers={"Authorization": f"Bearer {self.api_key}"},
                data={
                    "model": model,
                    "response_format": "verbose_json",
                    "timestamp_granularities[]": "segment",
                    "temperature": "0",
                },
                files={"file": (path.name, data, "audio/flac")},
            )
            if response.status_code < 400:
                payload = response.json()
                if not isinstance(payload, dict):
                    raise RuntimeError("Groq Whisper returned an invalid response")
                return payload
            if response.status_code not in {429, 500, 502, 503, 504} or attempt == 3:
                detail = _response_error(response)
                raise RuntimeError(f"Groq Whisper failed ({response.status_code}): {detail}")
            retry_after = response.headers.get("retry-after", "")
            try:
                wait = max(0.5, min(30.0, float(retry_after)))
            except ValueError:
                wait = 1.0 * (attempt + 1)
            await asyncio.sleep(wait)
        raise AssertionError("unreachable")

    async def close(self) -> None:
        if self.owns_client:
            await self.client.aclose()


def _response_error(response: httpx.Response) -> str:
    try:
        payload = response.json()
        error = payload.get("error", payload) if isinstance(payload, dict) else payload
        if isinstance(error, dict):
            return str(error.get("message") or error)[:300]
        return str(error)[:300]
    except ValueError:
        return response.text.strip()[:300] or "request rejected"
