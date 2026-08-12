from __future__ import annotations

import os
import platform


def open_windows_volume_mixer() -> None:
    if platform.system() != "Windows":
        raise RuntimeError("desktop audio setup is currently Windows-only")
    os.startfile("ms-settings:apps-volume")  # type: ignore[attr-defined]
