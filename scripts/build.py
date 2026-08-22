from __future__ import annotations

import importlib.util
import os
import platform
import plistlib
import shutil
import subprocess
import sys
import tomllib
from pathlib import Path

MACOS_BUNDLE_IDENTIFIER = "io.github.msmahdinejad.avorythm"
MACOS_MICROPHONE_USAGE = (
    "Avorythm uses audio-input access only after you start live translation "
    "from a selected input or loopback device."
)


def _project_version(root: Path) -> str:
    with (root / "pyproject.toml").open("rb") as source:
        return str(tomllib.load(source)["project"]["version"])


def _macos_icon(root: Path) -> Path:
    """Build a native icon from the canonical artwork using macOS system tools."""
    source = root / "assets" / "branding" / "avorythm-logo.png"
    iconset = root / "build" / "Avorythm.iconset"
    destination = root / "build" / "Avorythm.icns"
    shutil.rmtree(iconset, ignore_errors=True)
    iconset.mkdir(parents=True, exist_ok=True)
    destination.unlink(missing_ok=True)
    icon_sizes = (
        (16, 16),
        (16, 32),
        (32, 32),
        (32, 64),
        (128, 128),
        (128, 256),
        (256, 256),
        (256, 512),
        (512, 512),
        (512, 1024),
    )
    for points, pixels in icon_sizes:
        suffix = "@2x" if pixels == points * 2 else ""
        output = iconset / f"icon_{points}x{points}{suffix}.png"
        subprocess.run(
            ["sips", "-z", str(pixels), str(pixels), str(source), "--out", str(output)],
            check=True,
            stdout=subprocess.DEVNULL,
        )
    subprocess.run(
        ["iconutil", "-c", "icns", str(iconset), "-o", str(destination)],
        check=True,
    )
    if not destination.is_file():
        raise SystemExit("macOS icon generation did not produce Avorythm.icns")
    return destination


def _write_macos_bundle_metadata(product: Path, version: str) -> Path:
    plist_path = product / "Contents" / "Info.plist"
    if not plist_path.is_file():
        raise SystemExit(f"macOS bundle metadata is missing: {plist_path}")
    with plist_path.open("rb") as source:
        metadata = plistlib.load(source)
    metadata.update(
        {
            "CFBundleDisplayName": "Avorythm",
            "CFBundleIdentifier": MACOS_BUNDLE_IDENTIFIER,
            "CFBundleShortVersionString": version,
            "CFBundleVersion": version,
            "NSMicrophoneUsageDescription": MACOS_MICROPHONE_USAGE,
        }
    )
    with plist_path.open("wb") as destination:
        plistlib.dump(metadata, destination, sort_keys=True)
    return plist_path


def _finalize_macos_bundle(product: Path, version: str) -> None:
    """Apply release metadata, then restore PyInstaller's local ad-hoc signature."""
    _write_macos_bundle_metadata(product, version)
    subprocess.run(
        [
            "codesign",
            "--force",
            "--deep",
            "--sign",
            "-",
            "--identifier",
            MACOS_BUNDLE_IDENTIFIER,
            str(product),
        ],
        check=True,
    )


def _real_media_binary(name: str) -> Path:
    candidates: list[Path] = []
    if configured := os.getenv("AVORYTHM_FFMPEG_BINARY", "").strip():
        candidates.append(Path(configured).resolve())
    if discovered := shutil.which(name):
        candidates.append(Path(discovered).resolve())
    chocolatey = Path("C:/ProgramData/chocolatey/lib")
    if chocolatey.is_dir():
        candidates.extend(path.resolve() for path in chocolatey.glob(f"ffmpeg*/tools/**/{name}"))
    winget = Path(os.getenv("LOCALAPPDATA", "")) / "Microsoft" / "WinGet" / "Packages"
    if winget.is_dir():
        candidates.extend(path.resolve() for path in winget.glob(f"Gyan.FFmpeg*/**/bin/{name}"))
    binaries = [
        path
        for path in set(candidates)
        if path.is_file() and path.stat().st_size >= 1_000_000
    ]
    if not binaries:
        raise SystemExit(f"{name} is required to build the self-contained Windows package")
    if configured:
        configured_path = Path(configured).resolve()
        if configured_path not in binaries:
            raise SystemExit("AVORYTHM_FFMPEG_BINARY must point to a real FFmpeg executable")
        return configured_path
    return min(binaries, key=lambda path: path.stat().st_size)


def main() -> None:
    root = Path(__file__).resolve().parents[1]
    version = _project_version(root)
    system = platform.system()
    machine = platform.machine().lower()
    architecture = "arm64" if machine in {"arm64", "aarch64"} else "x64"
    data_separator = ";" if system == "Windows" else ":"
    if importlib.util.find_spec("webview") is None:
        raise SystemExit("pywebview is required to build the standalone desktop app")
    command = [
        sys.executable,
        "-m",
        "PyInstaller",
        "--noconfirm",
        "--clean",
        "--onedir",
        "--windowed",
        "--name",
        "Avorythm",
        "--paths",
        "src",
        "--collect-all",
        "avorythm",
        "--hidden-import",
        "webview",
        "--exclude-module",
        "mypy",
        "--exclude-module",
        "pytest",
        "--exclude-module",
        "ruff",
        "--exclude-module",
        "IPython",
        "--exclude-module",
        "matplotlib",
        "--exclude-module",
        "tkinter",
        "--exclude-module",
        "jedi",
        "--exclude-module",
        "pygments",
        "--exclude-module",
        "Cython",
        "--exclude-module",
        "zmq",
        "--exclude-module",
        "black",
        "--exclude-module",
        "nbformat",
        "--exclude-module",
        "jsonschema",
        "--add-data",
        f"THIRD_PARTY_NOTICES.md{data_separator}.",
        "--add-data",
        f"licenses/OFL-Vazirmatn.txt{data_separator}LICENSES",
    ]
    if system == "Windows":
        ffmpeg = _real_media_binary("ffmpeg.exe")
        command.extend(
            [
                "--icon",
                "extension/icons/Avorythm.ico",
                "--version-file",
                "assets/windows-version.txt",
                "--collect-all",
                "pyaudiowpatch",
                "--hidden-import",
                "keyring.backends.Windows",
                "--add-binary",
                f"{ffmpeg};.",
                "--add-data",
                "licenses/FFmpeg-GPL-3.0.txt;LICENSES",
            ]
        )
    elif system == "Darwin":
        command.extend(
            [
                "--icon",
                str(_macos_icon(root)),
                "--osx-bundle-identifier",
                MACOS_BUNDLE_IDENTIFIER,
            ]
        )
    command.append("scripts/launcher.py")
    subprocess.run(command, cwd=root, check=True)

    product = root / "dist" / ("Avorythm.app" if system == "Darwin" else "Avorythm")
    if not product.exists():
        raise SystemExit(f"PyInstaller output is missing: {product}")
    if system == "Darwin":
        _finalize_macos_bundle(product, version)
    archive = root / "dist" / f"Avorythm-{system}-{architecture}"
    archive.with_suffix(".zip").unlink(missing_ok=True)
    shutil.make_archive(str(archive), "zip", root_dir=product.parent, base_dir=product.name)
    print(f"Created {archive.with_suffix('.zip')}")


if __name__ == "__main__":
    main()
