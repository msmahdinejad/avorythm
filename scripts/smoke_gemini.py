"""Optional paid smoke test for Gemini 3.5 Live Translate."""

from __future__ import annotations

import argparse
import sys
import wave
from pathlib import Path

from dubira.config import ConfigStore
from dubira.gemini import GeminiGateway
from dubira.jobs import complete_translation
from dubira.models import Settings


def arguments() -> argparse.Namespace:
    parser = argparse.ArgumentParser()
    parser.add_argument("--wav", type=Path, required=True, help="16 kHz mono 16-bit PCM WAV")
    parser.add_argument("--target", default="fa", help="BCP-47 target language")
    return parser.parse_args()


async def smoke(wav_path: Path, target_language: str) -> None:
    if hasattr(sys.stdout, "reconfigure"):
        sys.stdout.reconfigure(encoding="utf-8")
    store = ConfigStore()
    settings = Settings(
        target_language=target_language,
        original_volume=0,
        dub_volume=1,
        proxy_url=store.load().proxy_url,
    )
    store.apply_proxy(settings)
    key = store.get_api_key()
    if not key:
        raise SystemExit("Set a Gemini API key before running the smoke test.")

    gateway = GeminiGateway(key)
    try:
        with wave.open(str(wav_path), "rb") as source:
            if (
                source.getframerate() != 16_000
                or source.getnchannels() != 1
                or source.getsampwidth() != 2
            ):
                raise ValueError("Smoke WAV must be 16 kHz mono 16-bit PCM")
            source_16khz = source.readframes(source.getnframes())
        result = await gateway.translate_pcm(settings, source_16khz)
        print(f"Source ({result.source_language or 'unknown'}): {result.source_text}")
        print(f"Translation ({settings.target_language}): {result.translated_text}")
        print(f"Audio bytes: {len(result.audio)}")
        print(f"Tokens: {result.total_tokens}")
        seconds = len(source_16khz) / (16_000 * 2)
        if not complete_translation(result, seconds):
            raise RuntimeError("Live Translate returned incomplete output")
    finally:
        await gateway.close()


if __name__ == "__main__":
    import asyncio

    args = arguments()
    asyncio.run(smoke(args.wav, args.target))
