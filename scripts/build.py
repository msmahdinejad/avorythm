from __future__ import annotations

import importlib.util
import os
import platform
import shutil
import subprocess
import sys
from pathlib import Path


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
