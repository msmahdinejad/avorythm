"""Write video/out/film.meta.json: { kind, duration, fps, langs: { <lang>: { title, transcript: [ … ] } } }.
The transcript lists, in order, what is said (and the on-screen headlines between the spoken lines)."""
import json
import subprocess
import sys
from pathlib import Path

sys.stdout.reconfigure(encoding="utf-8")
HERE = Path(__file__).resolve().parent
VIDEO = HERE.parents[1]
LANGS = ["en", "fa", "ru", "ar", "zh", "hi", "es", "pt", "fr", "de", "tr", "ja"]
cast = json.loads((HERE / "data" / "cast.json").read_text(encoding="utf-8"))
out = {"kind": "film", "duration": None, "fps": 60, "langs": {}}
for L in LANGS:
    copy = json.loads((HERE / "data" / "copy" / f"{L}.json").read_text(encoding="utf-8"))
    plan_p = VIDEO / "build" / "film" / L / "plan.json"
    if not plan_p.exists():
        continue
    plan = json.loads(plan_p.read_text(encoding="utf-8"))
    sc, sa = copy["screen"], copy["say"]
    hero = cast["originals"][f"film.{plan['hero']}"].replace("|", " ")
    strip = lambda s: s.replace("{", "").replace("}", "")
    transcript = [hero, strip(sc["a"]), strip(sc["b"]), sa["hero1"], sa["hero2"], sa["dub_pod"], f"{sc['drop1']} {strip(sc['drop2'])}",
                  sc["browserH"], sa["dub_lec"], sc["desktopH"], sa["dub_doc"], f"{sc['langsN']} {sc['langsW']}", f"{sc['free1']} {sc['free2']}",
                  sc["freeS"], sa["tagline"], "Avorythm", sc["cta"], "msmahdinejad.github.io/avorythm"]
    out["langs"][L] = {"title": copy["title"], "transcript": transcript}
    m = VIDEO / "out" / f"film-{L}-1080.mp4"
    if m.exists() and out["duration"] is None:
        d = subprocess.run(["ffprobe", "-v", "error", "-show_entries", "format=duration", "-of", "default=nw=1:nk=1", str(m)], capture_output=True, text=True).stdout
        out["duration"] = round(float(d), 2)
(VIDEO / "out" / "film.meta.json").write_text(json.dumps(out, ensure_ascii=False, indent=1), encoding="utf-8")
print("film.meta.json:", list(out["langs"]), out["duration"])
