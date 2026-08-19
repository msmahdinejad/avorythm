from __future__ import annotations

import json
import os
import tempfile
from contextlib import suppress
from pathlib import Path
from typing import Any, Literal

import keyring
from dotenv import load_dotenv

from .models import Settings

APP_NAME = "Avorythm"
LEGACY_APP_NAMES = ("Lingora", "Dubira", "Voxilyra", "LingoDub")
KEYRING_SERVICES = {
    "gemini": "Avorythm Gemini API",
    "groq": "Avorythm Groq API",
}
LEGACY_KEYRING_SERVICES = {
    "gemini": (
        "Lingora Gemini API",
        "Dubira Gemini API",
        "Voxilyra Gemini API",
        "LingoDub Gemini API",
    ),
    "groq": (
        "Lingora Groq API",
        "Dubira Groq API",
        "Voxilyra Groq API",
        "LingoDub Groq API",
    ),
}
KEYRING_USER = "default"
ApiProvider = Literal["gemini", "groq"]


class ConfigStore:
    """Owns persistent settings and secrets behind one small interface."""

    def __init__(self, directory: Path | None = None) -> None:
        appdata = Path(os.getenv("APPDATA", Path.home()))
        base = directory or appdata / APP_NAME
        self.directory = base
        self.path = base / "settings.json"
        self.legacy_paths = (
            [appdata / name / "settings.json" for name in LEGACY_APP_NAMES]
            if directory is None
            else []
        )
        load_dotenv()
        self._inherited_proxy = {
            name: os.environ.get(name) for name in ("HTTP_PROXY", "HTTPS_PROXY")
        }

    def load(self) -> Settings:
        data: dict[str, Any] = {}
        settings_path = self.path
        if not settings_path.is_file():
            settings_path = next(
                (path for path in self.legacy_paths if path.is_file()),
                settings_path,
            )
        if settings_path.is_file():
            try:
                data = json.loads(settings_path.read_text(encoding="utf-8"))
            except (OSError, json.JSONDecodeError):
                data = {}
        if "live_mode" in data and "original_audio_enabled" not in data:
            mode = data.pop("live_mode")
            if mode == "subtitles":
                # The legacy subtitle preset always monitored original audio at full volume.
                data["original_volume"] = 1.0
            data["original_audio_enabled"] = mode == "subtitles" or (
                mode == "dub" and float(data.get("original_volume", 0)) > 0
            )
            data["dub_audio_enabled"] = mode != "subtitles"
            data["source_subtitles_enabled"] = mode == "subtitles" and bool(
                data.pop("subtitle_show_source", False)
            )
            data["translated_subtitles_enabled"] = mode == "subtitles"
        if proxy := os.getenv("PROXY_URL"):
            data.setdefault("proxy_url", proxy)
        settings = Settings.model_validate(data)
        if settings_path != self.path and settings_path.is_file():
            with suppress(OSError):
                self.save(settings)
        return settings

    def save(self, settings: Settings) -> None:
        self.directory.mkdir(parents=True, exist_ok=True)
        payload = json.dumps(settings.model_dump(), ensure_ascii=False, indent=2) + "\n"
        fd, temporary = tempfile.mkstemp(dir=self.directory, suffix=".tmp", text=True)
        try:
            with os.fdopen(fd, "w", encoding="utf-8") as stream:
                stream.write(payload)
            os.replace(temporary, self.path)
        finally:
            Path(temporary).unlink(missing_ok=True)

    def get_api_key(self, provider: ApiProvider = "gemini") -> str:
        environment = "GEMINI_API_KEY" if provider == "gemini" else "GROQ_API_KEY"
        if key := os.getenv(environment, "").strip():
            return key
        try:
            key = (keyring.get_password(KEYRING_SERVICES[provider], KEYRING_USER) or "").strip()
            for service in LEGACY_KEYRING_SERVICES[provider]:
                if key:
                    break
                key = (keyring.get_password(service, KEYRING_USER) or "").strip()
                if key:
                    with suppress(keyring.errors.KeyringError):
                        keyring.set_password(KEYRING_SERVICES[provider], KEYRING_USER, key)
            return key
        except keyring.errors.KeyringError:
            return ""

    def set_api_key(self, key: str, provider: ApiProvider = "gemini") -> None:
        clean = key.strip()
        if len(clean) < 10 or "\n" in clean or "\r" in clean:
            raise ValueError("invalid API key")
        keyring.set_password(KEYRING_SERVICES[provider], KEYRING_USER, clean)
        environment = "GEMINI_API_KEY" if provider == "gemini" else "GROQ_API_KEY"
        os.environ[environment] = clean

    def apply_proxy(self, settings: Settings) -> None:
        if settings.proxy_url:
            os.environ["HTTP_PROXY"] = settings.proxy_url
            os.environ["HTTPS_PROXY"] = settings.proxy_url
        else:
            for name, inherited in self._inherited_proxy.items():
                if inherited is None:
                    os.environ.pop(name, None)
                else:
                    os.environ[name] = inherited
