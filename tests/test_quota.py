from __future__ import annotations

import pytest

from avorythm.quota import TokenGovernor


@pytest.mark.asyncio
async def test_token_governor_waits_for_rolling_window() -> None:
    now = 0.0
    waits: list[float] = []

    def clock() -> float:
        return now

    async def sleep(seconds: float) -> None:
        nonlocal now
        now += seconds

    governor = TokenGovernor(limit=100, window_seconds=60, clock=clock, sleep=sleep)
    first = await governor.reserve(80)
    second = await governor.reserve(30, waits.append)
    assert waits == [60.0]
    assert second.created_at == 60.0
    await governor.reconcile(first, 90)
    assert await governor.used() == 30


@pytest.mark.asyncio
async def test_token_governor_rejects_oversized_reservation() -> None:
    governor = TokenGovernor(limit=100)
    with pytest.raises(ValueError):
        await governor.reserve(101)
