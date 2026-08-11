"""Optional paid smoke test for both Gemini TTS and Live Translate."""

from __future__ import annotations

import argparse
import asyncio
import wave
from pathlib import Path

from lingodub.audio import to_device_pcm
from lingodub.config import ConfigStore
from lingodub.constants import INPUT_FRAMES
from lingodub.gemini import GeminiGateway
from lingodub.models import Settings


def arguments() -> argparse.Namespace:
    parser = argparse.ArgumentParser()
    parser.add_argument("--wav", type=Path, help="16 kHz mono PCM WAV; skips paid Gemini TTS")
    return parser.parse_args()


async def smoke(wav_path: Path | None) -> None:
    store = ConfigStore()
    settings = Settings(
        target_language="fa",
        original_volume=0,
        dub_volume=1,
        voice="Native",
        proxy_url=store.load().proxy_url,
    )
    store.apply_proxy(settings)
    key = store.get_api_key()
    if not key:
        raise SystemExit("Set a Gemini API key before running the smoke test.")

    gateway = GeminiGateway(key)
    try:
        if wav_path:
            with wave.open(str(wav_path), "rb") as source:
                if source.getframerate() != 16_000 or source.getnchannels() != 1:
                    raise ValueError("Smoke WAV must be 16 kHz mono")
                source_16khz = source.readframes(source.getnframes())
        else:
            source_24khz = await gateway.synthesize(
                "Say clearly: Open source software brings people together.",
                "Kore",
                "Clear, neutral English",
            )
            source_16khz = to_device_pcm(source_24khz, 16_000, 1)
        received_audio = False
        received_translation = ""

        async with gateway.connect(settings) as session:

            async def receive() -> None:
                nonlocal received_audio, received_translation
                async for event in gateway.events(session):
                    received_audio = received_audio or bool(event.audio)
                    received_translation += event.translated_text
                    if received_audio and received_translation.strip():
                        return

            receiver = asyncio.create_task(receive())
            chunk_size = INPUT_FRAMES * 2
            stream = source_16khz + b"\0" * 16_000 * 2
            for offset in range(0, len(stream), chunk_size):
                chunk = stream[offset : offset + chunk_size]
                chunk += b"\0" * (chunk_size - len(chunk))
                await gateway.send_audio(session, chunk)
                await asyncio.sleep(0.1)
            await asyncio.wait_for(receiver, timeout=20)

        if not received_audio or not received_translation.strip():
            raise RuntimeError("Live Translate returned incomplete output")
        prefix = "Live Translate" if wav_path else "Gemini TTS + Live Translate"
        print(f"{prefix} smoke test passed.")
    finally:
        await gateway.close()


if __name__ == "__main__":
    asyncio.run(smoke(arguments().wav))
