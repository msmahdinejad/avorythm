"""Small numpy synthesis toolkit for the Avorythm film scores (everything is generated from scratch, no samples).

Mono signals are 1-D float arrays at SR = 48 kHz; stereo signals are (2, n). Filters are zero-phase FFT filters.
Filter, reverb and percussion building blocks are adapted from the sample film `avorythm-motion-film/src/dsp.py`.
"""
import numpy as np

SR = 48000
rfft, irfft, rfftfreq = np.fft.rfft, np.fft.irfft, np.fft.rfftfreq


def nextpow2(n):
    return 1 << int(n - 1).bit_length()


def t_axis(n):
    return np.arange(n) / SR


# ------------------------------------------------------------------ filters
def lp(fc, order=2):
    return lambda f: 1 / np.sqrt(1 + (f / fc) ** (2 * order))


def hp(fc, order=2):
    return lambda f: 1 / np.sqrt(1 + (fc / np.maximum(f, 1e-3)) ** (2 * order))


def bp(lo, hi, order=2):
    return lambda f: lp(hi, order)(f) * hp(lo, order)(f)


def peak_eq(fc, gain_db, width_oct=1.0):
    g = 10 ** (gain_db / 20) - 1
    return lambda f: 1 + g * np.exp(-0.5 * (np.log2(np.maximum(f, 1) / fc) / (width_oct / 2)) ** 2)


def shelf_hi(fc, gain_db):
    g = 10 ** (gain_db / 20)
    return lambda f: 1 + (g - 1) / (1 + (fc / np.maximum(f, 1)) ** 4)


def filt(x, *H):
    """Apply magnitude responses H(f) to a mono or (2, n) signal."""
    if x.ndim == 2:
        return np.stack([filt(c, *H) for c in x])
    n = len(x)
    L = nextpow2(n + 8192)
    X = rfft(x, L)
    f = rfftfreq(L, 1 / SR)
    for h in H:
        X = X * h(f)
    return irfft(X, L)[:n]


def stft_filter(x, H_ft, nfft=2048, hop=512):
    """Time-varying zero-phase filter. H_ft(f[None, :], t[:, None]) -> gains (t in seconds from the start of x)."""
    n = len(x)
    xp = np.concatenate([np.zeros(nfft), x, np.zeros(2 * nfft)])
    nfr = (len(xp) - nfft) // hop + 1
    win = np.hanning(nfft + 1)[:-1]
    idx = np.arange(nfft)[None, :] + hop * np.arange(nfr)[:, None]
    F = rfft(xp[idx] * win, axis=1)
    f = rfftfreq(nfft, 1 / SR)
    tc = (hop * np.arange(nfr) + nfft / 2 - nfft) / SR
    Y = irfft(F * H_ft(f[None, :], tc[:, None]), nfft, axis=1) * win
    y = np.zeros(len(xp))
    for i in range(nfr):
        y[i * hop:i * hop + nfft] += Y[i]
    return y[nfft:nfft + n] / 1.5


def pan(x, p):
    a = (np.clip(p, -1, 1) + 1) * np.pi / 4
    return np.stack([x * np.cos(a), x * np.sin(a)])


def fades(x, fi=0.003, fo=0.01):
    x = x.copy()
    a, b = int(fi * SR), int(fo * SR)
    if a:
        x[..., :a] *= np.linspace(0, 1, a)
    if b:
        x[..., -b:] *= np.linspace(1, 0, b)
    return x


def db(x):
    return 10 ** (x / 20)


class Bus:
    """Stereo mix bus: add(sig, t, gain_db, pan)."""

    def __init__(self, seconds):
        self.b = np.zeros((2, int(seconds * SR)))

    def add(self, sig, t, gain_db=0.0, p=0.0):
        g = 10 ** (gain_db / 20)
        s = sig if sig.ndim == 2 else pan(sig, p)
        i0 = int(round(t * SR))
        if i0 < 0:
            s, i0 = s[:, -i0:], 0
        m = min(s.shape[1], self.b.shape[1] - i0)
        if m > 0:
            self.b[:, i0:i0 + m] += g * s[:, :m]


# ------------------------------------------------------------------- reverb
def make_ir(t60=2.4, predelay=0.015, hf=0.5, seed=1):
    n = int(t60 * 1.15 * SR)
    t = np.arange(n) / SR
    r = np.random.default_rng(seed)
    f = rfftfreq(n, 1 / SR)
    ir = np.zeros((2, n))
    for ch in range(2):
        X = rfft(r.standard_normal(n))
        acc = np.zeros(n)
        for lo, hi, mul in ((0, 250, 1.15), (250, 1500, 1.0), (1500, 5000, 0.7), (5000, 24000, 0.25 + 0.5 * hf)):
            acc += irfft(X * ((f >= lo) & (f < hi)), n) * np.exp(-6.91 * t / (t60 * mul))
        pd = int(predelay * SR)
        acc = np.concatenate([np.zeros(pd), acc])[:n]
        ramp = pd + int(0.02 * SR)
        acc[:ramp] *= np.linspace(0, 1, ramp) ** 2
        ir[ch] = acc
    return ir / np.sqrt((ir ** 2).sum() / 2)


def convolve(x, ir):
    if x.ndim == 1:
        x = np.stack([x, x])
    n, m = x.shape[1], ir.shape[1]
    L = nextpow2(n + m)
    return np.stack([irfft(rfft(x[c], L) * rfft(ir[c], L), L)[:n] for c in range(2)])


# --------------------------------------------------------------------- tuning
NOTE = {"C": 0, "C#": 1, "Db": 1, "D": 2, "D#": 3, "Eb": 3, "E": 4, "F": 5, "F#": 6, "Gb": 6, "G": 7, "G#": 8, "Ab": 8, "A": 9, "A#": 10, "Bb": 10, "B": 11}


def hz(name):
    import re
    m = re.fullmatch(r"([A-G][#b]?)(\d)", name)
    return 440.0 * 2 ** ((NOTE[m.group(1)] + 12 * (int(m.group(2)) + 1) - 69) / 12)


# ----------------------------------------------------------------- percussion
def kick(vel=1.0, punch=1.0):
    n = int(0.55 * SR)
    t = t_axis(n)
    f = 44 + 118 * np.exp(-t / 0.026)
    s = np.sin(2 * np.pi * np.cumsum(f) / SR) * np.exp(-t / 0.28)
    s += 0.22 * punch * filt(np.random.default_rng(3).standard_normal(n) * np.exp(-t / 0.0015), hp(1800))
    return np.tanh(1.8 * s) / np.tanh(1.8) * vel


def clap(vel=1.0, seed=0):
    r = np.random.default_rng(seed)
    n = int(0.45 * SR)
    t = t_axis(n)
    env = np.zeros(n)
    for k, o in enumerate((0, 0.0085, 0.017, 0.027)):
        env += (t >= o) * np.exp(-np.clip(t - o, 0, None) / (0.0055 if k < 3 else 0.1))
    s = filt(r.standard_normal(n), bp(900, 7000), peak_eq(1600, 4, 1)) * env
    return s / np.abs(s).max() * vel


def hat(vel=1.0, seed=0, open_=False):
    r = np.random.default_rng(seed)
    n = int((0.22 if open_ else 0.06) * SR)
    t = t_axis(n)
    s = filt(r.standard_normal(n), hp(7000)) * np.exp(-t / (0.09 if open_ else 0.018))
    return s / (np.abs(s).max() + 1e-9) * vel


def shaker(vel=1.0, seed=0):
    r = np.random.default_rng(seed)
    n = int(0.11 * SR)
    t = t_axis(n)
    s = filt(r.standard_normal(n), hp(6500)) * (1 - np.exp(-t / 0.004)) * np.exp(-t / 0.032)
    return s / np.abs(s).max() * vel


def boom(vel=1.0, seed=0, length=2.6):
    r = np.random.default_rng(seed)
    n = int(length * SR)
    t = t_axis(n)
    f = 30 + 55 * np.exp(-t / 0.08)
    s = np.sin(2 * np.pi * np.cumsum(f) / SR) * np.exp(-t / 0.85)
    s += 0.35 * filt(r.standard_normal(n), bp(120, 4000)) * np.exp(-t / 0.06)
    return np.tanh(1.5 * s) / np.tanh(1.5) * vel


def crash(vel=1.0, seed=0, length=3.0):
    r = np.random.default_rng(seed)
    n = int(length * SR)
    t = t_axis(n)
    s = filt(r.standard_normal(n), hp(3500)) * np.exp(-t / 0.9)
    return s / np.abs(s).max() * vel


# --------------------------------------------------------------------- tonal
def bass(freq, dur, vel=1.0):
    n = int(dur * SR)
    t = t_axis(n)
    s = np.sin(2 * np.pi * freq * t) + 0.32 * np.sin(4 * np.pi * freq * t) + 0.1 * np.sin(6 * np.pi * freq * t)
    s = np.tanh(1.5 * s) / np.tanh(1.5)
    return fades(s, 0.006, 0.06) * vel


def pad(freqs, dur, att=0.6, rel=1.0, bright=7.0, seed=0, det=(-9, -3, 4, 10)):
    """Warm detuned additive pad -> (2, n)."""
    r = np.random.default_rng(seed)
    n = int(dur * SR)
    t = t_axis(n)
    out = np.zeros((2, n))
    for f in freqs:
        K = int(min(22, 8000 / f))
        for ch in range(2):
            for dc in det:
                ff = f * 2 ** ((dc + (3 if ch else -3)) / 1200)
                ph = r.uniform(0, 2 * np.pi, K)
                for k in range(1, K + 1):
                    out[ch] += np.sin(2 * np.pi * ff * k * t + ph[k - 1]) * np.exp(-k / bright) / k
    env = np.minimum(1, t / att) * np.clip((dur - t) / rel, 0, 1)
    return out * env / (len(freqs) * len(det) * 1.3)


def fm_pluck(freq, dur=1.6, vel=1.0, bright=1.0, ratio=2.0, seed=0):
    """Glassy FM pluck / bell: two detuned voices, fast-decaying modulation index."""
    n = int(dur * SR)
    t = t_axis(n)
    out = np.zeros(n)
    for dc, amp in ((-4, 0.7), (3, 0.7), (0, 0.5)):
        f = freq * 2 ** (dc / 1200)
        idx = (2.2 * bright) * np.exp(-t / 0.18)
        out += amp * np.sin(2 * np.pi * f * t + idx * np.sin(2 * np.pi * f * ratio * t))
    out += 0.25 * np.sin(2 * np.pi * freq * 4 * t) * np.exp(-t / 0.05)
    env = (1 - np.exp(-t / 0.002)) * np.exp(-t / (0.35 + 0.5 * bright * 0.5))
    out = out * env
    out = filt(out, hp(140, 1))
    return out / (np.abs(out).max() + 1e-9) * vel


def noise_sweep(dur, f0, f1, q_oct=1.2, curve=2.0, seed=0, rise=True):
    """Band-passed noise whose centre glides f0 -> f1 (log), amplitude rising or falling."""
    r = np.random.default_rng(seed)
    n = int(dur * SR)
    x = r.standard_normal(n)

    def H(f, t):
        p = np.clip(t / dur, 0, 1)
        fc = f0 * (f1 / f0) ** p
        return np.exp(-0.5 * (np.log2(np.maximum(f, 1) / fc) / (q_oct / 2)) ** 2)

    y = stft_filter(x, H)
    p = t_axis(n) / dur
    env = p ** curve if rise else (1 - p) ** curve
    y *= env
    return y / (np.abs(y).max() + 1e-9)


def shepard(dur, octaves=1.0, base=110.0, seed=0):
    n = int(dur * SR)
    t = t_axis(n)
    out = np.zeros(n)
    r = np.random.default_rng(seed)
    for k in range(7):
        pos = (k + octaves * t / dur) % 7
        f = base * 2 ** pos
        amp = np.exp(-0.5 * ((pos - 3.5) / 1.3) ** 2)
        ph = 2 * np.pi * np.cumsum(f) / SR + r.uniform(0, 6.3)
        out += amp * np.sin(ph)
    return out / np.abs(out).max()


def click(vel=1.0, seed=0):
    r = np.random.default_rng(seed)
    n = int(0.08 * SR)
    t = t_axis(n)
    s = 0.8 * filt(r.standard_normal(n) * np.exp(-t / 0.0012), bp(1500, 9000))
    s += 0.5 * np.sin(2 * np.pi * 1350 * t) * np.exp(-t / 0.006)
    s += 0.5 * np.sin(2 * np.pi * 95 * t) * np.exp(-t / 0.02)
    return s / np.abs(s).max() * vel


def whoosh(dur=0.6, up=True, seed=0):
    f0, f1 = (300, 5000) if up else (5000, 300)
    x = noise_sweep(dur, f0, f1, q_oct=1.6, seed=seed)
    n = len(x)
    env = np.sin(np.pi * np.clip(t_axis(n) / dur, 0, 1)) ** 1.5
    x = x / (np.abs(x).max() + 1e-9) * env / (np.max(env) + 1e-9)
    p = np.linspace(-0.6, 0.6, n) if up else np.linspace(0.6, -0.6, n)
    a = (p + 1) * np.pi / 4
    return np.stack([x * np.cos(a), x * np.sin(a)])


def shimmer(dur, root=hz("A5"), seed=0):
    """Airy cluster of high partials with slow tremolo (for the logo)."""
    r = np.random.default_rng(seed)
    n = int(dur * SR)
    t = t_axis(n)
    out = np.zeros((2, n))
    for ch in range(2):
        for ratio in (1, 1.5, 2, 3, 4, 5.04):
            f = root * ratio * 2 ** (r.uniform(-6, 6) / 1200)
            trem = 0.55 + 0.45 * np.sin(2 * np.pi * r.uniform(0.3, 1.1) * t + r.uniform(0, 6.3))
            out[ch] += np.sin(2 * np.pi * f * t + r.uniform(0, 6.3)) * trem / ratio
    env = np.minimum(1, t / 0.4) * np.exp(-t / (dur * 0.45))
    return out * env / 3


def tick(vel=1.0):
    n = int(0.05 * SR)
    t = t_axis(n)
    s = np.sin(2 * np.pi * 760 * t) * np.exp(-t / 0.008) + 0.4 * filt(np.random.default_rng(5).standard_normal(n) * np.exp(-t / 0.002), hp(3000))
    return s / np.abs(s).max() * vel


def glitch(dur=0.3, seed=0):
    """Stuttering granular burst for the babel -> silence cut."""
    r = np.random.default_rng(seed)
    n = int(dur * SR)
    src = filt(r.standard_normal(n), bp(500, 6000))
    out = np.zeros(n)
    pos = 0
    while pos < n:
        L = int(r.uniform(0.01, 0.045) * SR)
        g = src[pos:pos + L].copy()
        reps = r.integers(1, 4)
        for k in range(reps):
            a = pos + k * L
            if a + L > n:
                break
            out[a:a + L] += g[: n - a][:L] * (r.uniform(0.4, 1.0))
        pos += L * reps
    return out / (np.abs(out).max() + 1e-9)
