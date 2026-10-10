"""QC of a delivered language (run with the system Python, NOT -I: faster-whisper lives in the user site).

  python video/films/tutorial/tools/qc.py --lang en

Checks on the ENCODED files in video/out: stream properties, loudness (ebur128: integrated LUFS, true peak), a faster-whisper
transcript of the master's audio compared with the script (intelligibility over the music), web size, and a contact sheet
of frames extracted from the final MP4 (build/tutorial2/<lang>/final_sheet.png). Writes build/tutorial2/<lang>/qc.json.
"""
import argparse
import difflib
import json
import re
import subprocess
import sys
import unicodedata
from pathlib import Path

sys.stdout.reconfigure(encoding="utf-8", errors="replace")
FILM = Path(__file__).resolve().parents[1]
VIDEO = FILM.parents[1]
BUILD = VIDEO / "build" / "tutorial2"
OUT = VIDEO / "out"
MARK = re.compile(r"\{([a-z0-9_]+)[|^]([^}]*)\}")
NUMS = {"en": {"79": "seventynine", "8": "eight"}, }


CJK_DIGIT = {c: i for i, c in enumerate("〇一二三四五六七八九")}


def cjk_numerals(s):
    """ja: counted/step numbers as Whisper writes them (ステップ一 -> ステップ1, 八つ -> 8つ, 七十九 -> 79); words like 一時停止 stay."""
    d = lambda m: str(CJK_DIGIT[m.group(0)])  # noqa: E731
    s = re.sub(r"[一二三四五六七八九]?十[一二三四五六七八九]?", lambda m: str((CJK_DIGIT.get(m.group(0).split("十")[0], 1) if m.group(0).split("十")[0] else 1) * 10 + (CJK_DIGIT.get(m.group(0).split("十")[1], 0) if m.group(0).split("十")[1] else 0)), s)
    s = re.sub(r"(?<=ステップ)[一二三四五六七八九]", d, s)
    return re.sub(r"[一二三四五六七八九](?=つ)", d, s)


def norm(s):
    s = unicodedata.normalize("NFKC", s).lower()
    s = re.sub(r"[‌‍‎‏ً-ٰ]", "", s)
    s = s.replace("ي", "ی").replace("ك", "ک")
    return "".join(ch for ch in s if ch.isalnum())


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("--lang", default="en")
    ap.add_argument("--model", default="large-v3")
    ap.add_argument("--no-whisper", action="store_true")
    a = ap.parse_args()
    d = BUILD / a.lang
    master = OUT / f"tutorial-{a.lang}-1080.mp4"
    web = OUT / f"tutorial-{a.lang}.mp4"
    res = {"lang": a.lang}
    pr = json.loads(subprocess.run(["ffprobe", "-v", "error", "-show_streams", "-show_format", "-of", "json", str(master)], capture_output=True, text=True, encoding="utf-8", errors="replace").stdout)
    v = next(s for s in pr["streams"] if s["codec_type"] == "video")
    au = next(s for s in pr["streams"] if s["codec_type"] == "audio")
    res["video"] = {k: v.get(k) for k in ("codec_name", "profile", "width", "height", "pix_fmt", "r_frame_rate", "color_primaries", "color_transfer", "color_space")}
    res["audio"] = {k: au.get(k) for k in ("codec_name", "sample_rate", "channels")}
    res["duration"] = float(pr["format"]["duration"])
    res["master_mb"] = round(master.stat().st_size / 1e6, 1)
    res["web_mb"] = round(web.stat().st_size / 1048576, 2)
    eb = subprocess.run(["ffmpeg", "-hide_banner", "-i", str(master), "-map", "0:a", "-af", "ebur128=peak=true", "-f", "null", "-"], capture_output=True, text=True, encoding="utf-8", errors="replace").stderr
    summ = eb[eb.rfind("Summary:"):]
    res["lufs"] = float(summ.split("I:")[1].split("LUFS")[0])
    res["true_peak"] = float(summ.split("Peak:")[1].split("dBFS")[0])
    # smoothness: every frame present (count = duration x fps) and no frozen stretch longer than 0.35 s
    fps = eval(v["r_frame_rate"])  # noqa: S307 (ffprobe "60/1")
    res["frames"] = int(v.get("nb_frames") or 0)
    res["frames_expected"] = round(float(v.get("duration") or res["duration"]) * fps)
    fz = subprocess.run(["ffmpeg", "-hide_banner", "-i", str(master), "-map", "0:v", "-vf", "freezedetect=n=-62dB:d=0.35", "-f", "null", "-"],
                        capture_output=True, text=True, encoding="utf-8", errors="replace").stderr
    res["freezes"] = [round(float(x), 2) for x in re.findall(r"freeze_start: ([0-9.]+)", fz)]
    wv = json.loads(subprocess.run(["ffprobe", "-v", "error", "-select_streams", "v", "-show_streams", "-of", "json", str(web)], capture_output=True, text=True, encoding="utf-8", errors="replace").stdout)["streams"][0]
    res["web_video"] = {k: wv.get(k) for k in ("width", "height", "r_frame_rate")}
    # contact sheet from the encoded master (one frame every ~2.4 s)
    n = 40
    step = res["duration"] / n
    subprocess.run(["ffmpeg", "-v", "error", "-y", "-i", str(master), "-vf", f"fps=1/{step:.3f},scale=480:-1,tile=5x8:padding=4:color=0x222222", "-frames:v", "1", str(d / "final_sheet.png")], check=True)
    if not a.no_whisper:
        from faster_whisper import WhisperModel
        try:
            import ctranslate2
            cuda = ctranslate2.get_cuda_device_count() > 0
        except Exception:  # noqa: BLE001
            cuda = False
        model = WhisperModel(a.model, device="cuda" if cuda else "cpu", compute_type="float16" if cuda else "int8")
        wav = d / "qc_audio.wav"
        subprocess.run(["ffmpeg", "-v", "error", "-y", "-i", str(master), "-ac", "1", "-ar", "16000", str(wav)], check=True)
        segs, info = model.transcribe(str(wav), language={"zh": "zh"}.get(a.lang, a.lang), beam_size=5, vad_filter=False, condition_on_previous_text=False)
        heard = " ".join(s.text.strip() for s in segs)
        script = json.loads((FILM / "script" / f"{a.lang}.json").read_text(encoding="utf-8"))
        TL = json.loads((d / "timeline.json").read_text(encoding="utf-8"))
        ref = " ".join(MARK.sub(lambda m: m.group(2), script["lines"][k]) for k in sorted(script["lines"], key=lambda k: TL["lines"][k]["start"]))
        if a.lang == "ja":
            ref = cjk_numerals(ref)
        ratio = difflib.SequenceMatcher(None, norm(ref), norm(heard), autojunk=False).ratio()
        res["whisper_match"] = round(ratio, 3)
        res["whisper_text"] = heard
        wav.unlink(missing_ok=True)
    (d / "qc.json").write_text(json.dumps(res, ensure_ascii=False, indent=1), encoding="utf-8")
    ok = (res["video"]["width"] == 1920 and res["video"]["height"] == 1080 and abs(res["lufs"] + 14) <= 0.6 and res["true_peak"] <= -1.0
          and res["web_mb"] <= 14.0 and res.get("whisper_match", 1) >= 0.85 and not res["freezes"] and abs(res["frames"] - res["frames_expected"]) <= 2)
    print(f"{a.lang}: {res['duration']:.2f}s {res['video']['width']}x{res['video']['height']} {res['video']['r_frame_rate']} {res['video']['pix_fmt']} {res['video']['color_primaries']} "
          f"frames {res['frames']}/{res['frames_expected']} freezes {res['freezes'] or 0} | "
          f"{res['lufs']:.1f} LUFS, TP {res['true_peak']:.1f} dBTP | web {res['web_mb']} MiB | whisper {res.get('whisper_match')} | {'PASS' if ok else 'CHECK'}")


if __name__ == "__main__":
    main()
