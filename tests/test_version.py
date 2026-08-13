from __future__ import annotations

import json
import tomllib
from pathlib import Path

from dubira import __version__


def test_release_versions_stay_aligned() -> None:
    root = Path(__file__).resolve().parents[1]
    package = tomllib.loads((root / "pyproject.toml").read_text(encoding="utf-8"))
    manifest = json.loads((root / "extension" / "manifest.json").read_text(encoding="utf-8"))
    installer = (root / "installer.iss").read_text(encoding="utf-8")
    windows_metadata = (root / "assets" / "windows-version.txt").read_text(encoding="utf-8")

    assert package["project"]["version"] == __version__
    assert manifest["version"] == __version__
    assert f'#define MyAppVersion "{__version__}"' in installer
    assert '#define MyAppProductName "Lingora Live Translator"' in installer
    assert "VersionInfoProductName={#MyAppProductName}" in installer
    assert 'StringStruct("ProductName", "Lingora Live Translator")' in windows_metadata
    assert f'StringStruct("FileVersion", "{__version__}")' in windows_metadata
    assert f'StringStruct("ProductVersion", "{__version__}")' in windows_metadata
