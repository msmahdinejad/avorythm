from __future__ import annotations

from collections.abc import AsyncIterator
from types import TracebackType

import pytest

from lingodub.gemini import GeminiGateway, LiveEvent, duration_seconds
from lingodub.models import Settings


class FakeSession:
    def __init__(self) -> None:
        self.ended = False
        self.audio: list[bytes] = []

    async def send_realtime_input(
        self,
        *,
        audio: object = None,
        audio_stream_end: bool = False,
    ) -> None:
        if audio_stream_end:
            self.ended = True
        elif audio is not None:
            self.audio.append(audio.data)  # type: ignore[attr-defined]


class FakeConnection:
    def __init__(self, session: FakeSession) -> None:
        self.session = session

    async def __aenter__(self) -> FakeSession:
        return self.session

    async def __aexit__(
        self,
        exc_type: type[BaseException] | None,
        exc_value: BaseException | None,
        traceback: TracebackType | None,
    ) -> None:
        return None


class FakeGateway(GeminiGateway):
    def __init__(self) -> None:
        self.session = FakeSession()

    def connect(self, settings: Settings) -> FakeConnection:
        return FakeConnection(self.session)

    @staticmethod
    async def events(session: object) -> AsyncIterator[LiveEvent]:
        yield LiveEvent(source_text="Hello", source_finished=True, source_language="en")
        yield LiveEvent(translated_text="سلام", translated_finished=True)
        yield LiveEvent(audio=b"\0\0", total_tokens=321, generation_complete=True)


def test_live_config_uses_translation_only_contract() -> None:
    gateway = GeminiGateway.__new__(GeminiGateway)
    config = gateway.live_config(Settings(target_language="fa"))
    assert config.translation_config is not None
    assert config.translation_config.target_language_code == "fa"
    assert config.input_audio_transcription is not None
    assert config.output_audio_transcription is not None
    assert config.speech_config is None


def test_go_away_duration_parser() -> None:
    assert duration_seconds("12.5s") == 12.5
    assert duration_seconds("invalid") is None
    assert duration_seconds(None) is None


@pytest.mark.asyncio
async def test_segment_translation_keeps_finished_transcripts() -> None:
    gateway = FakeGateway()
    result = await gateway.translate_pcm(
        Settings(target_language="fa"),
        b"\0\0" * 1_600,
        realtime=False,
    )
    assert gateway.session.ended is True
    assert gateway.session.audio
    assert result.audio == b"\0\0"
    assert result.source_text == "Hello"
    assert result.translated_text == "سلام"
    assert result.source_language == "en"
    assert result.total_tokens == 321
