from __future__ import annotations

import json
from pathlib import Path

import pytest

from avorythm.config import ConfigStore
from avorythm.models import Settings


def test_settings_are_saved_atomically_without_api_key(tmp_path: Path) -> None:
    store = ConfigStore(tmp_path)
    settings = Settings(target_language="de", proxy_url="http://127.0.0.1:10808")

    store.save(settings)

    payload = json.loads(store.path.read_text(encoding="utf-8"))
    assert payload["target_language"] == "de"
    assert "api_key" not in payload
    assert store.load().proxy_url == "http://127.0.0.1:10808"


def test_output_channel_settings_round_trip(tmp_path: Path) -> None:
    store = ConfigStore(tmp_path)
    settings = Settings(
        original_audio_enabled=True,
        dub_audio_enabled=True,
        source_subtitles_enabled=True,
        translated_subtitles_enabled=False,
        subtitle_font_size=34,
        subtitle_width=840,
    )

    store.save(settings)

    loaded = store.load()
    assert loaded.original_audio_enabled is True
    assert loaded.dub_audio_enabled is True
    assert loaded.source_subtitles_enabled is True
    assert loaded.translated_subtitles_enabled is False
    assert loaded.subtitle_font_size == 34
    assert loaded.subtitle_width == 840


def test_legacy_subtitle_mode_migrates_to_independent_channels(tmp_path: Path) -> None:
    store = ConfigStore(tmp_path)
    store.path.parent.mkdir(parents=True, exist_ok=True)
    store.path.write_text(
        json.dumps(
            {
                "live_mode": "subtitles",
                "subtitle_show_source": True,
                "original_volume": 0,
            }
        ),
        encoding="utf-8",
    )

    loaded = store.load()

    assert loaded.original_audio_enabled is True
    assert loaded.dub_audio_enabled is False
    assert loaded.source_subtitles_enabled is True
    assert loaded.translated_subtitles_enabled is True
    assert loaded.original_volume == 1


def test_legacy_settings_are_written_once_to_the_current_path(tmp_path: Path) -> None:
    store = ConfigStore(tmp_path / "Avorythm")
    legacy = tmp_path / "Lingora" / "settings.json"
    legacy.parent.mkdir(parents=True)
    legacy.write_text(json.dumps({"target_language": "tr"}), encoding="utf-8")
    store.legacy_paths = [legacy]

    assert store.load().target_language == "tr"
    assert json.loads(store.path.read_text(encoding="utf-8"))["target_language"] == "tr"


def test_legacy_key_is_copied_to_current_keyring_service(
    monkeypatch: pytest.MonkeyPatch,
    tmp_path: Path,
) -> None:
    saved: dict[str, str] = {"Lingora Gemini API": "legacy-secret-key"}
    monkeypatch.setenv("GEMINI_API_KEY", "")
    monkeypatch.setattr(
        "avorythm.config.keyring.get_password",
        lambda service, user: saved.get(service),
    )
    monkeypatch.setattr(
        "avorythm.config.keyring.set_password",
        lambda service, user, key: saved.__setitem__(service, key),
    )

    assert ConfigStore(tmp_path).get_api_key() == "legacy-secret-key"
    assert saved["Avorythm Gemini API"] == "legacy-secret-key"


def test_api_key_is_delegated_to_os_keyring(
    monkeypatch: pytest.MonkeyPatch,
    tmp_path: Path,
) -> None:
    saved: dict[str, str] = {}
    monkeypatch.delenv("GEMINI_API_KEY", raising=False)
    monkeypatch.setattr(
        "avorythm.config.keyring.set_password",
        lambda service, user, key: saved.update(key=key),
    )
    monkeypatch.setattr(
        "avorythm.config.keyring.get_password",
        lambda service, user: saved.get("key"),
    )
    store = ConfigStore(tmp_path)

    store.set_api_key("test-secret-key")

    assert store.get_api_key() == "test-secret-key"
    assert not store.path.exists()


def test_groq_key_is_separate_from_gemini_key(
    monkeypatch: pytest.MonkeyPatch,
    tmp_path: Path,
) -> None:
    saved: dict[str, str] = {}
    monkeypatch.delenv("GEMINI_API_KEY", raising=False)
    monkeypatch.delenv("GROQ_API_KEY", raising=False)
    monkeypatch.setattr(
        "avorythm.config.keyring.set_password",
        lambda service, user, key: saved.__setitem__(service, key),
    )
    monkeypatch.setattr(
        "avorythm.config.keyring.get_password",
        lambda service, user: saved.get(service),
    )
    store = ConfigStore(tmp_path)

    store.set_api_key("gemini-secret-key", "gemini")
    store.set_api_key("groq-secret-key", "groq")

    assert store.get_api_key("gemini") == "gemini-secret-key"
    assert store.get_api_key("groq") == "groq-secret-key"
