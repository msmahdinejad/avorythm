"""Mix one language version of the brand film -> build/film/<lang>/mix.wav (48 kHz, -14 LUFS, <= -1 dBTP) and
build/film/<lang>/timeline.json (the single timeline the picture reads: cues, clips with word timings and envelopes,
music envelope, beats and notes).

  python -I video/films/film/audio/mix.py --lang en
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
from dsp import SR, Bus, convolve, fades, filt, hp, lp, make_ir, pan, peak  # noqa: E402

HERE = Path(__file__).resolve().parent
BUILD = HERE.parents[2] / "build" / "film"
ENV_FPS = 100
CHAOS_X = [-1380, 1500, -1700, 1450, -200, 350, -2900, 3000, 1100]


def read(path):
    with wave.open(str(path)) as w:
        x = np.frombuffer(w.readframes(w.getnframes()), dtype=np.int16).astype(np.float64) / 32768
        if w.getnchannels() == 2:
            x = x.reshape(-1, 2).T
        assert w.getframerate() == SR, path
        return x


def write(path, x, rate=SR):
    x = np.clip(x, -1, 1)
    with wave.open(str(path), "wb") as w:
        w.setnchannels(2 if x.ndim == 2 else 1); w.setsampwidth(2); w.setframerate(rate)
        w.writeframes(((x.T if x.ndim == 2 else x) * 32767).astype(np.int16).tobytes())


def env_of(x, n_total, i0, fps=ENV_FPS):
    hop = SR // fps
    full = np.zeros(n_total)
    m = min(len(x), n_total - i0)
    full[i0:i0 + m] = x[:m]
    nf = n_total // hop
    r = np.sqrt((full[: nf * hop].reshape(nf, hop) ** 2).mean(1))
    out, v = np.zeros(nf), 0.0
    a, rl = np.exp(-1 / (0.012 * fps)), np.exp(-1 / (0.08 * fps))
    for i, s in enumerate(r):
        v = a * v + (1 - a) * s if s > v else rl * v + (1 - rl) * s
        out[i] = v
    pos = out[out > 1e-5]
    return np.clip(out / (np.percentile(pos, 95) + 1e-9), 0, 1) if pos.size else out


def measure(path):
    m = subprocess.run(["ffmpeg", "-hide_banner", "-i", str(path), "-af", "ebur128=peak=true", "-f", "null", "-"], capture_output=True, text=True).stderr
    summ = m[m.rindex("Summary:"):]
    return float(summ.split("I:")[1].split("LUFS")[0]), float(summ.split("Peak:")[1].split("dBFS")[0])


def lufs(x):
    with tempfile.TemporaryDirectory() as td:
        p = Path(td) / "m.wav"
        write(p, np.clip(x, -4, 4) / 4)                         # headroom for the measurement; +12.04 dB below
        return measure(p)[0] + 20 * np.log10(4)


def tp_limit(x, ceiling_db=-1.6, look=0.002, release=0.08, up=4):
    """True-peak limiter: 4x oversampled peak detection, look-ahead minimum, smooth attack, exponential release."""
    from numpy.lib.stride_tricks import sliding_window_view
    n = x.shape[1]
    X = np.fft.rfft(x, axis=1)
    Y = np.zeros((2, n * up // 2 + 1), dtype=complex)
    Y[:, :X.shape[1]] = X
    yo = np.fft.irfft(Y, n * up, axis=1) * up
    pk = np.abs(yo).max(0)[: n * up].reshape(n, up).max(1)
    del yo, Y
    c = 10 ** (ceiling_db / 20)
    gneed = np.minimum(1.0, c / np.maximum(pk, 1e-9))
    w = int(look * SR)
    gmin = sliding_window_view(np.pad(gneed, (0, w), constant_values=1.0), w + 1).min(1)[:n]
    gs = np.convolve(np.pad(gmin, (w, 0), constant_values=1.0), np.ones(w) / w, mode="valid")[:n]
    gs = np.minimum(gs, gmin)
    a = np.exp(-1 / (release * SR))
    out = np.empty(n)
    cur = 1.0
    for i in range(n):
        v = gs[i]
        cur = v if v < cur else cur * a + v * (1 - a)
        out[i] = cur
    return x * out


def stutter(buf, t0, t1):
    i0 = int(t0 * SR)
    src = buf[:, i0:i0 + int(0.09 * SR)].copy()
    parts = []
    for L, rep in ((0.09, 2), (0.06, 2), (0.04, 2), (0.025, 2), (0.015, 3)):
        parts += [fades(src[:, :int(L * SR)], 0.002, 0.004)] * rep
    s = np.concatenate(parts, axis=1)
    half = s.shape[1] // 2
    s[:, half:] = np.round(s[:, half:] * 20) / 20
    s[:, half:] = np.repeat(s[:, half::4], 4, axis=1)[:, : s.shape[1] - half]
    m = min(s.shape[1], int((t1 - t0) * SR))
    buf[:, i0:] = 0
    buf[:, i0:i0 + m] = s[:, :m]


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("--lang", required=True)
    a = ap.parse_args()
    out = BUILD / a.lang
    plan = json.loads((out / "plan.json").read_text(encoding="utf-8"))
    score = json.loads((out / "score.json").read_text(encoding="utf-8"))
    C = plan["cues"]
    dur = plan["duration"]
    n = int(dur * SR)
    vox = {cid: read(out / c["file"]) for cid, c in plan["clips"].items()}
    world, voice, under = Bus(dur), Bus(dur), Bus(dur)
    plate = make_ir(1.0, 0.012, 0.55, seed=21)
    hall = make_ir(2.2, 0.02, 0.45, seed=22)

    # ---------------------------------------------------------------- act I: the hero (intimate) and the world (a crowd)
    crowd = plan["crowd"]
    for cid, c in plan["clips"].items():
        x, t = vox[cid], c["t"]
        if cid == "hero_src":
            world.add(x, t, -1.5, 0.0)
        elif cid.startswith("crowd_"):
            slot = next(i for i, k in enumerate(crowd) if "crowd_" + k["role"] == cid)
            p = float(np.clip(CHAOS_X[slot] / 3200, -0.85, 0.85))
            world.add(x * 0.9, t, 0.5 - 0.2 * slot, p)
        elif cid.startswith("under_"):
            y = filt(x, lp(3400, 2), hp(170, 2))
            under.add(y, t, -16.5, 0.0)
        else:
            voice.add(x, t, 0.0, 0.0)
    # the babel thickens into a wall: fragments of every voice, faster, pitched, everywhere
    rng = np.random.default_rng(5)
    srcs = [vox[k] for k in vox if k.startswith("crowd_")] + [vox["hero_src"]]
    t = C["wall"] - 0.6
    while t < C["stutter"]:
        y = srcs[rng.integers(len(srcs))]
        a0, d = rng.uniform(0, max(0.05, len(y) / SR - 0.7)), rng.uniform(0.2, 0.6)
        frag = y[int(a0 * SR):int((a0 + d) * SR)]
        ratio = 2 ** (rng.uniform(-3, 3) / 12)
        frag = np.interp(np.arange(0, len(frag) - 1, ratio), np.arange(len(frag)), frag)
        world.add(fades(frag, 0.01, 0.03), t, -6 + 4 * (t - C["wall"] + 0.6), rng.uniform(-0.9, 0.9))
        t += rng.uniform(0.045, 0.12)
    world.b = world.b + 0.16 * convolve(world.b, hall)
    voice.b = voice.b + 0.09 * convolve(voice.b, plate)
    under.b = under.b + 0.12 * convolve(under.b, plate)

    music = read(out / "music.wav") / score["gain"]
    sfx = read(out / "sfx.wav") / score["gain"]
    music = np.pad(music, ((0, 0), (0, max(0, n - music.shape[1]))))[:, :n]
    sfx = np.pad(sfx, ((0, 0), (0, max(0, n - sfx.shape[1]))))[:, :n]

    # ---------------------------------------------------------------- ducking: music under every spoken line (smart ducking, like the product)
    hop = SR // ENV_FPS
    sp = np.abs(voice.b).max(0) + 0.5 * np.abs(world.b[:, :n]).max(0) * (np.arange(n) < C["whip"] * SR)
    nf = n // hop
    e = np.sqrt((sp[: nf * hop].reshape(nf, hop) ** 2).mean(1))
    e = np.clip(e / (np.percentile(e[e > 1e-4], 70) + 1e-9), 0, 1)
    g, cur = np.zeros(nf), 0.0
    for i in range(nf):
        cur = e[i] if e[i] > cur else cur + (e[i] - cur) * 0.03
        g[i] = cur
    duck_db = np.interp(np.arange(n), np.arange(nf) * hop, g)
    after = np.arange(n) >= C["click"] * SR
    duck = 10 ** (-(np.where(after, 9.0, 4.0) * duck_db) / 20)
    # the voices of the world duck a little under the headlines' scrim? no: they are the problem. They stay.
    mix = world.b[:, :n] * 0.92 + voice.b[:, :n] + under.b[:, :n] + music * duck + sfx
    # act I ends in a stutter and a hard cut to silence
    pre = mix[:, : int(C["cut"] * SR) + 1].copy()
    stutter(pre, C["stutter"], C["cut"])
    mix[:, : pre.shape[1]] = pre
    c0, c1 = int(C["cut"] * SR), int(C["popup"] * SR) - int(0.06 * SR)
    thud = sfx[:, c0:c1] * 0.6                                  # only the first low thud of the cut survives, then true silence
    k = int(0.3 * SR)
    thud[:, k:] = 0
    thud[:, :k] *= np.linspace(1, 0, k) ** 2
    mix[:, c0:c1] = thud
    mix = filt(mix, hp(28, 2))
    fo = int(1.8 * SR)
    mix[:, -fo:] *= np.linspace(1, 0, fo) ** 1.4

    # ---------------------------------------------------------------- master: -14 LUFS integrated, true peak <= -1.5 dBTP (4x oversampled limiter)
    g = 10 ** ((-14.0 - lufs(mix)) / 20)
    y = mix * g
    for _ in range(3):
        y = tp_limit(y, -2.5)
        d = -14.0 - lufs(y)
        if abs(d) < 0.05:
            break
        y = y * 10 ** (d / 20)
    y = tp_limit(y, -2.5)
    write(out / "mix.wav", y)
    I_, TP = measure(out / "mix.wav")

    # ---------------------------------------------------------------- timeline for the picture
    tl = dict(plan)
    tl["envFps"] = ENV_FPS
    clips = {}
    for cid, c in plan["clips"].items():
        c2 = dict(c)
        c2["env"] = [round(float(v), 3) for v in env_of(vox[cid], n, int(c["t"] * SR))[int(c["t"] * ENV_FPS): int((c["t"] + c["dur"]) * ENV_FPS) + 2]]
        clips[cid] = c2
    tl["clips"] = clips
    me = env_of(music.mean(0), n, 0)
    tl["music"] = [round(float(v), 3) for v in me]
    tl["beats"] = score["beats"]
    tl["notes"] = score["notes"]
    tl["culture"] = score["culture"]
    tl["loudness"] = {"I": I_, "TP": TP}
    (out / "timeline.json").write_text(json.dumps(tl, ensure_ascii=False), encoding="utf-8")
    print(f"mix {a.lang}: {I_:.1f} LUFS, true peak {TP:.1f} dBTP, culture {score['culture']}")


if __name__ == "__main__":
    main()
