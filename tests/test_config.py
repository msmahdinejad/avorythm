from __future__ import annotations

import json
from pathlib import Path

import pytest

from voxilyra.config import ConfigStore
from voxilyra.models import Settings


def test_settings_are_saved_atomically_without_api_key(tmp_path: Path) -> None:
    store = ConfigStore(tmp_path)
    settings = Settings(target_language="de", proxy_url="http://127.0.0.1:10808")

    store.save(settings)

    payload = json.loads(store.path.read_text(encoding="utf-8"))
    assert payload["target_language"] == "de"
    assert "api_key" not in payload
    assert store.load().proxy_url == "http://127.0.0.1:10808"


def test_api_key_is_delegated_to_os_keyring(
    monkeypatch: pytest.MonkeyPatch,
    tmp_path: Path,
) -> None:
    saved: dict[str, str] = {}
    monkeypatch.delenv("GEMINI_API_KEY", raising=False)
    monkeypatch.setattr(
        "voxilyra.config.keyring.set_password",
        lambda service, user, key: saved.update(key=key),
    )
    monkeypatch.setattr(
        "voxilyra.config.keyring.get_password",
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
        "voxilyra.config.keyring.set_password",
        lambda service, user, key: saved.__setitem__(service, key),
    )
    monkeypatch.setattr(
        "voxilyra.config.keyring.get_password",
        lambda service, user: saved.get(service),
    )
    store = ConfigStore(tmp_path)

    store.set_api_key("gemini-secret-key", "gemini")
    store.set_api_key("groq-secret-key", "groq")

    assert store.get_api_key("gemini") == "gemini-secret-key"
    assert store.get_api_key("groq") == "groq-secret-key"
