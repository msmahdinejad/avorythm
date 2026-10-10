"""Edit the narration like a VO editor: squeeze over-long pauses, gentle EQ + compression, level-match, resample to 48 kHz.

  python -I video/films/tutorial/tools/prep.py --lang en [--tempo 1.0]

Reads build/tutorial2/<lang>/voices/*.wav (24 kHz from narrate.py) and writes build/tutorial2/<lang>/vo/<id>.wav
(48 kHz mono float->16 bit) plus vo/durations.json. A per-language tempo (rubberband, formant preserved) may be applied
when the language is long; the fit step decides it (never above 1.12).
Adapted from video/tools/mix.py (squeeze + chain).
"""
import argparse
import json
import subprocess
import sys
import tempfile
import wave
from pathlib import Path

import numpy as np

sys.stdout.reconfigure(encoding="utf-8", errors="replace")
FILM = Path(__file__).resolve().parents[1]
BUILD = FILM.parents[1] / "build" / "tutorial2"
SR = 48000
IN_RATE = 24000
CHAIN = ("highpass=f=70,equalizer=f=220:t=q:w=1.0:g=-1.2,equalizer=f=3300:t=q:w=1.2:g=1.8,equalizer=f=9000:t=q:w=1.0:g=1.0,"
         "acompressor=threshold=0.07:ratio=2.4:attack=8:release=140:makeup=1.6,deesser=i=0.35:m=0.5:f=0.55")


def read_wav(path):
    with wave.open(str(path)) as w:
        x = np.frombuffer(w.readframes(w.getnframes()), dtype=np.int16).astype(np.float32) / 32768
        return x, w.getframerate()


def write_wav(path, x, rate=SR):
    path.parent.mkdir(parents=True, exist_ok=True)
    pcm = (np.clip(x, -1, 1) * 32767).astype(np.int16)
    with wave.open(str(path), "wb") as w:
        w.setnchannels(1); w.setsampwidth(2); w.setframerate(rate); w.writeframes(pcm.tobytes())


def squeeze(x, rate, floor_db=-38.0, max_pause=0.34, comma_pause=0.22):
    """Shorten silent runs inside a clip: sentence pauses to <= max_pause, keep shorter ones as they are."""
    hop = int(0.01 * rate)
    n = len(x) // hop
    if n < 5:
        return x
    frames = x[: n * hop].reshape(n, hop)
    rms = np.sqrt((frames ** 2).mean(axis=1) + 1e-12)
    ref = np.percentile(rms, 95)
    quiet = rms < ref * 10 ** (floor_db / 20)
    out = []
    i = 0
    while i < n:
        j = i
        while j < n and quiet[j] == quiet[i]:
            j += 1
        seg = frames[i:j].reshape(-1)
        dur = (j - i) * 0.01
        if quiet[i] and i > 0 and j < n and dur > max_pause:
            k = int(max_pause * rate)
            half = k // 2
            seg = np.concatenate([seg[:half] * np.linspace(1, 0.6, half), seg[-(k - half):] * np.linspace(0.6, 1, k - half)])
        out.append(seg)
        i = j
    out.append(x[n * hop:])
    return np.concatenate(out)


def chain(x, rate, tempo):
    with tempfile.TemporaryDirectory() as td:
        src = Path(td) / "in.wav"
        write_wav(src, x, rate)
        f = []
        if abs(tempo - 1) > 0.004:
            f.append(f"rubberband=tempo={tempo:.4f}:transients=smooth:detector=soft:formant=preserved:pitchq=quality")
        f += [CHAIN, f"aresample={SR}:resampler=soxr"]
        raw = subprocess.run(["ffmpeg", "-v", "error", "-y", "-i", str(src), "-af", ",".join(f), "-f", "f32le", "-ac", "1", "-ar", str(SR), "-"],
                             capture_output=True, check=True).stdout
        return np.frombuffer(raw, dtype=np.float32).copy()


def voiced_rms_db(x):
    hop = int(0.02 * SR)
    n = len(x) // hop
    r = np.sqrt((x[: n * hop].reshape(n, hop) ** 2).mean(axis=1))
    gate = r > np.percentile(r, 90) * 0.1
    return 20 * np.log10(np.sqrt((r[gate] ** 2).mean()) + 1e-9)


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("--lang", default="en")
    ap.add_argument("--tempo", type=float, default=None, help="override; default from build/<lang>/tempo.json or 1.0")
    a = ap.parse_args()
    d = BUILD / a.lang
    tempo_file = d / "tempo.json"
    tempos = json.loads(tempo_file.read_text()) if tempo_file.exists() else {}
    out = {}
    for src in sorted((d / "voices").glob("*.wav")):
        lid = src.stem
        tempo = a.tempo if a.tempo is not None else float(tempos.get(lid, tempos.get("*", 1.0)))
        x, rate = read_wav(src)
        sq = squeeze(x, rate)
        y = chain(sq, rate, tempo)
        # trim leading/trailing near-silence the chain may add, keep 30 ms / 120 ms
        env = np.abs(y)
        idx = np.where(env > 0.004)[0]
        if idx.size:
            y = y[max(0, idx[0] - int(0.03 * SR)): idx[-1] + int(0.12 * SR)]
        y *= 10 ** ((-18.0 - voiced_rms_db(y)) / 20)
        y[: int(0.004 * SR)] *= np.linspace(0, 1, int(0.004 * SR))
        y[-int(0.03 * SR):] *= np.linspace(1, 0, int(0.03 * SR))
        write_wav(d / "vo" / f"{lid}.wav", y)
        out[lid] = {"raw": round(len(x) / rate, 3), "squeezed": round(len(sq) / rate, 3), "tempo": tempo, "dur": round(len(y) / SR, 3)}
    (d / "vo" / "durations.json").write_text(json.dumps(out, indent=1), encoding="utf-8")
    tot = sum(v["dur"] for v in out.values())
    for k, v in out.items():
        print(f"  {k:4s} raw {v['raw']:5.2f}  squeezed {v['squeezed']:5.2f}  tempo {v['tempo']:.2f}  final {v['dur']:5.2f}")
    print(f"{a.lang}: {len(out)} clips, total speech {tot:.1f} s")


if __name__ == "__main__":
    main()
