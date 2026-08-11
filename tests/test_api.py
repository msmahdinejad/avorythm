from __future__ import annotations

from pathlib import Path

import pytest
from fastapi.testclient import TestClient

from lingodub.api import create_app
from lingodub.audio import AudioDevice, DeviceCatalog
from lingodub.config import ConfigStore
from lingodub.models import Settings


def catalog() -> DeviceCatalog:
    return DeviceCatalog(
        captures=(AudioDevice(4, "Virtual Cable Loopback"),),
        outputs=(AudioDevice(7, "Headphones"),),
        default_capture=4,
        default_output=7,
    )


def client(monkeypatch: pytest.MonkeyPatch, tmp_path: Path) -> TestClient:
    store = ConfigStore(tmp_path / "config")
    store.save(Settings(capture_device=4, output_device=7))
    monkeypatch.setattr("lingodub.api.DeviceCatalog.scan", catalog)
    static = tmp_path / "static"
    static.mkdir()
    (static / "index.html").write_text("LingoDub", encoding="utf-8")
    return TestClient(create_app(store, tmp_path / "recordings", static))


def test_health_and_bootstrap(
    monkeypatch: pytest.MonkeyPatch,
    tmp_path: Path,
) -> None:
    monkeypatch.delenv("GEMINI_API_KEY", raising=False)
    monkeypatch.setattr("lingodub.config.load_dotenv", lambda: False)
    monkeypatch.setattr("lingodub.config.keyring.get_password", lambda service, user: None)

    with client(monkeypatch, tmp_path) as app:
        assert app.get("/api/health").json()["status"] == "ok"
        response = app.get("/api/bootstrap")

    assert response.status_code == 200
    assert response.json()["devices"]["default_output"] == 7
    assert response.json()["api_key_set"] is False


def test_settings_endpoint_validates_and_persists(
    monkeypatch: pytest.MonkeyPatch,
    tmp_path: Path,
) -> None:
    with client(monkeypatch, tmp_path) as app:
        payload = Settings(
            target_language="fa",
            capture_device=4,
            output_device=7,
            original_volume=0,
            dub_volume=1,
        ).model_dump()
        response = app.post("/api/settings", json=payload)

    assert response.status_code == 200
    assert response.json()["settings"]["original_volume"] == 0


def test_recording_download_rejects_unknown_files(
    monkeypatch: pytest.MonkeyPatch,
    tmp_path: Path,
) -> None:
    with client(monkeypatch, tmp_path) as app:
        response = app.get("/api/recordings/session/secrets.txt")

    assert response.status_code == 404


def test_unsupported_automatic_audio_routing_is_not_exposed(
    monkeypatch: pytest.MonkeyPatch,
    tmp_path: Path,
) -> None:
    with client(monkeypatch, tmp_path) as app:
        response = app.post("/api/audio/auto-setup")

    assert response.status_code == 405


def test_media_upload_rejects_unknown_format(
    monkeypatch: pytest.MonkeyPatch,
    tmp_path: Path,
) -> None:
    with client(monkeypatch, tmp_path) as app:
        response = app.post(
            "/api/media/jobs?filename=lesson.exe&target_language=fa&mode=precise",
            content=b"not a video",
            headers={"content-type": "application/octet-stream"},
        )

    assert response.status_code == 400
    assert response.json()["detail"] == "unsupported video format"


def test_media_job_paths_reject_traversal(
    monkeypatch: pytest.MonkeyPatch,
    tmp_path: Path,
) -> None:
    with client(monkeypatch, tmp_path) as app:
        response = app.get("/api/media/jobs/not-a-job/video")

    assert response.status_code == 404
