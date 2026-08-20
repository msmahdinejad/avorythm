from __future__ import annotations

import argparse
import asyncio
import json
import sys
from pathlib import Path

from avorythm.config import ConfigStore
from avorythm.constants import GROQ_PRECISE_MODEL, OUTPUT_RATE
from avorythm.gemini import GeminiFileGateway
from avorythm.groq import GroqWhisperGateway


async def verify(path: Path, target_language: str, voice_name: str) -> dict[str, object]:
    config = ConfigStore()
    settings = config.load()
    config.apply_proxy(settings)
    gemini_key = config.get_api_key("gemini")
    groq_key = config.get_api_key("groq")
    if not gemini_key or not groq_key:
        raise RuntimeError("Both Gemini and Groq keys are required")

    whisper = GroqWhisperGateway(groq_key)
    gemini = GeminiFileGateway(gemini_key)
    try:
        transcription = await whisper.transcribe(path, GROQ_PRECISE_MODEL)
        segments = transcription.get("segments") or []
        source_text = " ".join(
            str(segment.get("text") or "").strip() for segment in segments
        ).strip()
        if not source_text:
            raise RuntimeError("Whisper returned no speech")
        source_language = str(transcription.get("language") or "auto")
        translation = await gemini.translate(
            [source_text], source_language, target_language
        )
        translated_text = translation.texts[0]
        narration = await gemini.narrate(translated_text, target_language, voice_name)
        return {
            "ok": True,
            "source_language": source_language,
            "source_text": source_text[:240],
            "translation_model": translation.model,
            "translated_text": translated_text[:240],
            "narration_transcript": narration.transcript[:240],
            "narration_seconds": round(len(narration.audio) / (OUTPUT_RATE * 2), 2),
        }
    finally:
        await whisper.close()
        await gemini.close()


def main() -> None:
    if hasattr(sys.stdout, "reconfigure"):
        sys.stdout.reconfigure(encoding="utf-8")
    parser = argparse.ArgumentParser(
        description="Verify the real Whisper → Gemini text → Gemini Live voice path."
    )
    parser.add_argument("input", type=Path)
    parser.add_argument("--target-language", default="fa")
    parser.add_argument("--voice", default="Kore")
    arguments = parser.parse_args()
    if not arguments.input.is_file():
        raise SystemExit(f"Input does not exist: {arguments.input}")
    result = asyncio.run(
        verify(arguments.input, arguments.target_language, arguments.voice)
    )
    print(json.dumps(result, ensure_ascii=False, indent=2))


if __name__ == "__main__":
    main()
