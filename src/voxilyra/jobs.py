from __future__ import annotations

import asyncio
import json
import os
import re
import shutil
import unicodedata
import uuid
import wave
from collections.abc import AsyncIterator, Callable
from dataclasses import asdict, dataclass, field
from datetime import UTC, datetime
from difflib import SequenceMatcher
from pathlib import Path
from typing import Literal, Protocol

from .config import ConfigStore
from .constants import (
    GROQ_FAST_MODEL,
    GROQ_PRECISE_MODEL,
    OUTPUT_RATE,
    SUPPORTED_LANGUAGES,
)
from .gemini import GeminiFileGateway, Narration, NoTranslationError, TextTranslation
from .groq import GroqWhisperGateway, TranscriptSegment, merge_segments, parse_transcription
from .media import MediaKind, MediaTools, supported_media, write_subtitles
from .quota import TokenGovernor
from .recording import SubtitleEntry

MediaMode = Literal["precise", "fast"]
ACTIVE_STATES = {
    "probing",
    "extracting",
    "transcribing",
    "translating",
    "narrating",
    "quota_wait",
    "aligning",
}
TERMINAL_STATES = {"ready", "cancelled", "failed"}
OUTPUT_NAMES = {
    "original.wav",
    "source.srt",
    "dubbed.wav",
    "translated.srt",
    "all-outputs.zip",
}


class WhisperGateway(Protocol):
    async def transcribe(self, path: Path, model: str) -> dict[str, object]: ...
    async def close(self) -> None: ...


class FileGateway(Protocol):
    async def translate(
        self, texts: list[str], source_language: str, target_language: str
    ) -> TextTranslation: ...
    async def narrate(self, text: str, language: str, voice_name: str) -> Narration: ...
    async def close(self) -> None: ...


def utc_now() -> str:
    return datetime.now(UTC).isoformat()


def transcript_score(reference: str, candidate: str) -> float:
    def words(value: str) -> list[str]:
        normalized = unicodedata.normalize("NFKD", value.casefold())
        normalized = "".join(c for c in normalized if not unicodedata.combining(c))
        tokens = re.findall(r"\w+", normalized, flags=re.UNICODE)
        if len(tokens) == 1 and len(tokens[0]) >= 4:
            return list(tokens[0])
        return tokens

    expected = words(reference)
    actual = words(candidate)
    if not expected or not actual:
        return 0.0
    sequence = SequenceMatcher(None, expected, actual).ratio()
    coverage = len(set(expected) & set(actual)) / len(set(expected))
    return round((sequence + coverage) / 2, 3)


@dataclass(slots=True)
class MediaJob:
    id: str
    filename: str
    suffix: str
    mode: MediaMode
    target_language: str
    media_kind: MediaKind = "video"
    status: str = "queued"
    stage: str = "queued"
    progress: float = 0.0
    duration: float = 0.0
    source_language: str = ""
    quality_score: float | None = None
    error: str = ""
    warnings: list[str] = field(default_factory=list)
    created_at: str = field(default_factory=utc_now)
    updated_at: str = field(default_factory=utc_now)

    @classmethod
    def from_dict(cls, payload: dict[str, object]) -> MediaJob:
        payload.setdefault(
            "media_kind",
            supported_media(str(payload.get("filename", ""))) or "video",
        )
        payload.setdefault("quality_score", None)
        return cls(**payload)  # type: ignore[arg-type]

    def to_dict(self) -> dict[str, object]:
        return asdict(self)


class MediaJobManager:
    MAX_UPLOAD_BYTES = 8 * 1024 * 1024 * 1024

    def __init__(
        self,
        store: ConfigStore,
        root: Path | None = None,
        *,
        tools: MediaTools | None = None,
        governor: TokenGovernor | None = None,
        whisper_factory: Callable[[str], WhisperGateway] = GroqWhisperGateway,
        file_gateway_factory: Callable[[str], FileGateway] = GeminiFileGateway,
    ) -> None:
        self.store = store
        self.root = root or store.directory / "media-jobs"
        self.tools = tools
        self.governor = governor or TokenGovernor()
        self.whisper_factory = whisper_factory
        self.file_gateway_factory = file_gateway_factory
        self.jobs: dict[str, MediaJob] = {}
        self.cancellations: dict[str, asyncio.Event] = {}
        self.queue: asyncio.Queue[str] = asyncio.Queue()
        self.worker: asyncio.Task[None] | None = None
        self.active_task: asyncio.Task[None] | None = None
        self.active_job_id = ""
        self._load()

    def _load(self) -> None:
        if not self.root.is_dir():
            return
        for manifest in self.root.glob("*/manifest.json"):
            try:
                job = MediaJob.from_dict(json.loads(manifest.read_text(encoding="utf-8")))
            except (OSError, TypeError, ValueError, json.JSONDecodeError):
                continue
            if job.status in ACTIVE_STATES:
                job.status = job.stage = "queued"
                job.error = ""
            self.jobs[job.id] = job

    async def start(self) -> None:
        if self.worker and not self.worker.done():
            return
        self.root.mkdir(parents=True, exist_ok=True)
        self.worker = asyncio.create_task(self._work())
        for job in sorted(self.jobs.values(), key=lambda item: item.created_at):
            if job.status == "queued":
                await self.queue.put(job.id)

    async def close(self) -> None:
        if self.active_job_id:
            self.cancellations.setdefault(self.active_job_id, asyncio.Event()).set()
        if self.worker:
            self.worker.cancel()
            await asyncio.gather(self.worker, return_exceptions=True)
            self.worker = None
            self.active_task = None

    def _folder(self, job_id: str) -> Path:
        if not re_full_job_id(job_id):
            raise KeyError(job_id)
        folder = self.root / job_id
        if folder.parent.resolve() != self.root.resolve():
            raise KeyError(job_id)
        return folder

    def _manifest(self, job: MediaJob) -> Path:
        return self._folder(job.id) / "manifest.json"

    def _save(self, job: MediaJob) -> None:
        job.updated_at = utc_now()
        path = self._manifest(job)
        path.parent.mkdir(parents=True, exist_ok=True)
        temporary = path.with_suffix(".tmp")
        temporary.write_text(
            json.dumps(job.to_dict(), ensure_ascii=False, indent=2) + "\n",
            encoding="utf-8",
        )
        os.replace(temporary, path)

    def _update(
        self,
        job: MediaJob,
        status: str,
        progress: float | None = None,
        *,
        error: str = "",
    ) -> None:
        job.status = job.stage = status
        if progress is not None:
            job.progress = min(1.0, max(0.0, progress))
        job.error = error
        self._save(job)

    async def create_upload(
        self,
        filename: str,
        target_language: str,
        mode: MediaMode,
        chunks: AsyncIterator[bytes],
        content_length: int | None = None,
    ) -> MediaJob:
        suffix = Path(filename).suffix.lower()
        media_kind = supported_media(filename)
        if not media_kind:
            raise ValueError("unsupported media format")
        if target_language not in SUPPORTED_LANGUAGES:
            raise ValueError("unsupported target language")
        if mode not in ("precise", "fast"):
            raise ValueError("unsupported processing mode")
        if content_length is not None and content_length > self.MAX_UPLOAD_BYTES:
            raise ValueError("media file is larger than the 8 GB local limit")
        job = MediaJob(
            uuid.uuid4().hex,
            Path(filename).name,
            suffix,
            mode,
            target_language,
            media_kind,
        )
        folder = self._folder(job.id)
        folder.mkdir(parents=True)
        source = folder / f"source{suffix}"
        size = 0
        try:
            with source.open("wb") as output:
                async for chunk in chunks:
                    size += len(chunk)
                    if size > self.MAX_UPLOAD_BYTES:
                        raise ValueError("media file is larger than the 8 GB local limit")
                    output.write(chunk)
            if size == 0:
                raise ValueError("uploaded media file is empty")
            self.jobs[job.id] = job
            self.cancellations[job.id] = asyncio.Event()
            self._save(job)
            await self.queue.put(job.id)
            return job
        except Exception:
            shutil.rmtree(folder, ignore_errors=True)
            raise

    def get(self, job_id: str) -> MediaJob:
        try:
            return self.jobs[job_id]
        except KeyError as error:
            raise KeyError(job_id) from error

    def list_jobs(self) -> list[MediaJob]:
        return sorted(self.jobs.values(), key=lambda item: item.created_at, reverse=True)

    def path(self, job_id: str, name: str) -> Path:
        job = self.get(job_id)
        if name in {"media", "video"}:
            path = self._folder(job.id) / f"source{job.suffix}"
        elif name in OUTPUT_NAMES or name in {"source.vtt", "translated.vtt"}:
            if job.status != "ready":
                raise FileNotFoundError(name)
            path = self._folder(job.id) / name
        else:
            raise KeyError(name)
        if not path.is_file():
            raise FileNotFoundError(path)
        return path

    def cancel(self, job_id: str) -> MediaJob:
        job = self.get(job_id)
        if job.status in TERMINAL_STATES:
            return job
        self.cancellations.setdefault(job_id, asyncio.Event()).set()
        if job.status == "queued":
            self._update(job, "cancelled")
        else:
            self._update(job, "cancelling")
            if self.active_job_id == job_id and self.active_task and not self.active_task.done():
                self.active_task.cancel()
        return job

    def delete(self, job_id: str) -> None:
        job = self.get(job_id)
        if job.status not in TERMINAL_STATES:
            raise RuntimeError("cancel the active job before deleting it")
        folder = self._folder(job_id).resolve()
        if folder.parent != self.root.resolve():
            raise RuntimeError("invalid media job path")
        shutil.rmtree(folder)
        self.jobs.pop(job_id, None)
        self.cancellations.pop(job_id, None)

    async def _work(self) -> None:
        while True:
            job_id = await self.queue.get()
            try:
                job = self.jobs.get(job_id)
                if not job or job.status != "queued":
                    continue
                self.active_job_id = job_id
                self.active_task = asyncio.create_task(self._process(job))
                await self.active_task
            except asyncio.CancelledError:
                current = asyncio.current_task()
                if current is not None and current.cancelling():
                    raise
                if job := self.jobs.get(job_id):
                    self._update(job, "cancelled")
            except Exception as error:
                if job := self.jobs.get(job_id):
                    self._update(job, "failed", error=safe_error(error))
            finally:
                self.active_task = None
                self.active_job_id = ""
                self.queue.task_done()

    def _waiting(self, job: MediaJob, wait: float) -> None:
        message = f"quota wait: {max(1, round(wait))}s"
        self._update(job, "quota_wait", job.progress, error=message)

    async def _translate(
        self,
        gateway: FileGateway,
        job: MediaJob,
        segments: list[TranscriptSegment],
    ) -> list[str]:
        texts = [segment.text for segment in segments]
        translated: list[str] = []
        for start in range(0, len(texts), 50):
            batch = texts[start : start + 50]
            estimate = min(8_000, max(512, sum(len(text) for text in batch) // 2 + 256))
            charge = await self.governor.reserve(estimate, lambda wait: self._waiting(job, wait))
            if job.status == "quota_wait":
                self._update(job, "translating", job.progress)
            result = await gateway.translate(batch, job.source_language, job.target_language)
            await self.governor.reconcile(charge, result.total_tokens or estimate)
            translated.extend(result.texts)
            progress = 0.38 + 0.12 * min(1, (start + len(batch)) / len(texts))
            self._update(job, "translating", progress)
        return translated

    async def _narrate(self, gateway: FileGateway, job: MediaJob, text: str) -> Narration:
        estimate = min(6_000, max(512, len(text) * 4 + 256))
        for attempt in range(3):
            charge = await self.governor.reserve(estimate, lambda wait: self._waiting(job, wait))
            if job.status == "quota_wait":
                self._update(job, "narrating", job.progress)
            try:
                result = await gateway.narrate(
                    text,
                    job.target_language,
                    self.store.load().voice_name,
                )
            except Exception:
                await self.governor.reconcile(charge, estimate)
                if attempt == 2:
                    raise
                await asyncio.sleep(0.5 * (attempt + 1))
                continue
            await self.governor.reconcile(charge, result.total_tokens or estimate)
            score = transcript_score(text, result.transcript) if result.transcript else 1.0
            if job.mode == "precise" and score < 0.72:
                if "narration_retry" not in job.warnings:
                    job.warnings.append("narration_retry")
                if attempt < 2:
                    continue
                if "quality_low" not in job.warnings:
                    job.warnings.append("quality_low")
            return result
        raise AssertionError("unreachable")

    async def _process(self, job: MediaJob) -> None:
        cancelled = self.cancellations.setdefault(job.id, asyncio.Event())
        folder = self._folder(job.id)
        source = folder / f"source{job.suffix}"
        tools = self.tools or MediaTools()
        self.tools = tools
        self._update(job, "probing", 0.02)
        info = await tools.probe(source)
        job.duration = info.duration
        self._update(job, "extracting", 0.06)
        original = folder / "original.wav"
        await tools.extract_audio(source, original, info.duration)
        if cancelled.is_set():
            self._update(job, "cancelled")
            return

        gemini_key = self.store.get_api_key("gemini")
        groq_key = self.store.get_api_key("groq")
        if not gemini_key:
            raise RuntimeError("set Gemini API key before processing media")
        if not groq_key:
            raise RuntimeError("set Groq API key before processing media")
        self.store.apply_proxy(self.store.load())
        whisper = self.whisper_factory(groq_key)
        gateway = self.file_gateway_factory(gemini_key)
        try:
            self._update(job, "transcribing", 0.12)
            chunks = await tools.transcription_chunks(
                original,
                folder / "whisper-chunks",
                info.duration,
            )
            raw_segments: list[TranscriptSegment] = []
            languages: list[str] = []
            model = GROQ_PRECISE_MODEL if job.mode == "precise" else GROQ_FAST_MODEL
            for index, chunk in enumerate(chunks):
                payload = await whisper.transcribe(chunk.path, model)
                transcription = parse_transcription(payload, chunk)
                raw_segments.extend(transcription.segments)
                if transcription.language:
                    languages.append(transcription.language)
                self._update(job, "transcribing", 0.12 + 0.23 * ((index + 1) / len(chunks)))
                if cancelled.is_set():
                    self._update(job, "cancelled")
                    return
            maximum_seconds = 12 if job.mode == "precise" else 16
            segments = merge_segments(raw_segments, maximum_seconds=maximum_seconds)
            if not segments:
                raise RuntimeError("Groq Whisper found no speech in this media")
            job.source_language = max(set(languages), key=languages.count) if languages else ""

            self._update(job, "translating", 0.38)
            translations = await self._translate(gateway, job, segments)
            if len(translations) != len(segments):
                raise RuntimeError("translation segment count does not match transcription")

            source_entries = [SubtitleEntry(item.start, item.end, item.text) for item in segments]
            translated_entries = [
                SubtitleEntry(item.start, item.end, text)
                for item, text in zip(segments, translations, strict=True)
            ]
            scores: list[tuple[float, float]] = []
            cursor_frames = 0
            self._update(job, "narrating", 0.52)
            with wave.open(str(folder / "dubbed.wav"), "wb") as dubbed:
                dubbed.setnchannels(1)
                dubbed.setsampwidth(2)
                dubbed.setframerate(OUTPUT_RATE)
                for index, (segment, text) in enumerate(zip(segments, translations, strict=True)):
                    if cancelled.is_set():
                        self._update(job, "cancelled")
                        return
                    try:
                        narration = await self._narrate(gateway, job, text)
                    except NoTranslationError:
                        if "segment_skipped" not in job.warnings:
                            job.warnings.append("segment_skipped")
                        continue
                    fitted, _ = await tools.fit_dubbed(
                        narration.audio,
                        segment.duration,
                        job.mode == "precise",
                    )
                    start_frame = round(segment.start * OUTPUT_RATE)
                    if start_frame > cursor_frames:
                        dubbed.writeframesraw(b"\0" * (start_frame - cursor_frames) * 2)
                    dubbed.writeframesraw(fitted)
                    cursor_frames = start_frame + len(fitted) // 2
                    if narration.transcript:
                        scores.append(
                            (transcript_score(text, narration.transcript), segment.duration)
                        )
                    self._update(job, "narrating", 0.52 + 0.36 * ((index + 1) / len(segments)))
                total_frames = round(info.duration * OUTPUT_RATE)
                if total_frames > cursor_frames:
                    dubbed.writeframesraw(b"\0" * (total_frames - cursor_frames) * 2)
            if scores:
                job.quality_score = round(
                    sum(score * seconds for score, seconds in scores)
                    / sum(seconds for _, seconds in scores),
                    3,
                )
        finally:
            await whisper.close()
            await gateway.close()
            shutil.rmtree(folder / "whisper-chunks", ignore_errors=True)

        self._update(job, "aligning", 0.92)
        write_subtitles(folder / "source.srt", source_entries)
        write_subtitles(folder / "translated.srt", translated_entries)
        write_subtitles(folder / "source.vtt", source_entries, vtt=True)
        write_subtitles(folder / "translated.vtt", translated_entries, vtt=True)
        tools.archive(folder)
        self._update(job, "ready", 1.0)


def re_full_job_id(value: str) -> bool:
    return len(value) == 32 and all(character in "0123456789abcdef" for character in value)


def safe_error(error: Exception) -> str:
    message = str(error).strip().splitlines()[-1] if str(error).strip() else type(error).__name__
    return message[:500]
