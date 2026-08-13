from __future__ import annotations

import asyncio
import mimetypes
from collections.abc import AsyncIterator, Callable
from contextlib import asynccontextmanager
from pathlib import Path
from typing import Literal

from fastapi import FastAPI, HTTPException, Query, Request
from fastapi.responses import FileResponse
from fastapi.staticfiles import StaticFiles

from .audio import DeviceCatalog
from .config import ConfigStore
from .constants import RTL_LANGUAGES, SUPPORTED_LANGUAGES, VOICE_NAMES
from .jobs import OUTPUT_NAMES, MediaJob, MediaJobManager
from .models import ApiKeyInput, Settings
from .routing import open_windows_volume_mixer
from .runtime import DubRuntime

ALLOWED_RECORDINGS = {
    "original.wav",
    "source.srt",
    "dubbed.wav",
    "translated.srt",
    "all-outputs.zip",
}


def create_app(
    store: ConfigStore | None = None,
    recordings: Path | None = None,
    static: Path | None = None,
    media_jobs: Path | None = None,
    shutdown_callback: Callable[[], None] | None = None,
) -> FastAPI:
    config = store or ConfigStore()
    recording_root = recordings or config.directory / "recordings"
    static_root = static or Path(__file__).parent / "static"
    runtime = DubRuntime(config, recording_root)
    media = MediaJobManager(config, media_jobs)

    @asynccontextmanager
    async def lifespan(application: FastAPI) -> AsyncIterator[None]:
        await media.start()
        yield
        await runtime.stop()
        await media.close()

    app = FastAPI(
        title="Dubira Desktop",
        version="0.7.0",
        docs_url=None,
        redoc_url=None,
        lifespan=lifespan,
    )
    app.state.runtime = runtime
    app.state.media = media

    def media_snapshot(job: MediaJob) -> dict[str, object]:
        payload = job.to_dict()
        payload.update(
            {
                "media_url": f"/api/media/jobs/{job.id}/media",
                "video_url": f"/api/media/jobs/{job.id}/media",
                "source_vtt_url": f"/api/media/jobs/{job.id}/subtitles/source",
                "translated_vtt_url": f"/api/media/jobs/{job.id}/subtitles/translated",
                "outputs": {
                    name: f"/api/media/jobs/{job.id}/outputs/{name}"
                    for name in sorted(OUTPUT_NAMES)
                }
                if job.status == "ready"
                else {},
            }
        )
        return payload

    @app.get("/api/health")
    def health() -> dict[str, str]:
        return {"status": "ok"}

    @app.get("/api/bootstrap")
    def bootstrap() -> dict[str, object]:
        return {
            "devices": DeviceCatalog.scan().to_dict(),
            "languages": sorted(SUPPORTED_LANGUAGES),
            "voices": sorted(VOICE_NAMES),
            "settings": runtime.settings.model_dump(),
            "api_key_set": bool(config.get_api_key()),
            "gemini_key_set": bool(config.get_api_key("gemini")),
            "groq_key_set": bool(config.get_api_key("groq")),
        }

    @app.get("/api/state")
    def state() -> dict[str, object]:
        snapshot = runtime.snapshot()
        source_language = runtime.state.source_lang
        target_language = runtime.settings.target_language
        source = source_language.split("-")[0]
        target = target_language.split("-")[0]
        snapshot.update(
            {
                "source_dir": "rtl" if source in RTL_LANGUAGES else "ltr",
                "translated_dir": "rtl" if target in RTL_LANGUAGES else "ltr",
                "latest_recording": snapshot["latest_recording"],
            }
        )
        return snapshot

    @app.post("/api/key")
    def set_key(body: ApiKeyInput) -> dict[str, bool]:
        try:
            config.set_api_key(body.api_key, body.provider)
        except ValueError as error:
            raise HTTPException(400, str(error)) from error
        return {"ok": True}

    @app.post("/api/settings")
    def update_settings(body: Settings) -> dict[str, object]:
        try:
            updated = runtime.update_settings(body)
        except RuntimeError as error:
            raise HTTPException(409, str(error)) from error
        return {"ok": True, "settings": updated.model_dump()}

    @app.post("/api/start")
    async def start() -> dict[str, bool]:
        if media.active_job_id:
            raise HTTPException(409, "wait for uploaded media processing to finish")
        try:
            await runtime.start()
        except ValueError as error:
            raise HTTPException(400, str(error)) from error
        return {"ok": True}

    @app.post("/api/stop")
    async def stop() -> dict[str, bool]:
        await runtime.stop()
        return {"ok": True}

    @app.post("/api/shutdown")
    async def shutdown() -> dict[str, bool]:
        if shutdown_callback is None:
            raise HTTPException(503, "application shutdown is unavailable")
        await runtime.stop()
        await media.close()
        asyncio.get_running_loop().call_later(0.15, shutdown_callback)
        return {"ok": True}

    @app.post("/api/record/start")
    def record_start() -> dict[str, bool]:
        if not runtime.state.running:
            raise HTTPException(409, "start desktop dubbing before recording")
        runtime.start_recording()
        return {"ok": True}

    @app.post("/api/record/stop")
    def record_stop() -> dict[str, str | bool]:
        return {"ok": True, "folder": runtime.stop_recording()}

    @app.post("/api/audio/open-mixer")
    def open_mixer() -> dict[str, bool]:
        try:
            open_windows_volume_mixer()
        except RuntimeError as error:
            raise HTTPException(400, str(error)) from error
        return {"ok": True}

    @app.get("/api/recordings/{folder}/{filename}")
    def recording_file(folder: str, filename: str) -> FileResponse:
        if filename not in ALLOWED_RECORDINGS or Path(folder).name != folder:
            raise HTTPException(404)
        path = recording_root / folder / filename
        if not path.is_file():
            raise HTTPException(404)
        return FileResponse(path, filename=filename)

    @app.get("/api/media/jobs")
    def media_list() -> dict[str, object]:
        return {"jobs": [media_snapshot(job) for job in media.list_jobs()]}

    @app.post("/api/media/jobs")
    async def media_create(
        request: Request,
        filename: str = Query(min_length=1, max_length=240),
        target_language: str = Query(default="fa"),
        mode: Literal["precise", "fast"] = Query(default="precise"),
        voice_name: str = Query(default="Kore"),
    ) -> dict[str, object]:
        if runtime.state.running:
            raise HTTPException(409, "stop live desktop dubbing before processing a video")
        content_length = request.headers.get("content-length")
        try:
            length = int(content_length) if content_length else None
            job = await media.create_upload(
                filename,
                target_language,
                mode,
                request.stream(),
                length,
                voice_name,
            )
        except ValueError as error:
            raise HTTPException(400, str(error)) from error
        return media_snapshot(job)

    @app.get("/api/media/jobs/{job_id}")
    def media_state(job_id: str) -> dict[str, object]:
        try:
            return media_snapshot(media.get(job_id))
        except KeyError as error:
            raise HTTPException(404) from error

    @app.post("/api/media/jobs/{job_id}/cancel")
    def media_cancel(job_id: str) -> dict[str, object]:
        try:
            return media_snapshot(media.cancel(job_id))
        except KeyError as error:
            raise HTTPException(404) from error

    @app.delete("/api/media/jobs/{job_id}")
    def media_delete(job_id: str) -> dict[str, bool]:
        try:
            media.delete(job_id)
        except KeyError as error:
            raise HTTPException(404) from error
        except RuntimeError as error:
            raise HTTPException(409, str(error)) from error
        return {"ok": True}

    @app.get("/api/media/jobs/{job_id}/media")
    @app.get("/api/media/jobs/{job_id}/video")
    def media_source(job_id: str) -> FileResponse:
        try:
            path = media.path(job_id, "media")
        except (KeyError, FileNotFoundError) as error:
            raise HTTPException(404) from error
        return FileResponse(path, media_type=mimetypes.guess_type(path.name)[0])

    @app.get("/api/media/jobs/{job_id}/outputs/{filename}")
    def media_output(job_id: str, filename: str) -> FileResponse:
        if filename not in OUTPUT_NAMES:
            raise HTTPException(404)
        try:
            path = media.path(job_id, filename)
        except (KeyError, FileNotFoundError) as error:
            raise HTTPException(404) from error
        return FileResponse(path, filename=filename)

    @app.get("/api/media/jobs/{job_id}/subtitles/{track}")
    def media_subtitle(job_id: str, track: Literal["source", "translated"]) -> FileResponse:
        try:
            path = media.path(job_id, f"{track}.vtt")
        except (KeyError, FileNotFoundError) as error:
            raise HTTPException(404) from error
        return FileResponse(path, media_type="text/vtt; charset=utf-8")

    app.mount("/", StaticFiles(directory=static_root, html=True), name="dashboard")
    return app
