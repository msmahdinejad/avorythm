"""Intelligibility check: transcribe the final mix with faster-whisper (large-v3-turbo) and compare every dubbed line to
the script.   python qc_whisper.py <lang> [mix.wav | master.mp4]      (run WITHOUT -I)

Every line is transcribed in its OWN window (line start - 0.5 s .. line end + 0.5 s), not as part of one long pass over
the whole film: a single 53 s pass sometimes drops whole segments (Whisper skips a region after the music-only intro)
or stamps the first word of a line early, which reported false failures (pt hero1/hero2, zh hero1, ar tagline)."""
import difflib, json, re, subprocess, sys, unicodedata
from pathlib import Path

import numpy as np

sys.stdout.reconfigure(encoding="utf-8", errors="replace")
BUILD = Path(__file__).resolve().parents[3] / "build" / "film"
lang = sys.argv[1]
src = sys.argv[2] if len(sys.argv) > 2 else str(BUILD / lang / "mix.wav")
plan = json.loads((BUILD / lang / "plan.json").read_text(encoding="utf-8"))
from faster_whisper import WhisperModel
try:
    m = WhisperModel("large-v3-turbo", device="cuda", compute_type="int8_float16")
except Exception:  # noqa: BLE001  (GPU busy / out of memory: fall back to the CPU)
    m = WhisperModel("large-v3-turbo", device="cpu", compute_type="int8", cpu_threads=8)
raw = subprocess.run(["ffmpeg", "-v", "error", "-i", src, "-vn", "-ac", "1", "-ar", "16000", "-f", "f32le", "-"], capture_output=True, check=True).stdout
audio = np.frombuffer(raw, dtype=np.float32)


# loanwords Whisper writes in Latin script although the narration says them exactly as scripted (hi: «न्यूरल नेटवर्क» is
# transcribed as "Neural Network"); mapped back before comparing so a spelling convention is not reported as a miss
LOANWORDS = {"hi": {"neural networks": "न्यूरल नेटवर्क", "neural network": "न्यूरल नेटवर्क"}}


def norm(s):
    s = unicodedata.normalize("NFKC", s).lower()
    for latin, native in LOANWORDS.get(lang, {}).items():
        s = s.replace(latin, native)
    s = re.sub(r"[‌‍ً-ٰـ]", "", s)
    return "".join(ch for ch in s if ch.isalnum())


rows, ok = [], True
for cid in ("hero1", "hero2", "dub_pod", "dub_lec", "dub_doc", "tagline"):
    c = plan["clips"][cid]
    t0, t1 = max(0.0, c["t"] - 0.5), c["t"] + c["dur"] + 0.5
    seg = audio[int(t0 * 16000): int(t1 * 16000)]
    segs, _ = m.transcribe(seg, language=lang, beam_size=5, vad_filter=False, condition_on_previous_text=False)
    heard = "".join(s.text for s in segs)
    r = difflib.SequenceMatcher(None, norm(c["text"]), norm(heard)).ratio()
    ok &= r >= 0.8
    rows.append((cid, round(r, 3), c["text"], heard.strip()))
for r in rows:
    print(f"{r[0]:8s} {r[1]:.3f}  script: {r[2]}\n                heard:  {r[3]}")
res = {"lang": lang, "lines": [{"id": r[0], "similarity": r[1], "heard": r[3]} for r in rows], "pass": bool(ok)}
(BUILD / lang / "whisper.json").write_text(json.dumps(res, ensure_ascii=False, indent=1), encoding="utf-8")
print("WHISPER", "PASS" if ok else "FAIL", lang)
