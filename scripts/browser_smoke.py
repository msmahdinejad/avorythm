from __future__ import annotations

import functools
import shutil
import subprocess
import tempfile
import threading
from http.server import SimpleHTTPRequestHandler, ThreadingHTTPServer
from pathlib import Path
from urllib.parse import urlsplit

from playwright.sync_api import Page, sync_playwright


class ModuleHandler(SimpleHTTPRequestHandler):
    extensions_map = {**SimpleHTTPRequestHandler.extensions_map, ".mjs": "text/javascript"}
    fixture = Path()

    def do_GET(self) -> None:
        if urlsplit(self.path).path == "/__avorythm-fixture.webm":
            payload = self.fixture.read_bytes()
            self.send_response(200)
            self.send_header("Content-Type", "video/webm")
            self.send_header("Content-Length", str(len(payload)))
            self.end_headers()
            self.wfile.write(payload)
            return
        super().do_GET()

    def log_message(self, format: str, *args: object) -> None:
        return


def run_harness(page: Page, url: str, *, click: bool, timeout_ms: int) -> str:
    page.goto(url, wait_until="domcontentloaded")
    if click:
        page.get_by_role("button", name="Run mixed export").click()
    page.wait_for_function(
        """() => /^(PASS|FAIL|SCRIPT-ERROR|PROMISE-ERROR)/.test(
          document.querySelector('#result')?.textContent || ''
        )""",
        timeout=timeout_ms,
    )
    result = page.locator("#result").inner_text()
    if not result.startswith("PASS "):
        raise RuntimeError(result)
    return result


def main() -> None:
    root = Path(__file__).resolve().parents[1]
    ffmpeg = shutil.which("ffmpeg")
    if not ffmpeg:
        raise RuntimeError("ffmpeg is required for browser release smoke tests")
    with tempfile.TemporaryDirectory(prefix="avorythm-browser-smoke-") as temporary:
        fixture = Path(temporary) / "fixture.webm"
        subprocess.run(
            [
                ffmpeg,
                "-hide_banner",
                "-loglevel",
                "error",
                "-f",
                "lavfi",
                "-i",
                "testsrc2=size=480x270:rate=30",
                "-f",
                "lavfi",
                "-i",
                "sine=frequency=220:sample_rate=48000",
                "-t",
                "1.5",
                "-c:v",
                "libvpx",
                "-c:a",
                "libopus",
                "-y",
                str(fixture),
            ],
            check=True,
        )
        ModuleHandler.fixture = fixture
        handler = functools.partial(ModuleHandler, directory=str(root))
        server = ThreadingHTTPServer(("127.0.0.1", 0), handler)
        worker = threading.Thread(target=server.serve_forever, daemon=True)
        worker.start()
        base_url = f"http://127.0.0.1:{server.server_port}"
        try:
            with sync_playwright() as playwright:
                browser = playwright.chromium.launch(
                    channel="chrome",
                    headless=False,
                    args=[
                        "--autoplay-policy=no-user-gesture-required",
                        "--disable-background-timer-throttling",
                        "--disable-backgrounding-occluded-windows",
                    ],
                )
                page = browser.new_page()
                page.bring_to_front()
                exported = run_harness(
                    page,
                    f"{base_url}/tests/browser/recording-export-harness.html"
                    "?fixture=/__avorythm-fixture.webm",
                    click=True,
                    timeout_ms=45_000,
                )
                media_source = run_harness(
                    page,
                    f"{base_url}/tests/browser/media-source-harness.html",
                    click=False,
                    timeout_ms=60_000,
                )
                browser.close()
        finally:
            server.shutdown()
            server.server_close()
            worker.join(timeout=2)
    print(exported)
    print(media_source)


if __name__ == "__main__":
    main()
