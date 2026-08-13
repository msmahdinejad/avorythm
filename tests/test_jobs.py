from __future__ import annotations

import asyncio
import shutil
import wave
from collections.abc import AsyncIterator
from pathlib import Path

import pytest

from dubira.config import ConfigStore
from dubira.gemini import Narration, TextTranslation
from dubira.groq import TranscriptSegment
from dubira.jobs import MediaJobManager, subtitle_entries, transcript_score
from dubira.media import MediaInfo, MediaTools, TranscriptionChunk


class FakeTools:
    async def probe(self, source: Path) -> MediaInfo:
        return MediaInfo(2.0, True)

    async def extract_audio(self, source: Path, destination: Path, duration: float) -> None:
        with wave.open(str(destination), "wb") as writer:
            writer.setnchannels(1)
            writer.setsampwidth(2)
            writer.setframerate(16_000)
            writer.writeframes(b"\0\0" * 32_000)

    async def transcription_chunks(
        self, source: Path, directory: Path, duration: float
    ) -> list[TranscriptionChunk]:
        directory.mkdir(parents=True)
        path = directory / "chunk.flac"
        path.write_bytes(b"flac")
        return [TranscriptionChunk(path, 0, 0, duration)]

    async def fit_dubbed(
        self, pcm: bytes, seconds: float, precise: bool
    ) -> tuple[bytes, bool]:
        size = round(seconds * 24_000) * 2
        return pcm[:size].ljust(size, b"\0"), False

    archive = staticmethod(MediaTools.archive)


class FakeWhisper:
    def __init__(self, api_key: str) -> None:
        self.api_key = api_key

    async def transcribe(self, path: Path, model: str) -> dict[str, object]:
        return {
            "language": "en",
            "duration": 2.0,
            "segments": [{"start": 0.1, "end": 1.8, "text": "Charge while you shop."}],
        }

    async def close(self) -> None:
        return None


class FakeFileGateway:
    narrations = 0
    voices: list[str] = []

    def __init__(self, api_key: str) -> None:
        self.api_key = api_key

    async def translate(
        self, texts: list[str], source_language: str, target_language: str
    ) -> TextTranslation:
        assert source_language == "en"
        assert target_language == "fa"
        return TextTranslation(["هنگام خرید شارژ کنید."], 200)

    async def narrate(self, text: str, language: str, voice: str) -> Narration:
        type(self).narrations += 1
        type(self).voices.append(voice)
        return Narration(b"\1\0" * 24_000, text, 300)

    async def close(self) -> None:
        return None


async def chunks() -> AsyncIterator[bytes]:
    yield b"fake media"


def test_transcript_score_handles_languages_without_spaces() -> None:
    assert transcript_score("海岸洪水风险", "海岸洪水危险") > 0.6
    assert transcript_score("海岸洪水风险", "完全不同文本") < 0.3


def test_long_subtitles_are_split_into_movie_sized_cues() -> None:
    text = (
        "Energy management helps retail hosts respond to grid demand while keeping "
        "charging reliable and matching infrastructure design to everyday driving."
    )
    entries = subtitle_entries(TranscriptSegment(0, 13.5, text), text)

    assert len(entries) >= 3
    assert max(len(entry.text) for entry in entries) <= 72
    assert max(entry.end - entry.start for entry in entries) <= 5.0
    assert entries[0].start == 0
    assert entries[-1].end == 13.5


@pytest.mark.asyncio
async def test_media_job_creates_four_outputs_and_player_tracks(
    tmp_path: Path,
    monkeypatch: pytest.MonkeyPatch,
) -> None:
    monkeypatch.setenv("GEMINI_API_KEY", "test-gemini-key-123")
    monkeypatch.setenv("GROQ_API_KEY", "test-groq-key-123")
    manager = MediaJobManager(
        ConfigStore(tmp_path / "config"),
        tmp_path / "jobs",
        tools=FakeTools(),  # type: ignore[arg-type]
        whisper_factory=FakeWhisper,
        file_gateway_factory=FakeFileGateway,
    )
    await manager.start()
    try:
        FakeFileGateway.voices.clear()
        job = await manager.create_upload(
            "lesson.mp3", "fa", "precise", chunks(), voice_name="Puck"
        )
        await asyncio.wait_for(manager.queue.join(), 2)
        result = manager.get(job.id)
        assert result.status == "ready"
        assert result.source_language == "en"
        assert result.quality_score == 1.0
        assert result.voice_name == "Puck"
        assert FakeFileGateway.voices == ["Puck"]
        assert "Charge while you shop." in manager.path(job.id, "source.srt").read_text(
            encoding="utf-8-sig"
        )
        assert "هنگام خرید شارژ کنید." in manager.path(
            job.id, "translated.srt"
        ).read_text(encoding="utf-8-sig")
        for name in (
            "original.wav",
            "source.srt",
            "dubbed.wav",
            "translated.srt",
            "all-outputs.zip",
            "source.vtt",
            "translated.vtt",
        ):
            assert manager.path(job.id, name).is_file()
        with wave.open(str(manager.path(job.id, "dubbed.wav")), "rb") as dubbed:
            assert dubbed.getnframes() == 48_000
    finally:
        await manager.close()
        shutil.rmtree(tmp_path, ignore_errors=True)


@pytest.mark.asyncio
async def test_precise_mode_retries_mismatched_live_narration(
    tmp_path: Path,
    monkeypatch: pytest.MonkeyPatch,
) -> None:
    class RetryingGateway(FakeFileGateway):
        calls = 0

        async def narrate(self, text: str, language: str, voice: str) -> Narration:
            type(self).calls += 1
            transcript = "متنی کاملا نامرتبط" if type(self).calls == 1 else text
            return Narration(b"\1\0" * 24_000, transcript, 300)

    monkeypatch.setenv("GEMINI_API_KEY", "test-gemini-key-123")
    monkeypatch.setenv("GROQ_API_KEY", "test-groq-key-123")
    manager = MediaJobManager(
        ConfigStore(tmp_path / "config"),
        tmp_path / "jobs",
        tools=FakeTools(),  # type: ignore[arg-type]
        whisper_factory=FakeWhisper,
        file_gateway_factory=RetryingGateway,
    )
    await manager.start()
    try:
        job = await manager.create_upload("lesson.mp4", "fa", "precise", chunks())
        await asyncio.wait_for(manager.queue.join(), 2)
        result = manager.get(job.id)
        assert result.status == "ready"
        assert "narration_retry" in result.warnings
        assert RetryingGateway.calls == 2
    finally:
        await manager.close()


@pytest.mark.asyncio
async def test_cancel_stops_active_job(
    tmp_path: Path, monkeypatch: pytest.MonkeyPatch
) -> None:
    entered = asyncio.Event()

    class SlowTools(FakeTools):
        async def probe(self, source: Path) -> MediaInfo:
            entered.set()
            await asyncio.sleep(30)
            return await super().probe(source)

    monkeypatch.setenv("GEMINI_API_KEY", "test-gemini-key-123")
    monkeypatch.setenv("GROQ_API_KEY", "test-groq-key-123")
    manager = MediaJobManager(
        ConfigStore(tmp_path / "config"),
        tmp_path / "jobs",
        tools=SlowTools(),  # type: ignore[arg-type]
        whisper_factory=FakeWhisper,
        file_gateway_factory=FakeFileGateway,
    )
    await manager.start()
    try:
        job = await manager.create_upload("lesson.mp4", "fa", "precise", chunks())
        await asyncio.wait_for(entered.wait(), 1)
        manager.cancel(job.id)
        await asyncio.wait_for(manager.queue.join(), 1)
        assert manager.get(job.id).status == "cancelled"
    finally:
        await manager.close()
