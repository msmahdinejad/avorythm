from __future__ import annotations

from dataclasses import asdict, dataclass, field
from typing import Any

from pydantic import BaseModel, Field, field_validator

from .constants import SUPPORTED_LANGUAGES, VOICES


class Settings(BaseModel):
    target_language: str = "fa"
    capture_device: int | None = None
    output_device: int | None = None
    original_volume: float = Field(default=0.0, ge=0.0, le=1.5)
    dub_volume: float = Field(default=1.0, ge=0.0, le=1.5)
    voice: str = "Native"
    voice_style: str = Field(
        default="Natural, clear, cinematic dubbing",
        max_length=240,
    )
    proxy_url: str = ""

    @field_validator("target_language")
    @classmethod
    def validate_language(cls, value: str) -> str:
        if value not in SUPPORTED_LANGUAGES:
            raise ValueError("unsupported target language")
        return value

    @field_validator("voice")
    @classmethod
    def validate_voice(cls, value: str) -> str:
        if value not in VOICES:
            raise ValueError("unsupported voice")
        return value


class ApiKeyInput(BaseModel):
    api_key: str = Field(min_length=10, max_length=256)


@dataclass(slots=True)
class RuntimeState:
    running: bool = False
    status: str = "idle"
    error: str = ""
    source_text: str = ""
    translated_text: str = ""
    source_lang: str = ""
    translated_lang: str = ""
    source_history: list[dict[str, Any]] = field(default_factory=list)
    translated_history: list[dict[str, Any]] = field(default_factory=list)
    latest_recording: str = ""

    def to_dict(self) -> dict[str, Any]:
        return asdict(self)
