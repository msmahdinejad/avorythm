from avorythm.transcripts import TranscriptTracker


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


def test_tracker_starts_a_new_subtitle_after_sentence_end() -> None:
    tracker = TranscriptTracker()

    first = tracker.update("Hello world.", False, 1)
    second = tracker.update("How are you?", False, 2)

    assert first == ("Hello world.", 1, 1)
    assert second == ("How are you?", 2, 2)
    assert tracker.partial == ""


def test_tracker_drops_committed_prefix_from_cumulative_updates() -> None:
    tracker = TranscriptTracker()

    assert tracker.update("Hello world.", False, 1) == ("Hello world.", 1, 1)
    assert tracker.update("Hello world. How", False, 2) is None
    assert tracker.partial == "How"
