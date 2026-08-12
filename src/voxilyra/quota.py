from __future__ import annotations

import asyncio
import time
from collections import deque
from collections.abc import Awaitable, Callable
from dataclasses import dataclass


@dataclass(slots=True)
class TokenCharge:
    created_at: float
    tokens: int


class TokenGovernor:
    """Conservative rolling budget for Voxilyra's own Gemini traffic."""

    def __init__(
        self,
        limit: int = 15_000,
        window_seconds: float = 60.0,
        *,
        clock: Callable[[], float] = time.monotonic,
        sleep: Callable[[float], Awaitable[None]] = asyncio.sleep,
    ) -> None:
        self.limit = limit
        self.window_seconds = window_seconds
        self.clock = clock
        self.sleep = sleep
        self.charges: deque[TokenCharge] = deque()
        self.lock = asyncio.Lock()

    def _expire(self, now: float) -> None:
        while self.charges and now - self.charges[0].created_at >= self.window_seconds:
            self.charges.popleft()

    async def reserve(
        self,
        tokens: int,
        on_wait: Callable[[float], None] | None = None,
    ) -> TokenCharge:
        if tokens <= 0 or tokens > self.limit:
            raise ValueError("token reservation is outside the local budget")
        while True:
            async with self.lock:
                now = self.clock()
                self._expire(now)
                if sum(charge.tokens for charge in self.charges) + tokens <= self.limit:
                    charge = TokenCharge(now, tokens)
                    self.charges.append(charge)
                    return charge
                wait = max(0.01, self.window_seconds - (now - self.charges[0].created_at))
            if on_wait:
                on_wait(wait)
            await self.sleep(wait)

    async def reconcile(self, charge: TokenCharge, actual_tokens: int) -> None:
        """Keep the larger value so delayed/missing metadata cannot undercount usage."""

        async with self.lock:
            if charge in self.charges:
                charge.tokens = max(charge.tokens, max(0, actual_tokens))

    async def used(self) -> int:
        async with self.lock:
            self._expire(self.clock())
            return sum(charge.tokens for charge in self.charges)
