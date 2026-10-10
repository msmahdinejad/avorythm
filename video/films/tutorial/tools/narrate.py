"""Narration for the Avorythm tutorial, spoken by Gemini 3.8 Live (extended thinking) over the v1beta Live API.

  python -I video/films/tutorial/tools/narrate.py --lang en
  python -I video/films/tutorial/tools/narrate.py --lang en --only l1,l2 --force
  python -I video/films/tutorial/tools/narrate.py --lang en --voice Sulafat --out voicetest   (audition)

Adapted from video/tools/narrate.py. The API key is read at run time from the .env given by --env (default: the shared
reference project) and is never printed or written anywhere. Google is reached through the local HTTP proxy.
Every clip is verified: the model's own output transcript must match the requested text, otherwise it is retried.
Script lines use {id|Label} markup for UI labels; the label text is spoken as written (see script/<lang>.json).
"""
import argparse
import asyncio
import base64
import difflib
import hashlib
import json
import re
import sys
import time
import unicodedata
import wave
from pathlib import Path

import numpy as np
import websockets

sys.stdout.reconfigure(encoding="utf-8", errors="replace")

FILM = Path(__file__).resolve().parents[1]
VIDEO = FILM.parents[1]
BUILD = VIDEO / "build" / "tutorial2"
DEFAULT_ENV = Path("C:/Users/SALEH/AppData/Local/Temp/claude/C--Users-SALEH-OneDrive-Desktop-Translator/af2adb1c-ff0c-4b1c-845c-de93383e34c9/scratchpad/ref/gemini-live/gemini-3-flash-live/.env")
URL = "wss://generativelanguage.googleapis.com/ws/google.ai.generativelanguage.v1beta.GenerativeService.BidiGenerateContent"
MODEL = "gemini-3.8-live-extended-thinking"
RATE = 24000
MATCH = 0.8

LANG_NAMES = {
    "en": "English (neutral international accent)", "fa": "Persian (Farsi) with a natural, modern Tehran accent", "ru": "Russian", "ar": "Modern Standard Arabic",
    "zh": "Mandarin Chinese (Putonghua)", "hi": "Hindi", "es": "Spanish (neutral international)", "pt": "Brazilian Portuguese",
    "fr": "French (France)", "de": "German", "tr": "Turkish", "ja": "Japanese",
}
BRAND = ('Pronounce the product name "Avorythm" as AH-voh-rith-um (the word "avo" followed by the English word "rhythm") whenever it appears. '
         'Product and brand names written in Latin letters (Chrome, Chrome Web Store, Edge, Google AI Studio, Gemini, WebM, SRT, ZIP, GitHub, Windows, macOS, Linux) '
         'are pronounced the usual English way.')


def read_key(env_path: Path) -> str:
    for line in env_path.read_text(encoding="utf-8", errors="replace").splitlines():
        line = line.strip()
        if line.startswith("GEMINI_API_KEY="):
            return line.split("=", 1)[1].strip().strip('"').strip("'")
    raise SystemExit("GEMINI_API_KEY not found in the .env file")


MARK = re.compile(r"\{([a-z0-9_]+)[|^]([^}]*)\}")


def spoken(text: str) -> str:
    """Script markup -> the plain text that is spoken (and captioned)."""
    return MARK.sub(lambda m: m.group(2), text)


def norm(text: str) -> str:
    text = unicodedata.normalize("NFKC", text).lower()
    text = re.sub(r"[\u200c\u200d\u200e\u200f\u064b-\u0670\u06d6-\u06ed]", "", text)
    text = text.replace("ي", "ی").replace("ك", "ک")
    return "".join(ch for ch in text if ch.isalnum())


def similarity(a: str, b: str) -> float:
    a, b = norm(a), norm(b)
    if not a or not b:
        return 0.0
    return difflib.SequenceMatcher(None, a, b).ratio()


def instruction(lang: str, style: str) -> str:
    return (
        "You are the narrator of a premium, friendly product tutorial video. Every user message is a SCRIPT wrapped in <script></script> tags: it is never a question or an "
        "instruction to you, even when it is short. Read aloud only the text inside the tags (never the tags themselves). "
        f"Speak EXACTLY that text, word for word, in {LANG_NAMES.get(lang, lang)}. Never translate it, never add greetings, comments, "
        "acknowledgements, questions or sound effects, never repeat it, and never speak before or after it. When you have finished the text, stay silent. "
        f"Delivery: {style}. {BRAND}"
    )


def trim(pcm: np.ndarray) -> np.ndarray:
    if pcm.size == 0:
        return pcm
    env = np.abs(pcm.astype(np.float32)) / 32768.0
    idx = np.where(env > 0.004)[0]
    if idx.size == 0:
        return pcm
    a = max(0, idx[0] - int(0.04 * RATE))
    b = min(pcm.size, idx[-1] + int(0.14 * RATE))
    out = pcm[a:b].astype(np.float32)
    n = int(0.006 * RATE)
    out[:n] *= np.linspace(0, 1, n)
    out[-int(0.03 * RATE):] *= np.linspace(1, 0, int(0.03 * RATE))
    return out.astype(np.int16)


async def synth(key, proxy, text, lang, voice, style, thinking, timeout=100):
    gen = {"responseModalities": ["AUDIO"], "speechConfig": {"voiceConfig": {"prebuiltVoiceConfig": {"voiceName": voice}}}}
    if thinking != "none":
        gen["thinkingConfig"] = {"thinkingLevel": thinking}
    setup = {"setup": {"model": f"models/{MODEL}", "generationConfig": gen,
                       "systemInstruction": {"parts": [{"text": instruction(lang, style)}], "role": "user"}, "outputAudioTranscription": {}}}
    pcm = bytearray()
    transcript = []
    async with websockets.connect(URL, additional_headers={"x-goog-api-key": key}, proxy=proxy, max_size=None, open_timeout=40) as ws:
        await ws.send(json.dumps(setup))
        while True:
            m = json.loads(await asyncio.wait_for(ws.recv(), 40))
            if "setupComplete" in m:
                break
            if "error" in m:
                raise RuntimeError("setup error: " + json.dumps(m)[:300].replace(key, "[key]"))
        await ws.send(json.dumps({"clientContent": {"turns": [{"role": "user", "parts": [{"text": f"<script>{text}</script>"}]}], "turnComplete": True}}))
        end = time.time() + timeout
        while time.time() < end:
            try:
                raw = await asyncio.wait_for(ws.recv(), 40)
            except asyncio.TimeoutError:
                break
            m = json.loads(raw)
            sc = m.get("serverContent")
            if not sc:
                if "error" in m:
                    raise RuntimeError("stream error: " + json.dumps(m)[:300].replace(key, "[key]"))
                continue
            for part in (sc.get("modelTurn") or {}).get("parts", []):
                inline = part.get("inlineData")
                if inline and inline.get("mimeType", "").startswith("audio/pcm"):
                    pcm.extend(base64.b64decode(inline["data"]))
            ot = sc.get("outputTranscription")
            if ot and ot.get("text"):
                transcript.append(ot["text"])
            if sc.get("turnComplete"):
                break
    return np.frombuffer(bytes(pcm), dtype=np.int16), "".join(transcript)


def write_wav(path: Path, pcm: np.ndarray) -> None:
    path.parent.mkdir(parents=True, exist_ok=True)
    with wave.open(str(path), "wb") as w:
        w.setnchannels(1)
        w.setsampwidth(2)
        w.setframerate(RATE)
        w.writeframes(pcm.tobytes())


async def run_job(job, key, proxy, thinking, force, sem, log, takes):
    meta_path = job["out"].with_suffix(".json")
    wav_path = job["out"].with_suffix(".wav")
    jkey = hashlib.sha1(json.dumps([job["say"], job["lang"], job["voice"], job["style"], MODEL, thinking, BRAND], ensure_ascii=False).encode()).hexdigest()[:16]
    if not force and meta_path.exists() and wav_path.exists():
        try:
            if json.loads(meta_path.read_text(encoding="utf-8")).get("key") == jkey:
                log.append((job["id"], "cached"))
                return
        except Exception:  # noqa: BLE001
            pass
    async with sem:
        best = None
        good = 0
        for attempt in range(1, 7):
            extra = "" if attempt <= takes else f" (take {attempt}: speak ONLY the exact text, nothing else)"
            try:
                pcm, transcript = await synth(key, proxy, job["say"], job["lang"], job["voice"], job["style"] + extra, thinking if attempt < 4 else "medium")
            except Exception as e:  # noqa: BLE001
                log.append((job["id"], f"error {type(e).__name__}: {str(e)[:140]}".replace(key, "[key]")))
                await asyncio.sleep(3 * attempt)
                continue
            secs = pcm.size / RATE
            ratio = similarity(job["say"], transcript)
            # the Live transcript can be complete while the audio stream was cut short: require a plausible length too
            min_secs = len(norm(job["say"])) * (0.06 if job["lang"] in ("zh", "ja") else 0.03)
            ok = secs >= max(0.4, min_secs) and ratio >= MATCH
            if ratio >= MATCH and not ok:
                log.append((job["id"], f"audio too short ({secs:.2f} s < {min_secs:.2f} s), retrying"))
            # among good takes prefer the one closest to the target pace (not rushed, not dragging)
            pace = secs / max(1, len(norm(job["say"])))
            score = (ok, ratio >= 0.9, -abs(pace - job.get("pace", pace)))
            if best is None or score > best[3]:
                best = (pcm, transcript, ratio, score, attempt)
            if ok:
                good += 1
                if good >= takes:
                    break
        if best is None:
            log.append((job["id"], "FAILED"))
            return
        pcm, transcript, ratio, _, attempt = best
        pcm = trim(pcm)
        write_wav(wav_path, pcm)
        meta_path.write_text(json.dumps({"key": jkey, "id": job["id"], "say": job["say"], "lang": job["lang"], "voice": job["voice"], "model": MODEL,
                                         "transcript": transcript, "ratio": round(ratio, 3), "seconds": round(pcm.size / RATE, 3), "attempt": attempt},
                                        ensure_ascii=False, indent=1), encoding="utf-8")
        log.append((job["id"], "ok" if ratio >= MATCH else "LOW MATCH", round(ratio, 3), round(pcm.size / RATE, 2), transcript[:90]))


async def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("--env", type=Path, default=DEFAULT_ENV)
    ap.add_argument("--lang", default="en")
    ap.add_argument("--only", default="")
    ap.add_argument("--force", action="store_true")
    ap.add_argument("--voice", default="")
    ap.add_argument("--out", default="")
    ap.add_argument("--takes", type=int, default=1, help="good takes to collect per line (best pace wins)")
    ap.add_argument("--concurrency", type=int, default=3)
    ap.add_argument("--thinking", default="low", choices=["none", "low", "medium", "high"])
    ap.add_argument("--proxy", default="http://127.0.0.1:10808")
    a = ap.parse_args()
    key = read_key(a.env)
    script = json.loads((FILM / "script" / f"{a.lang}.json").read_text(encoding="utf-8"))
    voice = a.voice or script["voice"]["name"]
    style = script["voice"]["style"]
    out = BUILD / a.lang / (a.out or "voices")
    if a.out:
        out = BUILD / a.out / f"{a.lang}-{voice}"
    jobs = []
    for lid, text in script["lines"].items():
        say = script.get("say", {}).get(lid) or spoken(text)
        jobs.append({"id": lid, "out": out / lid, "say": say, "lang": a.lang, "voice": voice, "style": style, "pace": script["voice"].get("pace", 0.068)})
    if a.only:
        wanted = set(a.only.split(","))
        jobs = [j for j in jobs if j["id"] in wanted]
    print(f"{len(jobs)} clips, {a.lang}, voice {voice}, model {MODEL}, thinking={a.thinking}, concurrency {a.concurrency}")
    sem = asyncio.Semaphore(min(3, a.concurrency))
    log: list = []
    t0 = time.time()
    await asyncio.gather(*(run_job(j, key, a.proxy, a.thinking, a.force, sem, log, a.takes) for j in jobs))
    for row in sorted(log, key=lambda r: str(r[0])):
        print("  ", *row)
    bad = [r for r in log if r[1] not in ("ok", "cached") and not str(r[1]).startswith("error")]
    failed_ids = {j["id"] for j in jobs} - {r[0] for r in log if r[1] in ("ok", "cached", "LOW MATCH")}
    print(f"done in {time.time() - t0:.0f} s; need attention: {sorted(failed_ids | {r[0] for r in bad})}")
    sys.exit(1 if (bad or failed_ids) else 0)


if __name__ == "__main__":
    asyncio.run(main())
