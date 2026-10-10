"""Fit the base (English-designed) timeline to one language's narration.

  python -I video/films/tutorial/tools/fit.py --lang en

Inputs : films/tutorial/timeline.json (base), build/tutorial2/<lang>/vo/durations.json, build/tutorial2/<lang>/align.json
Output : build/tutorial2/<lang>/timeline.json  — read by the picture, the score and the mixer.

Per scene: lines keep their base anchor unless the previous line is still speaking (then they follow it after `gap`);
the scene lasts max(base, last line end + tail) rounded UP to whole beats, so every cut sits on the beat grid.
Clicks anchored to a spoken word ("at") land on that word in every language; the rest of the scene's choreography is
warped piecewise-linearly between those anchors (monotonic, slope-limited).
"""
import argparse
import json
import math
import sys
from pathlib import Path

sys.stdout.reconfigure(encoding="utf-8", errors="replace")
FILM = Path(__file__).resolve().parents[1]
BUILD = FILM.parents[1] / "build" / "tutorial2"


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("--lang", default="en")
    ap.add_argument("--design", action="store_true", help="write this language's anchor times back into the BASE timeline (run for en)")
    a = ap.parse_args()
    base = json.loads((FILM / "timeline.json").read_text(encoding="utf-8"))
    d = BUILD / a.lang
    durs = json.loads((d / "vo" / "durations.json").read_text(encoding="utf-8"))
    align = json.loads((d / "align.json").read_text(encoding="utf-8"))
    beat = 60.0 / base["bpm"]
    gap = base.get("gap", 0.3)
    scenes, lines, cues = [], {}, {}
    t0 = 0.0
    warnings = []
    for sc in base["scenes"]:
        D = sc["dur"]
        tail = sc.get("tail", 0.8)
        placed = []
        prev_end = -1e9
        for lid, anchor in sc["lines"]:
            dur = durs[lid]["dur"]
            start = max(anchor, prev_end + gap)
            placed.append((lid, anchor, start, dur))
            prev_end = start + dur
        last_end = prev_end if placed else 0.0
        if a.design:
            for name, c in sc.get("cues", {}).items():
                if isinstance(c, dict) and c.get("at"):
                    for lid, _, start, _ in placed:
                        an = align[lid]["anchors"].get(c["at"])
                        if an:
                            c["t"] = round(start + an["t"] + c.get("off", 0.0), 3)
        need = max(D, last_end + tail)
        R = math.ceil(need / beat - 1e-6) * beat
        # anchor pairs (base, real)
        pairs = [(0.0, 0.0, "start"), (D, R, "end")]
        for lid, anchor, start, dur in placed:
            pairs.append((anchor, start, "line:" + lid))
        line_of_anchor = {}
        for lid, _, start, _ in placed:
            for an_id, an in align[lid]["anchors"].items():
                line_of_anchor[an_id] = (lid, start, an)
        for name, c in sc.get("cues", {}).items():
            if isinstance(c, dict) and c.get("at"):
                if c["at"] not in line_of_anchor:
                    warnings.append(f"{sc['id']}.{name}: anchor '{c['at']}' not found in this scene's lines")
                    continue
                lid, start, an = line_of_anchor[c["at"]]
                pairs.append((c["t"], start + an["t"] + c.get("off", 0.0), "cue:" + name))
        # keep a monotonic, slope-limited subset; priority: start/end > cues > lines
        prio = {"start": 0, "end": 0}
        pairs.sort(key=lambda p: (p[0], prio.get(p[2], 1 if p[2].startswith("cue") else 2)))
        kept = []
        for p in pairs:
            if not kept:
                kept.append(p)
                continue
            b0, r0, _ = kept[-1]
            if p[0] - b0 < 0.05:
                if p[2] in ("end",):
                    kept[-1] = p
                continue
            slope = (p[1] - r0) / (p[0] - b0)
            if 0.4 <= slope <= 3.2:
                kept.append(p)
            elif p[2] == "end":
                # end must stay: drop previous points until valid
                while len(kept) > 1 and not (0.4 <= (p[1] - kept[-1][1]) / (p[0] - kept[-1][0]) <= 3.2):
                    warnings.append(f"{sc['id']}: dropped anchor {kept[-1][2]} to keep the end")
                    kept.pop()
                kept.append(p)
            else:
                # a cue outranks line anchors: drop preceding line anchors if that makes the cue fit
                trial = kept[:]
                ok = lambda q: 0.4 <= (p[1] - q[1]) / (p[0] - q[0]) <= 3.2  # noqa: E731
                while p[2].startswith("cue") and len(trial) > 1 and trial[-1][2].startswith("line:") and not ok(trial[-1]):
                    trial.pop()
                if p[2].startswith("cue") and ok(trial[-1]):
                    for q in kept[len(trial):]:
                        warnings.append(f"{sc['id']}: dropped {q[2]} to keep {p[2]}")
                    kept = trial + [p]
                    continue
                warnings.append(f"{sc['id']}: dropped {p[2]} (slope {slope:.2f})")
        mp = [[round(b, 4), round(r, 4)] for b, r, _ in kept]
        if mp[-1][0] != D:
            mp.append([D, R])

        def warp(b):
            for i in range(1, len(mp)):
                if b <= mp[i][0]:
                    x0, y0 = mp[i - 1]
                    x1, y1 = mp[i]
                    return y0 + (y1 - y0) * (b - x0) / max(1e-6, x1 - x0)
            return mp[-1][1] + (b - mp[-1][0])

        for name, c in sc.get("cues", {}).items():
            bt = c["t"] if isinstance(c, dict) else c
            cues[f"{sc['id']}.{name}"] = round(t0 + warp(bt), 3)
        for lid, anchor, start, dur in placed:
            al = align[lid]
            lines[lid] = {"scene": sc["id"], "start": round(t0 + start, 3), "dur": round(dur, 3), "text": al["text"],
                          "t": al["t"], "anchors": {k: {"c0": v["c0"], "c1": v["c1"], "label": v["label"], "t": v["t"]} for k, v in al["anchors"].items()}}
        scenes.append({"id": sc["id"], "start": round(t0, 4), "end": round(t0 + R, 4), "base": D, "dur": round(R, 4), "map": mp,
                       "stretch": round(R / D, 3)})
        t0 += R
    if a.design:
        (FILM / "timeline.json").write_text(json.dumps(base, ensure_ascii=False, indent=1), encoding="utf-8")
        print("base timeline: anchored cue times updated from", a.lang)
    out = {"lang": a.lang, "fps": base["fps"], "bpm": base["bpm"], "beat": beat, "duration": round(t0, 3), "scenes": scenes, "lines": lines, "cues": cues}
    (d / "timeline.json").write_text(json.dumps(out, ensure_ascii=False), encoding="utf-8")
    print(f"{a.lang}: duration {t0:.2f} s")
    for s in scenes:
        print(f"  {s['id']:9s} {s['start']:7.2f} -> {s['end']:7.2f}  ({s['dur']:5.2f} s, base {s['base']:5.2f}, x{s['stretch']:.2f})  map {len(s['map'])} pts")
    for w in warnings:
        print("  WARN", w)


if __name__ == "__main__":
    main()
