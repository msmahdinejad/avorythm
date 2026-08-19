from __future__ import annotations

import importlib.util
import platform
import shutil
import subprocess
import sys
from pathlib import Path


def _real_media_binary(name: str) -> Path:
    discovered = shutil.which(name)
    if not discovered:
        raise SystemExit(f"{name} is required to build the self-contained Windows package")
    candidate = Path(discovered).resolve()
    if candidate.stat().st_size >= 1_000_000:
        return candidate

    chocolatey = Path("C:/ProgramData/chocolatey/lib")
    matches = list(chocolatey.glob(f"ffmpeg*/tools/**/{name}")) if chocolatey.is_dir() else []
    binaries = [path.resolve() for path in matches if path.stat().st_size >= 1_000_000]
    if not binaries:
        raise SystemExit(f"{name} resolved to a package-manager shim, not the real executable")
    return max(binaries, key=lambda path: path.stat().st_size)


def main() -> None:
    root = Path(__file__).resolve().parents[1]
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
        "--add-data",
        f"THIRD_PARTY_NOTICES.md{data_separator}.",
        "--add-data",
        f"licenses/OFL-Vazirmatn.txt{data_separator}LICENSES",
    ]
    if system == "Windows":
        ffmpeg = _real_media_binary("ffmpeg.exe")
        ffprobe = _real_media_binary("ffprobe.exe")
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
                "--add-binary",
                f"{ffprobe};.",
                "--add-data",
                "licenses/FFmpeg-GPL-3.0.txt;LICENSES",
            ]
        )
    command.append("scripts/launcher.py")
    subprocess.run(command, cwd=root, check=True)

    product = root / "dist" / ("Avorythm.app" if system == "Darwin" else "Avorythm")
    if not product.exists():
        raise SystemExit(f"PyInstaller output is missing: {product}")
    archive = root / "dist" / f"Avorythm-{system}-{architecture}"
    archive.with_suffix(".zip").unlink(missing_ok=True)
    shutil.make_archive(str(archive), "zip", root_dir=product.parent, base_dir=product.name)
    print(f"Created {archive.with_suffix('.zip')}")


if __name__ == "__main__":
    main()
