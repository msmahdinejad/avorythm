"""Build one or more language versions of the brand film end to end.

  python video/films/film/make.py --lang en,fa [--from prep|score|mix|video|mux|qc] [--only video]

Steps: ui (real product UI capture) -> prep (voice edit + whisper word timing) -> score -> mix -> video (frames, <= 8
Chrome workers, GPU canvas) -> mux (master, web, poster) -> qc (format, loudness, whisper on the master, frame sheet).
Run without -I (faster-whisper lives in the user site-packages); the audio steps themselves run with -I.
Voices are generated separately with voices.py (Gemini Live, needs the network).
"""
import argparse
import subprocess
import sys
import time
from pathlib import Path

HERE = Path(__file__).resolve().parent
VIDEO = HERE.parents[1]
ROOT = VIDEO.parent
STEPS = ["ui", "prep", "score", "mix", "video", "mux", "qc"]


def run(cmd):
    print("  $", " ".join(str(c) for c in cmd), flush=True)
    t = time.time()
    r = subprocess.run([str(c) for c in cmd], cwd=ROOT)
    if r.returncode:
        raise SystemExit(f"step failed ({r.returncode}): {' '.join(str(c) for c in cmd)}")
    print(f"    done in {time.time() - t:.0f} s", flush=True)


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("--lang", required=True)
    ap.add_argument("--from", dest="start", default="ui", choices=STEPS)
    ap.add_argument("--only", default="")
    ap.add_argument("--workers", default="8")
    a = ap.parse_args()
    steps = a.only.split(",") if a.only else STEPS[STEPS.index(a.start):]
    py = sys.executable
    for L in a.lang.split(","):
        print(f"=== film/{L}: {', '.join(steps)}", flush=True)
        for s in steps:
            if s == "ui":
                run(["node", HERE / "capture_ui.mjs", "--lang", L])
            elif s == "prep":
                run([py, HERE / "prep.py", "--lang", L])
            elif s == "score":
                run([py, "-I", HERE / "audio" / "score.py", "--lang", L])
            elif s == "mix":
                run([py, "-I", HERE / "audio" / "mix.py", "--lang", L])
            elif s == "video":
                run(["node", HERE / "render.mjs", "--lang", L, "--video", "--workers", a.workers, "--gpu"])
            elif s == "mux":
                run(["node", HERE / "render.mjs", "--lang", L, "--mux"])
            elif s == "qc":
                run([py, "-I", HERE / "qc_video.py", "--lang", L])
                run([py, HERE / "audio" / "qc_whisper.py", L, VIDEO / "out" / f"film-{L}-1080.mp4"])


if __name__ == "__main__":
    main()
