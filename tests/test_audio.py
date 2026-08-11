from __future__ import annotations

import numpy as np

from lingodub.audio import (
    input_to_output_pcm,
    is_virtual_device,
    mix_pcm,
    to_device_pcm,
    to_input_pcm,
)
from lingodub.constants import INPUT_FRAMES, OUTPUT_FRAMES


def test_to_input_pcm_downmixes_stereo_and_normalizes_length() -> None:
    stereo = np.column_stack(
        (
            np.full(INPUT_FRAMES * 3, 1_000, dtype="<i2"),
            np.full(INPUT_FRAMES * 3, 3_000, dtype="<i2"),
        )
    )

    result = np.frombuffer(to_input_pcm(stereo.tobytes(), 2), dtype="<i2")

    assert len(result) == INPUT_FRAMES
    assert np.allclose(result, 2_000, atol=1)


def test_input_to_output_pcm_resamples_to_24khz_chunk() -> None:
    source = np.arange(INPUT_FRAMES, dtype="<i2").tobytes()

    result = input_to_output_pcm(source)

    assert len(result) == OUTPUT_FRAMES * 2


def test_mix_pcm_can_fully_mute_original_and_clips() -> None:
    original = np.full(12, 20_000, dtype="<i2").tobytes()
    dubbed = np.full(12, 30_000, dtype="<i2").tobytes()

    muted = np.frombuffer(mix_pcm(original, dubbed, 0, 1), dtype="<i2")
    clipped = np.frombuffer(mix_pcm(original, dubbed, 1, 1), dtype="<i2")

    assert np.all(muted == 30_000)
    assert np.all(clipped == 32_767)


def test_to_device_pcm_resamples_and_duplicates_channels() -> None:
    source = np.arange(2_400, dtype="<i2").tobytes()

    result = np.frombuffer(to_device_pcm(source, 48_000, 2), dtype="<i2").reshape(-1, 2)

    assert result.shape == (4_800, 2)
    assert np.array_equal(result[:, 0], result[:, 1])


def test_common_virtual_audio_device_names_are_detected() -> None:
    assert is_virtual_device("CABLE Output (VB-Audio Virtual Cable)")
    assert is_virtual_device("VoiceMeeter Input")
    assert not is_virtual_device("Realtek Headphones")
