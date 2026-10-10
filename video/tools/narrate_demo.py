"""Voice clips for the interactive hero demo on the website (Gemini 3.8 Live, same engine and checks as narrate.py).

  python -I video/tools/narrate_demo.py --env <.env with GEMINI_API_KEY>

For every site language the demo line is spoken by the hero voice, plus the two "original" voices (Japanese, Korean):
  site/public/assets/audio/demo-src-ja.mp3, demo-src-ko.mp3, demo-dub-<lang>.mp3
The hero keeps the same voice in every language (Puck; Aoede when the viewer's language is Japanese and the hero is Korean).
"""
import argparse
import asyncio
import json
import subprocess
import sys
import time
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parent))
import narrate  # noqa: E402

ROOT = Path(__file__).resolve().parents[1]
SITE = ROOT.parent / "site"
BUILD = ROOT / "build" / "demo"
OUT = SITE / "public" / "assets" / "audio"


def load_site_lines() -> tuple[list, dict]:
    code = "import('./site/src/languages.mjs').then(m=>console.log(JSON.stringify({L:m.LANGUAGES,S:m.DEMO_SOURCES})))"
    res = subprocess.run(["node", "-e", code], cwd=ROOT.parent, capture_output=True, text=True, check=True, encoding="utf-8")
    data = json.loads(res.stdout)
    return data["L"], data["S"]


def to_mp3(wav: Path, mp3: Path) -> None:
    mp3.parent.mkdir(parents=True, exist_ok=True)
    subprocess.run(["ffmpeg", "-v", "error", "-y", "-i", str(wav), "-af", "loudnorm=I=-16:TP=-1.5:LRA=7,aresample=24000", "-ac", "1", "-c:a", "libmp3lame", "-b:a", "56k", str(mp3)], check=True)


async def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("--env", required=True, type=Path)
    ap.add_argument("--force", action="store_true")
    ap.add_argument("--proxy", default="http://127.0.0.1:10808")
    ap.add_argument("--thinking", default="low")
    a = ap.parse_args()
    key = narrate.read_key(a.env)
    sources = json.loads((ROOT / "src" / "data" / "sources.json").read_text(encoding="utf-8"))
    langs, demo_sources = load_site_lines()
    hero = sources["sources"]["ja"]
    style = hero["style"]
    jobs = []
    # the voices that "speak first": same speaker in both source languages
    jobs.append(narrate.Job("demo-src-ja", BUILD / "demo-src-ja", demo_sources["ja"]["text"], demo_sources["ja"]["text"], "ja", "Puck", style))
    jobs.append(narrate.Job("demo-src-ko", BUILD / "demo-src-ko", demo_sources["ko"]["text"], demo_sources["ko"]["text"], "ko", "Aoede", style))
    for l in langs:
        voice = "Aoede" if l["code"] == "ja" else "Puck"  # Japanese viewers hear the Korean speaker, so the dub keeps her voice
        jobs.append(narrate.Job(f"demo-dub-{l['code']}", BUILD / f"demo-dub-{l['code']}", l["demo"], l["demo"], l["code"], voice, style))
    sem = asyncio.Semaphore(3)
    log: list = []
    t0 = time.time()
    await asyncio.gather(*(narrate.run_job(j, key, a.proxy, a.thinking, a.force, sem, log) for j in jobs))
    for row in sorted(log, key=lambda r: str(r[0])):
        print("  ", *row)
    for j in jobs:
        wav = j.out.with_suffix(".wav")
        if wav.exists():
            to_mp3(wav, OUT / f"{j.id}.mp3")
    bad = [r for r in log if r[1] not in ("ok", "cached")]
    print(f"done in {time.time() - t0:.0f} s; {len(jobs) - len(bad)} clips ok, {len(bad)} need attention -> {OUT}")
    sys.exit(1 if bad else 0)


if __name__ == "__main__":
    asyncio.run(main())
