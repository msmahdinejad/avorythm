"""Audio QC picture: momentary loudness + log spectrogram of a mix (or stem) with the film's cues marked.
  python -I qc_audio.py <lang> [wav] [out.png] [t0 t1]"""
import json, sys, wave
from pathlib import Path
import numpy as np
from PIL import Image, ImageDraw, ImageFont
BUILD = Path(__file__).resolve().parents[3] / "build" / "film"
lang = sys.argv[1]
wav = Path(sys.argv[2]) if len(sys.argv) > 2 and sys.argv[2] != '-' else BUILD / lang / "mix.wav"
outp = Path(sys.argv[3]) if len(sys.argv) > 3 else BUILD / lang / "audio_qc.png"
with wave.open(str(wav)) as w:
    sr = w.getframerate(); ch = w.getnchannels()
    x = np.frombuffer(w.readframes(w.getnframes()), dtype=np.int16).astype(np.float32) / 32768
x = x.reshape(-1, ch).mean(1) if ch > 1 else x
t0 = float(sys.argv[4]) if len(sys.argv) > 4 else 0.0
t1 = float(sys.argv[5]) if len(sys.argv) > 5 else len(x) / sr
x = x[int(t0 * sr): int(t1 * sr)]
Wd, Hs, Hl = 2400, 520, 220
nfft, hop = 4096, int(len(x) / Wd) or 1
cols = []
win = np.hanning(nfft)
for i in range(Wd):
    a = i * hop
    seg = x[a:a + nfft]
    if len(seg) < nfft: seg = np.pad(seg, (0, nfft - len(seg)))
    cols.append(np.abs(np.fft.rfft(seg * win)))
S = np.array(cols).T
f = np.fft.rfftfreq(nfft, 1 / sr)
fl = np.geomspace(30, 16000, Hs)
idx = np.clip(np.searchsorted(f, fl), 0, len(f) - 1)
Sl = 20 * np.log10(S[idx] + 1e-6)
Sl = np.clip((Sl - (Sl.max() - 80)) / 80, 0, 1)[::-1]
img = np.zeros((Hs, Wd, 3), np.uint8)
img[..., 0] = (255 * Sl ** 1.2).astype(np.uint8); img[..., 1] = (255 * Sl ** 2.2).astype(np.uint8); img[..., 2] = (255 * np.sqrt(Sl) * 0.9).astype(np.uint8)
canvas = Image.new("RGB", (Wd, Hs + Hl + 30), (12, 12, 18)); canvas.paste(Image.fromarray(img), (0, 0))
d = ImageDraw.Draw(canvas)
win_ = int(0.4 * sr); step = len(x) / Wd
lv = []
for i in range(Wd):
    a = int(i * step); seg = x[max(0, a - win_ // 2): a + win_ // 2]
    lv.append(10 * np.log10(np.mean(seg ** 2) + 1e-10))
lv = np.array(lv)
for db in (-10, -20, -30, -40):
    y = Hs + int((-db) / 50 * Hl); d.line([(0, y), (Wd, y)], fill=(50, 50, 70)); d.text((4, y - 12), f"{db} dB", fill=(120, 120, 150))
pts = [(i, Hs + int(np.clip(-v, 0, 50) / 50 * Hl)) for i, v in enumerate(lv)]
d.line(pts, fill=(90, 230, 220), width=2)
try: font = ImageFont.truetype("C:/Windows/Fonts/consola.ttf", 16)
except OSError: font = None
plan = json.loads((BUILD / lang / "plan.json").read_text(encoding="utf-8"))
for k, v in plan["cues"].items():
    if t0 <= v <= t1 and k in ("whip", "a", "b", "cut", "popup", "click", "dub1", "dub2", "cascade", "build", "gap", "drop", "browser", "desktop", "langs", "free", "brk", "lock", "end"):
        X = int((v - t0) / (t1 - t0) * Wd); d.line([(X, 0), (X, Hs + Hl)], fill=(255, 210, 60)); d.text((X + 3, 3), k, fill=(255, 220, 90), font=font)
for s in range(int(t0), int(t1) + 1):
    X = int((s - t0) / (t1 - t0) * Wd); d.text((X, Hs + Hl + 6), str(s), fill=(160, 160, 190), font=font)
canvas.save(outp); print("->", outp)
