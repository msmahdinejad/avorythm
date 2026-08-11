"""Optional paid smoke test for Gemini 3.5 Live Translate."""

from __future__ import annotations

import argparse
import wave
from pathlib import Path

from lingodub.config import ConfigStore
from lingodub.gemini import GeminiGateway
from lingodub.models import Settings


def arguments() -> argparse.Namespace:
    parser = argparse.ArgumentParser()
    parser.add_argument("--wav", type=Path, required=True, help="16 kHz mono 16-bit PCM WAV")
    return parser.parse_args()


async def smoke(wav_path: Path) -> None:
    store = ConfigStore()
    settings = Settings(
        target_language="fa",
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
        if not result.audio or not result.translated_text.strip():
            raise RuntimeError("Live Translate returned incomplete output")
        print("Gemini 3.5 Live Translate smoke test passed.")
    finally:
        await gateway.close()


if __name__ == "__main__":
    import asyncio

    asyncio.run(smoke(arguments().wav))
