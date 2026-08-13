from __future__ import annotations

import argparse
import importlib

import pytest

from dubira.__main__ import NativeApi

main_module = importlib.import_module("dubira.__main__")


class FakeWindow:
    def __init__(self) -> None:
        self.on_top = False
        self.visible = False
        self.size = (0, 0)

    def resize(self, width: int, height: int) -> None:
        self.size = (width, height)

    def show(self) -> None:
        self.visible = True

    def hide(self) -> None:
        self.visible = False


class FakeWebview:
    def __init__(self) -> None:
        self.created: dict[str, object] | None = None

    def create_window(self, title: str, url: str, **options: object) -> FakeWindow:
        self.created = {"title": title, "url": url, **options}
        return FakeWindow()


def test_native_subtitle_window_is_bounded_and_always_on_top() -> None:
    api = NativeApi()
    window = FakeWindow()
    api._subtitle_window = window

    assert api.show_subtitles(2_000, 40) is True
    assert window.size == (1_200, 110)
    assert window.on_top is True
    assert window.visible is True
    assert api.subtitles_are_visible() is True

    api.hide_subtitles()
    assert window.visible is False
    assert api.subtitles_are_visible() is False


def test_native_subtitle_window_is_created_lazily() -> None:
    webview = FakeWebview()
    api = NativeApi(webview)

    assert api._subtitle_window is None
    assert api.show_subtitles(720, 180) is True
    assert webview.created is not None
    assert webview.created["title"] == "Lingora Subtitles"
    assert webview.created["on_top"] is True
    assert webview.created["frameless"] is True
    assert api._subtitle_window is not None


def test_normal_desktop_launch_never_opens_a_browser(
    monkeypatch: pytest.MonkeyPatch,
) -> None:
    opened: list[str] = []
    monkeypatch.setattr(
        main_module,
        "parse_args",
        lambda: argparse.Namespace(no_browser=False, browser=False),
    )
    monkeypatch.setattr(main_module, "running_app", lambda: "lingora")
    monkeypatch.setattr(main_module.webbrowser, "open", opened.append)

    main_module.main()

    assert opened == []


def test_browser_launch_opens_existing_local_app(monkeypatch: pytest.MonkeyPatch) -> None:
    opened: list[str] = []
    monkeypatch.setattr(
        main_module,
        "parse_args",
        lambda: argparse.Namespace(no_browser=False, browser=True),
    )
    monkeypatch.setattr(main_module, "running_app", lambda: "lingora")
    monkeypatch.setattr(main_module.webbrowser, "open", opened.append)

    main_module.main()

    assert opened == ["http://127.0.0.1:8765"]
