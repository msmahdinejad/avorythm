from __future__ import annotations

import json
import os
import tempfile
from pathlib import Path
from typing import Any

import keyring
from dotenv import load_dotenv

from .models import Settings

APP_NAME = "LingoDub"
KEYRING_SERVICE = "LingoDub Gemini API"
KEYRING_USER = "default"


class ConfigStore:
    """Owns persistent settings and secrets behind one small interface."""

    def __init__(self, directory: Path | None = None) -> None:
        base = directory or Path(os.getenv("APPDATA", Path.home())) / APP_NAME
        self.directory = base
        self.path = base / "settings.json"
        load_dotenv()
        self._inherited_proxy = {
            name: os.environ.get(name) for name in ("HTTP_PROXY", "HTTPS_PROXY")
        }

    def load(self) -> Settings:
        data: dict[str, Any] = {}
        if self.path.is_file():
            try:
                data = json.loads(self.path.read_text(encoding="utf-8"))
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

    def get_api_key(self) -> str:
        if key := os.getenv("GEMINI_API_KEY", "").strip():
            return key
        try:
            return (keyring.get_password(KEYRING_SERVICE, KEYRING_USER) or "").strip()
        except keyring.errors.KeyringError:
            return ""

    def set_api_key(self, key: str) -> None:
        clean = key.strip()
        if len(clean) < 10 or "\n" in clean or "\r" in clean:
            raise ValueError("invalid API key")
        keyring.set_password(KEYRING_SERVICE, KEYRING_USER, clean)
        os.environ["GEMINI_API_KEY"] = clean

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
