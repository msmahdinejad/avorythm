from __future__ import annotations

import json
import os
import tempfile
from pathlib import Path
from typing import Any, Literal

import keyring
from dotenv import load_dotenv

from .models import Settings

APP_NAME = "Voxilyra"
LEGACY_APP_NAME = "LingoDub"
KEYRING_SERVICES = {
    "gemini": "Voxilyra Gemini API",
    "groq": "Voxilyra Groq API",
}
LEGACY_GEMINI_SERVICE = "LingoDub Gemini API"
KEYRING_USER = "default"
ApiProvider = Literal["gemini", "groq"]


class ConfigStore:
    """Owns persistent settings and secrets behind one small interface."""

    def __init__(self, directory: Path | None = None) -> None:
        appdata = Path(os.getenv("APPDATA", Path.home()))
        base = directory or appdata / APP_NAME
        self.directory = base
        self.path = base / "settings.json"
        self.legacy_path = (
            appdata / LEGACY_APP_NAME / "settings.json" if directory is None else None
        )
        load_dotenv()
        self._inherited_proxy = {
            name: os.environ.get(name) for name in ("HTTP_PROXY", "HTTPS_PROXY")
        }

    def load(self) -> Settings:
        data: dict[str, Any] = {}
        settings_path = self.path
        if not settings_path.is_file() and self.legacy_path and self.legacy_path.is_file():
            settings_path = self.legacy_path
        if settings_path.is_file():
            try:
                data = json.loads(settings_path.read_text(encoding="utf-8"))
            except (OSError, json.JSONDecodeError):
                data = {}
        if proxy := os.getenv("PROXY_URL"):
            data.setdefault("proxy_url", proxy)
        return Settings.model_validate(data)

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
            if not key and provider == "gemini":
                key = (keyring.get_password(LEGACY_GEMINI_SERVICE, KEYRING_USER) or "").strip()
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
