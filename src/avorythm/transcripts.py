from __future__ import annotations

from dataclasses import dataclass

SENTENCE_ENDINGS = ".!?\u061f\u3002\uff01\uff1f\u2026"


@dataclass(slots=True)
class TranscriptTracker:
    partial: str = ""
    started: float = 0.0
    committed_prefix: str = ""

    def update(
        self,
        text: str,
        finished: bool | None,
        now: float,
    ) -> tuple[str, float, float] | None:
        raw = text.strip()
        text = raw
        if self.committed_prefix:
            if raw.startswith(self.committed_prefix):
                text = raw.removeprefix(self.committed_prefix).strip()
            else:
                self.committed_prefix = ""
        if not text:
            return self.flush(now, reset_context=True) if finished else None
        if not self.partial:
            self.started = now
        if text.startswith(self.partial):
            self.partial = text
        elif not self.partial.endswith(text):
            self.partial = f"{self.partial} {text}".strip()
        sentence_ended = self.partial[-1] in SENTENCE_ENDINGS
        if not finished and sentence_ended:
            self.committed_prefix = raw
        return self.flush(now, reset_context=bool(finished)) if finished or sentence_ended else None

    def flush(
        self,
        now: float,
        *,
        reset_context: bool = False,
    ) -> tuple[str, float, float] | None:
        if reset_context:
            self.committed_prefix = ""
        if not self.partial:
            return None
        result = (self.partial, self.started, now)
        self.partial = ""
        return result
