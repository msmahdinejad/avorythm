from __future__ import annotations

import asyncio
from pathlib import Path
from types import TracebackType

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
