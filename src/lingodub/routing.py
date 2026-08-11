from __future__ import annotations

import os
import platform
from dataclasses import dataclass

from .audio import DeviceCatalog


@dataclass(frozen=True, slots=True)
class AudioSetupResult:
    capture_device: int
    output_device: int
    virtual_device_found: bool
    requires_windows_step: bool

    def to_dict(self) -> dict[str, int | bool]:
        return {
            "capture_device": self.capture_device,
            "output_device": self.output_device,
            "virtual_device_found": self.virtual_device_found,
            "requires_windows_step": self.requires_windows_step,
        }


def detect_audio_setup(catalog: DeviceCatalog) -> AudioSetupResult:
    capture, output, found = catalog.auto_setup()
    return AudioSetupResult(capture, output, found, found)


def open_windows_volume_mixer() -> None:
    if platform.system() != "Windows":
        raise RuntimeError("automatic desktop audio setup is currently Windows-only")
    os.startfile("ms-settings:apps-volume")  # type: ignore[attr-defined]
