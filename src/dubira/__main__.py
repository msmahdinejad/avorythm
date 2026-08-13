from __future__ import annotations

import argparse
import json
import os
import sys
import time
import urllib.error
import urllib.request
import webbrowser
from contextlib import suppress
from pathlib import Path
from threading import Thread, Timer
from typing import Any

import uvicorn

from .api import create_app


class NativeApi:
    """Small bridge for the native always-on-top subtitle window."""

    def __init__(self, webview_module: Any | None = None) -> None:
        # pywebview recursively exposes public attributes from js_api objects.
        # Native window handles must therefore stay private.
        self._webview = webview_module
        self._subtitle_window: Any | None = None
        self._subtitle_visible = False

    def show_subtitles(self, width: int = 720, height: int = 180) -> bool:
        if self._subtitle_window is None and self._webview is not None:
            self._subtitle_window = self._webview.create_window(
                "Lingora Subtitles",
                "http://127.0.0.1:8765/subtitle-window.html",
                js_api=self,
                width=720,
                height=180,
                min_size=(320, 110),
                frameless=True,
                easy_drag=True,
                shadow=True,
                on_top=True,
                background_color="#0a0e1c",
            )
        if self._subtitle_window is None:
            return False
        window = self._subtitle_window
        window.resize(max(320, min(1200, int(width))), max(110, min(420, int(height))))
        window.on_top = True
        window.show()
        self._subtitle_visible = True
        return True

    def hide_subtitles(self) -> bool:
        if self._subtitle_window is not None:
            self._subtitle_window.hide()
        self._subtitle_visible = False
        return True

    def subtitles_are_visible(self) -> bool:
        return self._subtitle_visible


def parse_args() -> argparse.Namespace:
    parser = argparse.ArgumentParser(description="Lingora desktop application")
    parser.add_argument("--no-browser", action="store_true")
    parser.add_argument("--browser", action="store_true", help="open in the default browser")
    return parser.parse_args()


def running_app() -> str:
    try:
        with urllib.request.urlopen("http://127.0.0.1:8765/api/health", timeout=0.6) as response:
            payload = json.loads(response.read().decode("utf-8"))
            if response.status != 200 or payload.get("status") != "ok":
                return "none"
            return "lingora" if payload.get("app") == "Lingora" else "legacy"
    except (OSError, ValueError, urllib.error.URLError):
        return "none"


def app_is_running() -> bool:
    return running_app() == "lingora"


def stop_legacy_app() -> None:
    request = urllib.request.Request("http://127.0.0.1:8765/api/shutdown", method="POST")
    with suppress(OSError, urllib.error.URLError):
        urllib.request.urlopen(request, timeout=2).close()
    for _ in range(40):
        if running_app() == "none":
            return
        time.sleep(0.1)
    raise SystemExit("Close the older Lingora/Dubira process before starting Lingora.")


def main() -> None:
    # GUI-frozen Windows apps have no console streams. Uvicorn and a few
    # dependencies still expect process-lifetime writable file objects.
    if sys.stdout is None:
        sys.stdout = open(os.devnull, "w", encoding="utf-8")  # noqa: SIM115
    if sys.stderr is None:
        sys.stderr = open(os.devnull, "w", encoding="utf-8")  # noqa: SIM115
    args = parse_args()
    if running_app() == "legacy":
        stop_legacy_app()
    if app_is_running():
        if not args.no_browser:
            webbrowser.open("http://127.0.0.1:8765")
        return
    server_holder: dict[str, uvicorn.Server] = {}

    def request_shutdown() -> None:
        server_holder["server"].should_exit = True
        forced_exit = Timer(3.0, lambda: os._exit(0))
        forced_exit.daemon = True
        forced_exit.start()

    app = create_app(shutdown_callback=request_shutdown)
    server = uvicorn.Server(
        uvicorn.Config(app, host="127.0.0.1", port=8765, log_level="warning")
    )
    server_holder["server"] = server
    if args.no_browser:
        server.run()
        return
    if args.browser:
        Timer(1.2, lambda: webbrowser.open("http://127.0.0.1:8765")).start()
        server.run()
        return

    thread = Thread(target=server.run, name="lingora-server", daemon=True)
    thread.start()
    for _ in range(80):
        if app_is_running():
            break
        if not thread.is_alive():
            raise SystemExit("Lingora local server could not start.")
        time.sleep(0.05)
    else:
        raise SystemExit("Lingora local server did not become ready.")

    try:
        import webview  # type: ignore[import-not-found]

        native_api = NativeApi(webview)
        webview.settings["ALLOW_DOWNLOADS"] = True
        main_window = webview.create_window(
            "Lingora",
            "http://127.0.0.1:8765",
            js_api=native_api,
            width=1360,
            height=880,
            min_size=(980, 680),
            background_color="#070914",
        )
        if main_window is None:
            raise RuntimeError("Lingora native window could not be created")
        def close_native_windows() -> None:
            server.should_exit = True
            if native_api._subtitle_window is not None:
                native_api._subtitle_window.destroy()
                native_api._subtitle_window = None

        main_window.events.closed += close_native_windows
        webview.start(
            private_mode=False,
            storage_path=str(Path.home() / ".lingora-webview"),
        )
    finally:
        server.should_exit = True
        thread.join(timeout=3)


if __name__ == "__main__":
    main()
