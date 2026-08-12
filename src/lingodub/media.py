from __future__ import annotations

import asyncio
import json
import math
import os
import re
import shutil
import sys
import wave
import zipfile
from dataclasses import dataclass
from pathlib import Path
from typing import Literal

from .constants import INPUT_RATE, OUTPUT_RATE
from .recording import SubtitleEntry, srt_time

SUPPORTED_VIDEO_SUFFIXES = {
    ".mp4",
    ".m4v",
    ".mov",
    ".mkv",
    ".webm",
    ".avi",
    ".wmv",
    ".mpeg",
    ".mpg",
    ".3gp",
}
SUPPORTED_AUDIO_SUFFIXES = {
    ".aac",
    ".aif",
    ".aiff",
    ".flac",
    ".m4a",
    ".mp3",
    ".oga",
    ".ogg",
    ".opus",
    ".wav",
    ".wma",
}
SUPPORTED_MEDIA_SUFFIXES = SUPPORTED_VIDEO_SUFFIXES | SUPPORTED_AUDIO_SUFFIXES
MediaKind = Literal["audio", "video"]


def supported_media(filename: str) -> MediaKind | None:
    suffix = Path(filename).suffix.lower()
    if suffix in SUPPORTED_AUDIO_SUFFIXES:
        return "audio"
    if suffix in SUPPORTED_VIDEO_SUFFIXES:
        return "video"
    return None


@dataclass(frozen=True, slots=True)
class MediaInfo:
    duration: float
    has_audio: bool


@dataclass(frozen=True, slots=True)
class TimeWindow:
    start: float
    end: float

    @property
    def duration(self) -> float:
        return self.end - self.start


def parse_silences(output: str) -> list[TimeWindow]:
    starts = [float(value) for value in re.findall(r"silence_start:\s*([0-9.]+)", output)]
    ends = [float(value) for value in re.findall(r"silence_end:\s*([0-9.]+)", output)]
    if len(ends) > len(starts):
        starts.insert(0, 0.0)
    return [TimeWindow(start, end) for start, end in zip(starts, ends, strict=False) if end > start]


def fixed_windows(duration: float, maximum: float = 45.0) -> list[TimeWindow]:
    if duration <= 0:
        return []
    return [
        TimeWindow(start, min(duration, start + maximum))
        for start in (index * maximum for index in range(math.ceil(duration / maximum)))
    ]


def speech_windows(
    duration: float,
    silences: list[TimeWindow],
    maximum: float = 45.0,
    minimum: float = 8.0,
) -> list[TimeWindow]:
    if duration <= 0:
        return []
    boundaries = sorted(
        (silence.start + silence.end) / 2
        for silence in silences
        if 0 < silence.start < duration and silence.end > silence.start
    )
    windows: list[TimeWindow] = []
    cursor = 0.0
    while duration - cursor > maximum:
        limit = cursor + maximum
        candidates = [point for point in boundaries if cursor + minimum <= point <= limit]
        end = candidates[-1] if candidates else limit
        windows.append(TimeWindow(cursor, end))
        cursor = end
    if duration > cursor:
        windows.append(TimeWindow(cursor, duration))
    return windows


def read_pcm_window(path: Path, window: TimeWindow) -> bytes:
    with wave.open(str(path), "rb") as reader:
        if reader.getnchannels() != 1 or reader.getsampwidth() != 2:
            raise ValueError("expected mono 16-bit PCM WAV")
        rate = reader.getframerate()
        start = max(0, round(window.start * rate))
        frames = max(0, round(window.duration * rate))
        reader.setpos(min(start, reader.getnframes()))
        return reader.readframes(frames)


def write_subtitles(path: Path, entries: list[SubtitleEntry], *, vtt: bool = False) -> None:
    def stamp(seconds: float) -> str:
        return srt_time(seconds).replace(",", ".") if vtt else srt_time(seconds)

    blocks = [
        f"{index}\n{stamp(entry.start)} --> {stamp(entry.end)}\n{entry.text}\n"
        for index, entry in enumerate(entries, 1)
    ]
    prefix = "WEBVTT\n\n" if vtt else ""
    path.write_text(prefix + "\n".join(blocks), encoding="utf-8" if vtt else "utf-8-sig")


class MediaTools:
    def __init__(self, ffmpeg: str | None = None, ffprobe: str | None = None) -> None:
        self.ffmpeg = ffmpeg or self._find("ffmpeg")
        self.ffprobe = ffprobe or self._find("ffprobe")

    @staticmethod
    def _find(name: str) -> str:
        executable = f"{name}.exe" if sys.platform == "win32" else name
        bundled = Path(getattr(sys, "_MEIPASS", "")) / executable
        local_app_data = os.getenv("LOCALAPPDATA", "")
        program_files = os.getenv("PROGRAMFILES", "")
        winget_candidates = [
            Path(local_app_data) / "Microsoft" / "WinGet" / "Links" / executable,
            Path(program_files) / "WinGet" / "Links" / executable,
        ]
        found = str(bundled) if bundled.is_file() else shutil.which(executable)
        if not found:
            found = next((str(path) for path in winget_candidates if path.is_file()), None)
        if not found:
            package_roots = [
                Path(local_app_data) / "Microsoft" / "WinGet" / "Packages",
                Path(program_files) / "WinGet" / "Packages",
            ]
            found = next(
                (
                    str(path)
                    for root in package_roots
                    for path in root.glob(f"Gyan.FFmpeg*/**/bin/{executable}")
                    if path.is_file()
                ),
                None,
            )
        if not found:
            raise RuntimeError(f"{name} is required for uploaded media processing")
        return found

    async def _run(self, *arguments: str, input_data: bytes | None = None) -> tuple[bytes, str]:
        process = await asyncio.create_subprocess_exec(
            *arguments,
            stdin=asyncio.subprocess.PIPE if input_data is not None else None,
            stdout=asyncio.subprocess.PIPE,
            stderr=asyncio.subprocess.PIPE,
            creationflags=0x08000000 if sys.platform == "win32" else 0,
        )
        try:
            stdout, stderr = await process.communicate(input_data)
        except asyncio.CancelledError:
            if process.returncode is None:
                process.terminate()
                try:
                    await asyncio.wait_for(process.wait(), timeout=2)
                except TimeoutError:
                    process.kill()
                    await process.wait()
            raise
        text = stderr.decode("utf-8", errors="replace")
        if process.returncode:
            raise RuntimeError(text.strip().splitlines()[-1] if text.strip() else "FFmpeg failed")
        return stdout, text

    async def probe(self, source: Path) -> MediaInfo:
        stdout, _ = await self._run(
            self.ffprobe,
            "-v",
            "error",
            "-show_entries",
            "format=duration:stream=codec_type",
            "-of",
            "json",
            str(source),
        )
        payload = json.loads(stdout)
        duration = float(payload.get("format", {}).get("duration") or 0)
        has_audio = any(
            stream.get("codec_type") == "audio" for stream in payload.get("streams", [])
        )
        if duration <= 0 or not has_audio:
            raise ValueError("media file has no readable audio track")
        return MediaInfo(duration, has_audio)

    async def extract_audio(self, source: Path, destination: Path, duration: float) -> None:
        await self._run(
            self.ffmpeg,
            "-y",
            "-v",
            "error",
            "-i",
            str(source),
            "-vn",
            "-ac",
            "1",
            "-ar",
            str(INPUT_RATE),
            "-af",
            "apad",
            "-t",
            f"{duration:.6f}",
            "-c:a",
            "pcm_s16le",
            str(destination),
        )

    async def silences(self, source_wav: Path) -> list[TimeWindow]:
        _, stderr = await self._run(
            self.ffmpeg,
            "-v",
            "info",
            "-i",
            str(source_wav),
            "-af",
            "silencedetect=noise=-38dB:d=0.35",
            "-f",
            "null",
            "-",
        )
        return parse_silences(stderr)

    async def fit_dubbed(self, pcm: bytes, seconds: float, precise: bool) -> tuple[bytes, bool]:
        target_bytes = max(0, round(seconds * OUTPUT_RATE) * 2)
        if len(pcm) <= target_bytes:
            return pcm + b"\0" * (target_bytes - len(pcm)), False
        if target_bytes == 0:
            return pcm[:target_bytes], True
        ratio = len(pcm) / target_bytes
        maximum = 1.5 if precise else 2.0
        factors: list[float] = []
        while ratio > maximum:
            factors.append(maximum)
            ratio /= maximum
        factors.append(ratio)
        stdout, _ = await self._run(
            self.ffmpeg,
            "-v",
            "error",
            "-f",
            "s16le",
            "-ar",
            str(OUTPUT_RATE),
            "-ac",
            "1",
            "-i",
            "pipe:0",
            "-filter:a",
            ",".join(f"atempo={factor:.6f}" for factor in factors),
            "-f",
            "s16le",
            "pipe:1",
            input_data=pcm,
        )
        return stdout[:target_bytes] + b"\0" * max(0, target_bytes - len(stdout)), False

    async def to_input_pcm(self, pcm: bytes) -> bytes:
        stdout, _ = await self._run(
            self.ffmpeg,
            "-v",
            "error",
            "-f",
            "s16le",
            "-ar",
            str(OUTPUT_RATE),
            "-ac",
            "1",
            "-i",
            "pipe:0",
            "-ar",
            str(INPUT_RATE),
            "-f",
            "s16le",
            "pipe:1",
            input_data=pcm,
        )
        return stdout

    @staticmethod
    def archive(folder: Path) -> None:
        with zipfile.ZipFile(folder / "all-outputs.zip", "w", zipfile.ZIP_DEFLATED) as archive:
            for name in ("original.wav", "source.srt", "dubbed.wav", "translated.srt"):
                archive.write(folder / name, name)
