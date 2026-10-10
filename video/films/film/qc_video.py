"""QC of a finished film version, measured on the ENCODED files in video/out/:
format (ffprobe), loudness + true peak (ebur128 on the master's AAC track), a labelled contact sheet of frames extracted
from the master MP4 (every scene + every transition window), web size, poster.

  python -I video/films/film/qc_video.py --lang en
"""
import argparse
import json
import subprocess
import sys
from pathlib import Path

sys.stdout.reconfigure(encoding="utf-8", errors="replace")
HERE = Path(__file__).resolve().parent
VIDEO = HERE.parents[1]
OUT = VIDEO / "out"
BUILD = VIDEO / "build" / "film"


def probe(path):
    r = subprocess.run(["ffprobe", "-v", "error", "-show_entries", "format=duration,size:stream=codec_name,profile,width,height,r_frame_rate,pix_fmt,color_space,color_primaries,color_transfer,sample_rate,channels",
                        "-of", "json", str(path)], capture_output=True, text=True, check=True)
    return json.loads(r.stdout)


def loud(path):
    r = subprocess.run(["ffmpeg", "-hide_banner", "-i", str(path), "-vn", "-af", "ebur128=peak=true", "-f", "null", "-"], capture_output=True, text=True)
    s = r.stderr[r.stderr.rindex("Summary:"):]
    return {"I": float(s.split("I:")[1].split("LUFS")[0]), "LRA": float(s.split("LRA:")[1].split("LU")[0]), "TP": float(s.split("Peak:")[1].split("dBFS")[0])}


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("--lang", required=True)
    a = ap.parse_args()
    L = a.lang
    master, web, poster = OUT / f"film-{L}-1080.mp4", OUT / f"film-{L}.mp4", OUT / f"film-{L}.jpg"
    plan = json.loads((BUILD / L / "plan.json").read_text(encoding="utf-8"))
    C = plan["cues"]
    pm, pw = probe(master), probe(web)
    lm, lw = loud(master), loud(web)
    times = [0.0, 0.6, 1.6, 2.6, 3.6, C["whip"] + 0.4, C["whip_end"], C["a"] + 0.5, C["b"] + 0.4, C["settle"] + 0.2, C["stutter"] + 0.1, C["cut"] + 0.2,
             C["popup"] + 0.4, C["field"] + 0.4, C["click"] - 0.05, C["click"] + 0.15, C["click"] + 0.3, C["dub1"] + 1.2, C["dub2"] + 0.8, C["cascade"] + 0.6,
             C["cascade"] + 1.4, C["build"] + 0.6, C["gap"] - 0.15, C["drop"] + 0.1, C["drop"] + 1.4, C["drop"] + 3.6, C["browser"] - 0.1, C["browser"] + 1.4,
             C["lec"] + 2.6, C["desktop"] - 0.1, C["desktop"] + 1.4, C["doc"] + 2.8, C["langs"] - 0.05, C["langs"] + 1.4, C["free"] + 0.1, C["free2"] + 1.2,
             C["brk"] + 0.1, C["tag"] + 1.6, C["lock"] - 0.2, C["lock"] + 0.4, C["pills"] + 1.0, C["end"] - 0.3]
    fr = BUILD / L / "qcframes"
    fr.mkdir(parents=True, exist_ok=True)
    for f in fr.glob("*.png"):
        f.unlink()
    files = []
    for t in times:
        p = fr / f"t{t:06.2f}.png"
        subprocess.run(["ffmpeg", "-v", "error", "-y", "-ss", f"{t:.3f}", "-i", str(master), "-frames:v", "1", str(p)], check=True)
        files.append(str(p))
    sheet = BUILD / L / "qc_sheet.png"
    subprocess.run([sys.executable, str(HERE / "sheet.py"), str(sheet), "6", "400", *files], check=True, capture_output=True)
    v = next(s for s in pm["streams"] if s["codec_name"] == "h264")
    au = next(s for s in pm["streams"] if s["codec_name"] == "aac")
    res = {
        "lang": L,
        "master": {"duration": float(pm["format"]["duration"]), "size_mb": round(int(pm["format"]["size"]) / 1e6, 1), "video": f"{v['codec_name']} {v.get('profile')} {v['width']}x{v['height']} {v['r_frame_rate']} {v['pix_fmt']} {v.get('color_space')}/{v.get('color_primaries')}/{v.get('color_transfer')}",
                   "audio": f"aac {au['sample_rate']} Hz {au['channels']} ch", "loudness": lm},
        "web": {"duration": float(pw["format"]["duration"]), "size_mb": round(int(pw["format"]["size"]) / 1e6, 2), "loudness": lw},
        "poster": poster.exists(),
        "sheet": str(sheet),
    }
    ok = abs(lm["I"] + 14) <= 0.6 and lm["TP"] <= -1.0 and res["web"]["size_mb"] <= 8.5 and v["width"] == 1920 and v["r_frame_rate"] == "60/1"
    res["pass"] = bool(ok)
    (BUILD / L / "qc.json").write_text(json.dumps(res, indent=1), encoding="utf-8")
    print(json.dumps(res, indent=1))


if __name__ == "__main__":
    main()
