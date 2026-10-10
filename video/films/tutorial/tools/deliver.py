"""Deliver one language: master + web MP4, poster, and update video/out/tutorial.meta.json.

  python -I video/films/tutorial/tools/deliver.py --lang en

master : video/out/tutorial-<lang>-1080.mp4  (picture.mp4 stream copy: 1920x1080 H.264 High yuv420p BT.709 + AAC 48 kHz stereo)
web    : video/out/tutorial-<lang>.mp4       (1280x720 @ 30 fps, CRF ~25, +faststart, <= ~14 MB; falls back to 2-pass if larger)
poster : video/out/tutorial-<lang>.jpg       (1280x720, the language-and-mode moment: popup + "79")
"""
import argparse
import json
import re
import subprocess
import sys
from pathlib import Path

sys.stdout.reconfigure(encoding="utf-8", errors="replace")
FILM = Path(__file__).resolve().parents[1]
VIDEO = FILM.parents[1]
BUILD = VIDEO / "build" / "tutorial2"
OUT = VIDEO / "out"
MARK = re.compile(r"\{([a-z0-9_]+)[|^]([^}]*)\}")
LIMIT = 14 * 1024 * 1024


def run(cmd):
    subprocess.run(cmd, check=True)


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("--lang", default="en")
    a = ap.parse_args()
    d = BUILD / a.lang
    TL = json.loads((d / "timeline.json").read_text(encoding="utf-8"))
    script = json.loads((FILM / "script" / f"{a.lang}.json").read_text(encoding="utf-8"))
    OUT.mkdir(parents=True, exist_ok=True)
    master = OUT / f"tutorial-{a.lang}-1080.mp4"
    web = OUT / f"tutorial-{a.lang}.mp4"
    poster = OUT / f"tutorial-{a.lang}.jpg"
    run(["ffmpeg", "-v", "error", "-y", "-i", str(d / "picture.mp4"), "-i", str(d / "mix.wav"), "-map", "0:v", "-map", "1:a",
         "-c:v", "libx264", "-preset", "slow", "-crf", "16", "-profile:v", "high", "-pix_fmt", "yuv420p", "-g", "120",
         "-color_primaries", "bt709", "-color_trc", "bt709", "-colorspace", "bt709", "-color_range", "tv",
         "-x264-params", "colorprim=bt709:transfer=bt709:colormatrix=bt709",
         "-c:a", "aac", "-b:a", "256k", "-ar", "48000", "-ac", "2", "-movflags", "+faststart", "-shortest",
         "-metadata", f"title=Avorythm — {script['text']['introTitle']}", "-metadata", f"language={a.lang}", str(master)])
    vf = "fps=30,scale=1280:720:flags=lanczos,format=yuv420p"
    common = ["-c:v", "libx264", "-preset", "slow", "-profile:v", "high", "-pix_fmt", "yuv420p", "-color_primaries", "bt709", "-color_trc", "bt709", "-colorspace", "bt709",
              "-c:a", "aac", "-b:a", "112k", "-ac", "2", "-ar", "48000", "-movflags", "+faststart"]
    run(["ffmpeg", "-v", "error", "-y", "-i", str(master), "-vf", vf, "-crf", "25", "-maxrate", "2400k", "-bufsize", "4800k", *common, str(web)])
    if web.stat().st_size > LIMIT:
        dur = TL["duration"]
        vbr = int((LIMIT * 0.96 * 8 / dur - 112_000) / 1000)
        log = str(d / "x264pass")
        run(["ffmpeg", "-v", "error", "-y", "-i", str(master), "-vf", vf, "-b:v", f"{vbr}k", "-pass", "1", "-passlogfile", log, "-an", "-c:v", "libx264", "-preset", "slow", "-f", "mp4", "NUL"])
        run(["ffmpeg", "-v", "error", "-y", "-i", str(master), "-vf", vf, "-b:v", f"{vbr}k", "-pass", "2", "-passlogfile", log, *common, str(web)])
    # poster: the language list + "79" moment
    pt = round(TL["cues"].get("lang.n79", TL["duration"] * 0.4) + 0.7, 2)
    # rendered from the page itself without the caption layer (a poster should not carry half a sentence)
    subprocess.run(["node", str(FILM / "tools" / "render.mjs"), "--lang", a.lang, "--stills", f"{pt}", "--css", "#cap,#capScrim{display:none!important}"], check=True, capture_output=True)
    still = sorted((d / "stills").glob(f"t{pt:06.2f}.png".replace(" ", "0")))
    src = still[0] if still else None
    if src is None:
        run(["ffmpeg", "-v", "error", "-y", "-ss", f"{pt:.3f}", "-i", str(master), "-frames:v", "1", "-vf", "scale=1280:720:flags=lanczos", "-q:v", "2", str(poster)])
    else:
        run(["ffmpeg", "-v", "error", "-y", "-i", str(src), "-vf", "scale=1280:720:flags=lanczos", "-q:v", "2", str(poster)])
    # meta
    meta_p = OUT / "tutorial.meta.json"
    meta = json.loads(meta_p.read_text(encoding="utf-8")) if meta_p.exists() else {"kind": "tutorial", "langs": {}}
    meta["kind"] = "tutorial"
    meta["fps"] = TL["fps"]
    lines = [MARK.sub(lambda m: m.group(2), script["lines"][k]) for k in sorted(script["lines"], key=lambda k: TL["lines"][k]["start"])]
    meta.setdefault("langs", {})[a.lang] = {"title": f"Avorythm — {script['text']['introTitle']}", "duration": round(TL["duration"], 2), "transcript": lines}
    if "en" in meta["langs"]:
        meta["duration"] = meta["langs"]["en"]["duration"]
    else:
        meta["duration"] = round(TL["duration"], 2)
    meta["langs"] = dict(sorted(meta["langs"].items(), key=lambda kv: ["en", "fa", "ru", "ar", "zh", "hi", "es", "pt", "fr", "de", "tr", "ja"].index(kv[0]) if kv[0] in ["en", "fa", "ru", "ar", "zh", "hi", "es", "pt", "fr", "de", "tr", "ja"] else 99))
    meta_p.write_text(json.dumps(meta, ensure_ascii=False, indent=1), encoding="utf-8")
    print(f"{a.lang}: master {master.stat().st_size / 1e6:.1f} MB · web {web.stat().st_size / 1e6:.1f} MB · poster @ {pt:.2f}s")


if __name__ == "__main__":
    main()
