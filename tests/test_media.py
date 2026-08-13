from __future__ import annotations

import sys
from pathlib import Path

import pytest

from dubira.media import (
    MediaTools,
    TimeWindow,
    fixed_windows,
    parse_silences,
    speech_windows,
    supported_media,
    write_subtitles,
)
from dubira.recording import SubtitleEntry


def test_speech_windows_are_bounded_and_monotonic() -> None:
    stderr = "\n".join(
        (
            "silence_start: 0",
            "silence_end: 1.0 | silence_duration: 1",
            "silence_start: 4.0",
            "silence_end: 5.0 | silence_duration: 1",
        )
    )
    windows = speech_windows(100, parse_silences(stderr), maximum=30, minimum=1)
    assert windows[0] == TimeWindow(0, 4.5)
    assert windows[-1].end == 100
    assert all(0 < item.duration <= 30 for item in windows)
    assert all(left.end <= right.start for left, right in zip(windows, windows[1:], strict=False))


def test_short_media_is_one_complete_window() -> None:
    silences = [TimeWindow(0, 1), TimeWindow(2, 3), TimeWindow(6, 7)]
    assert speech_windows(8, silences) == [TimeWindow(0, 8)]


def test_uploaded_media_uses_short_stable_windows() -> None:
    windows = speech_windows(25, [], maximum=12, minimum=5)
    assert windows == [TimeWindow(0, 12), TimeWindow(12, 24), TimeWindow(24, 25)]


def test_fixed_windows_cover_entire_duration() -> None:
    assert fixed_windows(91) == [TimeWindow(0, 45), TimeWindow(45, 90), TimeWindow(90, 91)]


def test_write_subtitles_supports_srt_and_vtt(tmp_path: Path) -> None:
    entries = [SubtitleEntry(1.25, 2.5, "سلام")]
    srt = tmp_path / "track.srt"
    vtt = tmp_path / "track.vtt"
    write_subtitles(srt, entries)
    write_subtitles(vtt, entries, vtt=True)
    assert "00:00:01,250 --> 00:00:02,500" in srt.read_text(encoding="utf-8-sig")
    assert vtt.read_text(encoding="utf-8").startswith("WEBVTT\n\n1\n00:00:01.250")


def test_media_tools_find_winget_package_without_alias(
    tmp_path: Path,
    monkeypatch: pytest.MonkeyPatch,
) -> None:
    executable = (
        tmp_path
        / "Microsoft"
        / "WinGet"
        / "Packages"
        / "Gyan.FFmpeg_Microsoft.Winget.Source_8wekyb3d8bbwe"
        / "ffmpeg-9.0-full_build"
        / "bin"
        / "ffmpeg.exe"
    )
    executable.parent.mkdir(parents=True)
    executable.touch()
    monkeypatch.setenv("LOCALAPPDATA", str(tmp_path))
    monkeypatch.setenv("PROGRAMFILES", str(tmp_path / "Program Files"))
    monkeypatch.setattr(sys, "_MEIPASS", str(tmp_path / "bundle"), raising=False)
    monkeypatch.setattr("dubira.media.shutil.which", lambda _: None)

    assert MediaTools._find("ffmpeg") == str(executable)


def test_supported_media_accepts_audio_and_video() -> None:
    assert supported_media("lesson.mp3") == "audio"
    assert supported_media("podcast.FLAC") == "audio"
    assert supported_media("course.mkv") == "video"
    assert supported_media("notes.txt") is None


@pytest.mark.asyncio
async def test_fast_fit_preserves_oversized_speech(
    monkeypatch: pytest.MonkeyPatch,
) -> None:
    tools = MediaTools.__new__(MediaTools)
    tools.ffmpeg = "ffmpeg"
    processed = False

    async def fake_run(*arguments: str, input_data: bytes | None = None) -> tuple[bytes, str]:
        nonlocal processed
        processed = True
        assert input_data is not None
        return b"\x01\x00" * 24_000, ""

    monkeypatch.setattr(tools, "_run", fake_run)
    fitted, clipped = await tools.fit_dubbed(b"\x02\x00" * 48_000, 1.0, precise=False)

    assert processed is True
    assert len(fitted) == 48_000
    assert clipped is False
