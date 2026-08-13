from dubira.transcripts import TranscriptTracker


def test_tracker_merges_partial_transcripts_without_duplication() -> None:
    tracker = TranscriptTracker()

    assert tracker.update("Hello", False, 1) is None
    result = tracker.update("Hello world", True, 2)

    assert result == ("Hello world", 1, 2)


def test_tracker_accepts_delta_style_transcripts() -> None:
    tracker = TranscriptTracker()

    tracker.update("Hello", False, 1)
    result = tracker.update("world", True, 2)

    assert result == ("Hello world", 1, 2)
