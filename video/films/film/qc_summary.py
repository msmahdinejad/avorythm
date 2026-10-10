"""Summary table of every delivered version: duration, master/web size, loudness, true peak, Whisper similarity."""
import json
import sys
from pathlib import Path

sys.stdout.reconfigure(encoding="utf-8")
B = Path(__file__).resolve().parents[2] / "build" / "film"
LANGS = ["en", "fa", "ru", "ar", "zh", "hi", "es", "pt", "fr", "de", "tr", "ja"]
print(f"{'lang':4} {'dur':>5} {'master':>7} {'web':>6} {'LUFS':>6} {'TP':>5} {'web TP':>6} {'whisper min':>11}  culture   pass")
for L in LANGS:
    q, w, tl = B / L / "qc.json", B / L / "whisper.json", B / L / "timeline.json"
    if not q.exists():
        print(f"{L:4} (not delivered)")
        continue
    q = json.loads(q.read_text(encoding="utf-8"))
    wj = json.loads(w.read_text(encoding="utf-8")) if w.exists() else None
    cul = json.loads(tl.read_text(encoding="utf-8")).get("culture", "?") if tl.exists() else "?"
    wmin = min(x["similarity"] for x in wj["lines"]) if wj else float("nan")
    ok = q["pass"] and (wj or {}).get("pass", False)
    m = q["master"]
    print(f"{L:4} {m['duration']:5.1f} {m['size_mb']:6.1f}M {q['web']['size_mb']:5.2f}M {m['loudness']['I']:6.1f} {m['loudness']['TP']:5.1f} {q['web']['loudness']['TP']:6.1f} {wmin:11.3f}  {cul:9} {'PASS' if ok else 'CHECK'}")
