from __future__ import annotations

import base64
from collections.abc import AsyncIterator
from dataclasses import dataclass

from google import genai
from google.genai import types

from .constants import INPUT_RATE, LIVE_MODEL, TTS_MODEL
from .models import Settings


@dataclass(frozen=True, slots=True)
class LiveEvent:
    audio: bytes | None = None
    source_text: str = ""
    source_language: str = ""
    source_finished: bool | None = None
    translated_text: str = ""
    translated_language: str = ""
    translated_finished: bool | None = None
    turn_complete: bool = False


class GeminiGateway:
    """Hides Live and TTS SDK details from both desktop and extension callers."""

    def __init__(self, api_key: str) -> None:
        self.client = genai.Client(api_key=api_key)

    def live_config(self, settings: Settings) -> types.LiveConnectConfig:
        return types.LiveConnectConfig(
            response_modalities=[types.Modality.AUDIO],
            input_audio_transcription=types.AudioTranscriptionConfig(),
            output_audio_transcription=types.AudioTranscriptionConfig(),
            translation_config=types.TranslationConfig(
                target_language_code=settings.target_language,
                echo_target_language=False,
            ),
        )

    async def synthesize(self, text: str, voice: str, style: str) -> bytes:
        prompt = f"Synthesize speech in this style: {style}.\nTranscript:\n{text}"
        interaction = await self.client.aio.interactions.create(
            model=TTS_MODEL,
            input=prompt,
            response_format={"type": "audio"},
            generation_config={"speech_config": [{"voice": voice}]},
        )
        output = getattr(interaction, "output_audio", None)
        data = getattr(output, "data", None)
        if not isinstance(data, (str, bytes)):
            raise RuntimeError("Gemini TTS returned no audio")
        return base64.b64decode(data)

    @staticmethod
    async def send_audio(session: object, raw: bytes) -> None:
        await session.send_realtime_input(  # type: ignore[attr-defined]
            audio=types.Blob(data=raw, mime_type=f"audio/pcm;rate={INPUT_RATE}")
        )

    @staticmethod
    async def events(session: object) -> AsyncIterator[LiveEvent]:
        async for response in session.receive():  # type: ignore[attr-defined]
            content = response.server_content
            if not content:
                continue
            source = content.input_transcription
            translated = content.output_transcription
            audio_parts = []
            if content.model_turn:
                audio_parts = [
                    part.inline_data.data
                    for part in (content.model_turn.parts or [])
                    if part.inline_data and isinstance(part.inline_data.data, bytes)
                ]
            if source or translated or content.turn_complete:
                yield LiveEvent(
                    source_text=source.text if source else "",
                    source_language=(source.language_code or "") if source else "",
                    source_finished=source.finished if source else None,
                    translated_text=translated.text if translated else "",
                    translated_language=(translated.language_code or "") if translated else "",
                    translated_finished=translated.finished if translated else None,
                    turn_complete=bool(content.turn_complete),
                )
            for raw in audio_parts:
                yield LiveEvent(audio=raw)

    async def close(self) -> None:
        await self.client.aio.aclose()
        self.client.close()

    def connect(self, settings: Settings):  # type: ignore[no-untyped-def]
        return self.client.aio.live.connect(model=LIVE_MODEL, config=self.live_config(settings))
