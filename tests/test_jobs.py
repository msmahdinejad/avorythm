from __future__ import annotations

import asyncio
import shutil
import wave
from collections.abc import AsyncIterator
from pathlib import Path

import pytest

from lingodub.config import ConfigStore
from lingodub.gemini import SegmentTranslation
from lingodub.jobs import MediaJobManager
from lingodub.media import MediaInfo, MediaTools, TimeWindow


class FakeTools:
    async def probe(self, source: Path) -> MediaInfo:
        return MediaInfo(1.0, True)

    async def extract_audio(self, source: Path, destination: Path, duration: float) -> None:
        with wave.open(str(destination), "wb") as writer:
            writer.setnchannels(1)
            writer.setsampwidth(2)
            writer.setframerate(16_000)
            writer.writeframes(b"\0\0" * 16_000)

    async def silences(self, source_wav: Path) -> list[TimeWindow]:
        return []

    async def fit_dubbed(self, pcm: bytes, seconds: float, precise: bool) -> tuple[bytes, bool]:
        return pcm[:48_000].ljust(48_000, b"\0"), False

    archive = staticmethod(MediaTools.archive)


class FakeGateway:
    def __init__(self, api_key: str) -> None:
        self.api_key = api_key

    async def translate_pcm(self, settings: object, pcm: bytes) -> SegmentTranslation:
        return SegmentTranslation(b"\0\0" * 24_000, "Hello", "سلام", "en", 100, 100, 200)

    async def close(self) -> None:
        return None


async def chunks() -> AsyncIterator[bytes]:
    yield b"fake video"


@pytest.mark.asyncio
async def test_media_job_creates_four_outputs_and_player_tracks(
    tmp_path: Path,
    monkeypatch: pytest.MonkeyPatch,
) -> None:
    monkeypatch.setenv("GEMINI_API_KEY", "test-api-key-123")
    manager = MediaJobManager(
        ConfigStore(tmp_path / "config"),
        tmp_path / "jobs",
        tools=FakeTools(),  # type: ignore[arg-type]
        gateway_factory=FakeGateway,  # type: ignore[arg-type]
    )
    await manager.start()
    try:
        job = await manager.create_upload("lesson.mp4", "fa", "precise", chunks())
        await asyncio.wait_for(manager.queue.join(), 2)
        assert manager.get(job.id).status == "ready"
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
        manager.delete(job.id)
        assert not (tmp_path / "jobs" / job.id).exists()
    finally:
        await manager.close()
        shutil.rmtree(tmp_path, ignore_errors=True)


@pytest.mark.asyncio
async def test_cancel_stops_the_active_job(tmp_path: Path, monkeypatch: pytest.MonkeyPatch) -> None:
    entered = asyncio.Event()

    class SlowTools(FakeTools):
        async def probe(self, source: Path) -> MediaInfo:
            entered.set()
            await asyncio.sleep(30)
            return await super().probe(source)

    monkeypatch.setenv("GEMINI_API_KEY", "test-api-key-123")
    manager = MediaJobManager(
        ConfigStore(tmp_path / "config"),
        tmp_path / "jobs",
        tools=SlowTools(),  # type: ignore[arg-type]
        gateway_factory=FakeGateway,  # type: ignore[arg-type]
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
