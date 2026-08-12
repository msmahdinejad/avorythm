from __future__ import annotations

import wave
import zipfile
from pathlib import Path

from voxilyra.recording import SessionRecorder, srt_time


def test_srt_time_formats_and_clamps() -> None:
    assert srt_time(-1) == "00:00:00,000"
    assert srt_time(3_661.234) == "01:01:01,234"


def test_recorder_creates_four_outputs_and_archive(tmp_path: Path) -> None:
    recorder = SessionRecorder(tmp_path)
    recorder.write_original(b"\0\0" * 1_600)
    recorder.write_dubbed(b"\0\0" * 2_400)
    recorder.subtitle(False, "Hello", 0, 1)
    recorder.subtitle(True, "سلام", 0, 1)

    folder = recorder.close()

    expected = {"original.wav", "source.srt", "dubbed.wav", "translated.srt"}
    assert expected.issubset(path.name for path in folder.iterdir())
    with wave.open(str(folder / "original.wav"), "rb") as original:
        assert original.getframerate() == 16_000
        assert original.getnchannels() == 1
    with zipfile.ZipFile(folder / "all-outputs.zip") as archive:
        assert set(archive.namelist()) == expected
    assert "سلام" in (folder / "translated.srt").read_text(encoding="utf-8-sig")


def test_recorder_avoids_same_second_folder_collision(tmp_path: Path) -> None:
    first = SessionRecorder(tmp_path)
    second = SessionRecorder(tmp_path)

    assert first.folder != second.folder

    first.close()
    second.close()
