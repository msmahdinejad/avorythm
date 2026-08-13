from __future__ import annotations

import asyncio
from pathlib import Path
from types import TracebackType

import numpy as np
import pytest

from dubira.audio import AudioDevice, DeviceCatalog
from dubira.config import ConfigStore
from dubira.runtime import DubRuntime


class FakeAudio:
    def __init__(self, capture_device: int, output_device: int) -> None:
        self.closed = False

    def close(self) -> None:
        self.closed = True


class FakeConnection:
    def __init__(self, number: int) -> None:
        self.number = number

    async def __aenter__(self) -> int:
        return self.number

    async def __aexit__(
        self,
        exc_type: type[BaseException] | None,
        exc_value: BaseException | None,
        traceback: TracebackType | None,
    ) -> None:
        return None


class FakeGateway:
    def __init__(self, key: str) -> None:
        self.connections = 0

    def connect(self, settings: object) -> FakeConnection:
        self.connections += 1
        return FakeConnection(self.connections)

    async def close(self) -> None:
        return None


@pytest.mark.asyncio
async def test_runtime_reconnects_after_a_live_session_ends(
    tmp_path: Path,
    monkeypatch: pytest.MonkeyPatch,
) -> None:
    catalog = DeviceCatalog(
        captures=(AudioDevice(1, "capture"),),
        outputs=(AudioDevice(2, "output"),),
        default_capture=1,
        default_output=2,
    )
    monkeypatch.setattr("dubira.runtime.DeviceCatalog.scan", lambda: catalog)
    monkeypatch.setattr("dubira.runtime.AudioEngine", FakeAudio)
    monkeypatch.setattr("dubira.runtime.GeminiGateway", FakeGateway)
    store = ConfigStore(tmp_path / "config")
    monkeypatch.setattr(store, "get_api_key", lambda: "test-api-key-123")
    runtime = DubRuntime(store, tmp_path / "recordings")
    reconnected = asyncio.Event()

    async def forever(*args: object) -> None:
        await asyncio.Event().wait()

    async def receive(session: object, queue: object) -> None:
        if session == 1:
            return
        reconnected.set()
        await asyncio.Event().wait()

    monkeypatch.setattr(runtime, "_capture", forever)
    monkeypatch.setattr(runtime, "_mix", forever)
    monkeypatch.setattr(runtime, "_send", forever)
    monkeypatch.setattr(runtime, "_receive", receive)

    await runtime.start()
    try:
        await asyncio.wait_for(reconnected.wait(), 2)
        assert runtime.state.running is True
        assert runtime.state.status == "connected"
    finally:
        await runtime.stop()


@pytest.mark.asyncio
async def test_subtitle_mode_outputs_only_original_audio(
    tmp_path: Path,
    monkeypatch: pytest.MonkeyPatch,
) -> None:
    catalog = DeviceCatalog(
        captures=(AudioDevice(1, "capture"),),
        outputs=(AudioDevice(2, "output"),),
        default_capture=1,
        default_output=2,
    )
    monkeypatch.setattr("dubira.runtime.DeviceCatalog.scan", lambda: catalog)
    runtime = DubRuntime(ConfigStore(tmp_path / "config"), tmp_path / "recordings")
    runtime.settings = runtime.settings.model_copy(update={"live_mode": "subtitles"})
    played = asyncio.Event()
    output: list[bytes] = []

    class Output:
        def play(self, raw: bytes) -> None:
            output.append(raw)
            played.set()

    original: asyncio.Queue[bytes] = asyncio.Queue()
    dubbed: asyncio.Queue[bytes] = asyncio.Queue()
    source = np.full(2_400, 1_200, dtype="<i2").tobytes()
    await original.put(source)
    await dubbed.put(np.full(2_400, 3_000, dtype="<i2").tobytes())
    task = asyncio.create_task(runtime._mix(Output(), original, dubbed))  # type: ignore[arg-type]
    try:
        await asyncio.wait_for(played.wait(), 1)
    finally:
        task.cancel()
        await asyncio.gather(task, return_exceptions=True)

    assert np.array_equal(np.frombuffer(output[0], dtype="<i2"), np.frombuffer(source, dtype="<i2"))
