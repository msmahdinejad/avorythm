"""Summarise QC for every delivered language (reads build/tutorial2/<lang>/qc.json).

  python -I video/films/tutorial/tools/summary.py [--readme]   (--readme rewrites the QC table in films/tutorial/README.md)
"""
import json
import sys
from pathlib import Path

sys.stdout.reconfigure(encoding="utf-8", errors="replace")
FILM = Path(__file__).resolve().parents[1]
BUILD = FILM.parents[1] / "build" / "tutorial2"
OUT = FILM.parents[1] / "out"
LANGS = ["en", "fa", "ru", "ar", "zh", "hi", "es", "pt", "fr", "de", "tr", "ja"]
# Whisper scores below 0.9 were read word by word against the script; every difference is orthographic.
REVIEWED = {
    "fa": "brand/UI names transliterated (Gemini → جمینای), spelling variants",
    "hi": "English UI labels and brand transliterated to Devanagari",
    "ja": "English UI labels and brand in katakana (Save → セーブ), kana/kanji variants; no missing words",
}


def main():
    rows = ["| lang | duration | tempo | frames @ 60 fps | freezes | master MB | web MiB | LUFS | true peak | Whisper vs script |", "|---|---|---|---|---|---|---|---|---|---|"]
    for l in LANGS:
        q = BUILD / l / "qc.json"
        if not q.exists():
            rows.append(f"| {l} | — | — | — | — | — | — | — | — | not delivered |")
            continue
        d = json.loads(q.read_text(encoding="utf-8"))
        tempo = json.loads((BUILD / l / "tempo.json").read_text()).get("*", 1.0) if (BUILD / l / "tempo.json").exists() else 1.0
        rows.append(f"| {l} | {d['duration']:.1f} s | ×{tempo:.2f} | {d.get('frames', '—')}/{d.get('frames_expected', '—')} | {len(d.get('freezes', [])) if 'freezes' in d else '—'} | {d['master_mb']} | {d['web_mb']} | {d['lufs']:.1f} | {d['true_peak']:.1f} dBTP | {d.get('whisper_match', '—')}{' — reviewed: ' + REVIEWED[l] if l in REVIEWED else ''} |")
    table = "\n".join(rows)
    print(table)
    if "--readme" in sys.argv:
        r = FILM / "README.md"
        s = r.read_text(encoding="utf-8")
        head = "## Delivered (QC measured on the encoded files)"
        block = f"{head}\n\n{table}\n"
        if head in s:
            a = s.index(head)
            b = s.find("\n## ", a + 5)
            s = s[:a] + block + (s[b:] if b > 0 else "")
        else:
            s = s.rstrip() + "\n\n" + block
        r.write_text(s, encoding="utf-8")


if __name__ == "__main__":
    main()
