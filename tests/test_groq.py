from pathlib import Path

import httpx
import pytest

from voxilyra.groq import GroqWhisperGateway, TranscriptSegment, merge_segments, parse_transcription
from voxilyra.media import TranscriptionChunk


def test_overlap_keeps_only_each_chunks_core() -> None:
    chunk = TranscriptionChunk(Path("chunk.flac"), 8.5, 10, 20)
    result = parse_transcription(
        {
            "language": "en",
            "duration": 13,
            "segments": [
                {"start": 0, "end": 2, "text": "previous duplicate"},
                {"start": 2, "end": 4, "text": "kept words"},
                {"start": 11.5, "end": 13, "text": "next duplicate"},
            ],
        },
        chunk,
    )
    assert result.language == "en"
    assert [item.text for item in result.segments] == ["kept words"]
    assert result.segments[0].start == 10.5


def test_whisper_fragments_merge_without_crossing_maximum_duration() -> None:
    segments = [
        TranscriptSegment(0, 3, "one"),
        TranscriptSegment(3.2, 6, "two"),
        TranscriptSegment(6.2, 14, "three"),
    ]
    assert merge_segments(segments, maximum_seconds=12) == [
        TranscriptSegment(0, 6, "one two"),
        TranscriptSegment(6.2, 14, "three"),
    ]


@pytest.mark.asyncio
async def test_gateway_retries_rate_limit_and_returns_verbose_json(
    tmp_path: Path, monkeypatch: pytest.MonkeyPatch
) -> None:
    calls = 0

    def handler(request: httpx.Request) -> httpx.Response:
        nonlocal calls
        calls += 1
        assert request.headers["authorization"] == "Bearer gsk_test"
        if calls == 1:
            return httpx.Response(429, headers={"retry-after": "0"}, json={"error": {}})
        return httpx.Response(
            200,
            json={"language": "en", "segments": [{"start": 0, "end": 1, "text": "Hi"}]},
        )

    async def no_sleep(seconds: float) -> None:
        assert seconds == 0.5

    monkeypatch.setattr("voxilyra.groq.asyncio.sleep", no_sleep)
    path = tmp_path / "chunk.flac"
    path.write_bytes(b"flac")
    client = httpx.AsyncClient(transport=httpx.MockTransport(handler))
    gateway = GroqWhisperGateway("gsk_test", client=client)
    try:
        result = await gateway.transcribe(path, "whisper-large-v3")
        assert result["language"] == "en"
        assert calls == 2
    finally:
        await client.aclose()
