"""Per-language mix of the Avorythm demo: music + sound design + the 'Coastlines' video audio (Japanese narrator + sea)
+ the Gemini Live dub, with the product's own behaviour audible: smart ducking of the original under the dub, the pause
(tape stop), the original-audio checkbox and volume slider in the synchronized player. Mastered to -14 LUFS, <= -1 dBTP.

  python -I video/films/demo/tools/mix.py --lang en
"""
import argparse
import json
import sys
import wave
from pathlib import Path

import numpy as np

sys.stdout.reconfigure(encoding="utf-8", errors="replace")
sys.path.insert(0, str(Path(__file__).resolve().parent))
import dsp  # noqa: E402
from dsp import SR, filt, hp, lp, bp, peak_eq, shelf_hi, t_axis  # noqa: E402
from score import read_wav, write_wav, TL, C, DUR, N, BUILD  # noqa: E402


def db(x):
    return 10 ** (x / 20)


def load_voice(clip: str) -> np.ndarray:
    with wave.open(str(BUILD / "voices" / f"{clip}.wav"), "rb") as w:
        sr = w.getframerate()
        x = np.frombuffer(w.readframes(w.getnframes()), dtype=np.int16) / 32768.0
    # 24 kHz -> 48 kHz: zero-stuff + brick-wall low-pass (zero-phase FFT)
    if sr * 2 == SR:
        y = np.zeros(len(x) * 2)
        y[::2] = x * 2
        x = filt(y, lp(11300, 8))
    x = filt(x, hp(85, 2), peak_eq(3300, 2.0, 1.2), peak_eq(220, -1.5, 1.0), shelf_hi(9000, 1.5))
    # gentle RMS compression for an even read
    env = np.sqrt(np.convolve(x ** 2, np.ones(480) / 480, mode="same")) + 1e-6
    thr = 10 ** (-24 / 20)
    gain = np.where(env > thr, (thr / env) ** (1 - 1 / 2.5), 1.0)
    gain = np.convolve(gain, np.ones(240) / 240, mode="same")
    x = x * gain
    return x / (np.sqrt(np.mean(x[np.abs(x) > 0.01] ** 2)) + 1e-9) * 0.12  # equal speech level for every clip


def place(bus: np.ndarray, sig: np.ndarray, t: float, gain=1.0, pan=0.0):
    i0 = int(round(t * SR))
    m = min(len(sig), bus.shape[1] - i0)
    if m <= 0:
        return
    a = (pan + 1) * np.pi / 4
    bus[0, i0:i0 + m] += sig[:m] * gain * np.cos(a) * np.sqrt(2)
    bus[1, i0:i0 + m] += sig[:m] * gain * np.sin(a) * np.sqrt(2)


def tape_stop(sig: np.ndarray, t_cut: float, dur=0.16) -> np.ndarray:
    """Plays sig up to t_cut, then winds the playback rate down to zero over `dur` seconds."""
    i0 = int(t_cut * SR)
    if i0 >= len(sig):
        return sig
    n = int(dur * SR)
    rate = np.linspace(1, 0, n) ** 1.6
    pos = i0 + np.cumsum(rate)
    tail = np.interp(pos, np.arange(len(sig)), sig) * np.linspace(1, 0, n) ** 0.7
    return np.concatenate([sig[:i0], tail])


def ocean(seed=1) -> np.ndarray:
    r = np.random.default_rng(seed)
    t = t_axis(N)
    out = np.zeros((2, N))
    for ch in range(2):
        brown = np.cumsum(r.standard_normal(N)) * 0.02
        brown -= np.convolve(brown, np.ones(4800) / 4800, mode="same")
        swell = 0.45 + 0.55 * np.sin(2 * np.pi * (0.085 + 0.01 * ch) * t + ch) ** 2
        wash = filt(r.standard_normal(N), bp(500, 4500)) * (np.maximum(0, np.sin(2 * np.pi * 0.085 * t + 0.6 + ch)) ** 6)
        out[ch] = filt(brown, lp(900, 2)) * swell + 0.22 * wash
    return out / np.abs(out).max()


def envelope(x: np.ndarray, att=0.02, rel=0.35) -> np.ndarray:
    """Smoothed activity envelope (0..1) of a mono signal."""
    e = np.abs(x)
    e = np.convolve(e, np.ones(960) / 960, mode="same")
    e = np.clip(e / (np.percentile(e[e > 1e-4], 90) + 1e-9 if np.any(e > 1e-4) else 1), 0, 1)
    out = np.zeros_like(e)
    a, r = 1 - np.exp(-1 / (att * SR)), 1 - np.exp(-1 / (rel * SR))
    # one-pole follower, decimated for speed
    step = 48
    v = 0.0
    for i in range(0, len(e), step):
        target = e[i]
        k = a if target > v else r
        v += (target - v) * (1 - (1 - k) ** step)
        out[i:i + step] = v
    return out


def ramp(points, n=N):
    """Piecewise-linear gain curve from [(t, gain), ...]."""
    ts = np.array([p[0] for p in points]) * SR
    gs = np.array([p[1] for p in points])
    return np.interp(np.arange(n), ts, gs)


# ------------------------------------------------------------------ loudness (ITU-R BS.1770-4)
# K-weighting biquads at 48 kHz (pre-filter shelf, RLB high-pass)
KW = (([1.53512485958697, -2.69169618940638, 1.19839281085285], [1.0, -1.69065929318241, 0.73248077421585]),
      ([1.0, -2.0, 1.0], [1.0, -1.99004745483398, 0.99007225036621]))


def lufs(x: np.ndarray) -> float:
    """Integrated loudness (BS.1770-4): K-weighting applied in the frequency domain, 400 ms blocks, absolute + relative gates."""
    n = x.shape[1]
    L = dsp.nextpow2(n + 4096)
    f = np.fft.rfftfreq(L, 1 / SR)
    z = np.exp(1j * 2 * np.pi * f / SR)
    def H(b, a):
        return (b[0] + b[1] / z + b[2] / z ** 2) / (a[0] + a[1] / z + a[2] / z ** 2)
    (b1, a1), (b2, a2) = KW
    Hk = H(b1, a1) * H(b2, a2)
    y = np.stack([np.fft.irfft(np.fft.rfft(c, L) * Hk, L)[:n] for c in x])
    blk, hop = int(0.4 * SR), int(0.1 * SR)
    ms = np.array([np.mean(y[:, i:i + blk] ** 2, axis=1).sum() for i in range(0, n - blk, hop)])
    l = -0.691 + 10 * np.log10(ms + 1e-12)
    g = ms[l > -70]
    rel = -0.691 + 10 * np.log10(g.mean()) - 10
    g2 = g[(-0.691 + 10 * np.log10(g)) > rel]
    return -0.691 + 10 * np.log10(g2.mean())


def true_peak(x: np.ndarray) -> float:
    n = x.shape[1]
    L = dsp.nextpow2(n)
    up = []
    for c in x:
        X = np.fft.rfft(c, L)
        Y = np.zeros(L * 2 + 1, dtype=complex)
        Y[: len(X)] = X
        up.append(np.fft.irfft(Y, L * 4)[: n * 4] * 4)
    return 20 * np.log10(np.max(np.abs(up)) + 1e-12)


def limiter(x: np.ndarray, ceiling_db=-1.3, look=0.003, rel=0.08) -> np.ndarray:
    c = db(ceiling_db)
    # inter-sample (true) peak envelope: 4x oversampled, max over each group of 4
    n = x.shape[1]
    Lf = dsp.nextpow2(n)
    peak = np.zeros(n)
    for ch in x:
        X = np.fft.rfft(ch, Lf)
        Y = np.zeros(Lf * 2 + 1, dtype=complex)
        Y[: len(X)] = X
        up = np.fft.irfft(Y, Lf * 4)[: n * 4] * 4
        peak = np.maximum(peak, np.abs(up).reshape(n, 4).max(axis=1))
    need = np.minimum(1, c / np.maximum(peak, 1e-9))
    la = int(look * SR)
    # look-ahead minimum + smooth release
    g = np.minimum.reduce([np.roll(need, -k) for k in range(0, la, 8)])
    out = np.empty_like(g)
    v = 1.0
    r = 1 - np.exp(-1 / (rel * SR))
    for i in range(0, len(g), 32):
        tgt = g[i:i + 32].min()
        v = tgt if tgt < v else v + (tgt - v) * (1 - (1 - r) ** 32)
        out[i:i + 32] = v
    out = np.convolve(out, np.ones(64) / 64, mode="same")
    return x * out[None, :]


# ------------------------------------------------------------------ main
def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("--lang", default="en")
    a = ap.parse_args()
    lang = a.lang
    src = "ko" if lang == "ja" else "ja"
    music = read_wav(BUILD / "music.wav")[:, :N]
    sfx = read_wav(BUILD / lang / "sfx.wav")[:, :N]
    orig = np.zeros((2, N))
    dub = np.zeros((2, N))
    clips = {v["id"]: v for v in TL["voices"]}
    get = lambda vid: load_voice(clips[vid]["clip"].replace("{src}", src).replace("{lang}", lang))
    T = lambda vid: C[clips[vid]["at"]]
    # --- hook + card (on-page mode, smart ducking on)
    s1, d1, s2, d2 = get("src1"), get("dub1"), get("src2"), get("dub2")
    place(orig, s1, T("src1"), 1.0, -0.08)
    place(dub, d1, T("dub1"), 1.0, 0.0)
    place(orig, s2, T("src2"), 1.0, -0.08)
    place(dub, d2, T("dub2"), 1.0, 0.0)
    # --- synchronized player: first play (cut by the pause), then from the seek point
    s3, d3 = get("src3a"), get("dub3a")
    cut = C["pause"] - C["vo_3a"]
    place(orig, tape_stop(s3, cut), T("src3a"), 1.0, -0.08)
    place(dub, tape_stop(d3, cut), T("dub3a"), 1.0, 0.0)
    place(orig, s3, C["play"], 1.0, -0.08)
    place(dub, d3, C["play"], 1.0, 0.0)
    # the video's own sound: the sea
    sea = filt(ocean(3), hp(110, 2), peak_eq(1800, 3, 1.5)) * 0.03
    video_on = ramp([(0, 1), (5.4, 1), (6.4, 0.35), (7.4, 0.0), (C["toCard"], 0.0), (C["toCard"] + 0.6, 0.8), (C["whip"] - 0.3, 0.8), (C["whip"], 0.0),
                     (C["vo_3a"] - 0.2, 0.0), (C["vo_3a"], 0.8), (C["pause"], 0.8), (C["pause"] + 0.12, 0.0), (C["play"], 0.0), (C["play"] + 0.05, 0.8),
                     (C["toLaptop"] - 0.1, 0.8), (C["toLaptop"] + 0.4, 0.0), (DUR, 0.0)])
    orig += sea * video_on[None, :]
    # --- product behaviour on the original track
    dub_env = envelope(dub.mean(axis=0))
    smart = ramp([(0, 1), (C["vo_3a"] - 0.1, 1), (C["vo_3a"] - 0.05, 0), (C["duck"], 0), (C["duck"] + 0.08, 1), (DUR, 1)])  # player starts with ducking off
    duck_orig = 1 - (1 - db(-15)) * dub_env * smart
    P = db(-6)  # the synchronized player starts with ducking off: the original sits a little lower so the dub stays clear
    orig_level = ramp([(0, db(-2)), (C["vo_3a"] - 0.3, db(-2)), (C["vo_3a"] - 0.1, P), (C["origOff"] - 0.005, P), (C["origOff"] + 0.01, 0.0),
                       (C["origOn"] - 0.005, 0.0), (C["origOn"] + 0.01, P), (C["volDown"], P), (C["volUp"], P * 0.25), (DUR, P * 0.25)])
    # the hook starts with the original at full level (nothing to duck yet)
    orig = orig * (duck_orig * orig_level)[None, :]
    # a little room on the original so it sits "inside the video"
    ir_room = dsp.make_ir(0.6, 0.008, 0.6, seed=5)
    orig = orig * 0.9 + dsp.convolve(orig, ir_room) * 0.18
    # the original leaves with the player; the dub finishes its sentence over the cut to the laptop (J-cut)
    orig *= ramp([(0, 1), (C["toLaptop"] - 0.1, 1), (C["toLaptop"] + 0.45, 0), (DUR, 0)])[None, :]
    dub *= ramp([(0, 1), (C["toLaptop"] + 1.25, 1), (C["toLaptop"] + 1.75, 0), (DUR, 0)])[None, :]
    # the wall of languages: the same sentence in every voice we have, the viewer's own first
    chorus = np.zeros((2, N))
    langs = ["en", "fa", "ru", "ar", "zh", "hi", "es", "pt", "fr", "de", "tr", "ja"]
    order = [lang] + [l for l in langs if l != lang] + ["src-ko", "src-ja"]
    for j, l in enumerate(order):
        clip = f"{l}-L1" if l.startswith("src") else f"dub-{l}-L1"
        v = filt(load_voice(clip), hp(170, 2))
        g = db(-7) if j == 0 else db(-19)
        p_ = 0.0 if j == 0 else (-0.85 + 1.7 * ((j * 0.618) % 1))
        place(chorus, v, C["wall"] + (0.0 if j == 0 else 0.1 + j * 0.085), g, p_)
    chorus *= ramp([(0, 1), (C["wallOut"] + 0.2, 1), (C["end"] + 0.25, 0), (DUR, 0)])[None, :]
    chorus = chorus * 0.85 + dsp.convolve(chorus, dsp.make_ir(1.4, 0.01, 0.5, seed=9)) * 0.3
    # --- music side-chained under the voices; quieter while the mixer is being demonstrated
    voice_env = np.maximum(dub_env, 0.6 * envelope(orig.mean(axis=0)))
    # frequency-aware side-chain: the voice band of the music/sfx ducks hard, the low end keeps the drops' punch
    m_lo = filt(music, lp(180, 2)); m_hi = music - m_lo
    s_lo = filt(sfx, lp(180, 2)); s_hi = sfx - s_lo
    duck_hi = 1 - (1 - db(-12)) * dub_env - (1 - db(-6)) * (voice_env - dub_env).clip(0, 1)
    duck_lo = 1 - (1 - db(-5)) * voice_env
    sfx_hi = 1 - (1 - db(-7)) * dub_env
    scene = ramp([(0, db(-2)), (2.0, db(-3)), (4.0, db(0)), (C["toDock"], db(0)), (C["toDock"] + 0.3, db(-5)), (C["toLaptop"], db(-5)), (C["toLaptop"] + 0.3, db(0)), (DUR, db(0))])
    music = m_hi * (duck_hi * scene)[None, :] + m_lo * (duck_lo * scene)[None, :]
    sfx = s_hi * sfx_hi[None, :] + s_lo
    mix = music * db(2.5) + sfx * db(0) + orig * db(-1.5) + dub * db(0) + chorus
    mix = filt(mix, hp(30, 2), peak_eq(55, -2.0, 1.2))
    # --- master: loudness to -14 LUFS, true peak <= -1 dBTP
    for _ in range(3):
        L = lufs(mix)
        mix *= db(-14.0 - L)
        mix = limiter(mix, -1.7)
    L, tp = lufs(mix), true_peak(mix)
    fade = ramp([(0, 1), (TL["cues"]["fade"], 1), (DUR, 0)]) ** 1.5
    mix *= fade[None, :]
    mix[:, :48] *= np.linspace(0, 1, 48)[None, :]
    out = BUILD / lang / "mix.wav"
    write_wav(out, mix)
    (BUILD / lang / "mix.json").write_text(json.dumps({"lufs": round(L, 2), "true_peak_dbtp": round(tp, 2)}), encoding="utf-8")
    print(f"{lang}: mix.wav  {L:.2f} LUFS  true peak {tp:.2f} dBTP")


if __name__ == "__main__":
    main()
