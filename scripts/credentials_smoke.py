"""Check optional key persistence in a disposable, real Chromium profile.

Run: python scripts/credentials_smoke.py [--executable PATH] [--screenshots DIR]
Requires Playwright and Chromium. Uses fake keys and makes no provider requests.
"""

from __future__ import annotations

import argparse
import json
import tempfile
from pathlib import Path

from playwright.sync_api import BrowserContext, Page, expect, sync_playwright


def open_settings(context: BrowserContext) -> Page:
    worker = (
        context.service_workers[0]
        if context.service_workers
        else context.wait_for_event("serviceworker")
    )
    extension_id = worker.url.split("/")[2]
    page = context.new_page()
    page.goto(f"chrome-extension://{extension_id}/options.html")
    page.wait_for_function("document.querySelector('#keyStatus').textContent.length > 0")
    return page


def send(page: Page, message: dict[str, object]) -> dict[str, object]:
    result = page.evaluate("message => chrome.runtime.sendMessage(message)", message)
    assert result["ok"], result.get("error")
    return result


def main() -> None:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--executable", type=Path)
    parser.add_argument("--screenshots", type=Path)
    args = parser.parse_args()
    root = Path(__file__).resolve().parents[1]
    extension = root / "extension"
    errors: list[str] = []
    with (
        tempfile.TemporaryDirectory(prefix="avorythm-credentials-") as profile,
        sync_playwright() as playwright,
    ):

        def launch() -> BrowserContext:
            context = playwright.chromium.launch_persistent_context(
                profile,
                headless=True,
                executable_path=str(args.executable) if args.executable else None,
                viewport={"width": 1440, "height": 1060},
                args=[f"--disable-extensions-except={extension}", f"--load-extension={extension}"],
            )
            context.on(
                "page", lambda page: page.on("pageerror", lambda error: errors.append(str(error)))
            )
            return context

        context = launch()
        page = open_settings(context)
        expect(page.locator("#rememberGeminiKey")).not_to_be_checked()
        expect(page.locator("#rememberGroqKey")).not_to_be_checked()
        page.locator("#apiKey").fill("test-gemini-session-only")
        page.locator("#saveKeyButton").click()
        expect(page.locator("#keyStatus")).to_have_text("The key is ready for this session.")
        context.close()

        context = launch()
        page = open_settings(context)
        expect(page.locator("#keyStatus")).to_have_text("No key is configured yet.")
        page.locator("#rememberGeminiKey").check()
        expect(page.locator("#rememberGeminiKey")).to_be_enabled()
        page.locator("#apiKey").fill("test-gemini-remembered")
        page.locator("#saveKeyButton").click()
        expect(page.locator("#keyStatus")).to_have_text("The Gemini key is saved on this device.")
        page.locator("#rememberGroqKey").check()
        expect(page.locator("#rememberGroqKey")).to_be_enabled()
        send(page, {"type": "set-groq-key", "apiKey": "test-groq-remembered"})
        page.reload()
        expect(page.locator("#groqKeyStatus")).to_have_text("The Groq key is saved on this device.")
        context.close()

        context = launch()
        page = open_settings(context)
        expect(page.locator("#keyStatus")).to_have_text("The Gemini key is saved on this device.")
        expect(page.locator("#groqKeyStatus")).to_have_text("The Groq key is saved on this device.")
        for locale, filename in [("en", "en"), ("fa", "fa"), ("zh-Hans", "zh-CN")]:
            page.locator("#localeToggle").select_option(locale)
            page.wait_for_function("locale => document.documentElement.lang === locale", arg=locale)
            expect(page.locator("#rememberGeminiKey")).to_be_checked()
            expect(page.locator("#rememberGroqKey")).to_be_checked()
            if args.screenshots:
                args.screenshots.mkdir(parents=True, exist_ok=True)
                page.evaluate("() => document.fonts.ready")
                page.set_viewport_size({"width": 1440, "height": 1400})
                page.locator("#connection").evaluate(
                    "element => element.scrollIntoView({block: 'start', behavior: 'instant'})"
                )
                page.locator("#connection").screenshot(
                    path=str(args.screenshots / f"settings-{filename}.png")
                )
                page.locator("#sync").evaluate(
                    "element => element.scrollIntoView({block: 'start', behavior: 'instant'})"
                )
                page.locator("#sync").screenshot(
                    path=str(args.screenshots / f"sync-settings-{filename}.png")
                )
        page.locator("#localeToggle").select_option("en")
        page.locator("#rememberGeminiKey").uncheck()
        expect(page.locator("#keyStatus")).to_have_text("The key is ready for this session.")
        data = send(page, {"type": "bootstrap"})["data"]
        assert data["api_key_set"] and not data["remember_gemini_key"]
        assert data["groq_api_key_set"] and data["remember_groq_key"]
        context.close()

        context = launch()
        page = open_settings(context)
        expect(page.locator("#keyStatus")).to_have_text("No key is configured yet.")
        expect(page.locator("#groqKeyStatus")).to_have_text("The Groq key is saved on this device.")
        page.locator("#clearGroqKeyButton").click()
        expect(page.locator("#groqKeyStatus")).to_have_text("Add a Groq key to use precise mode.")
        expect(page.locator("#rememberGroqKey")).not_to_be_checked()
        page.locator("#rememberGeminiKey").check()
        expect(page.locator("#rememberGeminiKey")).to_be_enabled()
        page.locator("#apiKey").fill("test-gemini-reset")
        page.locator("#saveKeyButton").click()
        expect(page.locator("#keyStatus")).to_have_text("The Gemini key is saved on this device.")
        page.locator("#resetButton").click()
        expect(page.locator("#keyStatus")).to_have_text("The key is ready for this session.")
        expect(page.locator("#rememberGeminiKey")).not_to_be_checked()
        context.close()

        context = launch()
        page = open_settings(context)
        data = send(page, {"type": "bootstrap"})["data"]
        assert not any(
            data[field]
            for field in [
                "api_key_set",
                "groq_api_key_set",
                "remember_gemini_key",
                "remember_groq_key",
            ]
        )
        context.close()
    assert not errors, errors
    print(
        json.dumps(
            {"real_browser_restarts": 4, "locales": ["en", "fa", "zh-Hans"], "result": "passed"}
        )
    )


if __name__ == "__main__":
    main()
