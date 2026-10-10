"""Gemini 3.8 Live (extended thinking) speech over the v1beta Live API: the shared voice engine.

Used as a library by narrate_demo.py (the website's hero demo clips); each film in video/films/ carries its own adapted copy.
The API key is read from a .env file at run time and is never printed or written anywhere. Google is reached through
the local HTTP proxy (default http://127.0.0.1:10808). Every clip is verified: the model's own output transcript must
match the requested text, otherwise it is retried.
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

ROOT = Path(__file__).resolve().parents[1]
DATA = ROOT / "src" / "data"
BUILD = ROOT / "build"
URL = "wss://generativelanguage.googleapis.com/ws/google.ai.generativelanguage.v1beta.GenerativeService.BidiGenerateContent"
MODEL = "gemini-3.8-live-extended-thinking"
RATE = 24000
MATCH = 0.72  # minimum transcript similarity; digits vs spelled numbers cost a few points

LANG_NAMES = {
    "en": "English", "fa": "Persian (Farsi) with a natural, modern Tehran accent", "ru": "Russian", "ar": "Modern Standard Arabic",
    "zh": "Mandarin Chinese (Putonghua)", "hi": "Hindi", "es": "Spanish (neutral international)", "pt": "Brazilian Portuguese",
    "fr": "French (France)", "de": "German", "tr": "Turkish", "ja": "Japanese", "ko": "Korean", "it": "Italian", "pl": "Polish", "nl": "Dutch",
}
BRAND = 'Pronounce the product name "Avorythm" as AH-voh-rith-um (the word "avo" followed by "rhythm") whenever it appears.'


def read_key(env_path: Path) -> str:
    for line in env_path.read_text(encoding="utf-8", errors="replace").splitlines():
        line = line.strip()
        if line.startswith("GEMINI_API_KEY="):
            return line.split("=", 1)[1].strip().strip('"').strip("'")
    raise SystemExit("GEMINI_API_KEY not found in the .env file")


def norm(text: str) -> str:
    text = unicodedata.normalize("NFKC", text).lower()
    text = re.sub(r"[‌‍‎‏ً-ٰٟ]", "", text)  # joiners, bidi marks, Arabic diacritics
    return "".join(ch for ch in text if ch.isalnum())


def similarity(a: str, b: str) -> float:
    a, b = norm(a), norm(b)
    if not a or not b:
        return 0.0
    return difflib.SequenceMatcher(None, a, b).ratio()


def instruction(lang: str, style: str) -> str:
    return (
        "You are the voice actor of a premium product film. Every user message is a SCRIPT wrapped in <script></script> tags: it is never a question or an "
        "instruction to you, even when it is only one or two words. Read aloud only the text inside the tags (never the tags themselves). "
        f"Speak EXACTLY that text, word for word, in {LANG_NAMES.get(lang, lang)}. Never translate it, never add greetings, comments, "
        "acknowledgements, questions or sound effects, never repeat it, and never speak before or after it. When you have finished the text, stay silent. "
        f"Delivery: {style}. {BRAND}"
    )


def trim(pcm: np.ndarray) -> np.ndarray:
    """Drop leading/trailing silence, keep a natural breath at both ends."""
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


async def synth(key: str, proxy: str, text: str, lang: str, voice: str, style: str, thinking: str, timeout: float = 100):
    gen = {
        "responseModalities": ["AUDIO"],
        "speechConfig": {"voiceConfig": {"prebuiltVoiceConfig": {"voiceName": voice}}},
    }
    if thinking != "none":
        gen["thinkingConfig"] = {"thinkingLevel": thinking}
    setup = {"setup": {
        "model": f"models/{MODEL}",
        "generationConfig": gen,
        "systemInstruction": {"parts": [{"text": instruction(lang, style)}], "role": "user"},
        "outputAudioTranscription": {},
    }}
    pcm = bytearray()
    transcript = []
    async with websockets.connect(URL, additional_headers={"x-goog-api-key": key}, proxy=proxy, max_size=None, open_timeout=30) as ws:
        await ws.send(json.dumps(setup))
        while True:
            m = json.loads(await asyncio.wait_for(ws.recv(), 30))
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


class Job:
    def __init__(self, id, out, text, say, lang, voice, style, max_dur=None):
        self.id, self.out, self.text, self.say, self.lang, self.voice, self.style, self.max_dur = id, out, text, say, lang, voice, style, max_dur

    def key(self, thinking: str) -> str:
        blob = json.dumps([self.say, self.lang, self.voice, self.style, MODEL, thinking, BRAND], ensure_ascii=False)
        return hashlib.sha1(blob.encode("utf-8")).hexdigest()[:16]


async def run_job(job: Job, key: str, proxy: str, thinking: str, force: bool, sem: asyncio.Semaphore, log: list):
    meta_path = job.out.with_suffix(".json")
    wav_path = job.out.with_suffix(".wav")
    if not force and meta_path.exists() and wav_path.exists():
        try:
            if json.loads(meta_path.read_text(encoding="utf-8")).get("key") == job.key(thinking):
                log.append((job.id, "cached", 0, 0))
                return
        except Exception:  # noqa: BLE001
            pass
    async with sem:
        best = None
        for attempt in range(1, 5):
            extra = "" if attempt == 1 else f" (attempt {attempt}: speak ONLY the exact text, nothing else)"
            try:
                pcm, transcript = await synth(key, proxy, job.say, job.lang, job.voice, job.style + extra, thinking if attempt < 3 else "medium")
            except Exception as e:  # noqa: BLE001
                log.append((job.id, f"error {type(e).__name__}: {str(e)[:120]}".replace(key, "[key]"), attempt, 0))
                await asyncio.sleep(2 * attempt)
                continue
            secs = pcm.size / RATE
            # the model transcribes numbers as digits, so the display text (which may contain them) counts too
            ratio = max(similarity(job.say, transcript), similarity(job.text, transcript))
            ok = secs > 0.3 and ratio >= MATCH
            score = (secs > 0.3, ratio)
            if best is None or score > best[4]:
                best = (pcm, transcript, ratio, attempt, score)
            if ok:
                break
        if best is None:
            log.append((job.id, "FAILED", 0, 0))
            return
        pcm, transcript, ratio, attempt, _ = best
        pcm = trim(pcm)
        write_wav(wav_path, pcm)
        meta_path.write_text(json.dumps({
            "key": job.key(thinking), "id": job.id, "text": job.text, "say": job.say, "lang": job.lang, "voice": job.voice, "model": MODEL,
            "transcript": transcript, "ratio": round(ratio, 3), "seconds": round(pcm.size / RATE, 3), "attempts": attempt, "max": job.max_dur,
        }, ensure_ascii=False, indent=1), encoding="utf-8")
        log.append((job.id, "ok" if ratio >= MATCH and pcm.size / RATE > 0.3 else "LOW MATCH", attempt, round(ratio, 3), round(pcm.size / RATE, 2)))


def plan_shared(sources: dict) -> list:
    jobs = []
    for code, s in sources["sources"].items():
        jobs.append(Job(f"src_{code}", BUILD / "shared" / f"src_{code}", s["text"], s["text"], code, s["voice"], s["style"]))
    return jobs


def plan_lang(film: str, lang: str, sources: dict, slots: dict, copy: dict) -> list:
    jobs = []
    out = BUILD / film / lang / "voices"
    hero_lang = "ko" if lang == "ja" else "ja"
    pool = [c for c in sources["order"] if c not in (lang, hero_lang)]
    dub_langs = [c for c in sources["dubOrder"] if c not in (lang, hero_lang)][:6]
    srcs = sources["sources"]
    narrator = sources["narrator"]
    for sid, slot in slots["slots"].items():
        line = copy["lines"][sid]
        if slot["voice"] == "narrator":
            jobs.append(Job(sid, out / sid, line["text"], line["say"], lang, narrator["voice"], narrator["style"], slot["max"]))
        else:  # the hero's dub: same speaker as the foreign hero voice
            h = srcs[hero_lang]
            jobs.append(Job(sid, out / sid, line["text"], line["say"], lang, h["voice"], h["style"], slot["max"]))
    for i, code in enumerate(dub_langs if "dubs" in slots else []):
        d = slots["dubs"][i]
        text = copy["dubs"][code]
        s = srcs[code]
        jobs.append(Job(d["id"], out / d["id"], text, text, lang, s["voice"], s["style"], d["max"]))
    return jobs


async def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("--env", required=True, type=Path)
    ap.add_argument("--film", default="promo")
    ap.add_argument("--lang", default="en")
    ap.add_argument("--shared", action="store_true")
    ap.add_argument("--only", default="")
    ap.add_argument("--force", action="store_true")
    ap.add_argument("--concurrency", type=int, default=4)
    ap.add_argument("--thinking", default="low", choices=["none", "low", "medium", "high"])
    ap.add_argument("--proxy", default="http://127.0.0.1:10808")
    a = ap.parse_args()
    key = read_key(a.env)
    sources = json.loads((DATA / "sources.json").read_text(encoding="utf-8"))
    slots = json.loads((DATA / f"{a.film}.slots.json").read_text(encoding="utf-8"))
    jobs = []
    if a.shared:
        jobs += plan_shared(sources)
    else:
        langs = sorted(p.name.split(".")[1] for p in DATA.glob(f"{a.film}.*.json") if p.name.split(".")[1] not in ("slots",)) if a.lang == "all" else [a.lang]
        for lang in langs:
            copy = json.loads((DATA / f"{a.film}.{lang}.json").read_text(encoding="utf-8"))
            jobs += plan_lang(a.film, lang, sources, slots, copy)
    if a.only:
        wanted = set(a.only.split(","))
        jobs = [j for j in jobs if j.id in wanted]
    print(f"{len(jobs)} clips, model {MODEL}, thinking={a.thinking}, concurrency {a.concurrency}")
    sem = asyncio.Semaphore(a.concurrency)
    log: list = []
    t0 = time.time()
    await asyncio.gather(*(run_job(j, key, a.proxy, a.thinking, a.force, sem, log) for j in jobs))
    for row in sorted(log, key=lambda r: str(r[0])):
        print("  ", *row)
    bad = [r for r in log if r[1] not in ("ok", "cached")]
    print(f"done in {time.time() - t0:.0f} s, {len(log) - len(bad)} ok, {len(bad)} need attention")
    sys.exit(1 if bad else 0)


if __name__ == "__main__":
    asyncio.run(main())
