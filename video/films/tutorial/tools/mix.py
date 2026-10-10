"""Mix one language of the tutorial: narration + score + foley -> build/tutorial2/<lang>/mix.wav (-14 LUFS, <= -1 dBTP).

  python -I video/films/tutorial/tools/mix.py --lang en

The narration (vo/<id>.wav from prep.py) sits at the fitted line starts (timeline.json). The music breathes under the
voice: a smoothed narration envelope ducks it by about -9 dB (fast attack, slow release) and lets it swell back in the
gaps and on transitions; foley ducks only slightly so clicks stay audible. A touch of plate on the voice, then
loudness normalisation (two-pass loudnorm, linear) and a true-peak limiter. Adapted from video/tools/mix.py.
"""
import argparse
import json
import subprocess
import sys
import tempfile
import wave
from pathlib import Path

import numpy as np

sys.path.insert(0, str(Path(__file__).resolve().parent))
import dsp  # noqa: E402
from dsp import SR  # noqa: E402

sys.stdout.reconfigure(encoding="utf-8", errors="replace")
FILM = Path(__file__).resolve().parents[1]
BUILD = FILM.parents[1] / "build" / "tutorial2"
FPS = 100


def read_wav(path):
    with wave.open(str(path)) as w:
        x = np.frombuffer(w.readframes(w.getnframes()), dtype=np.int16).astype(np.float32) / 32768
        if w.getnchannels() == 2:
            x = x.reshape(-1, 2).T
        return x


def write_wav(path, x):
    pcm = (np.clip(x.T if x.ndim == 2 else x, -1, 1) * 32767).astype(np.int16)
    with wave.open(str(path), "wb") as w:
        w.setnchannels(x.shape[0] if x.ndim == 2 else 1); w.setsampwidth(2); w.setframerate(SR); w.writeframes(pcm.tobytes())


def smooth(e, att, rel):
    a, r = np.exp(-1 / (att * FPS)), np.exp(-1 / (rel * FPS))
    out = np.zeros_like(e); v = 0.0
    for i, s in enumerate(e):
        v = a * v + (1 - a) * s if s > v else r * v + (1 - r) * s
        out[i] = v
    return out


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("--lang", default="en")
    ap.add_argument("--music", type=float, default=0.55)
    ap.add_argument("--sfx", type=float, default=0.62)
    a = ap.parse_args()
    d = BUILD / a.lang
    TL = json.loads((d / "timeline.json").read_text(encoding="utf-8"))
    dur = TL["duration"]
    n = int(dur * SR)
    voice = np.zeros(n)
    for lid, L in TL["lines"].items():
        y = read_wav(d / "vo" / f"{lid}.wav")
        i0 = int(round(L["start"] * SR))
        m = min(len(y), n - i0)
        voice[i0:i0 + m] += y[:m]
    plate = dsp.make_ir(t60=0.8, predelay=0.01, hf=0.6, seed=2)
    vs = dsp.pan(voice, 0.0)
    vs = vs * 0.94 + dsp.convolve(vs, plate) * 0.06
    music = read_wav(d / "music.wav")
    sfx = read_wav(d / "sfx.wav")
    music = np.pad(music, ((0, 0), (0, max(0, n - music.shape[1]))))[:, :n]
    sfx = np.pad(sfx, ((0, 0), (0, max(0, n - sfx.shape[1]))))[:, :n]
    # narration presence envelope -> ducking gain
    hop = SR // FPS
    k = n // hop
    rms = np.sqrt((voice[: k * hop].reshape(k, hop) ** 2).mean(axis=1))
    gate = (rms > 0.012).astype(np.float32)
    env = smooth(gate, 0.05, 0.55)
    xs = np.arange(k) / FPS
    g = np.interp(np.arange(n) / SR, xs, env)
    duck_m = 1 - 0.66 * g          # about -9.4 dB under the voice
    duck_s = 1 - 0.25 * g
    mixed = vs * 1.0 + music * duck_m * a.music + sfx * duck_s * a.sfx
    with tempfile.TemporaryDirectory() as td:
        raw = Path(td) / "pre.wav"
        write_wav(raw, mixed / max(1.0, np.abs(mixed).max() / 0.98))
        probe = subprocess.run(["ffmpeg", "-hide_banner", "-i", str(raw), "-af", "loudnorm=I=-14:TP=-1.5:LRA=11:print_format=json", "-f", "null", "-"], capture_output=True, text=True)
        js = json.loads(probe.stderr[probe.stderr.rindex("{"):probe.stderr.rindex("}") + 1])
        af = ("loudnorm=I=-14:TP=-1.5:LRA=11:linear=true:measured_I={input_i}:measured_TP={input_tp}:measured_LRA={input_lra}:measured_thresh={input_thresh}:offset={target_offset},"
              "alimiter=limit=0.84:attack=1:release=50:level=disabled,afade=t=in:st=0:d=0.02,afade=t=out:st={fo}:d=0.25").format(fo=dur - 0.25, **js)
        subprocess.run(["ffmpeg", "-v", "error", "-y", "-i", str(raw), "-af", af, "-ar", "48000", "-c:a", "pcm_s16le", str(d / "mix.wav")], check=True)
    meas = subprocess.run(["ffmpeg", "-hide_banner", "-i", str(d / "mix.wav"), "-af", "ebur128=peak=true", "-f", "null", "-"], capture_output=True, text=True).stderr
    summ = meas[meas.rfind("Summary:"):]
    I = float(summ.split("I:")[1].split("LUFS")[0])
    tp = float(summ.split("Peak:")[1].split("dBFS")[0])
    print(f"{a.lang}: mix.wav {dur:.2f} s  integrated {I:.1f} LUFS  true peak {tp:.1f} dBTP")


if __name__ == "__main__":
    main()
