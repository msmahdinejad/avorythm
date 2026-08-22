import plistlib
from pathlib import Path
from runpy import run_path

from avorythm import __version__

_build = run_path(Path(__file__).parents[1] / "scripts" / "build.py")
_real_media_binary = _build["_real_media_binary"]
_project_version = _build["_project_version"]
_write_macos_bundle_metadata = _build["_write_macos_bundle_metadata"]
MACOS_BUNDLE_IDENTIFIER = _build["MACOS_BUNDLE_IDENTIFIER"]
MACOS_MICROPHONE_USAGE = _build["MACOS_MICROPHONE_USAGE"]


def test_configured_ffmpeg_binary_wins_over_path(
    tmp_path: Path,
    monkeypatch,
) -> None:
    configured = tmp_path / "ffmpeg.exe"
    configured.write_bytes(b"\0" * 1_000_000)
    monkeypatch.setenv("AVORYTHM_FFMPEG_BINARY", str(configured))
    monkeypatch.setattr(_real_media_binary.__globals__["shutil"], "which", lambda _: None)

    assert _real_media_binary("ffmpeg.exe") == configured.resolve()


def test_build_reads_the_canonical_project_version() -> None:
    root = Path(__file__).parents[1]

    assert _project_version(root) == __version__


def test_macos_bundle_metadata_uses_release_version_and_audio_consent(tmp_path: Path) -> None:
    app = tmp_path / "Avorythm.app"
    plist_path = app / "Contents" / "Info.plist"
    plist_path.parent.mkdir(parents=True)
    with plist_path.open("wb") as destination:
        plistlib.dump(
            {
                "CFBundleDisplayName": "Avorythm",
                "CFBundleIdentifier": "Avorythm",
                "CFBundleShortVersionString": "0.0.0",
            },
            destination,
        )

    assert _write_macos_bundle_metadata(app, __version__) == plist_path

    with plist_path.open("rb") as source:
        metadata = plistlib.load(source)
    assert metadata["CFBundleIdentifier"] == MACOS_BUNDLE_IDENTIFIER
    assert metadata["CFBundleShortVersionString"] == __version__
    assert metadata["CFBundleVersion"] == __version__
    assert metadata["NSMicrophoneUsageDescription"] == MACOS_MICROPHONE_USAGE
