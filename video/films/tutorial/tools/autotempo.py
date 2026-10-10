"""Pick the narration tempo for a language so the film stays inside its length budget (90–120 s).

  python -I video/films/tutorial/tools/autotempo.py --lang de [--target 118]

Reads build/tutorial2/<lang>/voices/*.wav durations (as edited by prep.py at tempo 1), simulates the fit (same rules as
fit.py) and writes build/tutorial2/<lang>/tempo.json with the smallest tempo in [1.0, 1.15] that keeps the film under the
target; prints the expected duration.
"""
import argparse
import json
import math
import subprocess
import sys
from pathlib import Path

sys.stdout.reconfigure(encoding="utf-8", errors="replace")
FILM = Path(__file__).resolve().parents[1]
BUILD = FILM.parents[1] / "build" / "tutorial2"


def total(base, durs, k):
    beat = 60 / base["bpm"]
    t = 0.0
    for sc in base["scenes"]:
        prev = -1e9
        for lid, a in sc["lines"]:
            start = max(a, prev + base["gap"])
            prev = start + durs[lid] / k
        need = max(sc["dur"], prev + sc.get("tail", 0.8))
        t += math.ceil(need / beat - 1e-6) * beat
    return t


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("--lang", required=True)
    ap.add_argument("--target", type=float, default=118.0)
    a = ap.parse_args()
    d = BUILD / a.lang
    (d / "tempo.json").write_text('{"*": 1.0}')
    subprocess.run([sys.executable, "-I", str(FILM / "tools" / "prep.py"), "--lang", a.lang], check=True, capture_output=True)
    durs = {k: v["dur"] for k, v in json.loads((d / "vo" / "durations.json").read_text()).items()}
    base = json.loads((FILM / "timeline.json").read_text(encoding="utf-8"))
    k = 1.0
    while k < 1.15 and total(base, durs, k) > a.target:
        k = round(k + 0.01, 2)
    (d / "tempo.json").write_text(json.dumps({"*": k}))
    print(f"{a.lang}: tempo {k:.2f} -> expected {total(base, durs, k):.1f} s (at 1.00: {total(base, durs, 1.0):.1f} s)")


if __name__ == "__main__":
    main()
