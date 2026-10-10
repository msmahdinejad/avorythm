"""Synthesized instruments for the brand film (no samples): plucked strings by Karplus-Strong (santur, oud, bağlama,
sitar + tanpura, koto, guzheng, nylon / flamenco guitar), modal percussion (daf, darbuka, riq, tabla, taiko, tanggu,
cajón, palmas…), additive piano, string ensemble, FM electric piano, pads, bass, and the sound-design kit."""
import numpy as np

from dsp import SR, T, bend, bp, filt, fades, hp, jawari, ks, lp, norm, peak, shelf_hi, stft_filter

_CACHE = {}


def _key(*a):
    return repr(a)


# ======================================================================== plucked strings
PLUCK = {
    #           courses (cents, amp)                      exc       ms   pos    t60(f)                                bright  body                                                                            tick
    "santur":  ([(-1.7, .85), (0.2, 1.0), (1.9, .8), (3.1, .35)], "hammer", 1.0, 1 / 8.5, lambda f: 3.4 * (293.7 / f) ** 0.45, 0.94, [hp(120, 1), peak(2600, 3, 1.5)], 0.25),
    "oud":     ([(-1.2, 1.0), (1.2, 0.9)], "plectrum", 2.4, 0.16, lambda f: 1.7 * (220 / f) ** 0.5, 0.86, [hp(70, 2), peak(115, 5, 0.8), peak(260, 3, 1.0), peak(1500, -3, 1.2), lp(5200, 2)], 0.12),
    "baglama": ([(0.0, 1.0), (2.2, 0.8), (1200.0, 0.32)], "plectrum", 1.2, 0.12, lambda f: 1.7 * (293 / f) ** 0.4, 0.95, [hp(150, 2), peak(3000, 5, 1.2), peak(600, -2, 1.0)], 0.3),
    "sitar":   ([(0.0, 1.0), (1.0, 0.25)], "plectrum", 1.0, 0.1, lambda f: 3.2 * (293 / f) ** 0.3, 0.985, [hp(110, 2), peak(2200, 3, 1.5)], 0.2),
    "tanpura": ([(0.0, 1.0), (1.5, 0.6)], "finger", 3.0, 0.2, lambda f: 7.0 * (146 / f) ** 0.3, 0.99, [hp(60, 2), peak(1800, 2, 1.5)], 0.0),
    "koto":    ([(0.0, 1.0)], "nail", 1.4, 0.2, lambda f: 2.6 * (293 / f) ** 0.4, 0.955, [hp(100, 2), peak(900, 3, 1.0), peak(2800, 2, 1.2)], 0.22),
    "guzheng": ([(0.0, 1.0), (0.9, 0.35)], "nail", 1.3, 0.18, lambda f: 4.2 * (293 / f) ** 0.4, 0.965, [hp(90, 2), peak(700, 3, 1.0), peak(2400, 3, 1.2)], 0.22),
    "nylon":   ([(0.0, 1.0)], "finger", 3.6, 0.22, lambda f: 2.4 * (196 / f) ** 0.5, 0.83, [hp(70, 2), peak(105, 5, 0.7), peak(220, 2, 0.8), lp(5200, 2)], 0.05),
    "flamenco": ([(0.0, 1.0)], "plectrum", 1.6, 0.14, lambda f: 1.5 * (196 / f) ** 0.5, 0.9, [hp(80, 2), peak(110, 4, 0.7), peak(2500, 3, 1.2), lp(7500, 2)], 0.18),
    "bass":    ([(0.0, 1.0)], "finger", 6.0, 0.3, lambda f: 2.0 * (73 / f) ** 0.3, 0.7, [hp(35, 2), peak(90, 3, 1.0), lp(2500, 2)], 0.0),
}


def pluck(kind, f0, vel=0.8, dur=None, seed=0, strikes=None, bend_cents=None):
    """One plucked note. strikes=[(t, vel), …] re-excites the same string (tremolo/riz). bend_cents: f(t)->cents or array."""
    courses, exc_kind, ms, pos, t60f, bright, body, tick = PLUCK[kind]
    strikes = tuple(strikes) if strikes else ((0.0, vel),)
    key = _key(kind, round(f0, 3), strikes, dur, seed, None if bend_cents is None else id(bend_cents))
    if bend_cents is None and key in _CACHE:
        return _CACHE[key]
    last = max(t for t, _ in strikes)
    t60 = t60f(f0)
    dur = dur or last + min(5.0, max(1.2, t60 * 0.9))
    n = int(dur * SR)
    r = np.random.default_rng(seed + int(f0 * 13) % 9973)
    exc = np.zeros(n)
    for t0, v in strikes:
        L = max(8, int(SR * ms / 1000 * (1.25 - 0.4 * v)))
        k = np.arange(L)
        if exc_kind == "hammer":
            pulse = np.sin(np.pi * k / L) ** 2 * (0.75 + 0.35 * r.standard_normal(L))
        elif exc_kind == "plectrum":
            pulse = r.standard_normal(L) * np.exp(-k / (L * 0.35)) + np.linspace(1, 0, L) * 0.6
        elif exc_kind == "nail":
            pulse = r.standard_normal(L) * np.exp(-k / (L * 0.25)) + np.sin(np.pi * k / L)
        else:  # finger: soft, rounded
            pulse = np.sin(np.pi * k / L) ** 1.5 * (1 + 0.15 * r.standard_normal(L))
        i0 = int(t0 * SR)
        if i0 + L < n:
            exc[i0:i0 + L] += pulse * v
    if exc_kind in ("plectrum", "finger"):
        exc = filt(exc, lp(2500 + 7000 * max(v for _, v in strikes), 1))
    dly = max(1, int(SR / f0 * pos))                       # pluck position comb
    e2 = exc.copy()
    e2[dly:] -= 0.9 * exc[:-dly]
    out = np.zeros(n)
    for cents, amp in courses:
        out += amp * ks(f0 * 2 ** (cents / 1200), n, e2, t60=t60 * r.uniform(0.92, 1.08), bright=bright)
    if kind in ("sitar", "tanpura"):
        out = jawari(out, f0, rise=0.16 if kind == "sitar" else 0.5, amount=1.0 if kind == "sitar" else 1.3)
    if tick > 0:
        tn = int(0.006 * SR)
        tk = filt(r.standard_normal(tn) * np.exp(-np.arange(tn) / (0.0008 * SR)), hp(2500))
        pk = np.abs(out).max() + 1e-9
        for t0, v in strikes:
            i0 = int(t0 * SR)
            m = min(tn, n - i0)
            if m > 0:
                out[i0:i0 + m] += tick * v * pk * tk[:m] / (np.abs(tk).max() + 1e-9)
    out = filt(out, *body)
    if bend_cents is not None:
        c = bend_cents(T(n)) if callable(bend_cents) else bend_cents
        out = bend(out, c)
    out = norm(out, max(v for _, v in strikes))
    out = fades(out, 0.0005, 0.12)
    if bend_cents is None:
        _CACHE[key] = out
    return out


def strum(kind, freqs, vel=0.8, spread=0.012, down=True, dur=None, seed=0):
    """A strum: strings struck one after another (low->high when down)."""
    fs = list(freqs) if down else list(freqs)[::-1]
    notes = [pluck(kind, f, vel * (0.85 + 0.15 * np.random.default_rng(seed + i).random()), dur=dur, seed=seed + i) for i, f in enumerate(fs)]
    n = max(len(x) for x in notes) + int(spread * SR * len(fs))
    out = np.zeros(n)
    for i, x in enumerate(notes):
        i0 = int(i * spread * SR)
        out[i0:i0 + len(x)] += x
    return out / np.sqrt(len(fs))


# ======================================================================== percussion
def _t(n):
    return np.arange(n) / SR


def jingles(n, vel, r, count=11, lo=4200, hi=10500, spread=0.025):
    out = np.zeros(n)
    for i in range(count):
        i0 = int((r.uniform(0, spread) + (0.01 * (i - 7) if i > 7 else 0)) * SR)
        L = min(int(0.14 * SR), n - i0)
        if L <= 0:
            continue
        tt = _t(L)
        ring = sum(np.sin(2 * np.pi * r.uniform(lo, hi) * tt + r.uniform(0, 6.3)) for _ in range(3))
        out[i0:i0 + L] += (0.45 * ring * np.exp(-tt / r.uniform(0.02, 0.07)) + 0.6 * r.standard_normal(L) * np.exp(-tt / 0.004)) * r.uniform(0.3, 1.0)
    return filt(out, hp(3800)) * vel


def membrane(f0, f_start, glide, decay, modes, n_s, noise_band=None, noise_amt=0.4, noise_dec=0.01, seed=0):
    r = np.random.default_rng(seed)
    n = int(n_s * SR)
    t = _t(n)
    f = f0 + (f_start - f0) * np.exp(-t / glide)
    s = np.sin(2 * np.pi * np.cumsum(f) / SR) * np.exp(-t / decay)
    for m, a, dc in modes:
        s += a * np.sin(2 * np.pi * np.cumsum(f * m) / SR + r.uniform(0, 6.3)) * np.exp(-t / dc)
    if noise_band:
        s += noise_amt * filt(r.standard_normal(n), bp(*noise_band)) * np.exp(-t / noise_dec)
    return norm(s)


def perc(kind, vel=1.0, seed=0):
    key = _key("perc", kind, round(vel, 3), seed)
    if key in _CACHE:
        return _CACHE[key]
    r = np.random.default_rng(seed)
    if kind == "daf_dum":
        s = membrane(60, 118, 0.016, 0.3, [(1.59, .3, .09), (2.14, .22, .06), (2.30, .16, .05), (2.65, .1, .04)], 0.9, (150, 1400), 0.55, 0.012, seed)
        s = norm(s + 0.3 * jingles(len(s), 1, r))
    elif kind == "daf_tak":
        n = int(0.5 * SR); t = _t(n)
        s = 0.6 * np.sin(2 * np.pi * np.cumsum(330 + 150 * np.exp(-t / 0.005)) / SR) * np.exp(-t / 0.05) + 0.9 * filt(r.standard_normal(n), bp(700, 6500)) * np.exp(-t / 0.016)
        s = norm(norm(s) + 0.55 * jingles(n, 1, r))
    elif kind == "doum":                                      # darbuka
        s = membrane(92, 135, 0.02, 0.32, [(1.62, .25, .08), (2.3, .12, .05)], 0.8, (180, 2200), 0.35, 0.01, seed)
    elif kind == "tek":
        n = int(0.25 * SR); t = _t(n)
        s = 0.7 * filt(r.standard_normal(n), bp(1800, 9000)) * np.exp(-t / 0.012) + 0.5 * np.sin(2 * np.pi * 620 * t) * np.exp(-t / 0.035) + 0.3 * np.sin(2 * np.pi * 2350 * t) * np.exp(-t / 0.02)
    elif kind == "ka":
        n = int(0.2 * SR); t = _t(n)
        s = 0.6 * filt(r.standard_normal(n), bp(900, 5000)) * np.exp(-t / 0.01) + 0.4 * np.sin(2 * np.pi * 480 * t) * np.exp(-t / 0.03)
    elif kind == "riq":
        n = int(0.35 * SR)
        s = jingles(n, 1, r, 9) + 0.2 * filt(r.standard_normal(n), bp(300, 3000)) * np.exp(-_t(n) / 0.01)
    elif kind in ("na", "tin", "ti"):                         # tabla dayan, tuned to D4
        f0 = 293.66
        n = int((0.9 if kind != "ti" else 0.15) * SR); t = _t(n)
        if kind == "na":
            amps, decs = [1, .55, .35, .22, .12], [0.42, 0.3, 0.2, 0.13, 0.08]
        elif kind == "tin":
            amps, decs = [1, .25, .12, .07, .04], [0.65, 0.35, 0.2, 0.12, 0.08]
        else:
            amps, decs = [1, .4, .2, .1, .05], [0.05, 0.04, 0.03, 0.02, 0.02]
        s = sum(a * np.sin(2 * np.pi * f0 * (k + 1) * (1 + 0.002 * k) * t + r.uniform(0, 6.3)) * np.exp(-t / d) for k, (a, d) in enumerate(zip(amps, decs)))
        s += 0.35 * filt(r.standard_normal(n), bp(2000, 9000)) * np.exp(-t / 0.004)
    elif kind == "ge":                                        # tabla bayan, open with the rising "ghe" glide
        n = int(0.9 * SR); t = _t(n)
        f = 82 + 38 * (1 - np.exp(-t / 0.12))
        s = np.sin(2 * np.pi * np.cumsum(f) / SR) * np.exp(-t / 0.5) + 0.3 * np.sin(2 * np.pi * np.cumsum(f * 2.1) / SR) * np.exp(-t / 0.2)
        s += 0.25 * filt(r.standard_normal(n), bp(150, 1500)) * np.exp(-t / 0.008)
    elif kind == "ke":
        n = int(0.15 * SR); t = _t(n)
        s = filt(r.standard_normal(n), bp(200, 2500)) * np.exp(-t / 0.012) + 0.5 * np.sin(2 * np.pi * 110 * t) * np.exp(-t / 0.03)
    elif kind == "taiko":
        s = membrane(46, 70, 0.03, 0.75, [(1.58, .3, .2), (2.1, .15, .1)], 2.0, (90, 1600), 0.5, 0.015, seed)
        s = np.tanh(1.6 * s) / np.tanh(1.6)
    elif kind == "taiko_ka":
        n = int(0.12 * SR); t = _t(n)
        s = filt(r.standard_normal(n), bp(1200, 5000)) * np.exp(-t / 0.008) + 0.6 * np.sin(2 * np.pi * 1180 * t) * np.exp(-t / 0.02)
    elif kind == "shime":
        s = membrane(360, 430, 0.008, 0.11, [(1.6, .3, .05)], 0.4, (1500, 7000), 0.4, 0.006, seed)
    elif kind == "hyoshigi":
        n = int(0.15 * SR); t = _t(n)
        s = np.sin(2 * np.pi * 2250 * t) * np.exp(-t / 0.035) + 0.5 * np.sin(2 * np.pi * 3420 * t) * np.exp(-t / 0.02) + 0.3 * r.standard_normal(n) * np.exp(-t / 0.002)
    elif kind == "tanggu":
        s = membrane(138, 190, 0.012, 0.28, [(1.55, .25, .1), (2.2, .1, .05)], 0.8, (300, 4000), 0.45, 0.008, seed)
    elif kind == "muyu":
        n = int(0.15 * SR); t = _t(n)
        s = np.sin(2 * np.pi * 980 * t) * np.exp(-t / 0.05) + 0.4 * np.sin(2 * np.pi * 2650 * t) * np.exp(-t / 0.02) + 0.2 * r.standard_normal(n) * np.exp(-t / 0.002)
    elif kind == "bo":                                        # small cymbals
        n = int(1.4 * SR); t = _t(n)
        s = sum(np.sin(2 * np.pi * f * t + r.uniform(0, 6.3)) * np.exp(-t / d) for f, d in ((2120, .5), (3010, .4), (4350, .35), (5730, .3), (7420, .25), (9100, .2)))
        s = s * 0.5 + filt(r.standard_normal(n), hp(5000)) * np.exp(-t / 0.25)
    elif kind == "cajon_bass":
        s = membrane(78, 115, 0.012, 0.18, [(2.0, .2, .05)], 0.5, (120, 1500), 0.4, 0.01, seed)
    elif kind == "cajon_slap":
        n = int(0.3 * SR); t = _t(n)
        s = filt(r.standard_normal(n), bp(900, 9000)) * (np.exp(-t / 0.008) + 0.35 * np.exp(-t / 0.08)) + 0.4 * np.sin(2 * np.pi * 260 * t) * np.exp(-t / 0.03)
    elif kind in ("palmas", "sordas"):
        n = int(0.3 * SR); t = _t(n)
        env = sum((t >= o) * np.exp(-np.clip(t - o, 0, None) / 0.006) * a for o, a in ((0, 1.0), (0.004 + 0.003 * r.random(), 0.8), (0.009 + 0.004 * r.random(), 0.7)))
        band = bp(1100, 7000) if kind == "palmas" else bp(350, 1600)
        s = filt(r.standard_normal(n), band) * env + 0.25 * filt(r.standard_normal(n), band) * np.exp(-t / 0.05)
    elif kind == "shaker":
        n = int(0.11 * SR); t = _t(n)
        s = filt(r.standard_normal(n), hp(6000)) * (1 - np.exp(-t / 0.004)) * np.exp(-t / 0.03)
    elif kind == "rim":
        n = int(0.12 * SR); t = _t(n)
        s = 0.8 * np.sin(2 * np.pi * 1650 * t) * np.exp(-t / 0.012) + 0.6 * np.sin(2 * np.pi * 420 * t) * np.exp(-t / 0.03) + 0.4 * filt(r.standard_normal(n), hp(3000)) * np.exp(-t / 0.003)
    elif kind == "kick":
        n = int(0.6 * SR); t = _t(n)
        s = np.sin(2 * np.pi * np.cumsum(44 + 120 * np.exp(-t / 0.028)) / SR) * np.exp(-t / 0.32)
        s += 0.18 * filt(r.standard_normal(n) * np.exp(-t / 0.0015), hp(1800))
        s = np.tanh(1.8 * s) / np.tanh(1.8)
    elif kind == "softkick":
        n = int(0.5 * SR); t = _t(n)
        s = np.sin(2 * np.pi * np.cumsum(52 + 50 * np.exp(-t / 0.03)) / SR) * np.exp(-t / 0.22)
    elif kind == "clap":
        n = int(0.45 * SR); t = _t(n)
        env = sum((t >= o) * np.exp(-np.clip(t - o, 0, None) / (0.0055 if k < 3 else 0.11)) for k, o in enumerate((0, 0.0085, 0.017, 0.027)))
        s = filt(r.standard_normal(n), bp(900, 7000), peak(1600, 4, 1)) * env
    elif kind == "snare":
        n = int(0.4 * SR); t = _t(n)
        s = 0.6 * np.sin(2 * np.pi * np.cumsum(185 + 60 * np.exp(-t / 0.01)) / SR) * np.exp(-t / 0.07) + filt(r.standard_normal(n), bp(1500, 9000)) * np.exp(-t / 0.09)
    elif kind == "tom":
        s = membrane(96, 150, 0.03, 0.35, [(1.5, .2, .1)], 0.9, (100, 2500), 0.3, 0.01, seed)
    elif kind == "hat":
        n = int(0.07 * SR); t = _t(n)
        s = filt(r.standard_normal(n), hp(7500)) * np.exp(-t / 0.016)
    else:
        raise ValueError(kind)
    s = norm(fades(s, 0.0003, 0.02), vel)
    _CACHE[key] = s
    return s


# ======================================================================== keys, strings, pads, bass
def piano(f0, vel=0.7, dur=3.0, seed=0, felt=0.6):
    """Additive piano: inharmonic partials, three detuned strings, two-stage decay, hammer thump. felt softens the tone."""
    key = _key("piano", round(f0, 3), round(vel, 3), dur, seed, felt)
    if key in _CACHE:
        return _CACHE[key]
    n = int(dur * SR); t = _t(n)
    r = np.random.default_rng(seed + int(f0))
    B = 0.00035 * (f0 / 261.6) ** 0.5
    out = np.zeros(n)
    K = int(min(20, 7000 / f0))
    for k in range(1, K + 1):
        fk = f0 * k * np.sqrt(1 + B * k * k)
        if fk > 16000:
            break
        bright = 0.6 + 0.8 * vel * (1 - 0.6 * felt)
        a = np.exp(-(k - 1) / (2.2 + 6 * bright)) / k ** 0.6
        d1 = 0.35 * (261.6 / f0) ** 0.6 / (1 + 0.08 * k * k) + 0.05
        d2 = 3.8 * (261.6 / f0) ** 0.7 / (1 + 0.025 * k * k)
        ph = r.uniform(0, 6.3)
        env = 0.65 * np.exp(-t / d1) + 0.35 * np.exp(-t / d2)
        out += a * (np.sin(2 * np.pi * fk * 2 ** (-0.35 / 1200) * t + ph) + np.sin(2 * np.pi * fk * 2 ** (0.4 / 1200) * t + ph + 0.7)) * 0.5 * env
    thump = filt(r.standard_normal(n) * np.exp(-t / 0.006), bp(60, 900 + 2000 * (1 - felt))) * 0.15 * vel
    out = out + thump
    out = filt(out, lp(1800 + 7000 * vel * (1 - 0.55 * felt), 1))
    out = norm(fades(out, 0.001, 0.25), vel)
    _CACHE[key] = out
    return out


def strings(freqs, dur, att=0.6, rel=0.8, bright=0.5, seed=0, vib=5.0):
    """String ensemble: per note five detuned sawtooth voices (band-limited additive) with vibrato, low-passed."""
    n = int(dur * SR); t = _t(n)
    r = np.random.default_rng(seed)
    out = np.zeros((2, n))
    for f in freqs:
        K = int(min(24, 6000 / f))
        for v in range(3):
            dc = (v - 1) * 6.0 + r.uniform(-1.5, 1.5)
            vr = vib * r.uniform(0.85, 1.15)
            ph_v = r.uniform(0, 6.3)
            inst = f * 2 ** ((dc + 6 * np.sin(2 * np.pi * vr * t + ph_v) * np.minimum(1, t / 0.8)) / 1200)
            phase = 2 * np.pi * np.cumsum(inst) / SR
            saw = sum(np.sin(k * phase + r.uniform(0, 6.3)) / k * np.exp(-k / (4 + 14 * bright)) for k in range(1, K + 1))
            ch = v % 2
            out[ch] += saw * (0.8 if v == 1 else 0.7)
            out[1 - ch] += saw * 0.3
    env = np.minimum(1, t / att) ** 1.5 * np.clip((dur - t) / rel, 0, 1)
    out = out * env / (len(freqs) * 2.2)
    return filt(out, lp(2200 + 4000 * bright, 2), hp(90, 2))


def pad(freqs, dur, att=0.8, rel=1.2, bright=7.0, seed=0, det=(-9, -3, 4, 10)):
    r = np.random.default_rng(seed)
    n = int(dur * SR); t = _t(n)
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


def ep(f0, vel=0.7, dur=2.5, seed=0):
    """FM electric piano (tine): carrier 1:1 with decaying index, a bell partial at 14x on the attack."""
    n = int(dur * SR); t = _t(n)
    I = (0.6 + 2.2 * vel) * np.exp(-t / 0.35) + 0.25
    s = np.sin(2 * np.pi * f0 * t + I * np.sin(2 * np.pi * f0 * t))
    s += 0.18 * vel * np.sin(2 * np.pi * f0 * 14 * t) * np.exp(-t / 0.02)
    s *= (1 - np.exp(-t / 0.002)) * (0.6 * np.exp(-t / 0.9) + 0.4 * np.exp(-t / 3.0))
    return norm(fades(filt(s, lp(5000, 1)), 0.0005, 0.2), vel)


def sub(f0, dur, vel=1.0, drive=1.4):
    n = int(dur * SR); t = _t(n)
    s = np.sin(2 * np.pi * f0 * t) + 0.25 * np.sin(4 * np.pi * f0 * t)
    s = np.tanh(drive * s) / np.tanh(drive)
    return fades(s, 0.006, 0.08) * vel


def tanpura_cycle(dur, notes, period=1.5, vel=0.5, seed=0):
    """Tanpura: the four strings plucked in turn (Pa Sa Sa Sa), each ringing long with the jawari bloom."""
    n = int(dur * SR)
    out = np.zeros(n)
    t0, i = 0.0, 0
    while t0 < dur - 0.2:
        f = notes[i % len(notes)]
        x = pluck("tanpura", f, vel * (0.9 if i % 4 else 1.0), dur=min(5.0, dur - t0 + 0.1), seed=seed + i)
        i0 = int(t0 * SR)
        m = min(len(x), n - i0)
        out[i0:i0 + m] += x[:m]
        t0 += period / 4 * (1.0 + 0.04 * np.sin(i))
        i += 1
    return out / 2.2


# ======================================================================== sound design
def drone_cold(dur, seed=9):
    n = int(dur * SR); t = _t(n); p = t / dur
    out = np.zeros((2, n))
    r = np.random.default_rng(seed)
    for f, amp in ((36.71, 1.0), (73.42, .7), (110.0, .32), (146.83, .2)):
        for ch in range(2):
            ff = f * 2 ** ((4 if ch else -4) / 1200)
            bright = 2.2 + 13 * p ** 1.7
            for k in range(1, 40):
                if ff * k > 5000:
                    break
                out[ch] += amp * np.sin(2 * np.pi * ff * k * t + r.uniform(0, 6.3)) * np.exp(-k / bright) / k
    return out * np.minimum(1, t / 1.6) * (0.45 + 0.55 * p)


def cluster(dur, notes=(587.33, 622.25, 830.61, 1174.66)):
    n = int(dur * SR); t = _t(n); p = t / dur
    s = sum(np.sin(2 * np.pi * f * t + 0.8 * np.sin(2 * np.pi * 0.23 * t + k)) for k, f in enumerate(notes))
    trem = 1 + 0.5 * np.sin(2 * np.pi * np.cumsum(1.5 + 9 * p ** 2) / SR)
    return s * trem * p ** 2 / 4


def noise_sweep(dur, f0, f1, q_oct=1.2, curve=2.0, seed=0, rise=True):
    r = np.random.default_rng(seed)
    n = int(dur * SR)
    x = r.standard_normal(n)

    def H(f, tt):
        pp = np.clip(tt / dur, 0, 1)
        fc = f0 * (f1 / f0) ** pp
        return np.exp(-0.5 * (np.log2(np.maximum(f, 1) / fc) / (q_oct / 2)) ** 2)
    y = stft_filter(x, H)
    pp = _t(n) / dur
    y *= pp ** curve if rise else (1 - pp) ** curve
    return norm(y)


def shepard(dur, octaves=1.0, base=55.0, seed=0):
    n = int(dur * SR); t = _t(n)
    out = np.zeros(n)
    r = np.random.default_rng(seed)
    for k in range(7):
        pos = (k + octaves * t / dur) % 7
        f = base * 2 ** pos
        out += np.exp(-0.5 * ((pos - 3.5) / 1.3) ** 2) * np.sin(2 * np.pi * np.cumsum(f) / SR + r.uniform(0, 6.3))
    return norm(out)


def whoosh(dur=0.6, up=True, seed=0, lo=300, hi=5000):
    f0, f1 = (lo, hi) if up else (hi, lo)
    x = noise_sweep(dur, f0, f1, q_oct=1.6, seed=seed)
    n = len(x)
    env = np.sin(np.pi * np.clip(_t(n) / dur, 0, 1)) ** 1.5
    x = norm(x) * env
    pp = np.linspace(-0.6, 0.6, n) if up else np.linspace(0.6, -0.6, n)
    a = (pp + 1) * np.pi / 4
    return np.stack([x * np.cos(a), x * np.sin(a)])


def boom(vel=1.0, seed=0, length=2.6):
    r = np.random.default_rng(seed)
    n = int(length * SR); t = _t(n)
    s = np.sin(2 * np.pi * np.cumsum(30 + 55 * np.exp(-t / 0.08)) / SR) * np.exp(-t / 0.85)
    s += 0.3 * filt(r.standard_normal(n), bp(120, 3500)) * np.exp(-t / 0.05)
    return np.tanh(1.5 * s) / np.tanh(1.5) * vel


def cymbal(length=3.0, seed=0, reverse=False):
    r = np.random.default_rng(seed)
    n = int(length * SR); t = _t(n)
    s = filt(r.standard_normal(n), hp(4200), peak(7000, 3, 1)) * np.exp(-t / (length * 0.32))
    s = norm(s)
    if reverse:
        s = s[::-1] * np.linspace(0, 1, n) ** 0.5
    return s


def shimmer(dur, root=1174.66, seed=0):
    r = np.random.default_rng(seed)
    n = int(dur * SR); t = _t(n)
    out = np.zeros((2, n))
    for ch in range(2):
        for ratio in (1, 1.5, 2, 3, 4):
            f = root * ratio * 2 ** (r.uniform(-6, 6) / 1200)
            trem = 0.55 + 0.45 * np.sin(2 * np.pi * r.uniform(0.3, 1.1) * t + r.uniform(0, 6.3))
            out[ch] += np.sin(2 * np.pi * f * t + r.uniform(0, 6.3)) * trem / ratio
    return out * np.minimum(1, t / 0.4) * np.exp(-t / (dur * 0.45)) / 3


def ui_click(vel=1.0, seed=0):
    r = np.random.default_rng(seed)
    n = int(0.08 * SR); t = _t(n)
    s = 0.8 * filt(r.standard_normal(n) * np.exp(-t / 0.0012), bp(1500, 9000))
    s += 0.5 * np.sin(2 * np.pi * 1350 * t) * np.exp(-t / 0.006) + 0.5 * np.sin(2 * np.pi * 95 * t) * np.exp(-t / 0.02)
    return norm(s, vel)


def tick(vel=1.0, f=760.0, seed=5):
    n = int(0.05 * SR); t = _t(n)
    s = np.sin(2 * np.pi * f * t) * np.exp(-t / 0.008) + 0.4 * filt(np.random.default_rng(seed).standard_normal(n) * np.exp(-t / 0.002), hp(3000))
    return norm(s, vel)


def blip(f0, f1, dur, vel=1.0):
    n = int(dur * SR); t = _t(n)
    f = f0 * (f1 / f0) ** np.clip(t / (dur * 0.6), 0, 1)
    ph = 2 * np.pi * np.cumsum(f) / SR
    return (np.sin(ph) + 0.2 * np.sin(2 * ph)) * (1 - np.exp(-t / 0.002)) * np.exp(-t / (dur / 3.5)) * vel


def heartbeat(vel=1.0):
    n = int(0.5 * SR); t = _t(n)
    s = np.sin(2 * np.pi * np.cumsum(48 + 30 * np.exp(-t / 0.04)) / SR) * np.exp(-t / 0.12)
    s2 = np.zeros(n); i0 = int(0.17 * SR)
    s2[i0:] = 0.6 * s[: n - i0]
    return norm(s + s2, vel)


def whomp(dur=0.9, f0=90):
    n = int(dur * SR); t = _t(n)
    s = np.sin(2 * np.pi * np.cumsum(f0 * (0.7 + 0.3 * np.minimum(1, t / 0.3))) / SR) * np.sin(np.pi * np.clip(t / dur, 0, 1)) ** 1.2
    air = filt(np.random.default_rng(3).standard_normal(n), bp(1500, 7000)) * np.sin(np.pi * np.clip(t / dur, 0, 1)) ** 3 * 0.08
    return norm(s + air)


def glass_ping(f=2600, vel=0.6, seed=0):
    n = int(1.2 * SR); t = _t(n)
    r = np.random.default_rng(seed)
    s = sum(a * np.sin(2 * np.pi * f * m * t + r.uniform(0, 6.3)) * np.exp(-t / d) for m, a, d in ((1, 1, .5), (2.76, .5, .25), (5.4, .25, .12), (8.9, .12, .06)))
    return norm(s * (1 - np.exp(-t / 0.001)), vel)


def glitch(dur=0.3, seed=0):
    r = np.random.default_rng(seed)
    n = int(dur * SR)
    src = filt(r.standard_normal(n), bp(500, 6000))
    out = np.zeros(n)
    pos = 0
    while pos < n:
        L = int(r.uniform(0.01, 0.045) * SR)
        g = src[pos:pos + L].copy()
        for k in range(r.integers(1, 4)):
            a = pos + k * L
            if a + L > n:
                break
            out[a:a + L] += g[: n - a][:L] * r.uniform(0.4, 1.0)
        pos += L * 3
    return norm(out)


def breath(dur=0.6, seed=0):
    n = int(dur * SR); t = _t(n)
    s = filt(np.random.default_rng(seed).standard_normal(n), bp(600, 5000), peak(1800, 6, 1)) * np.sin(np.pi * np.clip(t / dur, 0, 1)) ** 2
    return norm(s, 0.3)
