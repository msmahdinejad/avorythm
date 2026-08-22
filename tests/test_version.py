from __future__ import annotations

import json
import re
import tomllib
from pathlib import Path

from avorythm import __version__


def test_release_versions_stay_aligned() -> None:
    root = Path(__file__).resolve().parents[1]
    package = tomllib.loads((root / "pyproject.toml").read_text(encoding="utf-8"))
    manifest = json.loads((root / "extension" / "manifest.json").read_text(encoding="utf-8"))
    installer = (root / "installer.iss").read_text(encoding="utf-8")
    windows_metadata = (root / "assets" / "windows-version.txt").read_text(encoding="utf-8")
    version_tuple = (*map(int, __version__.split(".")), 0)
    tuple_text = ", ".join(map(str, version_tuple))

    assert package["project"]["version"] == __version__
    assert manifest["version"] == __version__
    assert f'#define MyAppVersion "{__version__}"' in installer
    assert '#define MyAppProductName "Avorythm Live Translator"' in installer
    assert "VersionInfoProductName={#MyAppProductName}" in installer
    assert 'StringStruct("ProductName", "Avorythm Live Translator")' in windows_metadata
    assert f'StringStruct("FileVersion", "{__version__}")' in windows_metadata
    assert f'StringStruct("ProductVersion", "{__version__}")' in windows_metadata
    assert re.search(rf"filevers=\({re.escape(tuple_text)}\)", windows_metadata)
    assert re.search(rf"prodvers=\({re.escape(tuple_text)}\)", windows_metadata)


def test_public_asset_cache_versions_follow_the_package_version() -> None:
    root = Path(__file__).resolve().parents[1]
    surfaces = (
        root / "src" / "avorythm" / "static" / "index.html",
        root / "src" / "avorythm" / "static" / "help.html",
        root / "src" / "avorythm" / "static" / "subtitle-window.html",
        root / "tests" / "browser" / "recording-export-harness.html",
        root / "tests" / "browser" / "recording-export-harness.mjs",
        root / "tests" / "browser" / "media-source-harness.html",
    )

    for path in surfaces:
        versions = re.findall(r"\?v=(\d+\.\d+\.\d+)", path.read_text(encoding="utf-8"))
        assert versions, f"expected a cache version in {path.relative_to(root)}"
        assert set(versions) == {__version__}, f"stale cache version in {path.relative_to(root)}"


def test_changelog_and_extension_package_follow_release_contract() -> None:
    root = Path(__file__).resolve().parents[1]
    changelog = (root / "CHANGELOG.md").read_text(encoding="utf-8")
    package_script = (root / "scripts" / "package-extension.ps1").read_text(
        encoding="utf-8"
    )

    assert f"## [{__version__}]" in changelog
    assert f"compare/v{__version__}...HEAD" in changelog
    assert '(Join-Path $repository "LICENSE")' in package_script
    assert '"LICENSE"' in package_script
