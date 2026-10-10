"""Final picture + delivery for many versions: video (fresh, 8 workers, GPU canvas) -> mux -> QC (format, loudness,
frame sheet from the encoded master) -> Whisper on the master. One language after the other.
  python video/films/film/render_all.py en,fa,...        (run WITHOUT -I)"""
import subprocess
import sys
import time
from pathlib import Path

HERE = Path(__file__).resolve().parent
ROOT = HERE.parents[2]
py = sys.executable
langs = sys.argv[1].split(",")
fresh = "--keep" not in sys.argv


def run(cmd, log):
    t = time.time()
    with open(log, "a", encoding="utf-8") as f:
        r = subprocess.run([str(c) for c in cmd], cwd=ROOT, stdout=f, stderr=subprocess.STDOUT)
    return r.returncode, time.time() - t


for L in langs:
    log = ROOT / "video" / "build" / "film" / L / "render_all.log"
    log.write_text("", encoding="utf-8")
    steps = [["node", HERE / "render.mjs", "--lang", L, "--video", "--workers", "8", "--gpu"] + (["--fresh"] if fresh else []),
             ["node", HERE / "render.mjs", "--lang", L, "--mux"],
             [py, "-I", HERE / "qc_video.py", "--lang", L],
             [py, HERE / "audio" / "qc_whisper.py", L, ROOT / "video" / "out" / f"film-{L}-1080.mp4"]]
    for cmd in steps:
        code, dt = run(cmd, log)
        name = Path(str(cmd[1])).name if len(cmd) > 1 else cmd[0]
        print(f"{L} {name} {'ok' if code == 0 else 'FAILED'} {dt:.0f}s", flush=True)
        if code:
            break
