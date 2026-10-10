"""The score of the brand film: a cold electronic first act shared by every version, then — on the click — the music
"translates" into the viewer's own musical world. Writes build/film/<lang>/music.wav, sfx.wav and score.json.

  python -I video/films/film/audio/score.py --lang fa [--culture persian]
"""
import argparse
import json
import re
import sys
import wave
from pathlib import Path

import numpy as np

sys.path.insert(0, str(Path(__file__).resolve().parent))
from dsp import SR, Bus, bp, convolve, fades, filt, hp, lp, make_ir, norm, peak, shelf_hi, shelf_lo  # noqa: E402
import instruments as I  # noqa: E402

HERE = Path(__file__).resolve().parent
BUILD = HERE.parents[2] / "build" / "film"
CULTURE = {"fa": "persian", "ar": "arabic", "tr": "turkish", "hi": "indian", "ja": "japanese", "zh": "chinese", "es": "flamenco", "pt": "bossa",
           "en": "cinematic", "fr": "cinematic", "de": "cinematic", "ru": "cinematic"}
CELLS = [(-1, 0), (1, 0), (0, -1), (0, 1), (-1, -1), (1, 1), (1, -1), (-1, 1), (2, 0)]


# ------------------------------------------------------------------ pitch names: C D E F G A B with # b ~ (half-flat) ^ (half-sharp)
SEMI = {"C": 0, "D": 2, "E": 4, "F": 5, "G": 7, "A": 9, "B": 11}


def hzn(name, tweak=None):
    m = re.fullmatch(r"([A-G])(#|b|~|\^)?(-?\d)", name)
    if not m:
        raise ValueError(name)
    L, acc, octv = m.group(1), m.group(2) or "", int(m.group(3))
    s = SEMI[L] + {"#": 1, "b": -1, "~": -0.5, "^": 0.5, "": 0}[acc]
    cents = (tweak or {}).get(L + acc, 0)
    return 440.0 * 2 ** ((s + 12 * (octv + 1) - 69 + cents / 100) / 12)


class Score:
    def __init__(self, plan):
        self.plan = plan
        self.C = plan["cues"]
        self.dur = plan["duration"]
        self.mus, self.perc, self.low, self.hall, self.room, self.sfx, self.cold = (Bus(self.dur + 1) for _ in range(7))
        self.notes, self.beats = [], []
        self.tweak = {}

    def note(self, inst, name, t, vel=0.7, gain=-6, p=0.0, send=-14, room=None, **kw):
        f = hzn(name, self.tweak) if isinstance(name, str) else name
        if t > self.C["click"] + 0.05:                               # a player, not a sequencer: tiny timing and touch variations
            t += 0.006 * np.sin(t * 1543.1)
            vel = float(np.clip(vel * (1 + 0.07 * np.sin(t * 911.7)), 0.05, 1.0))
        vq = round(vel * 20) / 20
        if inst in I.PLUCK:
            x = I.pluck(inst, f, vq, seed=int(t * 1000) % 5, **kw)
        elif inst == "piano":
            x = I.piano(f, vq, kw.get("dur", 3.5), seed=0, felt=kw.get("felt", 0.6))
        elif inst == "ep":
            x = I.ep(f, vel, kw.get("dur", 2.5))
        else:
            raise ValueError(inst)
        self.mus.add(x, t, gain, p)
        if send is not None:
            self.hall.add(x, t, gain + send, p)
        if room is not None:
            self.room.add(x, t, gain + room, p)
        self.notes.append({"t": round(t, 3), "v": round(vel, 2)})
        return x

    def chord(self, inst, names, t, vel=0.7, gain=-6, p=0.0, send=-14, spread=0.012, down=True):
        fs = [hzn(n, self.tweak) for n in names]
        x = I.strum(inst, fs, round(vel * 20) / 20, spread=spread, down=down, seed=int(t * 1000) % 5)
        self.mus.add(x, t, gain, p)
        if send is not None:
            self.hall.add(x, t, gain + send, p)
        self.notes.append({"t": round(t, 3), "v": round(vel, 2)})

    def hit(self, kind, t, vel=1.0, gain=-8, p=0.0, send=None, beat=None):
        if kind not in ("kick", "softkick", "boom") and not beat:
            t += 0.005 * np.sin(t * 733.3)
            vel = float(np.clip(vel * (1 + 0.1 * np.sin(t * 517.9)), 0.05, 1.0))
        x = I.perc(kind, round(vel * 20) / 20, seed=int(t * 1000) % 7)
        self.perc.add(x, t, gain, p)
        if send is not None:
            self.hall.add(x, t, gain + send, p)
        if beat:
            self.beats.append({"t": round(t, 3), "k": beat, "v": round(vel, 2)})

    def bass(self, name, t, dur, vel=0.9, gain=-10):
        self.low.add(I.sub(hzn(name, self.tweak), dur, vel), t, gain - 4.5)

    def pad(self, names, t, dur, gain=-20, att=1.0, rel=1.0, bright=6.0, kind="pad"):
        fs = [hzn(n, self.tweak) for n in names]
        x = I.pad(fs, dur, att, rel, bright, seed=int(t * 10)) if kind == "pad" else I.strings(fs, dur, att, rel, bright=0.45, seed=int(t * 10))
        self.mus.add(x, t, gain)
        self.hall.add(x, t, gain - 10)

    def bar(self, k):
        return self.C["drop"] + k * self.plan["bar"]


# ================================================================== shared: act I (the cold world), act II (the click), sound design
def act_one(S):
    C = S.C
    cut = C["cut"]
    cache = BUILD / "score_cache" / f"drone_{cut:.2f}.npy"
    if cache.exists():
        dr = np.load(cache)
    else:
        dr = I.drone_cold(cut + 0.2)
        cache.parent.mkdir(parents=True, exist_ok=True)
        np.save(cache, dr)
    shape = 0.3 + 0.7 * np.clip(np.arange(dr.shape[1]) / SR / cut, 0, 1) ** 1.8
    S.cold.add(dr * shape, 0.0, -14)
    S.cold.add(I.breath(0.5, 4), 0.0, -30)
    S.cold.add(I.cluster(cut - 4.3), 4.3, -27)
    t, gap = 1.0, 0.55                                         # a clock that keeps speeding up
    while t < cut - 0.05:
        S.cold.add(filt(I.ui_click(1.0, int(t * 100)), hp(2500)), t, -31 + 10 * t / cut)
        gap = max(0.07, gap * 0.93)
        t += gap
    t, gap = C["whip_end"], 1.15                                # a heartbeat under the babel
    while t < cut - 0.1:
        S.cold.add(I.heartbeat(1.0), t, -14 + 6 * (t - C["whip_end"]) / (cut - C["whip_end"]))
        gap = max(0.42, gap * 0.86)
        t += gap
    S.cold.add(I.noise_sweep(cut - 5.6, 350, 8000, curve=2.4, seed=2), 5.6, -16)
    S.cold.add(I.shepard(cut - 5.6, 1.2, 55, 4) * np.linspace(0, 1, int((cut - 5.6) * SR)) ** 2, 5.6, -24)
    S.sfx.add(I.whoosh(1.2, False, 3, 200, 3500), C["whip"] - 0.1, -17)
    S.sfx.add(I.boom(0.5, 1, 1.6), cut, -24)


def act_two(S):
    C = S.C
    S.sfx.add(I.whomp(0.9, 85), C["popup"] - 0.05, -18)
    S.sfx.add(I.glass_ping(2900, 0.6, 2), C["popup"] + 0.25, -30)
    S.sfx.add(I.blip(1200, 1500, 0.06), C["field"] + 0.25, -24)
    S.sfx.add(I.whoosh(0.45, True, 8, 600, 4000) * 0.4, C["toButton"] + 0.05, -26)
    S.sfx.add(I.ui_click(1.0, 3), C["click"], -9)
    S.hall.add(I.ui_click(1.0, 3), C["click"], -22)
    S.sfx.add(I.boom(0.7, 2, 2.4), C["click"], -13)
    S.sfx.add(I.shimmer(2.6, 1174.66, 5), C["click"] + 0.02, -27)
    S.beats.append({"t": C["click"], "k": "boom", "v": 1.0})


def transitions(S):
    C = S.C
    for k, d in (("browser", 0.45), ("desktop", 0.45), ("langs", 0.4), ("free", 0.35)):
        S.sfx.add(I.whoosh(0.55, True, int(C[k] * 10), 300, 6000), C[k] - d, -21)
    S.sfx.add(I.whoosh(0.4, False, 77, 500, 4000), C["file"] + 0.1, -25)
    S.sfx.add(I.perc("softkick", 0.7), C["file"] + 0.78, -18)
    S.sfx.add(I.glass_ping(1900, 0.5, 6), C["file"] + 0.8, -30)
    t = C["langs"] + 0.3                                       # one tick per language name of the ticker, a ping when it lands
    for d in (0.22, 0.22, 0.24, 0.27, 0.32):
        S.sfx.add(I.tick(0.6, 1400), t, -27)
        t += d
    S.sfx.add(I.glass_ping(2350, 0.7, 9), t, -24)
    dw = (C["settle"] - C["b"] - 0.2) / 4                         # the "understand" word changes language
    for i in range(1, 5):
        S.sfx.add(I.tick(0.4, 2200 + 180 * i), C["b"] + 0.2 + i * dw, -32, (-0.3, 0.3)[i % 2])
    for k in ("free", "free2"):
        S.sfx.add(I.boom(0.6, 11, 1.5), C[k], -17)
    S.sfx.add(I.cymbal(2.2, 3, reverse=True), C["drop"] - 2.2, -24)
    S.sfx.add(I.cymbal(3.0, 4), C["drop"], -22)
    S.sfx.add(I.boom(1.0, 5, 2.6), C["drop"], -8)
    S.beats.append({"t": C["drop"], "k": "boom", "v": 1.0})
    S.sfx.add(I.cymbal(2.0, 8, reverse=True), C["brk"] - 2.0, -30)
    S.sfx.add(I.boom(1.0, 9, 3.0), C["lock"], -7)
    S.sfx.add(I.shimmer(5.5, 1174.66, 12), C["lock"], -24)
    S.beats.append({"t": C["lock"], "k": "boom", "v": 1.0})
    for i in range(5):                                          # the logo layers land
        S.sfx.add(I.tick(0.5, 1800 + 250 * i), C["lock"] - 0.42 + 0.09 * i, -31, -0.4)
        S.sfx.add(I.tick(0.5, 1800 + 250 * i), C["lock"] - 0.42 + 0.09 * i, -31, 0.4)
    S.sfx.add(I.whoosh(0.7, True, 31, 400, 6000), C["lock"] - 0.68, -22)


def flips(S):
    C = S.C
    out = []
    for i, c in enumerate(S.plan["crowd"]):
        if i >= 8:
            continue
        cx, cy = CELLS[i]
        r = abs(cx) + abs(cy) + (1 if abs(cx) > 1 else 0)
        out.append(C["cascade"] + 0.25 + (r - 1) * 0.42 + i * 0.05)
    return sorted(out)


def gaps(S):
    C, cl = S.C, S.plan["clips"]
    h1 = cl["hero1"]["t"] + cl["hero1"]["dur"]
    h2 = cl["hero2"]["t"] + cl["hero2"]["dur"]
    return [(C["click"], cl["hero1"]["t"] - 0.05), (h1 + 0.02, cl["hero2"]["t"] - 0.04), (h2 + 0.02, C["cascade"] + 0.1)]


# ================================================================== the cultures
class Culture:
    lead = "santur"
    name = "base"
    tweak = {}

    def __init__(self, S):
        self.S = S
        S.tweak = self.tweak

    # helpers
    def run(self, names, t0, step, vel=0.6, gain=-8, inst=None, send=-12, pspread=0.3):
        for i, n in enumerate(names):
            if n is None:
                continue
            self.S.note(inst or self.lead, n, t0 + i * step, vel, gain, pspread * ((i % 3) - 1), send)

    def melody(self, row, t0, step, vel=0.75, gain=-8, inst=None, accents=None, send=-13, keep=None):
        for i, n in enumerate(row):
            if n is None or (keep is not None and i not in keep):
                continue
            a = accents[i] if accents else 1.0
            held = i + 1 < len(row) and row[i + 1] is None
            self.S.note(inst or self.lead, n, t0 + i * step, vel * a, gain, 0.15 * ((i % 3) - 1), send, **self.held_kw(held, step))

    def held_kw(self, held, step):
        return {}


class Persian(Culture):
    name, lead = "persian", "santur"
    E = 0.2
    RIFF = [["A4", None, "B~4", "A4", "G4", "F#4", "G4", None, "F#4", "E~4", "D4", None],
            ["D4", "E~4", "F#4", "G4", "A4", "B~4", "A4", None, None, "G4", "F#4", "G4"],
            ["A4", None, "B~4", "C#5", "D5", None, "C#5", "B~4", "A4", "G4", "F#4", None],
            ["G4", "F#4", "E~4", "F#4", "G4", "F#4", "E~4", None, "D4", None, None, None]]
    CHORD = [("D2", ["D3", "A3", "D4", "F#4"]), ("D2", ["D3", "A3", "D4", "F#4"]), ("G1", ["G3", "B~3", "D4", "G4"]), ("A1", ["A3", "C#4", "E~4", "A4"])]

    def held_kw(self, held, step):
        return {"strikes": [(i / 18, 0.7 * (0.95 - 0.03 * i)) for i in range(int(step * 2 * 18))]} if held else {}

    def first(self, t):
        self.S.note("santur", "D5", t, 0.95, -4, 0, -4)
        self.S.note("santur", "D4", t, 0.6, -9, 0, -6)

    def intro(self, G):
        (a0, a1), (b0, b1), (c0, c1) = G
        riz = [(i / 17, 0.25 + 0.4 * (i / 9) * (1 - i / 9)) for i in range(9)]
        self.S.note("santur", "A4", a0 + 0.35, 0.5, -11, 0.2, -8, strikes=riz)
        if b1 - b0 > 0.25:
            self.run(["A4", "B~4", "A4", "G4", "F#4"], b0 + 0.02, min(0.09, (b1 - b0) / 6), 0.5, -11)
        self.run(["E~4", "F#4", "G4"], c0, 0.11, 0.45, -12)

    def drone(self, t0, t1):
        self.S.pad(["D3", "A3", "D4"], t0, t1 - t0 + 0.5, -21, 2.0, 0.6, 5.5)
        self.S.bass("D2", t0 + 1.5, t1 - t0 - 1.0, 0.5, -19)

    def cascade(self, times):
        names = ["D4", "E~4", "F#4", "G4", "A4", "B~4", "C#5", "D5", "E~5", "F#5"]
        for i, t in enumerate(times):
            self.S.note("santur", names[i], t, 0.55 + 0.04 * i, -8 + 0.3 * i, 0.6 - 0.15 * i, -8)

    def build(self, t0, t1):
        n = int((t1 - t0) * 17)
        riz = [(i / 17, 0.15 + 0.8 * (i / n) ** 1.5) for i in range(n)]
        self.S.note("santur", "D5", t0, 0.95, -7, 0.15, -10, strikes=riz, dur=t1 - t0 + 0.3)
        self.S.note("santur", "D4", t0, 0.95, -10, -0.15, -12, strikes=riz, dur=t1 - t0 + 0.3)
        for i, dt in enumerate(np.cumsum([0.2] * 3 + [0.1] * 4 + [0.05] * 8)):
            if t0 + dt < t1 - 0.05:
                self.S.hit("daf_tak", t1 - 1.2 + dt * 0.75, 0.3 + 0.05 * i, -12, (-0.3, 0.3)[i % 2])

    def groove(self, k, t0, inten, voice):
        S, E = self.S, self.E
        for half in range(2):
            h0 = t0 + half * 6 * E
            S.hit("daf_dum", h0, 1.0 * inten, -7, send=-18, beat="dum")
            S.hit("daf_tak", h0 + 2 * E, 0.45 * inten, -11, -0.25)
            S.hit("daf_dum", h0 + 3 * E, 0.75 * inten, -9, send=-18, beat="dum")
            S.hit("daf_tak", h0 + 4 * E, 0.55 * inten, -11, 0.2)
            S.hit("daf_tak", h0 + 5 * E, 0.8 * inten, -10, 0.3)
            if inten > 0.8:
                S.hit("kick", h0, 0.9, -12, beat="kick")
                S.hit("kick", h0 + 3 * E, 0.6, -13)
            for j in range(12):
                S.hit("shaker", h0 + j * E / 2, (0.6 if j % 2 == 0 else 0.35) * inten, -24, 0.4)
        bn, ch = self.CHORD[k % 4]
        S.bass(bn, t0, 1.18, 0.9, -11); S.bass(bn, t0 + 1.2, 1.18, 0.8, -12)
        S.pad(ch, t0, 2.5, -24 if voice else -21, 0.05, 0.4, 7)
        row = self.RIFF[k % 4]
        keep = {0, 3, 6, 9} if voice else None
        self.melody(row, t0, E, 0.8 * (0.85 if voice else 1), -7, keep=keep)
        if not voice and inten >= 1.0:
            for i, n in enumerate(row):
                if n and i % 3 == 0:
                    up = n[:-1] + str(int(n[-1]) + 1)
                    S.note("santur", up, t0 + i * E + 0.004, 0.45, -15, 0.45, -12)

    def brk(self, t0, t1):
        self.run(["A4", "G4", "F#4", "E~4"], t0 + 0.35, 0.16, 0.5, -10)
        riz = [(i / 16, 0.4 * (1 - i / 20)) for i in range(14)]
        self.S.note("santur", "D4", t0 + 1.1, 0.55, -10, 0, -6, strikes=riz)
        self.S.pad(["D3", "A3", "D4"], t0, t1 - t0 + 0.3, -24, 0.8, 0.5, 5)

    def final(self, t):
        self.S.chord("santur", ["D4", "A4", "D5", "F#5", "A5"], t, 0.85, -5, 0, -5, spread=0.03)
        riz = [(i / 20, 0.9 * (1 - i / 22)) for i in range(16)]
        self.S.note("santur", "D4", t, 0.9, -6, 0, -5, strikes=riz)
        self.S.low.add(I.sub(hzn("D2"), 6.5, 0.9) * np.exp(-np.arange(int(6.5 * SR)) / SR / 2.6), t, -13)
        self.S.pad(["D3", "A3", "D4", "F#4", "A4"], t, self.S.dur - t, -16, 0.2, 2.6, 8)
        self.run(["A5", "G5", "F#5", "E~5", "D5"], t + 2.6, 0.22, 0.38, -13, send=-6)


class Arabic(Culture):
    name, lead = "arabic", "oud"
    E = 0.3
    RIFF = [["D4", "E~4", "F4", "G4", "A4", None, "G4", "F4"], ["E~4", "F4", "G4", "F4", "E~4", None, "D4", None],
            ["A4", "Bb4", "C5", "Bb4", "A4", "G4", "F4", "G4"], ["A4", "G4", "F4", "E~4", "D4", None, None, None]]

    def held_kw(self, held, step):
        return {"strikes": [(i / 14, 0.6 * (0.95 - 0.04 * i)) for i in range(int(step * 2 * 14))]} if held else {}

    def first(self, t):
        self.S.note("oud", "D4", t, 0.95, -4, 0, -6)
        self.S.note("oud", "D3", t + 0.01, 0.7, -8, 0, -8)

    def intro(self, G):
        (a0, a1), (b0, b1), (c0, c1) = G
        trem = [(i / 14, 0.5 * (1 - i / 16)) for i in range(8)]
        self.run(["E~4", "F4", "G4"], a0 + 0.25, 0.07, 0.45, -11)
        self.S.note("oud", "F4", a0 + 0.46, 0.5, -11, 0, -8, strikes=trem)
        if b1 - b0 > 0.25:
            self.run(["A4", "G4", "F4", "E~4"], b0 + 0.02, min(0.085, (b1 - b0) / 5), 0.5, -11)
        self.run(["F4", "E~4", "D4"], c0, 0.11, 0.45, -12)

    def drone(self, t0, t1):
        self.S.pad(["D3", "A3", "D4"], t0, t1 - t0 + 0.5, -21, 2.0, 0.6, 5.5)
        self.S.bass("D2", t0 + 1.5, t1 - t0 - 1.0, 0.5, -19)

    def cascade(self, times):
        names = ["D4", "E~4", "F4", "G4", "A4", "Bb4", "C5", "D5", "E~5", "F5"]
        for i, t in enumerate(times):
            self.S.note("oud", names[i], t, 0.6 + 0.04 * i, -7 + 0.3 * i, 0.6 - 0.15 * i, -9)

    def build(self, t0, t1):
        n = int((t1 - t0) * 15)
        trem = [(i / 15, 0.2 + 0.75 * (i / n) ** 1.5) for i in range(n)]
        self.S.note("oud", "D4", t0, 0.9, -7, 0, -10, strikes=trem, dur=t1 - t0 + 0.3)
        self.S.note("oud", "A3", t0, 0.9, -11, -0.2, -12, strikes=trem, dur=t1 - t0 + 0.3)
        for i, dt in enumerate(np.cumsum([0.15] * 4 + [0.075] * 8)):
            self.S.hit("tek", t1 - 1.2 + dt, 0.35 + 0.05 * i, -12, (-0.3, 0.3)[i % 2])

    def groove(self, k, t0, inten, voice):
        S, E = self.S, self.E
        S.hit("doum", t0, 1.0 * inten, -6, send=-18, beat="doum")
        S.hit("tek", t0 + E, 0.6 * inten, -12, -0.2)
        S.hit("tek", t0 + 3 * E, 0.7 * inten, -11, 0.2)
        S.hit("doum", t0 + 4 * E, 0.85 * inten, -7, send=-18, beat="doum")
        S.hit("tek", t0 + 6 * E, 0.75 * inten, -11, 0.1)
        if inten > 0.8:
            for j in (2, 5, 7):
                S.hit("ka", t0 + j * E, 0.4, -15, -0.3)
            S.hit("kick", t0, 0.85, -11, beat="kick")
            S.hit("kick", t0 + 4 * E, 0.7, -12)
        for j in range(16):
            S.hit("riq", t0 + j * E / 2, (0.55 if j % 2 == 0 else 0.3) * inten, -21, 0.35)
        S.bass("D2", t0, 1.15, 0.9, -11); S.bass("D2", t0 + 4 * E, 1.15, 0.8, -12)
        S.pad(["D3", "A3", "D4"] if k % 4 < 2 else ["G3", "D4", "G4"], t0, 2.5, -25 if voice else -22, 0.05, 0.4, 6)
        row = self.RIFF[k % 4]
        self.melody(row, t0, E, 0.82 * (0.85 if voice else 1), -6, keep={0, 4} if voice else None)
        if not voice and inten >= 1.0:
            self.melody([n and (n[:-1] + str(int(n[-1]) + 1)) for n in row], t0 + 0.005, E, 0.4, -15, keep={0, 2, 4, 6})

    def brk(self, t0, t1):
        self.run(["A4", "G4", "F4", "E~4"], t0 + 0.35, 0.16, 0.5, -10)
        trem = [(i / 14, 0.45 * (1 - i / 18)) for i in range(12)]
        self.S.note("oud", "D4", t0 + 1.1, 0.55, -10, 0, -6, strikes=trem)
        self.S.pad(["D3", "A3", "D4"], t0, t1 - t0 + 0.3, -24, 0.8, 0.5, 5)

    def final(self, t):
        self.S.chord("oud", ["D3", "A3", "D4", "A4"], t, 0.85, -5, 0, -6, spread=0.025)
        trem = [(i / 15, 0.85 * (1 - i / 20)) for i in range(15)]
        self.S.note("oud", "D4", t + 0.05, 0.8, -7, 0, -6, strikes=trem)
        self.S.low.add(I.sub(hzn("D2"), 6.5, 0.9) * np.exp(-np.arange(int(6.5 * SR)) / SR / 2.6), t, -13)
        self.S.pad(["D3", "A3", "D4", "F4", "A4"], t, self.S.dur - t, -16, 0.2, 2.6, 7)
        self.run(["A4", "G4", "F4", "E~4", "D4"], t + 2.6, 0.24, 0.4, -12, send=-6)


class Turkish(Culture):
    name, lead = "turkish", "baglama"
    E = 2.4 / 9
    tweak = {"Eb": 13, "F#": -16}
    RIFF = [["A4", None, "Bb4", "A4", "G4", None, "F#4", "G4", "A4"], ["G4", "F#4", "Eb4", "F#4", "G4", None, "F#4", "Eb4", "D4"],
            ["D5", None, "C5", "Bb4", "A4", None, "G4", "A4", "Bb4"], ["A4", "G4", "F#4", "Eb4", "D4", None, None, "D4", None]]

    def held_kw(self, held, step):
        return {"strikes": [(i / 16, 0.65 * (0.95 - 0.04 * i)) for i in range(int(step * 2 * 16))]} if held else {}

    def first(self, t):
        self.S.note("baglama", "D5", t, 0.9, -5, 0, -6)
        self.S.note("baglama", "D4", t + 0.008, 0.65, -9, 0, -8)

    def intro(self, G):
        (a0, a1), (b0, b1), (c0, c1) = G
        trem = [(i / 16, 0.45 * (1 - i / 14)) for i in range(10)]
        self.S.note("baglama", "A4", a0 + 0.35, 0.5, -11, 0.2, -8, strikes=trem)
        if b1 - b0 > 0.25:
            self.run(["Bb4", "A4", "G4", "F#4"], b0 + 0.02, min(0.085, (b1 - b0) / 5), 0.5, -11)
        self.run(["Eb4", "D4"], c0, 0.12, 0.45, -12)

    def drone(self, t0, t1):
        self.S.pad(["D3", "A3", "D4"], t0, t1 - t0 + 0.5, -21, 2.0, 0.6, 5.5)
        self.S.bass("D2", t0 + 1.5, t1 - t0 - 1.0, 0.5, -19)

    def cascade(self, times):
        names = ["D4", "Eb4", "F#4", "G4", "A4", "Bb4", "C5", "D5", "Eb5", "F#5"]
        for i, t in enumerate(times):
            self.S.note("baglama", names[i], t, 0.6 + 0.04 * i, -8 + 0.3 * i, 0.6 - 0.15 * i, -9)

    def build(self, t0, t1):
        n = int((t1 - t0) * 16)
        trem = [(i / 16, 0.15 + 0.8 * (i / n) ** 1.5) for i in range(n)]
        self.S.note("baglama", "D5", t0, 0.9, -8, 0.15, -10, strikes=trem, dur=t1 - t0 + 0.3)
        self.S.note("baglama", "A4", t0, 0.9, -11, -0.15, -12, strikes=trem, dur=t1 - t0 + 0.3)
        for i, dt in enumerate(np.cumsum([self.E] * 2 + [self.E / 2] * 6)):
            self.S.hit("tek", t1 - 1.0 + dt, 0.35 + 0.05 * i, -12, (-0.3, 0.3)[i % 2])

    def groove(self, k, t0, inten, voice):
        S, E = self.S, self.E
        pat = {0: ("doum", 1.0), 2: ("tek", .6), 4: ("doum", .85), 6: ("tek", .75), 7: ("tek", .6), 8: ("tek", .8)}
        for j in range(9):
            if j in pat:
                kind, v = pat[j]
                S.hit(kind, t0 + j * E, v * inten, -7 if kind == "doum" else -11, 0.15 * ((j % 3) - 1), send=-18 if kind == "doum" else None, beat="doum" if kind == "doum" else None)
            else:
                S.hit("ka", t0 + j * E, 0.3 * inten, -16, -0.3)
        if inten > 0.8:
            S.hit("kick", t0, 0.85, -11, beat="kick"); S.hit("kick", t0 + 4 * E, 0.7, -12)
        for j in range(18):
            S.hit("shaker", t0 + j * E / 2, (0.55 if j % 2 == 0 else 0.3) * inten, -24, 0.4)
        S.bass("D2", t0, 1.0, 0.9, -11); S.bass("D2" if k % 2 == 0 else "G1", t0 + 4 * E, 1.25, 0.8, -12)
        S.pad(["D3", "A3", "D4"] if k % 4 < 2 else ["G3", "D4", "G4"], t0, 2.5, -25 if voice else -22, 0.05, 0.4, 6)
        row = self.RIFF[k % 4]
        self.melody(row, t0, E, 0.8 * (0.85 if voice else 1), -7, keep={0, 4} if voice else None)
        if not voice and inten >= 1.0:
            self.melody([n and (n[:-1] + str(int(n[-1]) + 1)) for n in row], t0 + 0.005, E, 0.38, -15, keep={0, 2, 4, 6, 8})

    def brk(self, t0, t1):
        self.run(["A4", "G4", "F#4", "Eb4"], t0 + 0.35, 0.16, 0.5, -10)
        trem = [(i / 16, 0.45 * (1 - i / 18)) for i in range(12)]
        self.S.note("baglama", "D4", t0 + 1.1, 0.55, -10, 0, -6, strikes=trem)
        self.S.pad(["D3", "A3", "D4"], t0, t1 - t0 + 0.3, -24, 0.8, 0.5, 5)

    def final(self, t):
        self.S.chord("baglama", ["D4", "A4", "D5"], t, 0.85, -6, 0, -6, spread=0.02)
        trem = [(i / 16, 0.85 * (1 - i / 22)) for i in range(16)]
        self.S.note("baglama", "D5", t + 0.04, 0.75, -8, 0, -6, strikes=trem)
        self.S.low.add(I.sub(hzn("D2"), 6.5, 0.9) * np.exp(-np.arange(int(6.5 * SR)) / SR / 2.6), t, -13)
        self.S.pad(["D3", "A3", "D4", "F#4", "A4"], t, self.S.dur - t, -16, 0.2, 2.6, 7)
        self.run(["A4", "G4", "F#4", "Eb4", "D4"], t + 2.6, 0.24, 0.4, -12, send=-6)


class Indian(Culture):
    name, lead = "indian", "sitar"
    E = 0.3
    RIFF = [["C#4", "E4", "F#4", "E4", "F#4", "G#4", "A4", None], ["G#4", "F#4", "E4", "F#4", "E4", None, "D4", None],
            ["A4", "G#4", "B4", "C#5", "D5", None, "C#5", "B4"], ["A4", "G#4", "F#4", "E4", "F#4", None, "E4", "D4"]]
    THEKA = [("dha", 1.0), ("ge", .55), ("na", .7), ("ti", .5), ("na", .7), ("ka", .5), ("dhin", .85), ("na", .7)]

    def bol(self, b, t, v, beat=False):
        S = self.S
        if b in ("dha", "dhin"):
            S.hit("na" if b == "dha" else "tin", t, v, -9, 0.15)
            S.hit("ge", t, v, -8, -0.1, send=-18, beat="ge" if beat else None)
        elif b == "ka":
            S.hit("ke", t, v, -12, -0.1)
        else:
            S.hit(b, t, v, -10 if b != "ge" else -9, 0.15 if b != "ge" else -0.1)

    def meend(self, frm, to, t, vel=0.7, gain=-8, glide=0.12):
        f1, f2 = hzn(frm), hzn(to)
        c = 1200 * np.log2(f1 / f2)
        self.S.note("sitar", to, t, vel, gain, 0.1, -12, bend_cents=lambda tt: c * np.exp(-np.maximum(tt - 0.03, 0) / glide))

    def first(self, t):
        self.S.note("sitar", "D4", t, 0.9, -5, 0, -6)
        self.tanpura(t + 0.2, self.S.dur - t - 0.2)

    def tanpura(self, t0, dur):
        x = I.tanpura_cycle(dur, [hzn("A3"), hzn("D4"), hzn("D4"), hzn("D3")], 1.6, 0.5)
        env = np.ones(len(x))
        tt = np.arange(len(x)) / SR + t0
        C = self.S.C
        env *= np.where((tt > C["drop"]) & (tt < C["brk"]), 0.45, 1.0)       # under the groove the drone sits back
        env *= np.minimum(1, (tt - t0) / 1.5)
        self.S.mus.add(x * env, t0, -15)
        self.S.hall.add(x * env, t0, -26)

    def intro(self, G):
        (a0, a1), (b0, b1), (c0, c1) = G
        self.meend("C#4", "E4", a0 + 0.4, 0.5, -10)
        if b1 - b0 > 0.25:
            self.meend("E4", "F#4", b0 + 0.02, 0.5, -10, 0.08)
            if b1 - b0 > 0.35:
                self.S.note("sitar", "G#4", b0 + 0.2, 0.45, -11, 0.1, -12)
        self.meend("A4", "B4", c0, 0.45, -11, 0.1)

    def drone(self, t0, t1):
        self.S.bass("D2", t0 + 1.5, t1 - t0 - 1.0, 0.45, -20)

    def cascade(self, times):
        names = ["D4", "E4", "F#4", "G#4", "A4", "B4", "C#5", "D5", "E5", "F#5"]
        for i, t in enumerate(times):
            self.S.note("sitar", names[i], t, 0.6 + 0.04 * i, -7 + 0.3 * i, 0.5 - 0.12 * i, -10)

    def build(self, t0, t1):
        n = int((t1 - t0) * 12)
        for i in range(n):                                       # jhala: the drone string between melody strokes
            tt = t0 + i / 12
            v = 0.2 + 0.7 * (i / n) ** 1.5
            self.S.note("sitar", "D5" if i % 3 == 0 else "A4", tt, v, -10 if i % 3 == 0 else -14, 0.1 * ((i % 2) * 2 - 1), -12)
        for i, dt in enumerate(np.cumsum([0.15] * 4 + [0.075] * 8)):
            self.S.hit("ti", t1 - 1.2 + dt, 0.4 + 0.04 * i, -12, (-0.2, 0.2)[i % 2])

    def groove(self, k, t0, inten, voice):
        S, E = self.S, self.E
        for j, (b, v) in enumerate(self.THEKA):
            self.bol(b, t0 + j * E, v * inten, beat=(j in (0, 6)))
        if inten > 0.8:
            S.hit("kick", t0, 0.8, -12, beat="kick"); S.hit("kick", t0 + 4 * E, 0.6, -14)
        S.bass("D2", t0, 1.15, 0.85, -12); S.bass("D2" if k % 4 != 2 else "A1", t0 + 4 * E, 1.15, 0.8, -13)
        row = self.RIFF[k % 4]
        self.melody(row, t0, E, 0.78 * (0.85 if voice else 1), -7, keep={0, 4} if voice else None)
        if not voice and inten >= 1.0:
            self.melody([n and (n[:-1] + str(int(n[-1]) + 1)) for n in row], t0 + 0.006, E, 0.35, -16, keep={0, 2, 4, 6})

    def brk(self, t0, t1):
        self.meend("B4", "A4", t0 + 0.35, 0.5, -10, 0.1)
        self.run(["G#4", "F#4", "E4"], t0 + 0.8, 0.17, 0.45, -11)
        self.meend("C#4", "D4", t0 + 1.45, 0.55, -10, 0.15)

    def final(self, t):
        self.S.note("sitar", "D4", t, 0.85, -6, 0, -5)
        self.S.note("sitar", "A4", t + 0.03, 0.6, -10, 0.2, -6)
        self.S.note("sitar", "D5", t + 0.06, 0.6, -10, -0.2, -6)
        self.bol("dha", t, 1.0, beat=True)
        self.S.low.add(I.sub(hzn("D2"), 6.5, 0.9) * np.exp(-np.arange(int(6.5 * SR)) / SR / 2.6), t, -13)
        self.S.pad(["D3", "A3", "D4"], t, self.S.dur - t, -20, 0.3, 2.6, 6)
        self.meend("C#5", "D5", t + 2.7, 0.4, -12, 0.2)


class Japanese(Culture):
    name, lead = "japanese", "koto"
    E = 0.3
    RIFF = [["D5", None, None, "A4", "Bb4", None, "A4", None], ["G4", None, "Eb4", None, "D4", None, None, None],
            ["A4", "Bb4", "D5", None, "Eb5", None, "D5", None], ["Bb4", "A4", "G4", None, "A4", None, None, None]]

    def oshide(self, base, cents, t, vel=0.6, gain=-9, when=0.25):
        self.S.note("koto", base, t, vel, gain, 0.1, -10, bend_cents=lambda tt: cents * np.clip((tt - when) / 0.12, 0, 1))

    def first(self, t):
        self.S.note("koto", "D5", t, 0.9, -5, 0, -5)
        self.S.note("koto", "D4", t + 0.01, 0.6, -9, 0, -6)

    def intro(self, G):
        (a0, a1), (b0, b1), (c0, c1) = G
        self.oshide("A4", 100, a0 + 0.35, 0.5, -10)
        if b1 - b0 > 0.25:
            self.run(["G4", "Eb4", "D4"], b0 + 0.02, min(0.1, (b1 - b0) / 4), 0.5, -11)
        self.S.note("koto", "D5", c0, 0.45, -11, 0.2, -8)

    def drone(self, t0, t1):
        self.S.pad(["D3", "A3", "D4"], t0, t1 - t0 + 0.5, -22, 2.0, 0.6, 4.5)
        self.S.bass("D2", t0 + 1.5, t1 - t0 - 1.0, 0.45, -20)

    def cascade(self, times):
        names = ["D4", "Eb4", "G4", "A4", "Bb4", "D5", "Eb5", "G5", "A5", "Bb5"]
        for i, t in enumerate(times):
            self.S.note("koto", names[i], t, 0.6 + 0.04 * i, -7 + 0.3 * i, 0.6 - 0.15 * i, -9)

    def build(self, t0, t1):
        n = int((t1 - t0) * 14)
        trem = [(i / 14, 0.15 + 0.8 * (i / n) ** 1.5) for i in range(n)]
        self.S.note("koto", "D5", t0, 0.9, -8, 0.15, -10, strikes=trem, dur=t1 - t0 + 0.3)
        self.S.note("koto", "A4", t0, 0.9, -11, -0.15, -12, strikes=trem, dur=t1 - t0 + 0.3)
        for i, dt in enumerate(np.cumsum([0.3, 0.3, 0.2, 0.15, 0.1, 0.1, 0.07, 0.07, 0.05, 0.05])):
            self.S.hit("taiko", t1 - 1.4 + dt, 0.35 + 0.06 * i, -11, (-0.2, 0.2)[i % 2])

    def groove(self, k, t0, inten, voice):
        S, E = self.S, self.E
        S.hit("taiko", t0, 1.0 * inten, -5, send=-16, beat="taiko")
        S.hit("taiko", t0 + 3 * E, 0.6 * inten, -9, send=-18, beat="taiko")
        if inten > 0.85:
            S.hit("taiko", t0 + 5 * E, 0.55, -10)
        for j in (2, 6):
            S.hit("taiko_ka", t0 + j * E, 0.55 * inten, -13, 0.25)
        for j in range(8):
            S.hit("shime", t0 + j * E, (0.65 if j % 4 == 0 else 0.35) * inten, -17, -0.3)
        if k % 2 == 1:
            S.hit("hyoshigi", t0 + 6 * E, 0.6 * inten, -15, 0.35)
        S.bass("D2", t0, 1.15, 0.85, -12); S.bass("D2", t0 + 4 * E, 1.15, 0.75, -13)
        S.pad(["D3", "A3", "D4"] if k % 4 < 2 else ["G3", "D4", "G4"], t0, 2.5, -26 if voice else -23, 0.05, 0.4, 5)
        row = self.RIFF[k % 4]
        self.melody(row, t0, E, 0.8 * (0.85 if voice else 1), -3.5, keep={0, 4} if voice else None)
        if not voice and inten >= 1.0 and k % 2 == 0:
            S.chord("koto", ["D4", "A4", "D5", "Eb5"], t0 - 0.12, 0.45, -14, 0, -10, spread=0.03)

    def brk(self, t0, t1):
        self.oshide("A4", 100, t0 + 0.35, 0.5, -10)
        self.run(["G4", "Eb4"], t0 + 1.0, 0.2, 0.45, -11)
        self.S.note("koto", "D4", t0 + 1.5, 0.5, -10, 0, -6)
        self.S.pad(["D3", "A3", "D4"], t0, t1 - t0 + 0.3, -25, 0.8, 0.5, 4)

    def final(self, t):
        self.S.chord("koto", ["D4", "A4", "D5", "Eb5", "G5"], t, 0.8, -6, 0, -5, spread=0.035)
        self.S.hit("taiko", t, 1.0, -4, send=-12, beat="taiko")
        self.S.low.add(I.sub(hzn("D2"), 6.5, 0.9) * np.exp(-np.arange(int(6.5 * SR)) / SR / 2.6), t, -13)
        self.S.pad(["D3", "A3", "D4", "G4", "A4"], t, self.S.dur - t, -17, 0.2, 2.6, 6)
        self.run(["A5", "G5", "Eb5", "D5"], t + 2.6, 0.3, 0.38, -13, send=-6)


class Chinese(Culture):
    name, lead = "chinese", "guzheng"
    E = 0.3
    RIFF = [["A4", "B4", "D5", None, "B4", "A4", "F#4", None], ["E4", "F#4", "A4", None, "F#4", "E4", "D4", None],
            ["D5", "E5", "F#5", None, "E5", "D5", "B4", "A4"], ["B4", "A4", "F#4", "E4", "D4", None, None, None]]
    SCALE = ["D", "E", "F#", "A", "B"]

    def vib(self, name, t, vel=0.6, gain=-8, depth=22):
        self.S.note("guzheng", name, t, vel, gain, 0.1, -10, bend_cents=lambda tt: depth * np.sin(2 * np.pi * 5.6 * tt) * np.clip((tt - 0.35) / 0.3, 0, 1))

    def gliss(self, t, lo=4, hi=5, step=0.035, vel=0.4, gain=-14):
        names = [f"{n}{o}" for o in range(lo, hi + 1) for n in self.SCALE] + [f"D{hi + 1}"]
        for i, n in enumerate(names):
            self.S.note("guzheng", n, t + i * step, vel * (0.6 + 0.4 * i / len(names)), gain, -0.5 + i / len(names), -10)
        return t + len(names) * step

    def first(self, t):
        self.vib("D5", t, 0.9, -5)
        self.S.note("guzheng", "D4", t + 0.01, 0.6, -10, 0, -6)

    def intro(self, G):
        (a0, a1), (b0, b1), (c0, c1) = G
        end = self.gliss(a0 + 0.3, 4, 4, 0.04, 0.35, -15)
        self.vib("A4", min(end, a1 - 0.2), 0.5, -10)
        if b1 - b0 > 0.25:
            self.run(["E5", "D5", "B4", "A4"], b0 + 0.02, min(0.085, (b1 - b0) / 5), 0.5, -11)
        self.run(["F#4", "E4", "D4"], c0, 0.11, 0.45, -12)

    def drone(self, t0, t1):
        self.S.pad(["D3", "A3", "D4"], t0, t1 - t0 + 0.5, -22, 2.0, 0.6, 4.5)
        self.S.bass("D2", t0 + 1.5, t1 - t0 - 1.0, 0.45, -20)

    def cascade(self, times):
        names = ["D4", "E4", "F#4", "A4", "B4", "D5", "E5", "F#5", "A5", "B5"]
        for i, t in enumerate(times):
            self.S.note("guzheng", names[i], t, 0.6 + 0.04 * i, -7 + 0.3 * i, 0.6 - 0.15 * i, -9)

    def build(self, t0, t1):
        n = int((t1 - t0) * 14)
        trem = [(i / 14, 0.15 + 0.8 * (i / n) ** 1.5) for i in range(n)]
        self.S.note("guzheng", "D5", t0, 0.9, -8, 0.15, -10, strikes=trem, dur=t1 - t0 + 0.3)
        self.S.note("guzheng", "A4", t0, 0.9, -11, -0.15, -12, strikes=trem, dur=t1 - t0 + 0.3)
        self.gliss(t1 - 0.62, 4, 5, 0.05, 0.45, -12)
        for i, dt in enumerate(np.cumsum([0.15] * 4 + [0.075] * 8)):
            self.S.hit("tanggu", t1 - 1.2 + dt, 0.35 + 0.05 * i, -11, (-0.2, 0.2)[i % 2])

    def groove(self, k, t0, inten, voice):
        S, E = self.S, self.E
        S.hit("tanggu", t0, 1.0 * inten, -6, send=-18, beat="tanggu")
        S.hit("tanggu", t0 + 4 * E, 0.8 * inten, -8, send=-18, beat="tanggu")
        if inten > 0.85:
            S.hit("tanggu", t0 + 3 * E, 0.45, -12); S.hit("tanggu", t0 + 7 * E, 0.5, -12)
            S.hit("kick", t0, 0.8, -12, beat="kick")
        for j in (1, 3, 5, 7):
            S.hit("muyu", t0 + j * E, 0.5 * inten, -16, 0.3)
        if k % 2 == 1:
            S.hit("bo", t0 + 6 * E, 0.5 * inten, -19, 0.2)
        for j in range(16):
            S.hit("shaker", t0 + j * E / 2, (0.5 if j % 2 == 0 else 0.28) * inten, -25, 0.4)
        S.bass("D2", t0, 1.15, 0.85, -12); S.bass("A1" if k % 4 == 3 else "D2", t0 + 4 * E, 1.15, 0.75, -13)
        S.pad(["D3", "A3", "D4"] if k % 4 != 2 else ["B2", "F#3", "B3"], t0, 2.5, -26 if voice else -23, 0.05, 0.4, 5)
        row = self.RIFF[k % 4]
        self.melody(row, t0, E, 0.8 * (0.85 if voice else 1), -3.5, keep={0, 4} if voice else None)
        if not voice and inten >= 1.0 and k % 2 == 1:
            self.gliss(t0 + 7.2 * E - 0.5, 4, 5, 0.04, 0.3, -16)

    def brk(self, t0, t1):
        self.vib("A4", t0 + 0.35, 0.5, -10)
        self.run(["F#4", "E4"], t0 + 1.0, 0.2, 0.45, -11)
        self.vib("D4", t0 + 1.5, 0.5, -10, 18)
        self.S.pad(["D3", "A3", "D4"], t0, t1 - t0 + 0.3, -25, 0.8, 0.5, 4)

    def final(self, t):
        self.gliss(t - 0.45, 4, 5, 0.03, 0.4, -13)
        self.S.chord("guzheng", ["D4", "A4", "D5", "F#5"], t, 0.8, -6, 0, -5, spread=0.03)
        self.S.hit("bo", t, 0.8, -14, send=-10)
        self.S.hit("tanggu", t, 1.0, -6, send=-14, beat="tanggu")
        self.S.low.add(I.sub(hzn("D2"), 6.5, 0.9) * np.exp(-np.arange(int(6.5 * SR)) / SR / 2.6), t, -13)
        self.S.pad(["D3", "A3", "D4", "F#4", "A4"], t, self.S.dur - t, -17, 0.2, 2.6, 6)
        self.vib("A5", t + 2.7, 0.35, -13)


class Flamenco(Culture):
    name, lead = "flamenco", "flamenco"
    E = 0.2
    CH = {"Gm": ["G2", "D3", "G3", "Bb3", "D4", "G4"], "F": ["F2", "C3", "F3", "A3", "C4", "F4"], "Eb": ["Eb3", "G3", "Bb3", "Eb4", "G4"],
          "D": ["D3", "A3", "D4", "F#4", "A4", "D5"]}
    PROG = [("Gm", "F"), ("Eb", "D"), ("Gm", "F"), ("Eb", "D")]
    FALSETA = [["A4", "Bb4", "A4", "G4", "F#4", "G4", "A4", None, None, "Bb4", "A4", "G4"],
               ["F#4", "G4", "F#4", "Eb4", "D4", None, "Eb4", None, "D4", None, None, None]]

    def rasg(self, ch, t, vel, gain=-7, roll=False):
        if roll:
            for i, dt in enumerate((0, 0.035, 0.07, 0.105)):
                self.S.chord("flamenco", self.CH[ch], t + dt, vel * (0.75 + 0.08 * i), gain, 0.1 * (i % 2 * 2 - 1), -14, spread=0.006, down=i % 2 == 0)
        else:
            self.S.chord("flamenco", self.CH[ch], t, vel, gain, 0, -14, spread=0.009)

    def first(self, t):
        self.rasg("D", t, 0.95, -5, roll=True)

    def intro(self, G):
        (a0, a1), (b0, b1), (c0, c1) = G
        self.run(["A4", "Bb4", "A4", "G4", "F#4"], a0 + 0.3, 0.075, 0.5, -11)
        if b1 - b0 > 0.25:
            self.run(["G4", "F#4", "Eb4", "D4"], b0 + 0.02, min(0.08, (b1 - b0) / 5), 0.5, -11)
        self.rasg("Eb", c0, 0.45, -13)

    def drone(self, t0, t1):
        self.S.pad(["D3", "A3", "D4"], t0, t1 - t0 + 0.5, -23, 2.0, 0.6, 4.5)
        self.S.bass("D2", t0 + 1.5, t1 - t0 - 1.0, 0.45, -20)

    def cascade(self, times):
        names = ["D4", "Eb4", "F#4", "G4", "A4", "Bb4", "C5", "D5", "Eb5", "F#5"]
        for i, t in enumerate(times):
            self.S.note("flamenco", names[i], t, 0.62 + 0.04 * i, -7 + 0.3 * i, 0.6 - 0.15 * i, -10)

    def build(self, t0, t1):
        t, i = t0, 0
        while t < t1 - 0.05:
            v = 0.25 + 0.65 * ((t - t0) / (t1 - t0)) ** 1.4
            self.S.chord("flamenco", self.CH["D"], t, v, -9, 0.1 * (i % 2 * 2 - 1), -14, spread=0.005, down=i % 2 == 0)
            if i % 2 == 0:
                self.S.hit("palmas", t, v, -13, 0.3)
            t += 0.1 if t < t1 - 0.8 else 0.067
            i += 1

    def groove(self, k, t0, inten, voice):
        S, E = self.S, self.E
        acc = {0, 3, 6, 8, 10}
        for j in range(12):
            if j in acc:
                S.hit("palmas", t0 + j * E, (1.0 if j in (0, 6) else 0.8) * inten, -11, 0.3 * (1 if j % 2 else -1))
            else:
                S.hit("sordas", t0 + j * E, 0.45 * inten, -17, 0.2)
        S.hit("cajon_bass", t0, 1.0 * inten, -7, beat="kick")
        S.hit("cajon_bass", t0 + 6 * E, 0.85 * inten, -8, beat="kick")
        for j in (3, 8, 10):
            S.hit("cajon_slap", t0 + j * E, 0.75 * inten, -12, 0.1)
        if inten > 0.8:
            S.hit("kick", t0, 0.85, -12); S.hit("kick", t0 + 6 * E, 0.7, -13)
        a, b = self.PROG[k % 4]
        S.bass(self.CH[a][0], t0, 1.15, 0.85, -12); S.bass(self.CH[b][0], t0 + 6 * E, 1.15, 0.8, -12)
        if voice:
            self.rasg(a, t0, 0.55, -11); self.rasg(b, t0 + 6 * E, 0.55, -11)
        else:
            self.rasg(a, t0, 0.85 * inten, -7, roll=True); self.rasg(a, t0 + 3 * E, 0.7 * inten, -9)
            self.rasg(b, t0 + 6 * E, 0.85 * inten, -7, roll=True); self.rasg(b, t0 + 8 * E, 0.65 * inten, -9); self.rasg(b, t0 + 10 * E, 0.75 * inten, -9)
            if inten >= 1.0:
                self.melody(self.FALSETA[k % 2], t0, E, 0.6, -10)

    def brk(self, t0, t1):
        self.run(["A4", "G4", "F#4", "Eb4"], t0 + 0.35, 0.16, 0.5, -10)
        self.S.note("flamenco", "D4", t0 + 1.1, 0.55, -10, 0, -6)
        self.S.pad(["D3", "A3", "D4"], t0, t1 - t0 + 0.3, -25, 0.8, 0.5, 4)

    def final(self, t):
        self.rasg("Eb", t - 0.4, 0.7, -8, roll=True)
        self.rasg("D", t, 1.0, -5, roll=True)
        self.S.hit("cajon_bass", t, 1.0, -6, beat="kick")
        self.S.hit("palmas", t, 1.0, -10)
        self.S.low.add(I.sub(hzn("D2"), 6.5, 0.9) * np.exp(-np.arange(int(6.5 * SR)) / SR / 2.6), t, -13)
        self.S.pad(["D3", "A3", "D4", "F#4", "A4"], t, self.S.dur - t, -17, 0.2, 2.6, 6)
        self.run(["A4", "Bb4", "A4", "G4", "F#4"], t + 2.6, 0.12, 0.38, -13, send=-6)


class Bossa(Culture):
    name, lead = "bossa", "nylon"
    S16 = 0.15
    CH = [("D2", ["D3", "F#3", "C#4", "E4", "A4"]), ("B1", ["B2", "A3", "D4", "F#4", "C#5"]), ("E2", ["E3", "D4", "G4", "B4", "F#5"]), ("A1", ["A2", "G3", "C#4", "F#4", "B4"])]
    MEL = [["F#5", None, "E5", "D5", None, "C#5"], ["B4", None, None, "A4", None, None], ["G4", "A4", "B4", "D5", None, None], ["C#5", None, "E5", None, None, None]]

    def first(self, t):
        self.S.chord("nylon", self.CH[0][1], t, 0.8, -6, 0, -10, spread=0.03)
        self.S.note("ep", "F#5", t + 0.02, 0.6, -12, 0.2, -8)

    def intro(self, G):
        (a0, a1), (b0, b1), (c0, c1) = G
        self.S.note("ep", "A4", a0 + 0.45, 0.45, -15, -0.2, -8)
        if b1 - b0 > 0.25:
            self.run(["E5", "D5", "C#5"], b0 + 0.02, min(0.1, (b1 - b0) / 4), 0.45, -15, inst="ep")
        self.run(["B4", "A4"], c0, 0.12, 0.45, -15, inst="ep")

    def drone(self, t0, t1):
        self.S.pad(["D3", "A3", "C#4", "F#4"], t0, t1 - t0 + 0.5, -22, 2.0, 0.6, 5, kind="strings")
        self.S.bass("D2", t0 + 1.5, t1 - t0 - 1.0, 0.45, -20)

    def cascade(self, times):
        names = ["D5", "E5", "F#5", "G5", "A5", "B5", "C#6", "D6", "E6", "F#6"]
        for i, t in enumerate(times):
            self.S.note("ep", names[i], t, 0.55 + 0.03 * i, -12 + 0.3 * i, 0.5 - 0.12 * i, -8)   # under the podcast dub

    def build(self, t0, t1):
        t, i = t0, 0
        while t < t1 - 0.05:
            v = 0.2 + 0.55 * ((t - t0) / (t1 - t0)) ** 1.4
            # (-5 dB vs the first pass: the soft bossa groove gets a big normalisation gain, and the strums then
            #  overshot the drop by 1.4 LU; the build must stay under the drop)
            self.S.chord("nylon", self.CH[0][1], t, v, -20, 0.1 * (i % 2 * 2 - 1), -12, spread=0.008, down=i % 2 == 0)
            self.S.hit("shaker", t, v, -21, 0.4)
            t += 0.15 if t < t1 - 0.6 else 0.075
            i += 1

    def groove(self, k, t0, inten, voice):
        S, s = self.S, self.S16
        root, notes = self.CH[k % 4]
        for j in (0, 8):
            S.hit("softkick", t0 + j * s, 0.8 * inten, -11, beat="kick")
        S.bass(root, t0, 1.1, 0.8, -12); S.bass(root, t0 + 6 * s, 0.9, 0.6, -14)
        S.note("bass", hzn(root) * 2, t0, 0.8, -12, 0, None); S.note("bass", hzn(root) * 3, t0 + 6 * s, 0.6, -14, 0, None)
        pos = [2, 5, 8, 11, 14] if k % 2 == 0 else [0, 3, 6, 10, 13]
        for j in pos:
            S.chord("nylon", notes, t0 + j * s, 0.55 * (0.85 if voice else 1), -10, 0, -14, spread=0.006)
        for j in (0, 3, 6, 10, 12) if k % 2 == 0 else (2, 4, 8, 11):
            S.hit("rim", t0 + j * s, 0.6 * inten, -14, 0.2)
        for j in range(16):
            S.hit("shaker", t0 + j * s, (0.6 if j % 4 == 0 else 0.38) * inten, -17, 0.4)
            if j % 2 == 1:
                S.hit("hat", t0 + j * s, 0.35 * inten, -24, -0.3)
        if not voice:
            row = self.MEL[k % 4]
            for i, n in enumerate(row):
                if n:
                    S.note("ep", n, t0 + i * 0.4, 0.55 * inten, -11, 0.15, -8)
        S.pad(notes[1:4], t0, 2.5, -27 if voice else -25, 0.3, 0.5, 4, kind="strings")

    def brk(self, t0, t1):
        self.S.chord("nylon", self.CH[0][1], t0 + 0.3, 0.5, -14, 0, -8, spread=0.04)
        self.run(["F#5", "E5", "D5"], t0 + 0.9, 0.22, 0.45, -15, inst="ep")
        self.S.pad(["D3", "A3", "C#4", "F#4"], t0, t1 - t0 + 0.3, -25, 0.8, 0.5, 4, kind="strings")

    def final(self, t):
        self.S.chord("nylon", ["D2", "A2", "F#3", "C#4", "E4", "A4"], t, 0.85, -6, 0, -6, spread=0.035)
        self.S.note("ep", "F#5", t + 0.05, 0.6, -10, 0.2, -6)
        self.S.low.add(I.sub(hzn("D2"), 6.5, 0.85) * np.exp(-np.arange(int(6.5 * SR)) / SR / 2.6), t, -14)
        self.S.pad(["D3", "A3", "C#4", "F#4", "A4"], t, self.S.dur - t, -18, 0.3, 2.6, 5, kind="strings")
        self.run(["A5", "F#5", "E5", "D5"], t + 2.7, 0.3, 0.38, -13, inst="ep", send=-6)


class Cinematic(Culture):
    name, lead = "cinematic", "piano"
    E = 0.3
    PROG = [("D2", ["D3", "A3", "E4", "F#4"], ["D4", "A4", "E5", "F#5"]), ("C#2", ["C#3", "A3", "E4", "A4"], ["C#4", "A4", "E5", "A5"]),
            ("B1", ["B2", "F#3", "D4", "A4"], ["B3", "F#4", "D5", "A5"]), ("G1", ["G2", "D3", "B3", "F#4"], ["G3", "D4", "B4", "F#5"])]
    MEL = [["F#5", None, "E5", "D5", None, None, "A4", None], ["E5", None, "C#5", "A4", None, None, None, None],
           ["D5", None, "F#5", "E5", None, "D5", "B4", None], ["D5", None, None, "B4", "A4", None, None, None]]

    def first(self, t):
        self.S.note("piano", "D5", t, 0.8, -5, 0.1, -6, dur=5.0)
        self.S.note("piano", "D4", t + 0.01, 0.55, -9, -0.1, -7, dur=5.0)

    def intro(self, G):
        (a0, a1), (b0, b1), (c0, c1) = G
        self.S.note("piano", "A4", a0 + 0.5, 0.45, -11, 0.2, -6, dur=3.0)
        if b1 - b0 > 0.25:
            self.run(["F#4", "E4", "D4"], b0 + 0.02, min(0.11, (b1 - b0) / 4), 0.45, -11, inst="piano")
        self.S.note("piano", "A4", c0, 0.4, -12, -0.2, -6, dur=3.0)

    def drone(self, t0, t1):
        self.S.pad(["D3", "A3", "D4", "F#4"], t0, t1 - t0 + 0.5, -19, 2.4, 0.6, 5, kind="strings")
        self.S.bass("D2", t0 + 1.5, t1 - t0 - 1.0, 0.45, -20)

    def cascade(self, times):
        names = ["D4", "F#4", "A4", "D5", "E5", "F#5", "A5", "D6", "E6", "F#6"]
        for i, t in enumerate(times):
            self.S.note("piano", names[i], t, 0.55 + 0.04 * i, -8 + 0.3 * i, 0.5 - 0.12 * i, -7, dur=3.0)

    def build(self, t0, t1):
        n = int((t1 - t0) / 0.15)
        for i in range(n):
            v = 0.2 + 0.6 * (i / n) ** 1.4
            self.S.note("piano", "D5" if i % 2 == 0 else "A4", t0 + i * 0.15, v, -11, 0.15 * (i % 2 * 2 - 1), -10, dur=1.2)
        self.S.pad(["D3", "A3", "D4", "F#4", "A4"], t0, t1 - t0 + 0.1, -16, t1 - t0, 0.05, 7, kind="strings")
        for i, dt in enumerate(np.cumsum([0.3, 0.2, 0.15, 0.1, 0.1, 0.075, 0.075, 0.05, 0.05, 0.05])):
            self.S.hit("tom", t1 - 1.15 + dt, 0.35 + 0.06 * i, -10, (-0.2, 0.2)[i % 2])

    def groove(self, k, t0, inten, voice):
        S, E = self.S, self.E
        root, pad_, arp = self.PROG[k % 4]
        S.hit("kick", t0, 1.0 * inten, -8, beat="kick")
        S.hit("kick", t0 + 4 * E, 0.85 * inten, -9, beat="kick")
        if inten > 0.85:
            S.hit("kick", t0 + 7 * E, 0.6, -12)
        for j in (2, 6):
            S.hit("clap", t0 + j * E, 0.7 * inten, -14, 0.0, send=-14)
            if inten > 0.85:
                S.hit("snare", t0 + j * E, 0.5, -18)
        for j in range(8):
            S.hit("hat", t0 + j * E + E / 2, 0.45 * inten, -24, 0.3)
        S.bass(root, t0, 2.35, 0.9, -11)
        S.pad(pad_, t0, 2.6, -21 if voice else -18, 0.08, 0.4, 0.5, kind="strings")
        order = [0, 2, 1, 3, 2, 1, 3, 2] if k % 2 == 0 else [0, 1, 2, 3, 1, 2, 3, 1]
        for j, o in enumerate(order):
            S.note("piano", arp[o], t0 + j * E, (0.42 if j % 2 else 0.55) * (0.8 if voice else 1), -12, 0.25 * ((j % 3) - 1), -10, dur=1.6)
        if not voice:
            for i, n in enumerate(self.MEL[k % 4]):
                if n:
                    S.note("piano", n, t0 + i * E, 0.72 * inten, -8, 0.05, -8, dur=2.5)
                    if inten >= 1.0:
                        S.note("piano", n[:-1] + str(int(n[-1]) - 1), t0 + i * E + 0.004, 0.45, -13, -0.1, -9, dur=2.5)

    def brk(self, t0, t1):
        self.run(["A4", "F#4", "E4"], t0 + 0.35, 0.22, 0.45, -10, inst="piano")
        self.S.note("piano", "D4", t0 + 1.2, 0.5, -10, 0, -6, dur=3.0)
        self.S.pad(["D3", "A3", "D4", "F#4"], t0, t1 - t0 + 0.3, -22, 0.8, 0.5, 0.4, kind="strings")

    def final(self, t):
        for i, n in enumerate(["D3", "A3", "D4", "F#4", "A4", "D5"]):
            self.S.note("piano", n, t + i * 0.025, 0.75, -6, 0.2 * (i % 2 * 2 - 1), -5, dur=6.0)
        self.S.low.add(I.sub(hzn("D2"), 6.5, 0.9) * np.exp(-np.arange(int(6.5 * SR)) / SR / 2.6), t, -13)
        self.S.pad(["D3", "A3", "D4", "F#4", "A4"], t, self.S.dur - t, -14, 0.3, 2.6, 0.5, kind="strings")
        self.run(["A5", "F#5", "E5", "D5"], t + 2.7, 0.32, 0.38, -13, inst="piano", send=-5)


CULTURES = {c.name: c for c in (Persian, Arabic, Turkish, Indian, Japanese, Chinese, Flamenco, Bossa, Cinematic)}


# ================================================================== loudness helpers + main
def loudness(x, t0, t1, w=3.0):
    seg = filt(x[:, int(t0 * SR):int(t1 * SR)], hp(38, 1), lambda f: 1 + (10 ** (4 / 20) - 1) / (1 + (1500 / np.maximum(f, 1)) ** 2))
    pw = (seg ** 2).sum(0)
    hop, win = int(0.25 * SR), int(min(w, t1 - t0) * SR)
    vals = [pw[i:i + win].mean() for i in range(0, max(1, len(pw) - win + 1), hop)]
    return 10 * np.log10(max(vals) + 1e-12) - 0.691


def write(path, x):
    x = np.clip(x, -1, 1)
    with wave.open(str(path), "wb") as w:
        w.setnchannels(2); w.setsampwidth(2); w.setframerate(SR)
        w.writeframes((x.T * 32767).astype(np.int16).tobytes())


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("--lang", required=True)
    ap.add_argument("--culture", default=None)
    a = ap.parse_args()
    plan = json.loads((BUILD / a.lang / "plan.json").read_text(encoding="utf-8"))
    S = Score(plan)
    C = S.C
    act_one(S)
    act_two(S)
    transitions(S)
    cul = CULTURES[a.culture or CULTURE[a.lang]](S)
    cul.first(C["click"])
    G = gaps(S)
    cul.intro(G)
    cul.drone(C["click"] + 0.1, C["gap"])
    cul.cascade(flips(S))
    S.pad(["D3", "A3", "D4", "A4"], C["cascade"] - 0.3, C["gap"] - C["cascade"] + 0.3, -17, 1.6, 0.05, 6.5, kind="strings")
    S.sfx.add(I.whoosh(1.6, True, 41, 250, 5000), C["cascade"] - 0.1, -24)
    cul.build(C["build"], C["gap"])
    # the groove: 9 hyper-bars from the drop to the break
    inten = [1.0, 1.0, 0.7, 0.72, 0.8, 0.82, 0.9, 1.0, 1.0]
    voice = [False, False, True, True, True, True, False, False, False]
    for k in range(9):
        cul.groove(k, S.bar(k), inten[k], voice[k])
    cul.brk(C["brk"], C["lock"])
    cul.final(C["lock"])
    # silence the breath before the drop (music side), mix buses
    hall = convolve(S.hall.b, make_ir(2.8, 0.025, 0.5, seed=11))
    room = convolve(S.room.b, make_ir(0.9, 0.008, 0.5, seed=12))
    perc = S.perc.b + 0.35 * convolve(S.perc.b * 0.4, make_ir(1.0, 0.01, 0.4, seed=13))
    # sidechain pump on the low bus from kick-like beats
    n = S.low.b.shape[1]
    pump = np.ones(n)
    for b in S.beats:
        if b["k"] in ("kick", "dum", "doum", "taiko", "ge", "tanggu"):
            i0, L = int(b["t"] * SR), int(0.35 * SR)
            seg = 1 - 0.6 * b["v"] * np.exp(-np.arange(L) / (0.1 * SR)) * np.minimum(1, np.arange(L) / (0.004 * SR) + 0.25)
            m = min(L, n - i0)
            if m > 0:
                pump[i0:i0 + m] = np.minimum(pump[i0:i0 + m], seg[:m])
    low = S.low.b * pump
    music = S.mus.b + perc + low + 0.85 * hall + 0.6 * room
    music = filt(music, shelf_hi(6500, 2.5), shelf_lo(110, -4.5))
    # loudness: the groove sits at -15 LUFS short-term (mix.py balances against the voices and masters)
    g = 10 ** ((-15.0 - loudness(music, C["drop"], C["drop"] + 4.8)) / 20)
    music *= g
    cold = S.cold.b * 10 ** ((-17.0 - loudness(S.cold.b + 1e-9, 5.0, C["cut"] - 0.2)) / 20)
    music[:, : cold.shape[1]] += cold[:, : music.shape[1]]
    g0, g1 = int(C["gap"] * SR), int(C["drop"] * SR)
    music[:, g0:g0 + 240] *= np.linspace(1, 0, 240)
    music[:, g0 + 240:g1] = 0
    music = filt(music, hp(25, 2))
    sfx = S.sfx.b * g
    out = BUILD / a.lang
    if a.culture and a.culture != CULTURE[a.lang]:              # audition another culture without touching the version
        out = BUILD / a.lang / "audition" / a.culture
        out.mkdir(parents=True, exist_ok=True)
    write(out / "music.wav", music * 0.5)
    write(out / "sfx.wav", sfx * 0.5)
    sec = {"cold": (5.0, C["cut"]), "intro": (C["click"], C["cascade"]), "build": (C["build"], C["gap"]), "drop": (C["drop"], C["browser"]),
           "browser": (C["browser"], C["desktop"]), "free": (C["free"], C["brk"]), "break": (C["brk"], C["lock"]), "final": (C["lock"], C["lock"] + 4)}
    rep = {k: round(loudness(music, *v), 1) for k, v in sec.items()}
    (out / "score.json").write_text(json.dumps({"culture": cul.name, "notes": sorted(S.notes, key=lambda e: e["t"]), "beats": sorted(S.beats, key=lambda e: e["t"]),
                                                "gain": 0.5, "sections": rep}, indent=0), encoding="utf-8")
    print(f"score {a.lang} ({cul.name}): peak {np.abs(music).max():.2f}, notes {len(S.notes)}, beats {len(S.beats)}; loudness {rep}")


if __name__ == "__main__":
    main()
