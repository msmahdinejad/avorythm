from __future__ import annotations

import queue
import sys
from contextlib import suppress
from dataclasses import dataclass
from typing import Any

import numpy as np

from .constants import INPUT_FRAMES, OUTPUT_FRAMES, OUTPUT_RATE

pyaudio: Any = None
sounddevice: Any = None
if sys.platform == "win32":
    import pyaudiowpatch as _pyaudio  # type: ignore[import-untyped]

    pyaudio = _pyaudio
else:
    import sounddevice as _sounddevice  # type: ignore[import-untyped]

    sounddevice = _sounddevice

VIRTUAL_DEVICE_MARKERS = ("virtual", "cable output", "vb-audio", "voicemeeter", "amm ")


def is_virtual_device(name: str) -> bool:
    normalized = name.casefold()
    return any(marker in normalized for marker in VIRTUAL_DEVICE_MARKERS)


@dataclass(frozen=True, slots=True)
class AudioDevice:
    index: int
    name: str

    def to_dict(self) -> dict[str, Any]:
        return {"index": self.index, "name": self.name}


@dataclass(frozen=True, slots=True)
class DeviceCatalog:
    captures: tuple[AudioDevice, ...]
    outputs: tuple[AudioDevice, ...]
    default_capture: int | None
    default_output: int | None

    @classmethod
    def scan(cls) -> DeviceCatalog:
        if sys.platform != "win32":
            return cls._scan_portaudio()
        audio = pyaudio.PyAudio()
        try:
            captures = tuple(
                AudioDevice(int(device["index"]), str(device["name"]))
                for device in audio.get_loopback_device_info_generator()
            )
            outputs = tuple(
                AudioDevice(index, str(device["name"]))
                for index in range(audio.get_device_count())
                if (device := audio.get_device_info_by_index(index))["maxOutputChannels"] > 0
            )
            virtual = next(
                (device.index for device in captures if is_virtual_device(device.name)),
                int(audio.get_default_wasapi_loopback()["index"]),
            )
            return cls(
                captures=captures,
                outputs=outputs,
                default_capture=virtual,
                default_output=int(audio.get_default_output_device_info()["index"]),
            )
        finally:
            audio.terminate()

    @classmethod
    def _scan_portaudio(cls) -> DeviceCatalog:
        try:
            devices = tuple(sounddevice.query_devices())
            captures = tuple(
                AudioDevice(index, str(device["name"]))
                for index, device in enumerate(devices)
                if int(device["max_input_channels"]) > 0
            )
            outputs = tuple(
                AudioDevice(index, str(device["name"]))
                for index, device in enumerate(devices)
                if int(device["max_output_channels"]) > 0
            )
            defaults = sounddevice.default.device
            default_input = int(defaults[0]) if int(defaults[0]) >= 0 else None
            default_output = int(defaults[1]) if int(defaults[1]) >= 0 else None
            preferred = next(
                (device.index for device in captures if is_virtual_device(device.name)),
                default_input,
            )
            return cls(captures, outputs, preferred, default_output)
        except Exception:
            return cls((), (), None, None)

    def to_dict(self) -> dict[str, Any]:
        return {
            "captures": [device.to_dict() for device in self.captures],
            "outputs": [device.to_dict() for device in self.outputs],
            "default_capture": self.default_capture,
            "default_output": self.default_output,
        }


def to_input_pcm(raw: bytes, channels: int) -> bytes:
    samples = np.frombuffer(raw, dtype="<i2").reshape(-1, channels)
    mono = samples.mean(axis=1, dtype=np.float32)
    if len(mono) != INPUT_FRAMES:
        positions = np.linspace(0, len(mono) - 1, INPUT_FRAMES, dtype=np.float32)
        mono = np.interp(positions, np.arange(len(mono)), mono)
    return bytes(np.clip(mono, -32768, 32767).astype("<i2").tobytes())


def input_to_output_pcm(raw: bytes) -> bytes:
    source = np.frombuffer(raw, dtype="<i2").astype(np.float32)
    positions = np.linspace(0, len(source) - 1, OUTPUT_FRAMES, dtype=np.float32)
    return np.interp(positions, np.arange(len(source)), source).astype("<i2").tobytes()


def to_device_pcm(raw: bytes, rate: int, channels: int) -> bytes:
    source = np.frombuffer(raw, dtype="<i2").astype(np.float64)
    frame_count = round(len(source) * rate / OUTPUT_RATE)
    if rate != OUTPUT_RATE:
        positions = np.linspace(0, len(source) - 1, frame_count, dtype=np.float32)
        source = np.interp(positions, np.arange(len(source)), source)
    mono = np.clip(source, -32768, 32767).astype("<i2")
    if channels == 1:
        return mono.tobytes()
    return np.repeat(mono[:, None], channels, axis=1).tobytes()


def mix_pcm(original: bytes, dubbed: bytes, original_volume: float, dub_volume: float) -> bytes:
    source = np.frombuffer(original, dtype="<i2").astype(np.float32) * original_volume
    translation = np.frombuffer(dubbed, dtype="<i2").astype(np.float32) * dub_volume
    return np.clip(source + translation, -32768, 32767).astype("<i2").tobytes()


class AudioEngine:
    """Captures a selected input and plays mixed PCM through callback queues."""

    def __init__(self, capture_index: int, output_index: int) -> None:
        self._inputs: queue.Queue[bytes] = queue.Queue(maxsize=10)
        self._outputs: queue.Queue[bytes] = queue.Queue(maxsize=10)
        if sys.platform != "win32":
            self._init_portaudio(capture_index, output_index)
            return
        self.audio = pyaudio.PyAudio()
        capture = self.audio.get_device_info_by_index(capture_index)
        if not capture.get("isLoopbackDevice"):
            self.audio.terminate()
            raise ValueError("capture device must be a WASAPI loopback device")
        self.capture_name = str(capture["name"])
        output = self.audio.get_device_info_by_index(output_index)
        self.output_name = str(output["name"])
        self.output_channels = min(2, int(output["maxOutputChannels"]))
        self.output_rate = int(output["defaultSampleRate"])
        self.capture_channels = int(capture["maxInputChannels"])
        capture_rate = int(capture["defaultSampleRate"])
        capture_frames = capture_rate // 10
        self._input_stream = self.audio.open(
            format=pyaudio.paInt16,
            channels=self.capture_channels,
            rate=capture_rate,
            input=True,
            input_device_index=capture_index,
            frames_per_buffer=capture_frames,
            stream_callback=self._input_callback,
        )
        self._output_stream = self.audio.open(
            format=pyaudio.paInt16,
            channels=self.output_channels,
            rate=self.output_rate,
            output=True,
            output_device_index=output_index,
            frames_per_buffer=self.output_rate // 10,
            stream_callback=self._output_callback,
        )

    def _init_portaudio(self, capture_index: int, output_index: int) -> None:
        self.audio = None
        capture = sounddevice.query_devices(capture_index)
        output = sounddevice.query_devices(output_index)
        self.capture_name = str(capture["name"])
        self.output_name = str(output["name"])
        self.capture_channels = min(2, int(capture["max_input_channels"]))
        self.output_channels = min(2, int(output["max_output_channels"]))
        if self.capture_channels < 1 or self.output_channels < 1:
            raise ValueError("selected audio device is unavailable")
        capture_rate = int(capture["default_samplerate"])
        self.output_rate = int(output["default_samplerate"])
        self._input_stream = sounddevice.RawInputStream(
            samplerate=capture_rate,
            blocksize=max(1, capture_rate // 10),
            device=capture_index,
            channels=self.capture_channels,
            dtype="int16",
            callback=self._portaudio_input_callback,
        )
        self._output_stream = sounddevice.RawOutputStream(
            samplerate=self.output_rate,
            blocksize=max(1, self.output_rate // 10),
            device=output_index,
            channels=self.output_channels,
            dtype="int16",
            callback=self._portaudio_output_callback,
        )
        self._input_stream.start()
        self._output_stream.start()

    def _portaudio_input_callback(
        self,
        data: bytes,
        frame_count: int,
        time_info: Any,
        status: Any,
    ) -> None:
        self._offer(self._inputs, to_input_pcm(bytes(data), self.capture_channels))

    def _portaudio_output_callback(
        self,
        output: Any,
        frame_count: int,
        time_info: Any,
        status: Any,
    ) -> None:
        size = frame_count * self.output_channels * 2
        try:
            raw = self._outputs.get_nowait()
        except queue.Empty:
            raw = b""
        output[:] = raw[:size] + b"\0" * max(0, size - len(raw))

    @staticmethod
    def _offer(target: queue.Queue[bytes], data: bytes) -> None:
        try:
            target.put_nowait(data)
        except queue.Full:
            with suppress(queue.Empty):
                target.get_nowait()
            target.put_nowait(data)

    def _input_callback(
        self,
        data: bytes,
        frame_count: int,
        time_info: Any,
        status: int,
    ) -> tuple[None, int]:
        self._offer(self._inputs, to_input_pcm(data, self.capture_channels))
        return None, pyaudio.paContinue

    def _output_callback(
        self,
        data: bytes | None,
        frame_count: int,
        time_info: Any,
        status: int,
    ) -> tuple[bytes, int]:
        size = frame_count * self.output_channels * 2
        try:
            raw = self._outputs.get_nowait()
        except queue.Empty:
            raw = b""
        return raw[:size] + b"\0" * max(0, size - len(raw)), pyaudio.paContinue

    def capture(self) -> bytes | None:
        try:
            return self._inputs.get_nowait()
        except queue.Empty:
            return None

    def play(self, raw: bytes) -> None:
        self._offer(
            self._outputs,
            to_device_pcm(raw, self.output_rate, self.output_channels),
        )

    def close(self) -> None:
        for stream in (self._input_stream, self._output_stream):
            try:
                stream.stop_stream()
                stream.close()
            except Exception:
                pass
        if self.audio is not None:
            self.audio.terminate()
