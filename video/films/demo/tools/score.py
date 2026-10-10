"""Score + sound design for the Avorythm product demo (120 BPM, B minor -> D major). Pure numpy, no samples.

  python -I video/films/demo/tools/score.py            # music stem (cached) + language-independent sfx
  python -I video/films/demo/tools/score.py --lang fa  # + the few language-dependent ticks (dropdown list)

Reads every cue from video/films/demo/timeline.json (the same file film.js reads), so picture and sound stay locked.
Writes video/build/demo/music.wav and video/build/demo/<lang>/sfx.wav (48 kHz stereo float -> 24-bit).
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
from dsp import SR, Bus, filt, hp, lp, bp, peak_eq, pan, fades, t_axis  # noqa: E402

HERE = Path(__file__).resolve().parent
FILM = HERE.parent
BUILD = FILM.parents[1] / "build" / "demo"
TL = json.loads((FILM / "timeline.json").read_text(encoding="utf-8"))
C = TL["cues"]
DUR = TL["duration"]
BEAT = 60 / TL["bpm"]
BAR = 4 * BEAT
N = int(DUR * SR)


def mtof(m):
    return 440.0 * 2 ** ((m - 69) / 12)


def write_wav(path: Path, x: np.ndarray):
    path.parent.mkdir(parents=True, exist_ok=True)
    x = np.clip(x, -1, 1)
    pcm = (x.T * 8388607).astype(np.int32)
    raw = pcm.astype("<i4").tobytes()
    # pack 24-bit little endian
    arr = np.frombuffer(raw, dtype=np.uint8).reshape(-1, 4)[:, :3]
    with wave.open(str(path), "wb") as w:
        w.setnchannels(2)
        w.setsampwidth(3)
        w.setframerate(SR)
        w.writeframes(arr.tobytes())


def read_wav(path: Path) -> np.ndarray:
    with wave.open(str(path), "rb") as w:
        n, ch, sw, sr = w.getnframes(), w.getnchannels(), w.getsampwidth(), w.getframerate()
        raw = w.readframes(n)
    if sw == 3:
        a = np.frombuffer(raw, dtype=np.uint8).reshape(-1, 3)
        v = (a[:, 0].astype(np.int32) | (a[:, 1].astype(np.int32) << 8) | (a[:, 2].astype(np.int32) << 16))
        v = np.where(v >= 1 << 23, v - (1 << 24), v) / 8388608.0
    else:
        v = np.frombuffer(raw, dtype=np.int16) / 32768.0
    x = v.reshape(-1, ch).T
    if sr != SR:
        idx = np.arange(int(x.shape[1] * SR / sr)) * sr / SR
        x = np.stack([np.interp(idx, np.arange(x.shape[1]), c) for c in x])
    return x


# ------------------------------------------------------------------ harmony
CH = {
    "Bm9": (35, [59, 62, 66, 69, 73]),
    "Gmaj9": (31, [55, 59, 62, 66, 69]),
    "D": (38, [57, 62, 66, 69, 74]),
    "A": (33, [57, 61, 64, 69, 71]),
    "Bm": (35, [54, 59, 62, 66, 71]),
    "G": (31, [55, 59, 62, 67, 71]),
    "Em9": (40, [55, 59, 62, 66, 67]),
    "F#7": (30, [54, 58, 61, 64, 66]),
    "Asus": (33, [57, 62, 64, 69, 71]),
    "Dadd9": (38, [57, 62, 64, 66, 69, 74]),
}
# one entry per 2 s bar; "X|Y" = two chords of one beat-pair each
BARS = ["Bm9", "Gmaj9", "D", "A", "Bm", "G", "D", "A", "Em9|F#7", "Bm", "G", "D", "A", "Bm", "G", "Em9|Asus", "D", "A", "Dadd9", "Dadd9"]


def chord_spans():
    out = []
    for k, name in enumerate(BARS):
        t0 = k * BAR
        if "|" in name:
            a, b = name.split("|")
            out += [(t0, BAR / 2, a), (t0 + BAR / 2, BAR / 2, b)]
        else:
            out.append((t0, BAR, name))
    # merge the final held chord
    merged = []
    for s in out:
        if merged and merged[-1][2] == s[2] == "Dadd9":
            merged[-1] = (merged[-1][0], merged[-1][1] + s[1], s[2])
        else:
            merged.append(s)
    return merged


def section(t):
    if t < 4: return "intro"
    if t < 16: return "A"
    if t < 18: return "build"
    if t < 30: return "half" if 21.5 <= t < 24 else "B"
    if t < 32: return "break"
    if t < 36: return "final"
    return "tail"


# ------------------------------------------------------------------ instruments (beyond dsp.py)
def sub_bass(freq, dur, vel=1.0):
    n = int(dur * SR)
    t = t_axis(n)
    ph = 2 * np.pi * freq * t
    s = np.sin(ph) + 0.35 * np.sin(2 * ph) + 0.12 * np.sin(3 * ph)
    saw = sum(np.sin(k * ph) / k for k in range(1, 12))
    s = np.tanh(1.3 * s) + 0.18 * filt(saw, lp(900, 2)) * np.exp(-t / 0.18)
    return fades(s, 0.004, 0.04) * vel


def bell(freq, dur=2.4, vel=1.0, ratio=3.5, idx=1.5, decay=2.0):
    n = int(dur * SR)
    t = t_axis(n)
    s = np.sin(2 * np.pi * freq * t + idx * np.exp(-t * 3) * np.sin(2 * np.pi * freq * ratio * t))
    s += 0.3 * np.sin(2 * np.pi * freq * 2.01 * t) * np.exp(-t * 4)
    return s * np.exp(-t * decay) * np.minimum(1, t / 0.002) * vel


def reverse_cymbal(dur=1.2, seed=0):
    c = dsp.crash(1.0, seed, dur + 0.2)[: int(dur * SR)]
    c = c[::-1] * np.linspace(0, 1, int(dur * SR)) ** 1.5
    return filt(c, hp(2500))


def snare(vel=1.0, seed=0):
    r = np.random.default_rng(seed)
    n = int(0.25 * SR)
    t = t_axis(n)
    body = np.sin(2 * np.pi * (190 + 60 * np.exp(-t / 0.01)) * t) * np.exp(-t / 0.05)
    nz = filt(r.standard_normal(n), bp(1500, 9000)) * np.exp(-t / 0.07)
    s = 0.6 * body + 0.9 * nz / (np.abs(nz).max() + 1e-9)
    return s / np.abs(s).max() * vel


# ------------------------------------------------------------------ music
def make_music() -> np.ndarray:
    drums, bass, pads, arp, lead, fx = Bus(DUR), Bus(DUR), Bus(DUR), Bus(DUR), Bus(DUR), Bus(DUR)
    rev, dly = Bus(DUR), Bus(DUR)
    spans = chord_spans()
    chord_at = lambda t: next(s for s in spans if s[0] <= t < s[0] + s[1] + 1e-9)[2]

    # ---- kicks (and the side-chain envelope they drive)
    kicks = []
    for b in range(int(DUR / BEAT)):
        t = b * BEAT
        sec = section(t)
        if sec in ("A", "B", "final"):
            kicks.append((t, 1.0 if b % 4 == 0 else 0.9))
        elif sec == "half" and b % 4 in (0, 2):
            kicks.append((t, 0.8))
    kicks.append((36.0, 1.15))
    duck = np.ones(N)
    for tk, v in kicks:
        i0 = int(tk * SR)
        m = min(N - i0, int(0.45 * SR))
        tt = np.arange(m) / SR
        env = 1 - 0.62 * np.exp(-tt / 0.11) * np.minimum(1, tt / 0.004)
        duck[i0:i0 + m] = np.minimum(duck[i0:i0 + m], env)
    k = dsp.kick(1.0, 1.0)
    for tk, v in kicks:
        drums.add(k, tk, 20 * np.log10(v) - 3)
    # build (16-17.5): the kick keeps driving, low-passed, while everything else climbs
    for j in range(7):
        tk = 16.0 + j * BEAT / (1 if j < 4 else 2)
        if tk < 17.5:
            drums.add(filt(dsp.kick(1.0, 0.6), lp(400 + 300 * j, 2)), tk, -7 + j * 0.4)
    for i in range(16):
        t = 16.0 + i * BEAT / 4
        drums.add(dsp.hat(1.0, 200 + i), t, -30 + i * 0.8, 0.3 if i % 2 else -0.3)
    # muffled heartbeat kick under the flip (intro bar 2)
    km = filt(dsp.kick(1.0, 0.3), lp(220, 2))
    for tk in (2.0, 2.5, 3.0, 3.5):
        drums.add(km, tk, -9 if tk < 3 else -6)

    # ---- claps, hats, rolls
    cl = dsp.clap(1.0, 3)
    for b in range(int(DUR / BEAT)):
        t = b * BEAT
        sec = section(t)
        if sec in ("A", "B", "final") and b % 2 == 1:
            drums.add(cl, t, -10); rev.add(cl, t, -18)
        if sec == "half" and b % 4 == 2:
            drums.add(cl, t, -10); rev.add(cl, t, -14)
    for i in range(int(DUR / (BEAT / 4))):
        t = i * BEAT / 4
        sec = section(t)
        if sec in ("A", "B", "final"):
            if i % 4 == 2:
                drums.add(dsp.hat(1.0, i, open_=True), t, -21, 0.25)
            elif sec in ("B", "final") and i % 2 == 1:
                drums.add(dsp.hat(1.0, i), t, -27 + 2 * (i % 4 == 3), -0.3)
            elif sec == "A" and i % 4 == 0 and t >= 8:
                drums.add(dsp.hat(1.0, i), t, -29, -0.2)
        if sec == "half" and i % 4 == 2:
            drums.add(dsp.hat(1.0, i), t, -26, 0.2)
    sn = snare(1.0, 5)

    def roll(t0, t1, g0, g1, steps):
        tt = t0
        for (a, b, step) in steps:
            while tt < min(b, t1) - 1e-6:
                g = g0 + (g1 - g0) * (tt - t0) / (t1 - t0)
                drums.add(sn, tt, g, 0.05); rev.add(sn, tt, g - 8)
                tt += step
    roll(3.0, 4.0, -28, -14, [(3.0, 3.5, BEAT / 2), (3.5, 4.0, BEAT / 4)])
    roll(16.0, 18.0, -30, -11, [(16.0, 17.0, BEAT / 2), (17.0, 17.5, BEAT / 4), (17.5, 17.875, BEAT / 8)])
    roll(31.0, 32.0, -26, -12, [(31.0, 31.5, BEAT / 4), (31.5, 31.875, BEAT / 8)])
    for t0 in (4.0, 18.0, 32.0):
        drums.add(dsp.crash(1.0, int(t0), 3.0), t0, -15, 0.15); rev.add(dsp.crash(1.0, 9, 3.0), t0, -20)
        fx.add(reverse_cymbal(1.3, int(t0)), t0 - 1.3, -14)
    drums.add(dsp.crash(1.0, 36, 4.5), 36.0, -12, -0.1)

    # ---- bass
    for (t0, d, name) in spans:
        root = mtof(CH[name][0])
        sec = section(t0 + 0.01)
        if sec in ("A", "B", "final"):
            for j in range(int(round(d / (BEAT / 2)))):
                t = t0 + j * BEAT / 2
                if j % 2 == 1 or sec != "A" or (j % 4 == 0 and t >= 8):
                    f = root * (2 if (sec in ("B", "final") and j % 4 == 3) else 1)
                    bass.add(sub_bass(f, BEAT / 2 * 0.92, 1.0), t, -9 if j % 2 else -11)
        elif sec == "half":
            bass.add(sub_bass(root, d * 0.95, 1.0), t0, -12)
        elif sec == "tail":
            bass.add(sub_bass(root, 4.5, 1.0) * np.exp(-t_axis(int(4.5 * SR)) / 1.6), t0, -8)
        elif sec == "break" and name == "Asus":
            bass.add(sub_bass(root, d, 0.6), t0, -16)
    # ---- pads
    for (t0, d, name) in spans:
        notes = CH[name][1]
        sec = section(t0 + 0.01)
        tail = sec == "tail"
        pd = dsp.pad([mtof(m) for m in notes], d + (2.5 if tail else 0.6), att=0.04 if tail else 0.35, rel=3.5 if tail else 0.8, bright=5.0 if sec in ("intro", "break") else 7.5, seed=int(t0 * 10))
        if sec == "intro":
            pd = filt(pd, lp(1400 if t0 < 2 else 2600, 2))
        pads.add(pd, t0 - 0.02, -13 if sec != "tail" else -9)
        rev.add(pd, t0, -18)
    # ---- arp (FM plucks) in drop A / B / final, rising in the build
    ARP = [0, 2, 3, 4, 3, 2, 1, 2]
    for i in range(int(DUR / (BEAT / 4))):
        t = i * BEAT / 4
        sec = section(t)
        if sec not in ("A", "B", "build", "final") or (sec == "A" and t < 6):
            continue
        notes = CH[chord_at(t)][1]
        if sec == "build":
            step = BEAT / 4 if t >= 17 else BEAT / 2
            if abs((t - 16) / step - round((t - 16) / step)) > 1e-6:
                continue
            m = notes[int((t - 16) / step) % len(notes)] + 12 + (12 if t >= 17.5 else 0)
            g = -22 + 8 * (t - 16) / 2
        else:
            if sec == "A" and t < 8 and i % 2:
                continue
            m = notes[ARP[i % 8] % len(notes)] + 12
            g = -21 if i % 2 else -18
        pl = dsp.fm_pluck(mtof(m), 0.6, 1.0, bright=0.8 if sec == "A" else 1.1, ratio=2.0, seed=i)
        p = -0.35 if i % 2 else 0.35
        arp.add(pl, t, g, p); dly.add(pl, t, g - 6, p); rev.add(pl, t, g - 10)
    # ---- lead bell motif (drop B + final)
    MOTIF = [(0.0, 0, 0.75), (0.75, 1, 0.75), (1.5, 2, 0.5)]  # (beat offset, chord tone from the top, length)
    for (t0, d, name) in spans:
        sec = section(t0 + 0.01)
        if sec not in ("B", "final"):
            continue
        tones = sorted(CH[name][1], reverse=True)
        for (off, idx, ln) in MOTIF:
            t = t0 + off * BEAT * 2
            f = mtof(tones[idx] + 12)
            b = bell(f, 1.6, 1.0, ratio=3.0, idx=1.2, decay=2.6)
            lead.add(b, t, -20, -0.1); rev.add(b, t, -22); dly.add(b, t, -24, 0.3)
    # ---- the flip (2.0): reverse swell into a glassy chord + soft sub
    sw = dsp.noise_sweep(0.9, 600, 9000, q_oct=1.2, curve=2.5, seed=4)
    fx.add(filt(sw, hp(500)), 1.1, -22, 0)
    for j, m in enumerate([74, 78, 81, 85, 90]):
        b = bell(mtof(m), 2.6, 1.0, ratio=3.5, idx=1.0, decay=1.4)
        fx.add(b, 2.0 + j * 0.035, -25, -0.5 + j * 0.25); rev.add(b, 2.0, -24)
    fx.add(dsp.boom(1.0, 2, 2.0), 2.0, -16)
    # first frame: a single soft bell so the film never starts in silence
    fx.add(bell(mtof(78), 2.5, 1.0, 3.5, 0.8, 1.6), 0.0, -26, 0.2); rev.add(bell(mtof(78), 2.5), 0.0, -26)
    # ---- impacts on the drops + final chord
    for t0, g in ((4.0, -9), (18.0, -9), (32.0, -8)):
        fx.add(dsp.boom(1.0, int(t0), 2.6), t0, g)
    fx.add(dsp.boom(1.0, 36, 3.6), 36.0, -6)
    for j, m in enumerate([74, 78, 81, 86, 88, 93]):
        b = bell(mtof(m), 4.5, 1.0, ratio=3.5, idx=1.1, decay=0.9)
        fx.add(b, 36.0 + j * 0.05, -22, -0.6 + j * 0.24); rev.add(b, 36.0, -18); dly.add(b, 36.0 + j * 0.05, -26)
    fx.add(dsp.shimmer(5.5, mtof(81), 3), 36.05, -18)
    # ---- risers before the drops
    for (a, b, g) in ((2.9, 4.0, -15), (16.0, 18.0, -11), (30.4, 32.0, -12)):
        r = dsp.noise_sweep(b - a, 300, 7000, q_oct=1.4, curve=2.2, seed=int(a))
        fx.add(r, a, g, 0); rev.add(r, a, g - 6)
        sh = dsp.shepard(b - a, 1.0, 110, int(a)) * np.linspace(0, 1, int((b - a) * SR)) ** 2
        fx.add(filt(sh, bp(200, 3000)), a, g - 6)

    # break swell (30-32): a filtered pad rising into the end card
    swell = dsp.pad([mtof(m) for m in (52, 59, 64, 66, 71)], 2.2, att=1.6, rel=0.4, bright=6.0, seed=77)
    pads.add(filt(swell, hp(300, 2)), 30.0, -12)
    # ---- side-chain + sum
    sc = duck[None, :]
    music = drums.b + bass.b * sc + pads.b * sc ** 1.2 + arp.b * (0.6 + 0.4 * sc) + lead.b + fx.b
    # ping-pong delay (dotted 8th)
    d = int(0.75 * BEAT * SR)
    echo = np.zeros_like(dly.b)
    src = dly.b.copy()
    for k2 in range(1, 7):
        g = 0.45 ** k2
        side = k2 % 2
        sh2 = np.zeros_like(src)
        sh2[:, d * k2:] = src[:, : N - d * k2]
        echo[side] += g * (sh2[0] + sh2[1]) * 0.5
    echo = filt(echo, lp(5000), hp(250))
    ir = dsp.make_ir(2.6, 0.02, 0.45, seed=3)
    wet = dsp.convolve(rev.b, ir)
    music = music + echo * 0.8 + wet * 0.55
    music = filt(music, hp(28, 2))
    # a breath of near-silence right before the two big drops
    gate = np.ones(N)
    for g0 in (17.875, 31.875):
        i0, i1 = int(g0 * SR), int((g0 + 0.125) * SR)
        gate[i0:i1] = np.linspace(0.25, 0.12, i1 - i0)
        gate[i0 - 240:i0] = np.linspace(1, 0.25, 240)
    music *= gate[None, :]
    return music


# ------------------------------------------------------------------ sound design (UI foley)
def tone(f, dur, decay, vel=1.0, harm=0.25):
    n = int(dur * SR)
    t = t_axis(n)
    return (np.sin(2 * np.pi * f * t) + harm * np.sin(4 * np.pi * f * t) * np.exp(-t * 30)) * np.exp(-t / decay) * np.minimum(1, t / 0.0015) * vel


def ui_click(seed=0, bright=1.0):
    s = dsp.click(1.0, seed)
    s = filt(s, peak_eq(3500, 3 * bright, 1.2))
    return s / np.abs(s).max()


def pop(f0=300, f1=950, dur=0.18):
    n = int(dur * SR)
    t = t_axis(n)
    f = f0 + (f1 - f0) * (1 - np.exp(-t * 45))
    return np.sin(2 * np.pi * np.cumsum(f) / SR) * np.exp(-t * 18) * np.minimum(1, t / 0.002)


def glass_grab(seed=0):
    r = np.random.default_rng(seed)
    n = int(0.14 * SR)
    t = t_axis(n)
    s = filt(r.standard_normal(n), bp(2500, 9000)) * np.exp(-t / 0.012) * 0.6
    s += 0.5 * np.sin(2 * np.pi * 1850 * t) * np.exp(-t / 0.03) + 0.4 * np.sin(2 * np.pi * 140 * t) * np.exp(-t / 0.03)
    return s / np.abs(s).max()


def swish(dur=0.5, f0=800, f1=4000, seed=0):
    x = dsp.noise_sweep(dur, f0, f1, q_oct=1.5, curve=1.0, seed=seed)
    x *= np.sin(np.pi * np.clip(t_axis(len(x)) / dur, 0, 1)) ** 1.5
    return x / (np.abs(x).max() + 1e-9)


def zipper(dur=0.32, seed=0):
    r = np.random.default_rng(seed)
    n = int(dur * SR)
    t = t_axis(n)
    env = np.zeros(n)
    for k in range(20):
        tk = dur * 0.9 * (k / 19) ** 0.8
        env += (t >= tk) * np.exp(-np.clip(t - tk, 0, None) * 1500)
    return filt(r.standard_normal(n), bp(2000, 6000)) * env


def chime(t, bus, g=-16):
    for j, m in enumerate([81, 85, 88, 93]):
        bus.add(bell(mtof(m), 1.8, 1.0, 3.5, 1.2, 2.4), t + 0.02 + j * 0.055, g, -0.4 + j * 0.27)


def scrub(dur, seed=0):
    r = np.random.default_rng(seed)
    n = int(dur * SR)
    out = np.zeros(n)
    pos = 0
    while pos < n:
        L = int(r.uniform(0.012, 0.03) * SR)
        g = filt(r.standard_normal(L), bp(400, 3000)) * np.hanning(L) * r.uniform(0.3, 1)
        out[pos:pos + L] += g[: n - pos]
        pos += int(L * 0.7)
    return out / (np.abs(out).max() + 1e-9)


def make_sfx(lang: str) -> np.ndarray:
    fx, rev = Bus(DUR), Bus(DUR)

    def add(sig, t, g, p=0.0, r=-99):
        fx.add(sig, t, g, p)
        if r > -60:
            rev.add(sig, t, r, p)

    clickS = [ui_click(i) for i in range(6)]
    # camera moves
    add(dsp.whoosh(1.1, True, 1), C["drop1"] - 0.15, -11, r=-20)
    add(dsp.whoosh(0.9, False, 2), C["toIcon"] + 0.25, -21)
    add(dsp.whoosh(0.8, True, 3), C["toCard"] + 0.05, -16, r=-24)
    add(dsp.whoosh(0.7, False, 4), C["whip"] - 0.3, -9, r=-18)
    add(dsp.whoosh(0.7, True, 5), C["toDock"], -22)
    add(dsp.whoosh(1.2, False, 6), C["toLaptop"] - 0.1, -14, r=-22)
    add(dsp.whoosh(0.9, True, 7), C["drop1"] + 0.05, -20)
    # headline arrivals: soft low bloom
    for kk, key in enumerate(("h1", "h2", "h3", "h5", "h6", "h7")):
        n = int(0.5 * SR); t = t_axis(n)
        bloom = np.sin(2 * np.pi * (70 + 30 * np.exp(-t * 20)) * t) * np.exp(-t / 0.12) * np.minimum(1, t / 0.01)
        add(bloom, C[key] + 0.08, -24)
        add(swish(0.35, 2000, 6000, 50 + kk), C[key] - 0.05, -32)
    # popup
    add(clickS[0], C["iconClick"], -12, 0.2)
    add(pop(260, 820), C["iconClick"] + 0.03, -17, 0.2, r=-28)
    add(clickS[1], C["fieldClick"], -13, 0.1)
    add(pop(500, 1200, 0.12), C["listOpen"], -22, 0.1)
    add(clickS[2], C["pick"], -12, 0.1)
    add(dsp.fm_pluck(mtof(83), 0.5, 1.0, 1.0, 2.0, 1), C["pick"] + 0.02, -20, 0.1, r=-28)
    add(clickS[3], C["modeClick"], -13, 0.1)
    add(clickS[4], C["startClick"], -9, 0.0)
    chime(C["startClick"], fx, -15)
    add(swish(0.5, 3000, 9000, 9), C["startClick"] + 0.02, -24)
    # language-dependent dropdown ticks
    LIST = ["en", "fa", "ar", "zh-Hans", "zh-Hant", "de", "fr", "it", "es", "ru", "ja", "ko", "tr", "pt-BR", "pt-PT", "nl", "pl", "uk", "hi"]
    target = {"zh": "zh-Hans", "pt": "pt-BR"}.get(lang, lang)
    initial = "fa" if target == "en" else "en"
    it, ii = LIST.index(target), LIST.index(initial)
    scroll1 = max(0, min(30 - 8, it - 3))
    for j in range(scroll1):
        add(tone(2400 + 40 * j, 0.03, 0.006, 1.0, 0.1), C["listOpen"] + 0.12 + (9.05 - C["listOpen"] - 0.12) * (j + 0.5) / max(1, scroll1), -30, 0.15)
    hops = min(6, abs(it - ii) + 1)
    for j in range(hops):
        add(tone(1900 + 60 * j, 0.03, 0.006, 1.0, 0.1), 9.08 + 0.33 * (j + 0.5) / hops, -31, 0.1)
    # card
    add(glass_grab(1), C["grabDown"], -15, -0.1)
    add(swish(C["grabUp"] - C["grabDown"], 700, 2400, 11), C["grabDown"] + 0.02, -27)
    add(glass_grab(2) * 0.7, C["grabUp"], -18, 0.1)
    add(glass_grab(3), C["resizeDown"], -16, 0.2)
    st = dsp.noise_sweep(C["resizeUp"] - C["resizeDown"], 400, 2600, 1.0, 1.0, 12)
    add(st * np.sin(np.pi * np.linspace(0, 1, len(st))), C["resizeDown"] + 0.02, -27, 0.2)
    add(glass_grab(4) * 0.7, C["resizeUp"], -18, 0.2)
    add(pop(700, 1400, 0.1), C["labels"], -26, -0.3)
    add(pop(800, 1600, 0.1), C["labels"] + 0.15, -26, 0.3)
    # flip glint on the second sentence
    for j, m in enumerate([86, 90, 93]):
        add(bell(mtof(m), 1.2, 1.0, 3.5, 0.8, 3.0), C["vo_dub2"] - 0.05 + j * 0.03, -31, -0.3 + 0.3 * j, r=-34)
    # 79 languages: rising pitched ticks
    scale = [71, 74, 76, 78, 81, 83, 86, 88]
    for j, tm in enumerate(TL["montage"]):
        add(tone(mtof(scale[j % len(scale)] + 12), 0.14, 0.035, 1.0, 0.3), tm, -14, -0.5 + j * 0.15, r=-22)
        add(ui_click(j) * 0.5, tm, -22, -0.5 + j * 0.15)
    add(dsp.boom(1.0, 17, 1.2), C["land"], -15)
    add(bell(mtof(86), 1.5, 1.0, 3.5, 1.2, 2.0), C["land"], -18, 0, r=-22)
    # player
    add(clickS[5], C["pause"], -11, 0.05)
    add(glass_grab(5) * 0.6, C["seekDown"], -19)
    add(scrub(C["seekUp"] - C["seekDown"], 13), C["seekDown"] + 0.02, -27)
    add(clickS[0], C["play"], -11, 0.05)
    add(clickS[1], C["origOff"], -12, -0.1)
    add(clickS[2], C["origOn"], -12, -0.1)
    nt = 12
    for j in range(nt):
        add(tone(1600 - 50 * j, 0.025, 0.005, 1.0, 0.1), C["volDown"] + (C["volUp"] - C["volDown"]) * (j + 0.5) / nt, -27, -0.1)
    add(clickS[3], C["duck"], -12, 0.1)
    add(dsp.fm_pluck(mtof(81), 0.5, 1.0, 1.0, 2.0, 2), C["duck"] + 0.02, -22, r=-30)
    # laptop
    n = int(0.9 * SR); t = t_axis(n)
    hinge = filt(np.random.default_rng(20).standard_normal(n), bp(150, 1200)) * np.sin(np.pi * t / 0.9) ** 2
    add(hinge / np.abs(hinge).max(), C["lidOpen"] - 0.2, -24)
    add(dsp.kick(0.6, 0.2), C["lidOpen"] + 0.62, -22)
    add(glass_grab(6), C["dragDown"], -17, 0.3)
    add(swish(C["drop"] - C["dragDown"], 500, 1800, 14), C["dragDown"] + 0.05, -28, 0.2)
    add(pop(220, 600, 0.22), C["drop"], -13, -0.1, r=-24)
    add(clickS[4], C["process"], -12)
    for j, ts in enumerate(TL["stages"]):
        add(tone(mtof(76 + 2 * j), 0.18, 0.04, 1.0, 0.3), ts, -24, -0.2 + 0.1 * j, r=-30)
    chime(C["ready"], fx, -14)
    add(clickS[5], C["zip"], -12)
    add(zipper(0.3, 15), C["zip"] + 0.05, -15)
    for j in range(4):
        add(tone(mtof([79, 83, 86, 91][j]), 0.4, 0.07, 1.0, 0.25), C["fan"] + j * 0.07, -18, -0.45 + 0.3 * j, r=-24)
    # trust words
    for j, key in enumerate(("free", "open", "private")):
        add(dsp.boom(1.0, 30 + j, 1.4), C[key], -9 + j)
        add(bell(mtof([74, 78, 81][j]), 1.8, 1.0, 3.5, 1.0, 2.0), C[key], -21, -0.3 + 0.3 * j, r=-22)
    # the wall of languages
    add(dsp.whoosh(1.0, False, 41), C["wall"] - 0.05, -10, r=-18)
    for j in range(8):
        add(tone(mtof([86, 88, 90, 93, 95, 98, 100, 102][j]), 0.12, 0.03, 1.0, 0.3), C["wall"] + 0.2 + j * 0.06, -28, -0.7 + 0.2 * j, r=-30)
    rv = dsp.noise_sweep(0.6, 6000, 400, 1.4, 1.5, 42)[::-1]
    add(rv, C["wallOut"], -18, r=-24)
    # end card
    for j in range(5):
        add(swish(0.45, 1500, 7000, 30 + j), C["end"] - 0.35 + j * 0.05, -26, -0.6 + 0.3 * j)
    add(swish(0.6, 900, 5000, 40), C["word"] - 0.1, -24)
    add(pop(300, 900, 0.2), C["cta"], -17, r=-26)
    for j, m in enumerate([93, 97, 100, 102, 105]):
        add(bell(mtof(m), 1.4, 1.0, 2.0, 0.8, 2.5), C["shine"] + 0.08 + j * 0.06, -30, -0.5 + 0.25 * j, r=-28)
    ir = dsp.make_ir(1.6, 0.012, 0.5, seed=8)
    return fx.b + dsp.convolve(rev.b, ir) * 0.5


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("--lang", default="en")
    ap.add_argument("--force", action="store_true")
    a = ap.parse_args()
    mpath = BUILD / "music.wav"
    key = BUILD / "music.key"
    import hashlib
    sig = hashlib.sha1((json.dumps(TL, sort_keys=True) + Path(__file__).read_text(encoding="utf-8")).encode()).hexdigest()
    if a.force or not mpath.exists() or not key.exists() or key.read_text() != sig:
        m = make_music()
        pk = np.abs(m).max()
        write_wav(mpath, m / pk * 0.5)
        key.write_text(sig)
        print(f"music.wav  peak-normalised (was {pk:.2f})")
    s = make_sfx(a.lang)
    write_wav(BUILD / a.lang / "sfx.wav", s * 0.5)
    print(f"sfx.wav for {a.lang}  peak {np.abs(s).max() * 0.5:.2f}")


if __name__ == "__main__":
    main()
