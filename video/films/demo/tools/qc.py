"""QC of a delivered demo language: loudness of the master, faster-whisper check of the dub lines inside the final mix,
and contact sheets made from frames of the ENCODED files (master + web).

  python video/films/demo/tools/qc.py --lang fa            (system Python: faster-whisper lives there; no -I)
Writes video/build/demo/<lang>/qc.json and qc-sheet.png / qc-web.png.
"""
import argparse
import os
os.environ.setdefault("HF_HUB_OFFLINE", "1")
import difflib
import json
import re
import subprocess
import sys
import unicodedata
from pathlib import Path

sys.stdout.reconfigure(encoding="utf-8", errors="replace")
HERE = Path(__file__).resolve().parent
FILM = HERE.parent
VIDEO = FILM.parents[1]
OUT = VIDEO / "out"
TL = json.loads((FILM / "timeline.json").read_text(encoding="utf-8"))
LINES = json.loads((FILM / "lines.json").read_text(encoding="utf-8"))
C = TL["cues"]
WHISPER_LANG = {"zh": "zh", "pt": "pt"}


def norm(text: str) -> str:
    text = unicodedata.normalize("NFKC", text).lower()
    text = re.sub(r"[\u200c\u200d\u200e\u200f\u064b-\u0670\u065f]", "", text)
    return "".join(ch for ch in text if ch.isalnum())


def sim(a, b):
    a, b = norm(a), norm(b)
    return difflib.SequenceMatcher(None, a, b).ratio() if a and b else 0.0


def loudness(path: Path):
    r = subprocess.run(["ffmpeg", "-hide_banner", "-nostats", "-i", str(path), "-af", "ebur128=peak=true", "-f", "null", "-"], capture_output=True, text=True, encoding="utf-8", errors="replace")
    tail = r.stderr[r.stderr.rfind("Summary"):]
    I = float(re.search(r"I:\s+(-?[\d.]+) LUFS", tail).group(1))
    tp = float(re.search(r"Peak:\s+(-?[\d.]+) dBFS", tail).group(1))
    return I, tp


def probe(path: Path):
    r = subprocess.run(["ffprobe", "-v", "error", "-show_entries", "stream=codec_name,profile,width,height,r_frame_rate,pix_fmt,color_space,color_primaries,sample_rate,channels:format=duration,size", "-of", "json", str(path)], capture_output=True, text=True)
    return json.loads(r.stdout)


def whisper(lang: str, master: Path):
    from faster_whisper import WhisperModel
    import ctranslate2
    cuda = ctranslate2.get_cuda_device_count() > 0
    # local model only (no downloads): large-v3-turbo snapshot from the Hugging Face cache
    snap = sorted((Path.home() / ".cache/huggingface/hub/models--mobiuslabsgmbh--faster-whisper-large-v3-turbo/snapshots").glob("*/model.bin"))[0].parent
    model = WhisperModel(str(snap), device="cuda" if cuda else "cpu", compute_type="float16" if cuda else "int8")
    windows = [("L1", C["vo_dub1"] - 0.1, C["vo_dub1"] + 4.6), ("L2", C["vo_dub2"] - 0.1, C["vo_dub2"] + 3.6), ("L3", C["play"] - 0.05, C["play"] + 4.6)]
    out = []
    tmp = VIDEO / "build" / "demo" / lang / "qc"
    tmp.mkdir(parents=True, exist_ok=True)
    for key, a, b in windows:
        wav = tmp / f"{key}.wav"
        subprocess.run(["ffmpeg", "-v", "error", "-y", "-ss", f"{a:.2f}", "-to", f"{b:.2f}", "-i", str(master), "-vn", "-ac", "1", "-ar", "16000", str(wav)], check=True)
        prompt = "以下是普通话的句子，使用简体中文。" if lang == "zh" else None  # steer Whisper to Simplified characters
        segs, info = model.transcribe(str(wav), language=WHISPER_LANG.get(lang, lang), beam_size=5, vad_filter=False, initial_prompt=prompt)
        text = " ".join(s.text.strip() for s in segs)
        ref = LINES["dub"][lang][key]
        out.append({"line": key, "expected": ref, "heard": text, "similarity": round(sim(ref, text), 3)})
    return out


def sheet(lang: str, src: Path, times, name, width=640, cols=4):
    tmp = VIDEO / "build" / "demo" / lang / "qc" / name
    tmp.mkdir(parents=True, exist_ok=True)
    files = []
    for t in times:
        f = tmp / f"{t:06.2f}.png"
        subprocess.run(["ffmpeg", "-v", "error", "-y", "-ss", f"{t:.3f}", "-i", str(src), "-frames:v", "1", "-vf", f"scale={width}:-1", str(f)], check=True)
        files.append(f)
    lst = tmp / "list.txt"
    lst.write_text("\n".join(f"file '{f.as_posix()}'\nduration 1" for f in files), encoding="utf-8")
    dest = VIDEO / "build" / "demo" / lang / f"{name}.png"
    rows = (len(files) + cols - 1) // cols
    subprocess.run(["ffmpeg", "-v", "error", "-y", "-f", "concat", "-safe", "0", "-i", str(lst), "-vf", f"tile={cols}x{rows}:padding=4:color=0x333333", "-frames:v", "1", str(dest)], check=True)
    return dest


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("--lang", default="en")
    ap.add_argument("--no-whisper", action="store_true")
    ap.add_argument("--mix-only", action="store_true", help="only run the whisper check on build/demo/<lang>/mix.wav")
    a = ap.parse_args()
    lang = a.lang
    if a.mix_only:
        for w in whisper(lang, VIDEO / "build" / "demo" / lang / "mix.wav"):
            print(f"  {w['line']} sim {w['similarity']}: heard «{w['heard']}»")
        return
    master, web, poster = OUT / f"demo-{lang}-1080.mp4", OUT / f"demo-{lang}.mp4", OUT / f"demo-{lang}.jpg"
    rep = {"lang": lang}
    rep["master"] = probe(master)
    rep["web"] = probe(web)
    rep["web_mb"] = round(web.stat().st_size / 1e6, 2)
    rep["master_mb"] = round(master.stat().st_size / 1e6, 1)
    rep["loudness_master"] = loudness(master)
    rep["loudness_web"] = loudness(web)
    if not a.no_whisper:
        rep["whisper"] = whisper(lang, master)
    times = [0.4, 1.6, 2.6, 3.6, 4.6, 5.6, 7.0, 8.0, 9.2, 10.4, 11.2, 12.0, 13.4, 14.4, 15.4, 16.6, 17.6, 18.2, 19.2, 20.4, 21.6, 22.6, 23.4, 24.4, 25.4, 26.4, 27.6, 28.6, 29.4, 29.8, 30.6, 31.4, 32.3, 33.2, 34.6, 35.4, 36.4, 37.6, 38.8, 39.6]
    rep["sheet"] = str(sheet(lang, master, times, "qc-sheet"))
    rep["sheet_web"] = str(sheet(lang, web, [2.8, 9.2, 13.8, 22.6, 27.6, 36.4], "qc-web", 640, 3))
    (VIDEO / "build" / "demo" / lang / "qc.json").write_text(json.dumps(rep, ensure_ascii=False, indent=1), encoding="utf-8")
    I, tp = rep["loudness_master"]
    print(f"{lang}: master {rep['master_mb']} MB  web {rep['web_mb']} MB  loudness {I} LUFS / TP {tp} dBTP")
    for w in rep.get("whisper", []):
        print(f"  {w['line']} sim {w['similarity']}: heard «{w['heard']}»")


if __name__ == "__main__":
    main()
