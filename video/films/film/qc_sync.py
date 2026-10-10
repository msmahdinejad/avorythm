"""A/V sync check on the encoded master: audio onset vs picture change at the click, the drop and the logo lock.
  python -I video/films/film/qc_sync.py en"""
import json
import subprocess
import sys
from pathlib import Path

import numpy as np

L = sys.argv[1]
V = Path(__file__).resolve().parents[2]
master = V / "out" / f"film-{L}-1080.mp4"
C = json.loads((V / "build" / "film" / L / "plan.json").read_text(encoding="utf-8"))["cues"]


def audio_onset(t0, t1):
    raw = subprocess.run(["ffmpeg", "-v", "error", "-ss", f"{t0}", "-t", f"{t1 - t0}", "-i", str(master), "-vn", "-ac", "1", "-ar", "48000", "-f", "f32le", "-"], capture_output=True).stdout
    x = np.frombuffer(raw, dtype=np.float32)
    hop = 240
    e = np.sqrt(np.convolve(x ** 2, np.ones(hop) / hop, mode="same"))[::hop]
    d = np.diff(np.log(e + 1e-5))
    return t0 + (np.argmax(d) + 1) * hop / 48000


def video_change(t0, t1):
    raw = subprocess.run(["ffmpeg", "-v", "error", "-ss", f"{t0}", "-t", f"{t1 - t0}", "-i", str(master), "-vf", "scale=96:54,format=gray", "-f", "rawvideo", "-"], capture_output=True).stdout
    f = np.frombuffer(raw, dtype=np.uint8).reshape(-1, 54, 96).astype(float)
    d = np.abs(np.diff(f, axis=0)).mean((1, 2))
    return t0 + (np.argmax(d) + 1) / 60


for name, t in (("click", C["click"]), ("drop", C["drop"]), ("lock", C["lock"])):
    w0 = 0.1 if name == "drop" else 0.25          # the drop is preceded by a cut to black 0.2 s earlier
    a = audio_onset(t - w0, t + 0.25)
    v = video_change(t - w0, t + 0.25)
    print(f"{L} {name:5s} cue {t:6.2f}  audio onset {a:6.3f}  picture change {v:6.3f}  offset {1000 * (v - a):+5.0f} ms")
