from __future__ import annotations

from dataclasses import dataclass


@dataclass(slots=True)
class TranscriptTracker:
    partial: str = ""
    started: float = 0.0

    def update(
        self,
        text: str,
        finished: bool | None,
        now: float,
    ) -> tuple[str, float, float] | None:
        text = text.strip()
        if not text:
            return None
        if not self.partial:
            self.started = now
        if text.startswith(self.partial):
            self.partial = text
        elif not self.partial.endswith(text):
            self.partial = f"{self.partial} {text}".strip()
        return self.flush(now) if finished else None

    def flush(self, now: float) -> tuple[str, float, float] | None:
        if not self.partial:
            return None
        result = (self.partial, self.started, now)
        self.partial = ""
        return result
