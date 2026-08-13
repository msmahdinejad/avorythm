from __future__ import annotations

from dataclasses import asdict, dataclass, field
from typing import Any, Literal

from pydantic import BaseModel, Field, field_validator

from .constants import SUPPORTED_LANGUAGES


class Settings(BaseModel):
    target_language: str = "fa"
    capture_device: int | None = None
    output_device: int | None = None
    original_audio_enabled: bool = False
    dub_audio_enabled: bool = True
    source_subtitles_enabled: bool = False
    translated_subtitles_enabled: bool = False
    original_volume: float = Field(default=1.0, ge=0.0, le=1.5)
    dub_volume: float = Field(default=1.0, ge=0.0, le=1.5)
    subtitle_font_size: int = Field(default=26, ge=14, le=52)
    subtitle_width: int = Field(default=720, ge=320, le=1200)
    subtitle_opacity: int = Field(default=88, ge=45, le=98)
    proxy_url: str = ""

    @field_validator("target_language")
    @classmethod
    def validate_language(cls, value: str) -> str:
        if value not in SUPPORTED_LANGUAGES:
            raise ValueError("unsupported target language")
        return value

class ApiKeyInput(BaseModel):
    api_key: str = Field(min_length=10, max_length=256)
    provider: Literal["gemini", "groq"] = "gemini"


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
