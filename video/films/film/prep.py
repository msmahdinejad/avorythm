"""Voice edit + placement + word alignment for one language version of the brand film.

  python video/films/film/prep.py --lang en            (run WITHOUT -I: faster-whisper lives in the user site-packages)

Reads the Gemini clips (build/film/voices), edits them like a human VO editor (pauses squeezed, gentle pitch-preserving
stretch only when a line is longer than its window, EQ + compression, level matching), decides the per-language cue
times that depend on the voices, aligns every word with faster-whisper and writes build/film/<lang>/plan.json plus the
edited 48 kHz clips in build/film/<lang>/vox/. The score (score.py) and the mix (mix.py) read plan.json; the picture
reads timeline.json written by mix.py (plan + envelopes + notes + beats).
"""
import argparse
import difflib
import json
import re
import subprocess
import sys
import tempfile
import unicodedata
import wave
from pathlib import Path

import numpy as np

sys.stdout.reconfigure(encoding="utf-8", errors="replace")
HERE = Path(__file__).resolve().parent
VIDEO = HERE.parents[1]
BUILD = VIDEO / "build" / "film"
SR = 48000
IN_RATE = 24000

# ------------------------------------------------------------------ fixed cues (seconds); the groove grid is 100 BPM, 2.4 s per bar
DROP = 21.6
BAR = 2.4
CUES = dict(
    hero_src=0.25, reveal=2.4, whip=4.3, whip_end=5.7, a=5.6, b=7.3, settle=8.6, wall=8.6, stutter=9.35, cut=9.65,
    popup=10.15, field=10.7, toButton=11.25, click=11.9, dub1=12.55,
    gap=21.4, drop=DROP, browser=DROP + 2 * BAR, lec=DROP + 2 * BAR + 0.45, desktop=DROP + 4 * BAR, file=DROP + 4 * BAR + 0.55, doc=DROP + 4 * BAR + 0.85,
    langs=DROP + 6 * BAR, free=DROP + 7 * BAR, free2=DROP + 7 * BAR + 1.2, freeS=DROP + 8 * BAR, brk=DROP + 9 * BAR, tag=DROP + 9 * BAR + 0.2,
    lock=DROP + 9 * BAR + 3.0, end=DROP + 9 * BAR + 10.0,
)
CUES.update(wordmark=CUES["lock"] + 0.55, under=CUES["lock"] + 1.1, pills=CUES["lock"] + 1.7, url=CUES["lock"] + 2.1, fade=CUES["end"] - 0.7)
CROWD_T0, CROWD_STEP = 4.55, 0.32

VOICE_CHAIN = "highpass=f=80,equalizer=f=250:t=q:w=1.0:g=-1.5,equalizer=f=3200:t=q:w=1.0:g=2.0,equalizer=f=9000:t=q:w=1.0:g=1.2,acompressor=threshold=0.07:ratio=2.4:attack=6:release=140:makeup=1.6"


def read_wav(path):
    with wave.open(str(path)) as w:
        x = np.frombuffer(w.readframes(w.getnframes()), dtype=np.int16).astype(np.float32) / 32768
        return x, w.getframerate()


def write_wav(path, x, rate=SR):
    path.parent.mkdir(parents=True, exist_ok=True)
    pcm = (np.clip(x, -1, 1) * 32767).astype(np.int16)
    with wave.open(str(path), "wb") as w:
        w.setnchannels(1)
        w.setsampwidth(2)
        w.setframerate(rate)
        w.writeframes(pcm.tobytes())


def squeeze(x, rate, keep=0.18, floor_db=-38.0, min_run=0.22):
    """Shorten silent runs inside a clip to `keep` seconds (keeps natural breath at most)."""
    hop = int(0.01 * rate)
    n = len(x) // hop
    if n < 5:
        return x
    fr = x[: n * hop].reshape(n, hop)
    rms = np.sqrt((fr ** 2).mean(1) + 1e-12)
    quiet = rms < np.percentile(rms, 95) * 10 ** (floor_db / 20)
    out, i = [], 0
    while i < n:
        j = i
        while j < n and quiet[j] == quiet[i]:
            j += 1
        seg = fr[i:j].reshape(-1)
        if quiet[i] and (j - i) * 0.01 > min_run and i > 0 and j < n:
            k = int(keep * rate)
            h = k // 2
            seg = np.concatenate([seg[:h] * np.linspace(1, 0.4, h), seg[-(k - h):] * np.linspace(0.4, 1, k - h)])
        out.append(seg)
        i = j
    out.append(x[n * hop:])
    return np.concatenate(out)


def ffchain(x, rate, tempo):
    with tempfile.TemporaryDirectory() as td:
        src = Path(td) / "in.wav"
        write_wav(src, x, rate)
        f = []
        if abs(tempo - 1) > 0.004:
            f.append(f"rubberband=tempo={tempo:.4f}:transients=smooth:detector=soft:formant=preserved:pitchq=quality")
        f += [VOICE_CHAIN, f"aresample={SR}"]
        raw = subprocess.run(["ffmpeg", "-v", "error", "-y", "-i", str(src), "-af", ",".join(f), "-f", "f32le", "-ac", "1", "-ar", str(SR), "-"], capture_output=True, check=True).stdout
        return np.frombuffer(raw, dtype=np.float32).copy()


def voiced_rms_db(x):
    hop = int(0.02 * SR)
    n = len(x) // hop
    r = np.sqrt((x[: n * hop].reshape(n, hop) ** 2).mean(1))
    g = r > np.percentile(r, 90) * 0.1
    return 20 * np.log10(np.sqrt((r[g] ** 2).mean()) + 1e-9)


def edit(path, window, keep, target_db, max_tempo=1.1):
    x, rate = read_wav(path)
    y = squeeze(x, rate, keep=keep)
    dur = len(y) / rate
    tempo = 1.0 if not window or dur <= window else min(max_tempo, dur / window)
    z = ffchain(y, rate, tempo)
    # trim the chain's tails, short fades
    a = np.where(np.abs(z) > 0.003)[0]
    if a.size:
        z = z[max(0, a[0] - int(0.03 * SR)): a[-1] + int(0.12 * SR)]
    z[: int(0.004 * SR)] *= np.linspace(0, 1, int(0.004 * SR))
    z[-int(0.03 * SR):] *= np.linspace(1, 0, int(0.03 * SR))
    z *= 10 ** ((target_db - voiced_rms_db(z)) / 20)
    return z, {"raw": round(len(x) / rate, 3), "tempo": round(tempo, 3), "dur": round(len(z) / SR, 3), "over": round(max(0.0, len(z) / SR - (window or 1e9)), 3)}


# ------------------------------------------------------------------ word alignment
def norm_chars(s):
    s = unicodedata.normalize("NFKC", s).lower()
    s = re.sub(r"[‌‍‎‏ً-ٰـ]", "", s)
    return [(i, ch) for i, ch in enumerate(s) if ch.isalnum()]


def tokens(text, lang):
    """Display tokens like the page's tokenize(): words, CJK by character groups (approximation), punctuation glued."""
    text = text.replace("|", " ")
    if lang in ("zh", "ja"):
        out = []
        for ch in text:
            if ch.isspace():
                continue
            if out and (not ch.isalnum()):
                out[-1] += ch
            else:
                out.append(ch)
        return out
    return [w for w in text.split() if w]


_MODEL = None


def whisper():
    global _MODEL
    if _MODEL is None:
        import os
        from faster_whisper import WhisperModel
        dev = os.environ.get("FILM_WHISPER_DEVICE", "cpu")          # the GPU is shared with other teams: CPU int8 is the safe default
        _MODEL = WhisperModel("large-v3-turbo", device=dev, compute_type="int8" if dev == "cpu" else "int8_float16", cpu_threads=12)
    return _MODEL


def align(path, text, lang):
    """Word times for the display text: whisper word stamps -> characters -> display tokens (difflib char alignment)."""
    segs, _ = whisper().transcribe(str(path), language=lang, word_timestamps=True, beam_size=5, vad_filter=False)
    wl = [w for s in segs for w in (s.words or [])]
    heard = "".join(w.word for w in wl)
    # character timeline of the transcript
    ctimes, cstr = [], []
    for w in wl:
        cs = [ch for ch in unicodedata.normalize("NFKC", w.word).lower() if ch.isalnum()]
        n = max(1, len(cs))
        for k, ch in enumerate(cs):
            ctimes.append(w.start + (w.end - w.start) * k / n)
            cstr.append(ch)
    toks = tokens(text, lang)
    tchars, owner = [], []
    for ti, tk in enumerate(toks):
        for _, ch in norm_chars(tk):
            tchars.append(ch)
            owner.append(ti)
    sm = difflib.SequenceMatcher(None, tchars, cstr, autojunk=False)
    t_of = [None] * len(tchars)
    for a, b, size in sm.get_matching_blocks():
        for k in range(size):
            t_of[a + k] = ctimes[b + k]
    # fill gaps by interpolation
    known = [i for i, v in enumerate(t_of) if v is not None]
    end_t = wl[-1].end if wl else 0.0
    if not known:
        t_of = list(np.linspace(0, end_t, len(tchars) + 1)[:-1]) if tchars else []
    else:
        for i in range(len(t_of)):
            if t_of[i] is None:
                prev = max([k for k in known if k < i], default=None)
                nxt = min([k for k in known if k > i], default=None)
                if prev is None:
                    t_of[i] = t_of[nxt]
                elif nxt is None:
                    t_of[i] = t_of[prev] + 0.06 * (i - prev)
                else:
                    t_of[i] = t_of[prev] + (t_of[nxt] - t_of[prev]) * (i - prev) / (nxt - prev)
    starts = []
    for ti in range(len(toks)):
        idx = [k for k, o in enumerate(owner) if o == ti]
        starts.append(t_of[idx[0]] if idx else (starts[-1] + 0.1 if starts else 0.0))
    for i in range(1, len(starts)):
        starts[i] = max(starts[i], starts[i - 1] + 0.04)
    words = []
    for i, tk in enumerate(toks):
        end = starts[i + 1] if i + 1 < len(toks) else max(end_t, starts[i] + 0.2)
        words.append({"w": tk, "t": round(float(starts[i]), 3), "d": round(float(max(0.08, end - starts[i])), 3)})
    sim = difflib.SequenceMatcher(None, "".join(tchars), "".join(cstr), autojunk=False).ratio()
    return words, heard.strip(), round(sim, 3)


# ------------------------------------------------------------------ plan
def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("--lang", required=True)
    ap.add_argument("--no-align", action="store_true")
    a = ap.parse_args()
    for lang in a.lang.split(","):
        prep_lang(lang, a.no_align)


def prep_lang(lang, no_align):
    cast = json.loads((HERE / "data" / "cast.json").read_text(encoding="utf-8"))
    copy = json.loads((HERE / "data" / "copy" / f"{lang}.json").read_text(encoding="utf-8"))
    roles = cast["roles"]
    out = BUILD / lang
    vox = out / "vox"
    vox.mkdir(parents=True, exist_ok=True)
    V = BUILD / "voices"

    def role_lang(role):
        r = roles[role]
        return r.get("alt", {}).get(lang, r["lang"])

    hero_lang = role_lang("film")
    crowd = []
    for role in cast["crowdOrder"]:
        rl = role_lang(role)
        if rl in (lang, hero_lang):
            continue
        if any(c["lang"] == rl for c in crowd):   # one card per language
            continue
        crowd.append({"role": role, "lang": rl})
    crowd = crowd[:9]

    clips, log = {}, []
    cues = dict(CUES)

    def place(cid, src, t, window, keep, target, role, text, tlang, max_tempo=1.1, extra=None):
        y, m = edit(src, window, keep, target, max_tempo)
        write_wav(vox / f"{cid}.wav", y)
        clips[cid] = {"t": round(t, 3), "dur": m["dur"], "role": role, "text": text, "lang": tlang, "file": f"vox/{cid}.wav", **(extra or {})}
        log.append(f"{cid:10s} t={t:6.2f} raw={m['raw']:.2f} tempo={m['tempo']:.2f} dur={m['dur']:.2f}" + (f"  OVER {m['over']:.2f}s" if m["over"] > 0.02 else ""))
        return m["dur"]

    orig = cast["originals"]
    # act I: the hero, then the crowd
    place("hero_src", V / "src" / f"film.{hero_lang}.wav", cues["hero_src"], 4.6, 0.42, -20.0, "hero_src", orig[f"film.{hero_lang}"], hero_lang, 1.08)
    for i, c in enumerate(crowd):
        c["t"] = round(CROWD_T0 + i * CROWD_STEP, 3)
        place(f"crowd_{c['role']}", V / "src" / f"{c['role']}.{c['lang']}.wav", c["t"], None, 0.2, -24.0, "crowd", orig[f"{c['role']}.{c['lang']}"], c["lang"])
    # act III: the hero speaks your language
    d1 = place("hero1", V / lang / "hero1.wav", cues["dub1"], 3.3, 0.3, -19.0, "dub", copy["say"]["hero1"], lang)
    cues["dub2"] = round(cues["dub1"] + d1 + 0.42, 3)
    d2 = place("hero2", V / lang / "hero2.wav", cues["dub2"], 2.0, 0.3, -19.0, "dub", copy["say"]["hero2"], lang)
    cues["cascade"] = round(min(18.2, max(17.3, cues["dub2"] + d2 + 0.2)), 3)
    cues["pod"] = round(cues["cascade"] + 0.25, 3)
    cues["build"] = round(max(cues["cascade"] + 1.9, 19.5), 3)
    place("dub_pod", V / lang / "dub_pod.wav", cues["pod"], 2.2, 0.2, -21.0, "dub", copy["say"]["dub_pod"], lang)
    # the originals under the dubs (ducked in the mix)
    place("under_hero1", V / "src" / f"film.{hero_lang}.wav", cues["dub1"] - 0.08, None, 0.42, -20.0, "under", orig[f"film.{hero_lang}"], hero_lang)
    pod_lang = role_lang("podcast")
    place("under_pod", V / "src" / f"podcast.{pod_lang}.wav", cues["pod"] - 0.06, None, 0.2, -21.0, "under", orig[f"podcast.{pod_lang}"], pod_lang)
    # act IV: product scenes
    lec_lang, doc_lang = role_lang("lecture"), role_lang("documentary")
    place("dub_lec", V / lang / "dub_lec.wav", cues["lec"], 4.25, 0.2, -19.0, "dub", copy["say"]["dub_lec"], lang)
    place("under_lec", V / "src" / f"lecture.{lec_lang}.wav", cues["lec"] - 0.08, None, 0.2, -20.0, "under", orig[f"lecture.{lec_lang}"], lec_lang)
    place("dub_doc", V / lang / "dub_doc.wav", cues["doc"], 3.9, 0.2, -19.5, "dub", copy["say"]["dub_doc"], lang)
    place("under_doc", V / "src" / f"documentary.{doc_lang}.wav", cues["doc"] - 0.08, None, 0.2, -20.0, "under", orig[f"documentary.{doc_lang}"], doc_lang)
    place("tagline", V / lang / "tagline.wav", cues["tag"], 2.72, 0.2, -18.5, "tag", copy["say"]["tagline"], lang, 1.12)

    if not no_align:
        for cid, c in clips.items():
            w, heard, sim = align(vox / f"{cid}.wav", c["text"], c["lang"])
            c["words"], c["heard"], c["sim"] = w, heard, sim
            if sim < 0.8:
                log.append(f"ALIGN {cid}: similarity {sim} heard '{heard}'")
    plan = {"lang": lang, "dir": copy["dir"], "hero": hero_lang, "duration": cues["end"], "fps": 60, "bar": BAR, "cues": cues,
            "crowd": crowd, "roleLang": {r: role_lang(r) for r in roles}, "clips": clips}
    (out / "plan.json").write_text(json.dumps(plan, ensure_ascii=False, indent=1), encoding="utf-8")
    print(f"plan {lang}: hero={hero_lang} crowd={[c['lang'] for c in crowd]} cascade={cues['cascade']} build={cues['build']}")
    for line in log:
        print("  " + line)


if __name__ == "__main__":
    main()
