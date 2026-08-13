from __future__ import annotations

import platform
import shutil
import subprocess
import sys
from pathlib import Path


def main() -> None:
    root = Path(__file__).resolve().parents[1]
    system = platform.system()
    machine = platform.machine().lower()
    architecture = "arm64" if machine in {"arm64", "aarch64"} else "x64"
    command = [
        sys.executable,
        "-m",
        "PyInstaller",
        "--noconfirm",
        "--clean",
        "--onedir",
        "--windowed",
        "--name",
        "Lingora",
        "--paths",
        "src",
        "--collect-all",
        "dubira",
    ]
    if system == "Windows":
        command.extend(
            [
                "--icon",
                "extension/icons/Lingora.ico",
                "--version-file",
                "assets/windows-version.txt",
                "--collect-all",
                "pyaudiowpatch",
                "--hidden-import",
                "keyring.backends.Windows",
            ]
        )
    command.append("scripts/launcher.py")
    subprocess.run(command, cwd=root, check=True)

    product = root / "dist" / ("Lingora.app" if system == "Darwin" else "Lingora")
    if not product.exists():
        raise SystemExit(f"PyInstaller output is missing: {product}")
    archive = root / "dist" / f"Lingora-{system}-{architecture}"
    archive.with_suffix(".zip").unlink(missing_ok=True)
    shutil.make_archive(str(archive), "zip", root_dir=product.parent, base_dir=product.name)
    print(f"Created {archive.with_suffix('.zip')}")


if __name__ == "__main__":
    main()
