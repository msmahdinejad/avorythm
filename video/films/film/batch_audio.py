"""Audio for many versions at once: prep (sequential, GPU whisper) then score + mix (3 in parallel).
  python video/films/film/batch_audio.py ru,ar,zh,...      (run WITHOUT -I)"""
import subprocess
import sys
from concurrent.futures import ThreadPoolExecutor
from pathlib import Path

HERE = Path(__file__).resolve().parent
ROOT = HERE.parents[2]
langs = sys.argv[1].split(",")
skip_prep = "--no-prep" in sys.argv
py = sys.executable


def run(cmd):
    r = subprocess.run([str(c) for c in cmd], cwd=ROOT, capture_output=True, text=True, encoding="utf-8", errors="replace")
    tail = "\n".join((r.stdout + r.stderr).strip().splitlines()[-3:])
    return r.returncode, tail


if not skip_prep:
    code, tail = run([py, HERE / "prep.py", "--lang", ",".join(langs)])
    print(f"prep {','.join(langs)}: {'ok' if code == 0 else 'FAILED'}\n{tail}", flush=True)


def audio(L):
    c1, t1 = run([py, "-I", HERE / "audio" / "score.py", "--lang", L])
    if c1:
        return f"score {L} FAILED\n{t1}"
    c2, t2 = run([py, "-I", HERE / "audio" / "mix.py", "--lang", L])
    return f"{t1.splitlines()[-1]}\n{t2.splitlines()[-1] if t2 else ''}" if not c2 else f"mix {L} FAILED\n{t2}"


with ThreadPoolExecutor(3) as ex:
    for res in ex.map(audio, langs):
        print(res, flush=True)
