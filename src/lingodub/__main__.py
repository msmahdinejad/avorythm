from __future__ import annotations

import argparse
import sys
import urllib.error
import urllib.request
import webbrowser
from threading import Timer

import uvicorn

from .api import create_app


def parse_args() -> argparse.Namespace:
    parser = argparse.ArgumentParser(description="LingoDub local companion")
    parser.add_argument("--no-browser", action="store_true")
    return parser.parse_args()


def companion_is_running() -> bool:
    try:
        with urllib.request.urlopen("http://127.0.0.1:8765/api/health", timeout=0.6) as response:
            return bool(response.status == 200)
    except (OSError, urllib.error.URLError):
        return False


def main() -> None:
    if sys.platform != "win32":
        raise SystemExit("LingoDub desktop capture currently supports Windows 10/11.")
    args = parse_args()
    if companion_is_running():
        if not args.no_browser:
            webbrowser.open("http://127.0.0.1:8765")
        return
    if not args.no_browser:
        Timer(1.2, lambda: webbrowser.open("http://127.0.0.1:8765")).start()
    uvicorn.run(create_app(), host="127.0.0.1", port=8765, log_level="warning")


if __name__ == "__main__":
    main()
