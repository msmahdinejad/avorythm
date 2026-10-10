"""Quick objective checks of the synthesized instruments: stability, tuning (YIN-like pitch), decay, spectral centroid."""
import sys, time, wave
import numpy as np
sys.path.insert(0, '.')
from dsp import SR, D4
import instruments as I

def f0_est(x, f_exp=None, fmin=60, fmax=1500):
    if f_exp:
        seg = x[int(0.1 * SR): int(0.1 * SR) + int(0.6 * SR)]
        seg = seg * np.hanning(len(seg))
        L = 1 << 20
        X = np.abs(np.fft.rfft(seg, L)); fr = np.fft.rfftfreq(L, 1 / SR)
        m = (fr > f_exp * 0.94) & (fr < f_exp * 1.06)
        i = np.argmax(np.where(m, X, 0))
        a, b, c = np.log(X[i - 1] + 1e-12), np.log(X[i] + 1e-12), np.log(X[i + 1] + 1e-12)
        return fr[i] + 0.5 * (a - c) / (a - 2 * b + c) * (fr[1] - fr[0])
    seg = x[int(0.08 * SR): int(0.08 * SR) + 4096]
    seg = seg - seg.mean()
    n = len(seg)
    d = np.array([np.sum((seg[:n - tau] - seg[tau:]) ** 2) for tau in range(int(SR / fmax), int(SR / fmin))])
    cum = np.cumsum(d) / np.arange(1, len(d) + 1)
    dn = d / (cum + 1e-12)
    taus = np.arange(int(SR / fmax), int(SR / fmin))
    i = np.argmax(dn < 0.15) if (dn < 0.15).any() else np.argmin(dn)
    # parabolic refinement
    if 0 < i < len(dn) - 1:
        a, b, c = dn[i - 1], dn[i], dn[i + 1]
        i = i + 0.5 * (a - c) / (a - 2 * b + c + 1e-12)
    return SR / (taus[0] + i)

def centroid(x):
    X = np.abs(np.fft.rfft(x[: int(0.3 * SR)] * np.hanning(int(0.3 * SR))))
    f = np.fft.rfftfreq(int(0.3 * SR), 1 / SR)
    return (X * f).sum() / X.sum()

out = []
for kind in ["santur", "oud", "baglama", "sitar", "koto", "guzheng", "nylon", "flamenco", "bass", "tanpura"]:
    for cents in [0, 700, 1200] if kind != "bass" else [-2400, -1700]:
        f = D4 * 2 ** (cents / 1200)
        t0 = time.time()
        x = I.pluck(kind, f, 0.8, seed=1)
        ok = np.isfinite(x).all()
        est = f0_est(x, f)
        err = 1200 * np.log2(est / f)
        e1 = np.sqrt(np.mean(x[int(0.05*SR):int(0.15*SR)]**2)); e2 = np.sqrt(np.mean(x[int(1.0*SR):int(1.1*SR)]**2)) if len(x) > 1.1*SR else 0
        print(f"{kind:9s} {f:7.1f} Hz est {est:7.1f} err {err:+6.1f}c  dur {len(x)/SR:4.1f}s  decay1s {20*np.log10(e2/e1+1e-9):6.1f} dB  centroid {centroid(x):6.0f}  {'OK' if ok else 'NaN!'}  {time.time()-t0:.2f}s")
        out.append(np.pad(x, (0, int(0.2 * SR))))
for k in ["daf_dum", "daf_tak", "doum", "tek", "ka", "riq", "na", "tin", "ge", "ke", "taiko", "taiko_ka", "shime", "hyoshigi", "tanggu", "muyu", "bo", "cajon_bass", "cajon_slap", "palmas", "sordas", "rim", "kick", "clap", "snare", "tom"]:
    x = I.perc(k, 0.9, 3)
    print(f"{k:10s} len {len(x)/SR:.2f}s finite {np.isfinite(x).all()} centroid {centroid(np.pad(x,(0,SR))):6.0f}")
    out.append(np.pad(x, (0, int(0.25 * SR))))
p = I.piano(D4, 0.7, 3.0); print('piano est', f0_est(p), 'finite', np.isfinite(p).all()); out.append(p)
e = I.ep(D4 * 2, 0.7, 2.0); print('ep est', f0_est(e)); out.append(e)
y = np.concatenate(out)
y = y / np.abs(y).max() * 0.8
with wave.open('../../../build/film/audio_test/instruments.wav', 'wb') as w:
    w.setnchannels(1); w.setsampwidth(2); w.setframerate(SR); w.writeframes((y * 32767).astype(np.int16).tobytes())
