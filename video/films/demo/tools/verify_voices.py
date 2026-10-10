"""ASR check of every voice clip (the Live API's own transcript can be complete while its audio stream ends early).

  python video/films/demo/tools/verify_voices.py            (system Python: faster-whisper; local model only)
Writes video/build/demo/voices/asr.json and prints the clips whose audio does not match the script.
"""
import difflib
import json
import os
import re
import sys
import unicodedata
from pathlib import Path

os.environ.setdefault("HF_HUB_OFFLINE", "1")
sys.stdout.reconfigure(encoding="utf-8", errors="replace")
from faster_whisper import WhisperModel  # noqa: E402

VOICES = Path(__file__).resolve().parents[3] / "build" / "demo" / "voices"
THRESH = 0.8


def norm(text: str) -> str:
    text = unicodedata.normalize("NFKC", text).lower()
    text = re.sub(r"[‌‍‎‏ً-ٰٟ]", "", text)
    return "".join(ch for ch in text if ch.isalnum())


def main():
    only = set(sys.argv[1].split(",")) if len(sys.argv) > 1 else None
    snap = sorted((Path.home() / ".cache/huggingface/hub/models--mobiuslabsgmbh--faster-whisper-large-v3-turbo/snapshots").glob("*/model.bin"))[0].parent
    model = WhisperModel(str(snap), device="cuda", compute_type="float16")
    path = VOICES / "asr.json"
    res = json.loads(path.read_text(encoding="utf-8")) if path.exists() else {}
    bad = []
    for meta in sorted(VOICES.glob("*-L[123].json")):
        m = json.loads(meta.read_text(encoding="utf-8"))
        if only and m["id"] not in only:
            continue
        segs, _ = model.transcribe(str(meta.with_suffix(".wav")), language=m["lang"], beam_size=5, vad_filter=False)
        heard = " ".join(s.text.strip() for s in segs)
        a, b = norm(m["text"]), norm(heard)
        sim = difflib.SequenceMatcher(None, a, b).ratio() if a and b else 0.0
        # the tail matters most (truncation): compare the last third of the script with the end of what was heard
        tail = a[-max(3, len(a) // 3):]
        tail_ok = difflib.SequenceMatcher(None, tail, b[-len(tail) - 2:]).ratio() >= 0.6
        res[m["id"]] = {"key": m["key"], "heard": heard, "sim": round(sim, 3), "tail_ok": tail_ok}
        flag = "" if sim >= THRESH and tail_ok else "  <-- BAD"
        if flag:
            bad.append(m["id"])
        print(f"{m['id']:12s} {sim:.2f} {'tail ok' if tail_ok else 'TAIL?'}  «{heard}»{flag}")
    path.write_text(json.dumps(res, ensure_ascii=False, indent=1), encoding="utf-8")
    print("BAD:", ",".join(bad) if bad else "none")


if __name__ == "__main__":
    main()
