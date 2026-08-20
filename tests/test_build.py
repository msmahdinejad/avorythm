from pathlib import Path
from runpy import run_path

_build = run_path(Path(__file__).parents[1] / "scripts" / "build.py")
_real_media_binary = _build["_real_media_binary"]


def test_configured_ffmpeg_binary_wins_over_path(
    tmp_path: Path,
    monkeypatch,
) -> None:
    configured = tmp_path / "ffmpeg.exe"
    configured.write_bytes(b"\0" * 1_000_000)
    monkeypatch.setenv("AVORYTHM_FFMPEG_BINARY", str(configured))
    monkeypatch.setattr(_real_media_binary.__globals__["shutil"], "which", lambda _: None)

    assert _real_media_binary("ffmpeg.exe") == configured.resolve()
