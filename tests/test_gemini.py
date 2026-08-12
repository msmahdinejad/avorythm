from __future__ import annotations

from collections.abc import AsyncIterator
from types import SimpleNamespace, TracebackType

import pytest

from lingodub.gemini import (
    GeminiGateway,
    LiveEvent,
    duration_seconds,
    stream_tail_is_silent,
    trim_stream_padding,
)
from lingodub.models import Settings


class FakeSession:
    def __init__(self) -> None:
        self.ended = False
        self.activity_started = False
        self.activity_ended = False
        self.audio: list[bytes] = []

    async def send_realtime_input(
        self,
        *,
        audio: object = None,
        audio_stream_end: bool = False,
        activity_start: object = None,
        activity_end: object = None,
    ) -> None:
        if audio_stream_end:
            self.ended = True
        elif activity_start is not None:
            self.activity_started = True
        elif activity_end is not None:
            self.activity_ended = True
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
        self.manual_activity = False

    def connect(self, settings: Settings, *, manual_activity: bool = False) -> FakeConnection:
        self.manual_activity = manual_activity
        return FakeConnection(self.session)

    @staticmethod
    async def events(session: object) -> AsyncIterator[LiveEvent]:
        yield LiveEvent(source_text="Hello", source_finished=True, source_language="en")
        yield LiveEvent(translated_text="سلام", translated_finished=True)
        yield LiveEvent(audio=b"\xe8\x03" * 480, total_tokens=321, generation_complete=True)


class LateTranscriptGateway(FakeGateway):
    @staticmethod
    async def events(session: object) -> AsyncIterator[LiveEvent]:
        yield LiveEvent(source_text="The complete sentence", source_finished=True)
        yield LiveEvent(audio=b"\0\0", generation_complete=True)
        yield LiveEvent(translated_text="جمله کامل", translated_finished=True)
        yield LiveEvent(turn_complete=True)


class MultiTurnSession:
    def __init__(self) -> None:
        self.calls = 0

    async def receive(self) -> AsyncIterator[object]:
        self.calls += 1
        content = SimpleNamespace(
            input_transcription=SimpleNamespace(
                text=f"turn {self.calls}",
                language_code="en",
                finished=True,
            ),
            output_transcription=None,
            model_turn=None,
            turn_complete=True,
            generation_complete=True,
        )
        yield SimpleNamespace(server_content=content, usage_metadata=None, go_away=None)


def test_live_config_uses_translation_only_contract() -> None:
    gateway = GeminiGateway.__new__(GeminiGateway)
    config = gateway.live_config(Settings(target_language="fa"))
    assert config.translation_config is not None
    assert config.translation_config.target_language_code == "fa"
    assert config.input_audio_transcription is not None
    assert config.output_audio_transcription is not None
    assert config.speech_config is None


def test_file_config_uses_manual_activity_detection() -> None:
    gateway = GeminiGateway.__new__(GeminiGateway)
    config = gateway.live_config(Settings(target_language="fa"), manual_activity=True)
    assert config.realtime_input_config is not None
    assert config.realtime_input_config.automatic_activity_detection is not None
    assert config.realtime_input_config.automatic_activity_detection.disabled is True


def test_go_away_duration_parser() -> None:
    assert duration_seconds("12.5s") == 12.5
    assert duration_seconds("invalid") is None
    assert duration_seconds(None) is None


def test_stream_padding_trims_silent_tail_without_cutting_speech() -> None:
    speech = (1_000).to_bytes(2, "little", signed=True) * 4_800
    silence = b"\0\0" * 24_000
    result = trim_stream_padding(speech + silence)
    assert 4_800 * 2 <= len(result) <= (4_800 + 6_500) * 2
    assert stream_tail_is_silent(speech + silence) is True
    assert stream_tail_is_silent(speech * 4) is False


@pytest.mark.asyncio
async def test_segment_translation_keeps_finished_transcripts() -> None:
    gateway = FakeGateway()
    result = await gateway.translate_pcm(
        Settings(target_language="fa"),
        b"\0\0" * 1_600,
        realtime=False,
    )
    assert gateway.manual_activity is True
    assert gateway.session.activity_started is True
    assert gateway.session.activity_ended is True
    assert gateway.session.ended is False
    assert gateway.session.audio
    assert result.audio == b"\xe8\x03" * 480
    assert result.source_text == "Hello"
    assert result.translated_text == "سلام"
    assert result.source_language == "en"
    assert result.total_tokens == 321


@pytest.mark.asyncio
async def test_segment_translation_waits_for_transcript_after_generation() -> None:
    gateway = LateTranscriptGateway()
    result = await gateway.translate_pcm(
        Settings(target_language="fa"),
        b"\0\0" * 1_600,
        realtime=False,
    )
    assert result.translated_text == "جمله کامل"


@pytest.mark.asyncio
async def test_event_stream_continues_across_live_turns() -> None:
    session = MultiTurnSession()
    events = GeminiGateway.events(session)
    first = await anext(events)
    second = await anext(events)
    await events.aclose()
    assert first.source_text == "turn 1"
    assert second.source_text == "turn 2"
    assert session.calls == 2
