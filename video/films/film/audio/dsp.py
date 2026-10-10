"""DSP core for the brand film score (numpy only): zero-phase FFT filters, reverb, Karplus-Strong strings, pitch bends.
Filters, reverb and the KS loop are adapted from the reference motion film (avorythm-motion-film/src/dsp.py)."""
import numpy as np

SR = 48000
rfft, irfft, rfftfreq = np.fft.rfft, np.fft.irfft, np.fft.rfftfreq
D4 = 293.6648


def nextpow2(n):
    return 1 << int(n - 1).bit_length()


def T(n):
    return np.arange(n) / SR


def hz_cents(c, base=D4):
    """frequency for `c` cents above D4"""
    return base * 2 ** (c / 1200)


# ------------------------------------------------------------------ filters
def lp(fc, order=2):
    return lambda f: 1 / np.sqrt(1 + (f / fc) ** (2 * order))


def hp(fc, order=2):
    return lambda f: 1 / np.sqrt(1 + (fc / np.maximum(f, 1e-3)) ** (2 * order))


def bp(lo, hi, order=2):
    return lambda f: lp(hi, order)(f) * hp(lo, order)(f)


def peak(fc, gain_db, width_oct=1.0):
    g = 10 ** (gain_db / 20) - 1
    return lambda f: 1 + g * np.exp(-0.5 * (np.log2(np.maximum(f, 1) / fc) / (width_oct / 2)) ** 2)


def shelf_hi(fc, gain_db):
    g = 10 ** (gain_db / 20)
    return lambda f: 1 + (g - 1) / (1 + (fc / np.maximum(f, 1)) ** 4)


def shelf_lo(fc, gain_db):
    g = 10 ** (gain_db / 20)
    return lambda f: 1 + (g - 1) / (1 + (np.maximum(f, 1) / fc) ** 4)


def filt(x, *H):
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


def norm(x, peak_=1.0):
    m = np.abs(x).max()
    return x / m * peak_ if m > 0 else x


class Bus:
    def __init__(self, seconds):
        self.b = np.zeros((2, int(seconds * SR)))

    def add(self, sig, t, gain_db=0.0, p=0.0):
        if sig is None or sig.size == 0:
            return
        g = 10 ** (gain_db / 20)
        s = sig if sig.ndim == 2 else pan(sig, p)
        i0 = int(round(t * SR))
        if i0 < 0:
            s, i0 = s[:, -i0:], 0
        m = min(s.shape[1], self.b.shape[1] - i0)
        if m > 0:
            self.b[:, i0:i0 + m] += g * s[:, :m]


# ------------------------------------------------------------------ reverb
def make_ir(t60=2.4, predelay=0.015, hf=0.5, seed=1, width=1.0):
    n = int(t60 * 1.15 * SR)
    t = np.arange(n) / SR
    r = np.random.default_rng(seed)
    f = rfftfreq(n, 1 / SR)
    ir = np.zeros((2, n))
    base = r.standard_normal(n)
    for ch in range(2):
        noise = base * (1 - width) + r.standard_normal(n) * width
        X = rfft(noise)
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


# ------------------------------------------------------------------ Karplus-Strong string (fractional delay, 2-tap loss)
def _lagrange3(d):
    h = np.ones(4)
    for k in range(4):
        for j in range(4):
            if j != k:
                h[k] *= (d - j) / (k - j)
    return h


def ks(f0, n, exc, t60=3.0, bright=0.93):
    """Karplus-Strong string, exactly tuned: the fractional delay is solved so that the loop's phase delay AT f0 equals
    SR/f0 (the loss filter delays high partials differently from DC)."""
    lag = 1.0 - bright
    Dl = SR / f0
    M = int(np.floor(Dl - lag)) - 1
    w = 2 * np.pi * f0 / SR
    g = 10 ** (-3 / (t60 * f0))

    def taps(d):
        return np.convolve([bright, 1 - bright], _lagrange3(d))

    def phase_delay(d):
        h = taps(d)
        H = np.sum(h * np.exp(-1j * w * np.arange(len(h))))
        return -np.angle(H) / w

    d = Dl - lag - M
    for _ in range(6):                                       # secant on the phase delay at f0
        err = M + phase_delay(d) - Dl
        if abs(err) < 1e-6:
            break
        d2 = d - err
        d = float(np.clip(d2, 0.2, 2.8))
    h = taps(d) * g
    off = M + 6
    y = np.zeros(n + off)
    x = np.zeros(n)
    x[:min(n, len(exc))] = exc[:n]
    for s in range(0, n, M):
        e = min(s + M, n)
        acc = x[s:e].copy()
        for k in range(5):
            acc += h[k] * y[off + s - M - k: off + e - M - k]
        y[off + s: off + e] = acc
    return y[off:]


def jawari(x, f0, rise=0.18, lo=900, hi=3800, amount=1.0):
    """The buzzing bridge of sitar/tanpura, as a post effect: a formant that blooms upward after the attack and settles,
    plus gentle odd-harmonic saturation. Stable (no non-linearity inside the string loop)."""
    n = len(x)
    dur = n / SR

    def H(f, t):
        u = np.clip(t / rise, 0, 1)
        fc = lo * (hi / lo) ** (np.sin(np.pi * 0.5 * u) * np.exp(-np.maximum(t - rise, 0) / 1.6))
        g = np.exp(-0.5 * (np.log2(np.maximum(f, 1) / fc) / 0.45) ** 2)
        return 0.55 + amount * 1.6 * g
    y = stft_filter(x, H)
    m = np.abs(y).max() + 1e-9
    y = np.tanh(1.6 * y / m) / np.tanh(1.6) * m
    return y


def bend(x, cents):
    """Pitch-bend a rendered note by resampling. `cents` is an array (len(x)) of cents offsets over time."""
    r = 2 ** (np.asarray(cents) / 1200)
    pos = np.cumsum(r) - r[0]
    pos = pos[pos < len(x) - 1]
    return np.interp(pos, np.arange(len(x)), x)


def env_adsr(n, a=0.005, d=0.1, s=0.7, r=0.2, dur=None):
    t = T(n)
    dur = dur or n / SR
    e = np.where(t < a, t / max(a, 1e-6), s + (1 - s) * np.exp(-(t - a) / max(d, 1e-6)))
    rel = np.clip((dur - t) / max(r, 1e-6), 0, 1)
    return e * rel
