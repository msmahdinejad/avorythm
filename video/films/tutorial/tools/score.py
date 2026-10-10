"""Score + UI foley for the Avorythm tutorial, synthesized from scratch and placed from the fitted timeline.

  python -I video/films/tutorial/tools/score.py --lang en     -> build/tutorial2/<lang>/music.wav, sfx.wav

100 BPM, D major (D – A/C# – Bm – G, a lift to Em – A before the outro). The bed grows with the story:
setup steps (1–3) = pad, felt-pluck arpeggio, round bass, shaker; steps 4–8 add a soft kick/clap pulse and hats;
the outro drops the drums and resolves on D. Every click, toggle, drag and transition in the picture has a sound, keyed
to the same timeline the picture reads (cues are warped per language, so the foley lands on the clicks).
Uses the shared numpy toolkit (dsp.py, copied from video/tools).
"""
import argparse
import json
import sys
import wave
from pathlib import Path

import numpy as np

sys.path.insert(0, str(Path(__file__).resolve().parent))
import dsp  # noqa: E402
from dsp import SR, Bus, hz  # noqa: E402

sys.stdout.reconfigure(encoding="utf-8", errors="replace")
FILM = Path(__file__).resolve().parents[1]
BUILD = FILM.parents[1] / "build" / "tutorial2"

PROG = ["D", "A", "Bm", "G"]
PAD = {"D": ["D4", "F#4", "A4", "E5"], "A": ["C#4", "E4", "A4", "B4"], "Bm": ["B3", "D4", "F#4", "A4"], "G": ["B3", "D4", "G4", "A4"],
       "Em": ["B3", "E4", "G4", "D5"], "A7": ["C#4", "E4", "G4", "B4"]}
ROOT = {"D": "D2", "A": "C#2", "Bm": "B1", "G": "G1", "Em": "E2", "A7": "A1"}
ARP = {"D": ["D5", "F#5", "A5", "E6"], "A": ["C#5", "E5", "A5", "B5"], "Bm": ["B4", "D5", "F#5", "A5"], "G": ["B4", "D5", "G5", "A5"],
       "Em": ["B4", "E5", "G5", "D6"], "A7": ["C#5", "E5", "G5", "B5"]}


def write(path, x, peak=0.89):
    x = x / max(np.abs(x).max() / peak, 1.0)
    pcm = (np.clip(x.T, -1, 1) * 32767).astype(np.int16)
    path.parent.mkdir(parents=True, exist_ok=True)
    with wave.open(str(path), "wb") as w:
        w.setnchannels(2); w.setsampwidth(2); w.setframerate(SR); w.writeframes(pcm.tobytes())


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("--lang", default="en")
    a = ap.parse_args()
    d = BUILD / a.lang
    TL = json.loads((d / "timeline.json").read_text(encoding="utf-8"))
    BASE = json.loads((FILM / "timeline.json").read_text(encoding="utf-8"))
    DUR = TL["duration"]
    BEAT = 60.0 / TL["bpm"]
    BAR = 4 * BEAT
    S16 = BEAT / 4
    scenes = {s["id"]: s for s in TL["scenes"]}
    bcues = {s["id"]: s["cues"] for s in BASE["scenes"]}
    rng = np.random.default_rng(7)

    def warp(sid, b):
        mp = scenes[sid]["map"]
        if b <= mp[0][0]:
            return scenes[sid]["start"] + mp[0][1] + (b - mp[0][0])
        for i in range(1, len(mp)):
            if b <= mp[i][0]:
                x0, y0 = mp[i - 1]; x1, y1 = mp[i]
                return scenes[sid]["start"] + y0 + (y1 - y0) * (b - x0) / max(1e-6, x1 - x0)
        return scenes[sid]["start"] + mp[-1][1] + (b - mp[-1][0])

    def cue(sid, name, off=0.0):
        c = bcues[sid][name]
        return warp(sid, (c["t"] if isinstance(c, dict) else c) + off)

    music, fx, verb = Bus(DUR + 4), Bus(DUR + 4), Bus(DUR + 4)
    kicks = []
    order = [s["id"] for s in TL["scenes"]]
    sstart = {k: scenes[k]["start"] for k in order}
    out_t = sstart["outro"]

    def level(t):
        if t < sstart["install"] - 0.3:
            return 0
        if t < sstart["lang"]:
            return 1
        if t < out_t - BAR:
            return 2
        return 3

    pad_cache = {}

    def pad(ch, dur):
        k = (ch, round(dur, 2))
        if k not in pad_cache:
            pad_cache[k] = dsp.pad([hz(n) for n in PAD[ch]], dur, att=0.6, rel=1.1, bright=6.5, seed=sum(map(ord, ch)) % 97)
        return pad_cache[k]

    nbars = int(DUR // BAR) + 2
    last_full = int((out_t - BAR) // BAR)
    for bar in range(nbars):
        t0 = bar * BAR
        if t0 >= DUR + 0.5:
            break
        lv = level(t0 + 0.05)
        ch = PROG[bar % 4]
        if bar == last_full:
            ch = "Em"
        elif bar == last_full + 1:
            ch = "A7"
        elif t0 >= out_t:
            ch = "D"
        p = pad(ch, BAR + 0.8)
        g = -19.5 if lv == 0 else -18.5 if lv < 2 else -17.5
        music.add(p, t0 - 0.04, g)
        verb.add(p, t0, g - 8)
        if lv == 0:
            continue
        r = hz(ROOT[ch])
        if lv == 2:
            for s in (0, 6, 8, 14):
                music.add(dsp.bass(r * (2 if s == 14 else 1), S16 * 3.0, 0.8), t0 + s * S16, -14)
            for s in (0, 8):
                music.add(dsp.kick(0.65, 0.45), t0 + s * S16, -15)
                kicks.append(t0 + s * S16)
            for s in (4, 12):
                music.add(dsp.clap(0.45, seed=bar), t0 + s * S16, -26, p=0.05)
            for s in range(2, 16, 4):
                music.add(dsp.hat(0.35, seed=bar * 16 + s), t0 + s * S16, -29, p=0.18)
        elif lv == 1:
            music.add(dsp.bass(r, BEAT * 3.4, 0.75), t0, -15)
            for s in (2, 6, 10, 14):
                music.add(dsp.shaker(0.3, seed=bar * 16 + s), t0 + s * S16, -31, p=0.2)
        else:  # outro: drums out, long bass
            music.add(dsp.bass(r, BAR * 0.95, 0.7), t0, -16)
        pat = [0, 3, 6, 8, 11, 14] if lv == 2 else [0, 6, 10]
        octv = 2 if t0 >= sstart["player"] and lv == 2 else 1
        for k, s in enumerate(pat):
            note = hz(ARP[ch][[0, 1, 2, 3, 2, 1][k % 6]]) * octv
            pl = dsp.fm_pluck(note, 1.2, 0.85 if s == 0 else 0.55, bright=0.7)
            gg = -23 if s == 0 else -27
            music.add(pl, t0 + s * S16, gg, p=-0.35 + 0.7 * (k % 2))
            verb.add(pl, t0 + s * S16, gg - 2, p=0.2)

    # ---- intro: swell into the logo hit
    lg = cue("intro", "logo")
    music.add(dsp.noise_sweep(1.2, 300, 9000, q_oct=1.4, curve=2.2, seed=2) * 0.6, lg - 1.15, -25)
    fx.add(dsp.boom(0.55, seed=4, length=1.6), lg, -16)
    for k, n in enumerate(["D6", "F#6", "A6", "D7"]):
        b = dsp.fm_pluck(hz(n), 2.2, 0.8, bright=1.0)
        fx.add(b, lg + 0.02 + k * 0.06, -22, p=-0.4 + 0.27 * k)
        verb.add(b, lg + 0.02 + k * 0.06, -16)
    fx.add(dsp.shimmer(3.0, root=hz("D6"), seed=5), lg, -27)

    # ---- transitions: whoosh into every step, a soft pluck when the title lands
    for i, sid in enumerate(order[1:]):
        t = sstart[sid]
        fx.add(dsp.whoosh(0.7, up=True, seed=20 + i), t - 0.45, -22)
        if sid != "outro":
            fx.add(dsp.fm_pluck(hz(["A5", "B5", "D6", "E6", "F#6", "A6", "B6", "D7"][i % 8]), 1.0, 0.6, bright=0.9), t + 0.05, -26, p=-0.2)

    def click(t, g=-14, seed=0):
        fx.add(dsp.click(0.85, seed=seed), t, g, p=0.08)

    def chime(t, notes=("A5", "D6"), g=-23, gap=0.07):
        for k, n in enumerate(notes):
            b = dsp.fm_pluck(hz(n), 0.9, 0.7, bright=0.9)
            fx.add(b, t + k * gap, g, p=-0.2 + 0.2 * k)
            verb.add(b, t + k * gap, g - 6)

    def pop(t, g=-22):
        n = int(0.18 * SR); tt = np.arange(n) / SR
        ph = np.cumsum(300 + 650 * (1 - np.exp(-tt * 45))) / SR
        fx.add(np.sin(2 * np.pi * ph) * np.exp(-tt * 18) * np.minimum(1, tt / 0.002), t, g)

    def ticks(t0, t1, n, g=-27, accel=False):
        for k in range(n):
            u = k / max(1, n - 1)
            if accel:
                u = 0.5 - 0.5 * np.cos(np.pi * u)
            fx.add(dsp.tick(0.35 + 0.25 * rng.uniform()), t0 + (t1 - t0) * u + rng.uniform(0, 0.008), g, p=rng.uniform(-0.25, 0.25))

    def grab(t, g=-20):
        fx.add(dsp.click(0.5, seed=31), t, g - 2)
        fx.add(dsp.tick(0.5), t + 0.01, g)

    def swoosh(t, up=True, g=-27, dur=0.45):
        fx.add(dsp.whoosh(dur, up=up, seed=int(t * 10) % 50), t - dur * 0.3, g)

    def take(t):
        chime(t, ("D6", "A6"), -27, 0.08)

    # install
    c = lambda n, o=0.0: cue("install", n, o)  # noqa: E731
    click(c("add")); pop(c("add", 0.15)); click(c("ok"), seed=1); chime(c("ok", 0.1), ("F#5", "A5"), -25)
    click(c("puzzle"), seed=2); pop(c("puzzle", 0.08), -26); click(c("pin"), seed=3); chime(c("pin", 0.1), ("A5", "D6", "F#6"), -21); take(c("take"))
    # key
    c = lambda n, o=0.0: cue("key", n, o)  # noqa: E731
    click(c("create")); fx.add(dsp.shimmer(1.2, root=hz("A6"), seed=9), c("create", 0.3), -30); ticks(c("create", 0.4), c("create", 1.1), 12, -30)
    click(c("copy"), seed=4); chime(c("copy", 0.08), ("E6",), -24); fx.add(dsp.noise_sweep(0.9, 600, 9000, q_oct=1.2, curve=1.5, seed=3) * 0.5, c("lift"), -28); take(c("take"))
    # settings
    c = lambda n, o=0.0: cue("settings", n, o)  # noqa: E731
    click(c("icon")); pop(c("icon", 0.08)); click(c("opens"), seed=5); swoosh(c("page"), True, -26)
    fx.add(dsp.boom(0.35, seed=11, length=0.7), c("paste"), -24); ticks(c("paste"), c("paste", 0.35), 14, -30)
    click(c("save"), seed=6); chime(c("save", 0.08), ("D6", "F#6", "A6"), -22); take(c("take"))
    fx.add(dsp.noise_sweep(1.1, 900, 200, q_oct=1.6, curve=1.4, seed=13, rise=False) * 0.5, c("crane"), -29)
    click(c("tick"), seed=7); chime(c("tick", 0.08), ("A5", "D6"), -22)
    # lang
    c = lambda n, o=0.0: cue("lang", n, o)  # noqa: E731
    click(c("icon")); pop(c("icon", 0.08)); click(c("pick"), seed=8); swoosh(c("pick", 0.1), False, -30, 0.3)
    ticks(c("pick", 0.15), c("choose", -0.1), 34, -31, accel=True)
    click(c("choose"), seed=9); chime(c("choose", 0.05), ("B5",), -25)
    fx.add(dsp.boom(0.5, seed=15, length=1.4), c("n79", -0.1), -19); fx.add(dsp.shimmer(1.8, root=hz("F#6"), seed=12), c("n79", -0.1), -27)
    chime(c("onpage", 0.05), ("F#6",), -29); chime(c("sync", 0.05), ("A6",), -29); click(c("radio"), seed=10); take(c("take"))
    # start
    c = lambda n, o=0.0: cue("start", n, o)  # noqa: E731
    fx.add(dsp.noise_sweep(0.8, 400, 8000, q_oct=1.3, curve=2.4, seed=17) * 0.6, c("start", -0.8), -27)
    click(c("start"), -12); chime(c("start", 0.04), ("D5", "F#5", "A5", "D6"), -20, 0.06)
    chime(c("live"), ("A6",), -28); swoosh(c("swing"), True, -24, 0.6)
    chime(c("speaks"), ("D6", "F#6", "A6", "E7"), -22, 0.05); take(c("take"))
    # outputs
    c = lambda n, o=0.0: cue("outputs", n, o)  # noqa: E731
    for k, n in enumerate(("o1", "o3", "o4")):
        click(c(n), seed=11 + k); chime(c(n, 0.03), (["E6", "F#6", "A6"][k],), -27)
    chime(c("o2"), ("D6",), -30)
    pop(c("card"), -26)
    grab(c("drag")); grab(c("dragEnd")); swoosh(c("drag", 0.05), True, -32, 0.6)
    grab(c("resize")); grab(c("resizeEnd"))
    grab(c("balance")); ticks(c("balance", 0.05), c("balanceEnd"), 10, -33); grab(c("balanceEnd"))
    chime(c("duck"), ("B5", "D6"), -27); take(c("take"))
    # player
    c = lambda n, o=0.0: cue("player", n, o)  # noqa: E731
    click(c("pause")); grab(c("seek")); ticks(c("seek", 0.05), c("seekEnd"), 9, -32); grab(c("seekEnd"))
    click(c("full"), seed=14); swoosh(c("full", 0.05), True, -24, 0.5); swoosh(c("fullEnd", -0.1), False, -27, 0.45)
    chime(c("complete", 0.1), ("A5",), -28); click(c("build"), seed=15)
    fx.add(dsp.noise_sweep(0.5, 500, 6000, q_oct=1.3, curve=2.0, seed=21) * 0.5, c("build", 0.05), -30)
    for k in range(3):
        fx.add(dsp.tick(0.7), c("files", k * 0.12), -24, p=-0.4 + 0.4 * k)
        chime(c("files", k * 0.12 + 0.02), (["D6", "F#6", "A6"][k],), -28)
    take(c("take"))
    # desktop
    c = lambda n, o=0.0: cue("desktop", n, o)  # noqa: E731
    swoosh(c("lid", -0.4), True, -26, 0.9); fx.add(dsp.boom(0.35, seed=19, length=0.9), c("lid", 0.6), -24)
    click(c("any", -0.05)); chime(c("any", 0.05), ("A5", "E6"), -26)
    for k in range(3):
        chime(c("os", k * 0.14), (["D6", "F#6", "A6"][k],), -27)
    swoosh(c("studio"), False, -28, 0.6)
    grab(c("drop", -0.75)); fx.add(dsp.boom(0.4, seed=23, length=0.8), c("drop"), -22); click(c("drop", 0.45), seed=16)
    proc, rd = c("drop", 0.55), c("ready")
    for k in range(5):
        chime(proc + (rd - proc) * k / 5, (["D6", "E6", "F#6", "A6", "B6"][k],), -31)
    chime(rd, ("D6", "F#6", "A6", "D7"), -23, 0.06)
    click(c("zip"), seed=17)
    zt = c("zip", 0.1); n = int(0.32 * SR); tt = np.arange(n) / SR; env = np.zeros(n)
    for k in range(18):
        tk = 0.28 * (k / 17) ** 0.75
        env += (tt >= tk) * np.exp(-np.clip(tt - tk, 0, None) * 1400)
    fx.add(dsp.filt(rng.standard_normal(n), dsp.bp(1800, 6000)) * env * 0.6, zt, -18)
    take(c("take"))
    # outro
    c = lambda n, o=0.0: cue("outro", n, o)  # noqa: E731
    fx.add(dsp.boom(0.55, seed=29, length=1.8), c("logo"), -18)
    chime(c("logo", 0.02), ("D6", "A6", "D7", "F#7"), -22, 0.06)
    click(c("star"), seed=18)
    for k, nn in enumerate(["D7", "F#7", "A7", "D8", "F#7", "A7"]):
        b = dsp.fm_pluck(hz(nn), 1.4, 0.5, bright=1.0)
        fx.add(b, c("star", 0.04 + k * 0.06), -27, p=-0.6 + 0.24 * k)
        verb.add(b, c("star", 0.04 + k * 0.06), -20)
    ticks(c("url"), c("url", 0.9), 16, -32)
    # final resolve: long D chord + bells tail
    tf = sstart["outro"] + 0.3
    p = dsp.pad([hz(n) for n in ["D3", "A3", "F#4", "D5", "E5"]], DUR - tf + 1.5, att=1.2, rel=2.5, bright=6.0, seed=31)
    music.add(p, tf, -16)
    verb.add(p, tf, -22)
    music.add(dsp.bass(hz("D2"), DUR - tf, 0.7), tf, -16)

    # ---- fx + master
    ir = dsp.make_ir(t60=2.3, predelay=0.02, hf=0.45, seed=3)
    wet = dsp.convolve(verb.b[:, : int((DUR + 2) * SR)], ir)
    music.b[:, : wet.shape[1]] += wet * 0.8
    # gentle kick sidechain on the bed
    n = music.b.shape[1]
    g = np.ones(n)
    tt = np.arange(int(0.4 * SR)) / SR
    for kt in kicks:
        i = int(kt * SR)
        seg = 1 - 0.2 * np.exp(-tt / 0.14)
        m = min(len(seg), n - i)
        if m > 0:
            g[i:i + m] = np.minimum(g[i:i + m], seg[:m])
    music.b *= g
    end = int(DUR * SR)
    fade = np.ones(n)
    a0 = int((DUR - 2.4) * SR)
    fade[a0:end] = np.linspace(1, 0, end - a0) ** 1.6
    fade[end:] = 0
    music.b *= fade
    m = np.tanh(dsp.filt(music.b, dsp.hp(30, 2)) * 1.25) / np.tanh(1.25)
    f = np.tanh(dsp.filt(fx.b, dsp.hp(40, 2)) * 1.15) / np.tanh(1.15)
    write(d / "music.wav", m[:, :end])
    write(d / "sfx.wav", f[:, :end])
    print(f"{a.lang}: music + sfx written ({DUR:.2f} s)")


if __name__ == "__main__":
    main()
