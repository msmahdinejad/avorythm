"""Capture the current, unmodified product UI with synthetic local demo content."""

from __future__ import annotations

import functools
import json
import shutil
import subprocess
import threading
from http.server import SimpleHTTPRequestHandler, ThreadingHTTPServer
from pathlib import Path
from urllib.parse import urlsplit

from playwright.sync_api import sync_playwright

ROOT = Path(__file__).resolve().parents[1]
OUT = ROOT / "docs/images/campaign"


class Handler(SimpleHTTPRequestHandler):
    extensions_map = {**SimpleHTTPRequestHandler.extensions_map, ".mjs": "text/javascript"}

    def translate_path(self, path: str) -> str:
        route = urlsplit(path).path
        if route == "/" or route == "/index.html":
            return str(ROOT / "src/avorythm/static/index.html")
        if route.startswith("/assets/") or route in ("/styles.css", "/app.js"):
            return str(ROOT / "src/avorythm/static" / route.lstrip("/"))
        return super().translate_path(path)

    def log_message(self, format: str, *args: object) -> None:
        return


def main() -> None:
    OUT.mkdir(parents=True, exist_ok=True)
    temporary = ROOT / ".store-preview/v3"
    temporary.mkdir(parents=True, exist_ok=True)
    video = temporary / "demo.webm"
    if not video.exists():
        ffmpeg = shutil.which("ffmpeg")
        if not ffmpeg:
            raise RuntimeError("FFmpeg is required to build the original demo clip")
        subprocess.run(
            [
                ffmpeg,
                "-hide_banner",
                "-loglevel",
                "error",
                "-loop",
                "1",
                "-i",
                str(ROOT / "assets/marketing/source-demo-v3.png"),
                "-t",
                "12",
                "-vf",
                "scale=1280:720",
                "-r",
                "10",
                "-c:v",
                "libvpx",
                "-b:v",
                "1M",
                "-an",
                "-y",
                str(video),
            ],
            check=True,
        )
    server = ThreadingHTTPServer(("127.0.0.1", 0), functools.partial(Handler, directory=str(ROOT)))
    thread = threading.Thread(target=server.serve_forever, daemon=True)
    thread.start()
    try:
        with sync_playwright() as pw:
            browser = pw.chromium.launch(channel="chrome", headless=True)
            for locale, code in (("en", "en"), ("fa", "fa"), ("zh-Hans", "zh-CN")):
                context = browser.new_context(
                    viewport={"width": 1200, "height": 900}, device_scale_factor=2
                )
                context.add_init_script(path=ROOT / "scripts/visuals/capture-bootstrap.js")
                page = context.new_page()
                errors: list[str] = []
                page.on("pageerror", lambda error, errors=errors: errors.append(str(error)))
                base = f"http://127.0.0.1:{server.server_port}"
                page.goto(f"{base}/extension/popup.html?locale={locale}")
                page.wait_for_function("!document.querySelector('#toggleButton').disabled")
                page.evaluate("document.fonts.ready")
                page.locator("body").screenshot(path=OUT / f"popup-{code}.png")
                page.goto(f"{base}/extension/options.html?locale={locale}")
                page.wait_for_function("document.querySelector('#dataConsent').checked")
                page.evaluate("document.fonts.ready")
                page.locator("#output").screenshot(path=OUT / f"settings-{code}.png")
                page.locator("#sync").screenshot(path=OUT / f"sync-full-{code}.png")
                page.locator("#sync").scroll_into_view_if_needed()
                # Real, contiguous crop: buffer and engine controls in the shipped card.
                first = page.locator(".buffer-range").bounding_box()
                last = page.locator("#syncVoiceName").locator("..").bounding_box()
                assert first and last
                page.screenshot(
                    path=OUT / f"sync-settings-{code}.png",
                    clip={
                        "x": first["x"] - 15,
                        "y": first["y"] - 12,
                        "width": first["width"] + 30,
                        "height": last["y"] + last["height"] - first["y"] + 24,
                    },
                )
                producer = context.new_page()
                producer.goto(base)
                producer.evaluate("""async () => {
                  const data = await (await fetch('/.store-preview/v3/demo.webm')).blob();
                  const bridge = new BroadcastChannel('avorythm-sync');
                  bridge.onmessage = ({data: message}) => {
                    if (message.type !== 'ready') return;
                    bridge.postMessage({type:'session-reset',duration:12,position:0,
                      replayId:message.replayId});
                    bridge.postMessage({type:'media-init',mimeType:'video/webm;codecs=vp8',
                      bufferSeconds:8});
                    bridge.postMessage({type:'media-chunk',data});
                    bridge.postMessage({type:'media-progress',duration:12});
                    const pcm = new Int16Array(24000 * 8);
                    bridge.postMessage({type:'dub-chunk',id:'demo',start:0,data:pcm.buffer});
                    for(const translated of [false,true]) bridge.postMessage({
                      type:'caption',translated,id:'demo-caption',start:0,end:12,
                      text:translated ? marketingDemo.translation : marketingDemo.source});
                  };
                }""")
                page.goto(f"{base}/extension/player.html?locale={locale}")
                page.wait_for_function("!document.querySelector('#activateButton').disabled")
                page.locator("#activateButton").click()
                page.wait_for_function("document.querySelector('#video').currentTime > .3")
                page.locator("#playButton").click()
                page.evaluate("document.fonts.ready")
                page.locator(".stage-card").screenshot(path=OUT / f"player-{code}.png")
                page.locator(".control-dock").screenshot(path=OUT / f"mixer-{code}.png")
                producer.close()
                page.goto(f"{base}/extension/popup.html?locale={locale}")
                page.set_content("""<!doctype html><html><head><style>
                  body{margin:0;background:#0b0e15;font-family:system-ui;color:white}
                  header{height:68px;padding:0 32px;display:flex;align-items:center;
                  justify-content:space-between}img{width:100%;height:calc(100vh - 68px);
                  object-fit:cover}small{color:#aaa}
                  </style></head><body><header><b>Coastlines</b><small>
                  Original demo film · Chapter 03</small></header>
                  <img src="/assets/../../assets/marketing/source-demo-v3.png"></body></html>""")
                page.evaluate("document.querySelector('img').src='/assets/marketing-demo.png'")
                # Use repository image directly through the root route, not a remote page.
                page.evaluate(
                    "document.querySelector('img').src='/assets/../../assets/marketing/source-demo-v3.png'"
                )
                page.evaluate("document.querySelector('img').src='/campaign-demo.png'")
                # Resolve the demo as a data URL to avoid static app asset routing.
                import base64

                encoded = base64.b64encode(
                    (ROOT / "assets/marketing/source-demo-v3.png").read_bytes()
                )
                page.evaluate(
                    "url => document.querySelector('img').src = url",
                    "data:image/png;base64," + encoded.decode(),
                )
                page.add_script_tag(path=ROOT / "extension/content.js")
                page.evaluate("""() => __avorythmSubtitleOverlay.render({active:true,
                  settings:marketingDemo.settings,output:marketingDemo.settings.onPageOutput,
                  sourceText:marketingDemo.source,translatedText:marketingDemo.translation})""")
                page.evaluate("document.fonts.ready")
                page.screenshot(path=OUT / f"subtitles-{code}.png")
                # The real pages may log benign async notices while navigating
                # between extension surfaces; capture output is valid only when
                # the requested controls and visual surfaces rendered.
                if errors:
                    print(f"Non-fatal page notices for {code}: {errors[:2]}", flush=True)
                print(f"Captured current product UI: {code}", flush=True)
                context.close()
            browser.close()
    finally:
        server.shutdown()
        server.server_close()
        thread.join(timeout=2)
    print(json.dumps({"captures": len(list(OUT.glob("*.png"))), "api_requests": 0}))


if __name__ == "__main__":
    main()
