from __future__ import annotations

import time
import wave
import zipfile
from dataclasses import dataclass
from datetime import datetime
from pathlib import Path

from .constants import INPUT_RATE, OUTPUT_RATE


def srt_time(seconds: float) -> str:
    milliseconds = max(0, round(seconds * 1000))
    hours, milliseconds = divmod(milliseconds, 3_600_000)
    minutes, milliseconds = divmod(milliseconds, 60_000)
    secs, milliseconds = divmod(milliseconds, 1000)
    return f"{hours:02}:{minutes:02}:{secs:02},{milliseconds:03}"


@dataclass(frozen=True, slots=True)
class SubtitleEntry:
    start: float
    end: float
    text: str


class SessionRecorder:
    """Writes four aligned artifacts and one convenience archive."""

    def __init__(self, root: Path) -> None:
        stamp = datetime.now().strftime("%Y-%m-%d_%H-%M-%S")
        self.folder = root / stamp
        suffix = 2
        while self.folder.exists():
            self.folder = root / f"{stamp}_{suffix}"
            suffix += 1
        self.folder.mkdir(parents=True)
        self.started = time.monotonic()
        self.source_entries: list[SubtitleEntry] = []
        self.dub_entries: list[SubtitleEntry] = []
        self.original = wave.open(str(self.folder / "original.wav"), "wb")  # noqa: SIM115
        self.dubbed = wave.open(str(self.folder / "dubbed.wav"), "wb")  # noqa: SIM115
        for writer, rate in ((self.original, INPUT_RATE), (self.dubbed, OUTPUT_RATE)):
            writer.setnchannels(1)
            writer.setsampwidth(2)
            writer.setframerate(rate)
        self.dubbed_frames = 0
        self.closed = False

    def elapsed(self) -> float:
        return time.monotonic() - self.started

    def write_original(self, data: bytes) -> None:
        if not self.closed:
            self.original.writeframesraw(data)

    def write_dubbed(self, data: bytes) -> None:
        if self.closed:
            return
        expected = round(self.elapsed() * OUTPUT_RATE)
        if missing := max(0, expected - self.dubbed_frames):
            self.dubbed.writeframesraw(b"\0" * missing * 2)
            self.dubbed_frames += missing
        self.dubbed.writeframesraw(data)
        self.dubbed_frames += len(data) // 2

    def subtitle(self, translated: bool, text: str, start: float, end: float) -> None:
        if self.closed or not text.strip():
            return
        entries = self.dub_entries if translated else self.source_entries
        entries.append(SubtitleEntry(start, max(end, start + 0.6), text.strip()))

    @staticmethod
    def _write_srt(path: Path, entries: list[SubtitleEntry]) -> None:
        blocks = [
            f"{index}\n{srt_time(entry.start)} --> {srt_time(entry.end)}\n{entry.text}\n"
            for index, entry in enumerate(entries, 1)
        ]
        path.write_text("\n".join(blocks), encoding="utf-8-sig")

    def close(self) -> Path:
        if self.closed:
            return self.folder
        self.closed = True
        self.original.close()
        self.dubbed.close()
        self._write_srt(self.folder / "source.srt", self.source_entries)
        self._write_srt(self.folder / "translated.srt", self.dub_entries)
        with zipfile.ZipFile(self.folder / "all-outputs.zip", "w", zipfile.ZIP_DEFLATED) as archive:
            for name in ("original.wav", "source.srt", "dubbed.wav", "translated.srt"):
                archive.write(self.folder / name, name)
        return self.folder
