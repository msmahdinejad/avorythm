from __future__ import annotations

from pathlib import Path

from lingodub.media import (
    TimeWindow,
    fixed_windows,
    parse_silences,
    speech_windows,
    write_subtitles,
)
from lingodub.recording import SubtitleEntry


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
