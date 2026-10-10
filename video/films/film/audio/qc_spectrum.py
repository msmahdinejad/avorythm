"""Octave-band long-term spectrum of a section of the mix (balance sanity check, since the score is synthesized)."""
import json, sys, wave
from pathlib import Path
import numpy as np
BUILD = Path(__file__).resolve().parents[3] / "build" / "film"
lang = sys.argv[1]
with wave.open(str(BUILD / lang / (sys.argv[2] if len(sys.argv) > 2 else "mix.wav"))) as w:  # path relative to build/film/<lang>
    sr = w.getframerate(); x = np.frombuffer(w.readframes(w.getnframes()), dtype=np.int16).astype(np.float64).reshape(-1, w.getnchannels()).mean(1) / 32768
C = json.loads((BUILD / lang / "plan.json").read_text(encoding="utf-8"))["cues"]
bands = [31.5, 63, 125, 250, 500, 1000, 2000, 4000, 8000, 16000]
def ltas(t0, t1):
    seg = x[int(t0 * sr):int(t1 * sr)]
    n = 8192; acc = np.zeros(n // 2 + 1); k = 0
    for i in range(0, len(seg) - n, n // 2):
        acc += np.abs(np.fft.rfft(seg[i:i + n] * np.hanning(n))) ** 2; k += 1
    f = np.fft.rfftfreq(n, 1 / sr); acc /= max(k, 1)
    out = []
    for b in bands:
        m = (f >= b / np.sqrt(2)) & (f < b * np.sqrt(2))
        out.append(10 * np.log10(acc[m].sum() + 1e-20))
    out = np.array(out); return out - out[5]
for name, (a, b) in {"act I": (4.5, C["cut"]), "intro": (C["click"], C["cascade"]), "drop": (C["drop"], C["browser"]), "browser": (C["browser"], C["desktop"]), "free": (C["free"], C["brk"]), "end": (C["lock"], C["lock"] + 4)}.items():
    print(f"{name:8s}", " ".join(f"{v:+6.1f}" for v in ltas(a, b)), "  (31..16k Hz, re 1 kHz)")
