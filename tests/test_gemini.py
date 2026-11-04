from __future__ import annotations

import asyncio
from collections.abc import AsyncIterator
from types import SimpleNamespace, TracebackType

import pytest
from google.genai import types as genai_types

from avorythm.gemini import (
    GeminiFileGateway,
    GeminiGateway,
    LiveEvent,
    NoTranslationError,
    TranslationItem,
    duration_seconds,
    pcm_from_audio,
    stream_tail_is_silent,
    transient_live_error,
    trim_stream_padding,
)
from avorythm.models import Settings


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


class SlowTranslationGateway(FakeGateway):
    @staticmethod
    async def events(session: object) -> AsyncIterator[LiveEvent]:
        yield LiveEvent(source_text="Complete source", source_finished=True)
        await asyncio.sleep(3.2)
        yield LiveEvent(translated_text="ترجمه کامل", translated_finished=True)
        yield LiveEvent(audio=b"\xe8\x03" * 24_000, generation_complete=True)


class TranscriptAfterSilentTailGateway(FakeGateway):
    @staticmethod
    async def events(session: object) -> AsyncIterator[LiveEvent]:
        yield LiveEvent(source_text="Complete source", source_finished=True)
        yield LiveEvent(audio=b"\0\0" * 12_000, generation_complete=True)
        await asyncio.sleep(4.2)
        yield LiveEvent(translated_text="ترجمه پایانی کامل", translated_finished=True)


class BrokenSendGateway(FakeGateway):
    async def send_audio(self, session: object, raw: bytes) -> None:
        raise ConnectionError("connection reset")

    @staticmethod
    async def events(session: object) -> AsyncIterator[LiveEvent]:
        raise ConnectionError("receiver closed")
        yield LiveEvent()


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


def test_gateway_disables_websocket_ping_timeout(monkeypatch: pytest.MonkeyPatch) -> None:
    captured: dict[str, object] = {}

    def client(**kwargs: object) -> SimpleNamespace:
        captured.update(kwargs)
        return SimpleNamespace()

    monkeypatch.setattr("avorythm.gemini.genai.Client", client)
    GeminiGateway("test-key")

    options = captured["http_options"]
    assert isinstance(options, genai_types.HttpOptions)
    assert options.async_client_args == {"ping_interval": None}


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


def test_transient_live_connection_errors_are_retryable() -> None:
    assert transient_live_error(TimeoutError()) is True
    assert transient_live_error(RuntimeError("no close frame received or sent")) is True
    assert transient_live_error(RuntimeError("API key not valid")) is False


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
    assert gateway.session.audio[0] == b"\0" * 12_800
    assert gateway.session.audio[-1] == b"\0" * 64_000
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
async def test_segment_translation_does_not_treat_source_text_as_finished_output() -> None:
    gateway = SlowTranslationGateway()
    result = await gateway.translate_pcm(
        Settings(target_language="fa"),
        b"\0\0" * 1_600,
        realtime=False,
    )
    assert result.translated_text == "ترجمه کامل"
    assert result.audio


@pytest.mark.asyncio
async def test_segment_translation_waits_for_text_after_silent_audio_tail() -> None:
    gateway = TranscriptAfterSilentTailGateway()
    result = await gateway.translate_pcm(
        Settings(target_language="fa"),
        b"\0\0" * 1_600,
        realtime=False,
    )
    assert result.translated_text == "ترجمه پایانی کامل"


@pytest.mark.asyncio
async def test_segment_translation_drains_receiver_when_send_fails() -> None:
    gateway = BrokenSendGateway()
    with pytest.raises(ConnectionError, match="connection reset"):
        await gateway.translate_pcm(
            Settings(target_language="fa"),
            b"\0\0" * 1_600,
            realtime=False,
        )


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


@pytest.mark.asyncio
async def test_translation_pool_falls_back_in_strength_order() -> None:
    class QuotaError(Exception):
        code = 429

    class Models:
        def __init__(self) -> None:
            self.calls: list[str] = []

        async def generate_content(self, *, model: str, **_: object) -> object:
            self.calls.append(model)
            if len(self.calls) == 1:
                raise QuotaError("RESOURCE_EXHAUSTED")
            return SimpleNamespace(
                parsed=[TranslationItem(id=0, text="سلام")],
                usage_metadata=SimpleNamespace(total_token_count=42),
            )

    models = Models()
    gateway = GeminiFileGateway.__new__(GeminiFileGateway)
    gateway.client = SimpleNamespace(aio=SimpleNamespace(models=models))
    gateway._minute_usage = {}
    gateway._daily_usage = {}
    gateway._unavailable_models = set()

    result = await gateway.translate(["Hello"], "en", "fa")

    assert models.calls == ["gemini-3.8-flash", "gemini-3.6-flash"]
    assert result.texts == ["سلام"]
    assert result.model == "gemini-3.6-flash"


def wav_bytes(pcm: bytes) -> bytes:
    import struct

    header = (
        b"RIFF"
        + struct.pack("<I", 36 + len(pcm))
        + b"WAVEfmt "
        + struct.pack("<IHHIIHH", 16, 1, 1, 24_000, 48_000, 2, 16)
        + b"data"
        + struct.pack("<I", len(pcm))
    )
    return header + pcm


def narration_gateway(models: object, timeout: float = 1.0) -> GeminiFileGateway:
    gateway = GeminiFileGateway.__new__(GeminiFileGateway)
    gateway.client = SimpleNamespace(aio=SimpleNamespace(models=models))
    gateway.narration_receive_timeout = timeout
    return gateway


@pytest.mark.asyncio
async def test_narration_reads_the_text_with_a_gemini_3_8_tts_model() -> None:
    audio = b"\xe8\x03" * 480

    class Models:
        calls: list[dict[str, object]] = []

        async def generate_content(self, **kwargs: object) -> object:
            self.calls.append(kwargs)
            return SimpleNamespace(
                candidates=[
                    SimpleNamespace(
                        content=SimpleNamespace(
                            parts=[SimpleNamespace(inline_data=SimpleNamespace(data=wav_bytes(audio)))]
                        )
                    )
                ],
                usage_metadata=SimpleNamespace(total_token_count=7),
            )

    models = Models()
    result = await narration_gateway(models).narrate("سلام دنیا", "fa", "Kore")

    assert result.audio == audio, "the WAV header must be stripped and the PCM kept intact"
    assert result.total_tokens == 7
    call = models.calls[0]
    assert call["model"] == "gemini-3.8-flash-tts"
    assert call["contents"] == "سلام دنیا"
    config = call["config"]
    assert config.response_modalities == ["AUDIO"]  # type: ignore[attr-defined]
    voice = config.speech_config.voice_config.prebuilt_voice_config.voice_name  # type: ignore[attr-defined]
    assert voice == "Kore"


@pytest.mark.asyncio
async def test_narration_uses_the_selected_model_and_rejects_unknown_ones() -> None:
    class Models:
        used: list[str] = []

        async def generate_content(self, *, model: str, **_: object) -> object:
            self.used.append(model)
            part = SimpleNamespace(inline_data=SimpleNamespace(data=b"\xe8\x03" * 480))
            return SimpleNamespace(
                candidates=[SimpleNamespace(content=SimpleNamespace(parts=[part]))],
                usage_metadata=None,
            )

    models = Models()
    gateway = narration_gateway(models)
    await gateway.narrate("hello", "en", "Kore", "gemini-3.8-flash-lite-tts")
    await gateway.narrate("hello", "en", "Kore", "gemini-3.8-flash-tts")
    assert models.used == ["gemini-3.8-flash-lite-tts", "gemini-3.8-flash-tts"]


@pytest.mark.asyncio
async def test_narration_times_out_and_reports_missing_audio() -> None:
    class Slow:
        async def generate_content(self, **_: object) -> object:
            await asyncio.Event().wait()

    with pytest.raises(NoTranslationError, match="timed out"):
        await narration_gateway(Slow(), timeout=0.01).narrate("سلام", "fa", "Kore")

    class Empty:
        async def generate_content(self, **_: object) -> object:
            return SimpleNamespace(candidates=[], usage_metadata=None)

    with pytest.raises(NoTranslationError, match="no narrated audio"):
        await narration_gateway(Empty()).narrate("سلام", "fa", "Kore")


def test_pcm_from_audio_handles_wav_containers_and_raw_pcm() -> None:
    pcm = b"\x01\x00" * 100
    assert pcm_from_audio(wav_bytes(pcm)) == pcm
    assert pcm_from_audio(pcm) == pcm
    assert pcm_from_audio(b"RIFF\x00\x00\x00\x00WAVE") == b""


class LiveNarrationSession:
    """Stands in for a Gemini 3.8 Live session that reads the script aloud."""

    def __init__(self, *, silent: bool = False) -> None:
        self.sent_text = ""
        self.silent = silent

    async def send_realtime_input(self, *, text: str) -> None:
        self.sent_text = text

    async def receive(self) -> AsyncIterator[object]:
        if self.silent:
            await asyncio.Event().wait()
        audio = b"\xe8\x03" * 480
        yield SimpleNamespace(
            server_content=SimpleNamespace(
                model_turn=SimpleNamespace(
                    parts=[SimpleNamespace(inline_data=SimpleNamespace(data=audio))]
                ),
                output_transcription=SimpleNamespace(text="سلام "),
                turn_complete=False,
            ),
            usage_metadata=SimpleNamespace(total_token_count=5),
        )
        yield SimpleNamespace(
            server_content=SimpleNamespace(
                model_turn=None,
                output_transcription=SimpleNamespace(text="دنیا"),
                turn_complete=True,
            ),
            usage_metadata=SimpleNamespace(total_token_count=7),
        )


class LiveConnection:
    def __init__(self, session: LiveNarrationSession) -> None:
        self.session = session
        self.exited = False

    async def __aenter__(self) -> LiveNarrationSession:
        return self.session

    async def __aexit__(
        self,
        exc_type: type[BaseException] | None,
        exc: BaseException | None,
        traceback: TracebackType | None,
    ) -> None:
        self.exited = True


def live_gateway(session: LiveNarrationSession, models: object, timeout: float = 0.2):
    captured: dict[str, object] = {}

    def connect(**kwargs: object) -> LiveConnection:
        captured.update(kwargs)
        captured["connection"] = LiveConnection(session)
        return captured["connection"]  # type: ignore[return-value]

    gateway = GeminiFileGateway.__new__(GeminiFileGateway)
    live = SimpleNamespace(connect=connect)
    gateway.client = SimpleNamespace(aio=SimpleNamespace(live=live, models=models))
    gateway.narration_receive_timeout = timeout
    return gateway, captured


class TtsModels:
    def __init__(self) -> None:
        self.used: list[str] = []

    async def generate_content(self, *, model: str, **_: object) -> object:
        self.used.append(model)
        part = SimpleNamespace(inline_data=SimpleNamespace(data=b"\x10\x27" * 480))
        return SimpleNamespace(
            candidates=[SimpleNamespace(content=SimpleNamespace(parts=[part]))],
            usage_metadata=None,
        )


@pytest.mark.asyncio
async def test_gemini_3_8_live_reads_the_script_with_a_strict_voice_over_instruction() -> None:
    from avorythm.constants import VOICE_READER_INSTRUCTION

    session = LiveNarrationSession()
    models = TtsModels()
    gateway, captured = live_gateway(session, models)

    result = await gateway.narrate("سلام دنیا", "fa", "Kore", "gemini-3.8-live")

    assert captured["model"] == "gemini-3.8-live"
    config = captured["config"]
    assert config.system_instruction == VOICE_READER_INSTRUCTION  # type: ignore[attr-defined]
    assert config.output_audio_transcription is None  # type: ignore[attr-defined]
    assert config.thinking_config is None  # type: ignore[attr-defined]
    assert config.speech_config.language_code is None  # type: ignore[attr-defined]
    assert session.sent_text == "سلام دنیا"
    assert result.audio == b"\xe8\x03" * 480
    assert result.transcript == "", "3.8 Live transcripts are unreliable and are not used"
    assert result.total_tokens == 7
    assert models.used == [], "a working Live session must not spend a TTS request"


@pytest.mark.asyncio
async def test_a_failed_or_silent_live_session_falls_back_to_flash_tts() -> None:
    models = TtsModels()
    gateway, _ = live_gateway(LiveNarrationSession(silent=True), models, timeout=0.01)
    result = await gateway.narrate("سلام", "fa", "Kore", "gemini-3.8-live")
    assert models.used == ["gemini-3.8-flash-tts"]
    assert result.audio

    def broken(**_: object) -> object:
        raise ConnectionError("socket closed")

    models = TtsModels()
    gateway = GeminiFileGateway.__new__(GeminiFileGateway)
    live = SimpleNamespace(connect=broken)
    gateway.client = SimpleNamespace(aio=SimpleNamespace(live=live, models=models))
    gateway.narration_receive_timeout = 0.1
    await gateway.narrate("سلام", "fa", "Kore", "gemini-3.8-live")
    assert models.used == ["gemini-3.8-flash-tts"]
