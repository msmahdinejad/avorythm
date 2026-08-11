from __future__ import annotations

from collections.abc import AsyncIterator
from contextlib import asynccontextmanager
from pathlib import Path

from fastapi import FastAPI, HTTPException
from fastapi.responses import FileResponse
from fastapi.staticfiles import StaticFiles

from .audio import DeviceCatalog
from .config import ConfigStore
from .constants import RTL_LANGUAGES, SUPPORTED_LANGUAGES, VOICES
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
) -> FastAPI:
    config = store or ConfigStore()
    recording_root = recordings or config.directory / "recordings"
    static_root = static or Path(__file__).parent / "static"
    runtime = DubRuntime(config, recording_root)

    @asynccontextmanager
    async def lifespan(application: FastAPI) -> AsyncIterator[None]:
        yield
        await runtime.stop()

    app = FastAPI(
        title="LingoDub Companion",
        version="0.3.1",
        docs_url=None,
        redoc_url=None,
        lifespan=lifespan,
    )
    app.state.runtime = runtime

    @app.get("/api/health")
    def health() -> dict[str, str]:
        return {"status": "ok"}

    @app.get("/api/bootstrap")
    def bootstrap() -> dict[str, object]:
        return {
            "devices": DeviceCatalog.scan().to_dict(),
            "languages": sorted(SUPPORTED_LANGUAGES),
            "voices": VOICES,
            "settings": runtime.settings.model_dump(),
            "api_key_set": bool(config.get_api_key()),
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
            config.set_api_key(body.api_key)
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
        try:
            await runtime.start()
        except ValueError as error:
            raise HTTPException(400, str(error)) from error
        return {"ok": True}

    @app.post("/api/stop")
    async def stop() -> dict[str, bool]:
        await runtime.stop()
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

    app.mount("/", StaticFiles(directory=static_root, html=True), name="dashboard")
    return app
