"""Writes video/out/demo.meta.json from the copy, the spoken lines and the delivered files.

  python -I video/films/demo/tools/meta.py
transcript = everything the viewer hears or reads, in order (spoken lines, subtitles, headlines, end card).
"""
import json
import re
import subprocess
import sys
from pathlib import Path

sys.stdout.reconfigure(encoding="utf-8", errors="replace")
FILM = Path(__file__).resolve().parents[1]
VIDEO = FILM.parents[1]
OUT = VIDEO / "out"
TL = json.loads((FILM / "timeline.json").read_text(encoding="utf-8"))
LINES = json.loads((FILM / "lines.json").read_text(encoding="utf-8"))
LANGS = ["en", "fa", "ru", "ar", "zh", "hi", "es", "pt", "fr", "de", "tr", "ja"]


def plain(s: str) -> str:
    return re.sub(r"\s+", " ", s.replace("*", "")).strip()


def duration(p: Path) -> float:
    r = subprocess.run(["ffprobe", "-v", "error", "-show_entries", "format=duration", "-of", "csv=p=0", str(p)], capture_output=True, text=True)
    return round(float(r.stdout.strip()), 3)


def main():
    meta = {"kind": "demo", "duration": TL["duration"], "fps": TL["fps"], "langs": {}}
    for lang in LANGS:
        master = OUT / f"demo-{lang}-1080.mp4"
        if not master.exists():
            continue
        c = json.loads((FILM / "copy" / f"{lang}.json").read_text(encoding="utf-8"))
        src = "ko" if lang == "ja" else "ja"
        s, d = LINES["src"][src], LINES["dub"][lang]
        tr = [
            f"[{s['name']}] {s['L1']}", d["L1"],
            plain(c["h1"]["eyebrow"] + " — " + c["h1"]["title"]), plain(c["h1"]["sub"]),
            plain(c["h2"]["title"]), plain(c["h2"]["sub"]),
            f"[{s['name']}] {s['L2']}", plain(c["h3"]["title"]), plain(c["h3"]["sub"]), d["L2"],
            plain(f"{c['h4']['num']} {c['h4']['title']}"),
            plain(c["h5"]["title"]), plain(c["h5"]["sub"]), f"[{s['name']}] {s['L3']}", d["L3"],
            plain(c["h6"]["title"]), plain(c["h6"]["sub"]),
            plain(c["h7"]["title"]), plain(c["h7"]["sub"]),
            " ".join(c["h8"]["words"]), plain(c["h8"]["sub"]),
            "Avorythm — " + plain(c["end"]["tagline"]), plain(c["end"]["cta"]) + " · GitHub · " + plain(c["end"]["desktop"]), c["end"]["url"],
        ]
        meta["langs"][lang] = {"title": c["title"], "duration": duration(master), "transcript": tr,
                               "files": {"master": master.name, "web": f"demo-{lang}.mp4", "poster": f"demo-{lang}.jpg"}}
    (OUT / "demo.meta.json").write_text(json.dumps(meta, ensure_ascii=False, indent=1), encoding="utf-8")
    print("demo.meta.json:", ", ".join(meta["langs"]))


if __name__ == "__main__":
    main()
