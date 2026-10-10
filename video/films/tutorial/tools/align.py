"""Word/character timing of every narration clip (faster-whisper large-v3 + character alignment to the script).

  python video/films/tutorial/tools/align.py --lang en          (system Python, NOT -I: faster-whisper lives in user site)

Output build/tutorial2/<lang>/align.json:
  { "<line id>": { "text": plain spoken text, "dur": clip seconds, "t": [start time of every character],
                   "anchors": { "<anchor id>": {"c0": char index, "c1": end index, "t": seconds, "label": bool} },
                   "whisper": "what whisper heard", "match": similarity } }
Character times are relative to the clip start; the picture tokenises the text itself (Intl.Segmenter) and looks up each
token's first character, so word timing works the same for Latin, Arabic script, Devanagari and CJK.
"""
import argparse
import difflib
import json
import re
import sys
import unicodedata
import wave
from pathlib import Path

sys.stdout.reconfigure(encoding="utf-8", errors="replace")
FILM = Path(__file__).resolve().parents[1]
BUILD = FILM.parents[1] / "build" / "tutorial2"
MARK = re.compile(r"\{([a-z0-9_]+)([|^])([^}]*)\}")
WHISPER_LANG = {"zh": "zh", "pt": "pt"}


def parse(text):
    """markup -> (plain, anchors)"""
    plain, anchors, pos = "", {}, 0
    for m in MARK.finditer(text):
        plain += text[pos:m.start()]
        c0 = len(plain)
        plain += m.group(3)
        anchors[m.group(1)] = {"c0": c0, "c1": len(plain), "label": m.group(2) == "|"}
        pos = m.end()
    plain += text[pos:]
    return plain, anchors


def nchar(ch):
    ch = unicodedata.normalize("NFKC", ch).lower()
    ch = {"ي": "ی", "ك": "ک", "ى": "ی", "ة": "ه", "أ": "ا", "إ": "ا", "آ": "ا", "ۀ": "ه"}.get(ch, ch)
    if not ch or not ch[0].isalnum():
        return ""
    if unicodedata.category(ch[0]) == "Mn":
        return ""
    return ch[0]


def wav_dur(p):
    with wave.open(str(p)) as w:
        return w.getnframes() / w.getframerate()


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("--lang", default="en")
    ap.add_argument("--model", default="large-v3")
    a = ap.parse_args()
    from faster_whisper import WhisperModel
    try:
        import ctranslate2
        cuda = ctranslate2.get_cuda_device_count() > 0
    except Exception:  # noqa: BLE001
        cuda = False
    model = WhisperModel(a.model, device="cuda" if cuda else "cpu", compute_type="float16" if cuda else "int8")
    script = json.loads((FILM / "script" / f"{a.lang}.json").read_text(encoding="utf-8"))
    d = BUILD / a.lang
    out = {}
    for lid, text in script["lines"].items():
        plain, anchors = parse(text)
        wav = d / "vo" / f"{lid}.wav"
        dur = wav_dur(wav)
        # script normalised stream with back-references
        sc, sidx = [], []
        for i, ch in enumerate(plain):
            c = nchar(ch)
            if c:
                sc.append(c)
                sidx.append(i)

        def hear(prompt):
            segs, _ = model.transcribe(str(wav), language=WHISPER_LANG.get(a.lang, a.lang), word_timestamps=True, beam_size=5,
                                       vad_filter=False, initial_prompt=prompt, condition_on_previous_text=False)
            words = [w for s in segs for w in (s.words or [])]
            wc, wt = [], []  # whisper character stream with times
            for w in words:
                chars = [c for c in (nchar(c) for c in w.word) if c]
                for k, c in enumerate(chars):
                    wc.append(c)
                    wt.append(w.start + (w.end - w.start) * (k / max(1, len(chars))))
            return "".join(w.word for w in words).strip(), wc, wt

        def quality(wc, wt):
            blocks = [b for b in difflib.SequenceMatcher(None, sc, wc, autojunk=False).get_matching_blocks() if b.size]
            m = sum(b.size for b in blocks)
            # implausible: the first matched script character is well into the line but heard at ~0 s
            if blocks and blocks[0].a >= 3 and wt[blocks[0].b] < 0.1:
                m -= 20
            return m

        heard, wc, wt = hear(plain)
        if difflib.SequenceMatcher(None, sc, wc, autojunk=False).ratio() < 0.9:
            # the script prompt can make whisper skip a mis-heard opening (all of it then lands at 0 s): try without it
            h2, wc2, wt2 = hear(None)
            if quality(wc2, wt2) > quality(wc, wt):
                heard, wc, wt = h2, wc2, wt2
        times = [None] * len(sc)
        sm = difflib.SequenceMatcher(None, sc, wc, autojunk=False)
        for blk in sm.get_matching_blocks():
            for k in range(blk.size):
                times[blk.a + k] = wt[blk.b + k]
        known = [i for i, v in enumerate(times) if v is not None]
        if not known:
            # nothing matched (should not happen): spread evenly
            times = [dur * 0.96 * i / max(1, len(sc)) for i in range(len(sc))]
        else:
            first, last = known[0], known[-1]
            for i in range(len(times)):
                if times[i] is not None:
                    continue
                prev = max([k for k in known if k < i], default=None)
                nxt = min([k for k in known if k > i], default=None)
                if prev is None:
                    times[i] = max(0.0, times[nxt] - 0.06 * (nxt - i))
                elif nxt is None:
                    times[i] = min(dur, times[prev] + 0.06 * (i - prev))
                else:
                    times[i] = times[prev] + (times[nxt] - times[prev]) * (i - prev) / (nxt - prev)
            # enforce monotonic
            for i in range(1, len(times)):
                times[i] = max(times[i], times[i - 1])
        # per original character: time of the next normalised character (spaces/punctuation inherit)
        tchar = [None] * len(plain)
        j = 0
        for i in range(len(plain)):
            while j < len(sidx) and sidx[j] < i:
                j += 1
            tchar[i] = round(times[j] if j < len(times) else (times[-1] if times else 0.0), 3)
        for k, an in anchors.items():
            an["t"] = tchar[an["c0"]] if an["c0"] < len(tchar) else dur
        ratio = difflib.SequenceMatcher(None, "".join(sc), "".join(wc), autojunk=False).ratio()
        out[lid] = {"text": plain, "dur": round(dur, 3), "t": tchar, "anchors": anchors, "whisper": heard, "match": round(ratio, 3)}
        print(f"  {lid:4s} {dur:5.2f}s match {ratio:.2f}  {heard[:80]}")
    (d / "align.json").write_text(json.dumps(out, ensure_ascii=False), encoding="utf-8")
    print(f"{a.lang}: align.json written ({'cuda' if cuda else 'cpu'})")


if __name__ == "__main__":
    main()
