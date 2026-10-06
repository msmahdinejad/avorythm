"""Load a packaged extension in Chromium and verify localized manifest fields.

Uses disposable browser profiles and makes no AI provider requests.
"""

from __future__ import annotations

import argparse
import json
import re
import tempfile
import zipfile
from pathlib import Path

from playwright.sync_api import sync_playwright


def main() -> None:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("package", type=Path)
    parser.add_argument("--executable", type=Path)
    args = parser.parse_args()
    root = Path(__file__).resolve().parents[1]
    with tempfile.TemporaryDirectory(prefix="avorythm-store-") as temporary:
        workspace = Path(temporary)
        extension = workspace / "extension"
        with zipfile.ZipFile(args.package) as archive:
            for name in archive.namelist():
                assert (extension / name).resolve().is_relative_to(extension.resolve()), name
            archive.extractall(extension)
        manifest = json.loads((extension / "manifest.json").read_text(encoding="utf-8"))
        messages = list((extension / "_locales").glob("*/messages.json"))
        assert len(messages) == 51, f"Expected 51 packaged locales, got {len(messages)}"
        for path in messages:
            locale = path.parent.name
            copy = (root / "store-assets" / f"LISTING.{locale.replace('_', '-')}.md").read_text(
                encoding="utf-8"
            )
            fields = re.split(r"^## .+$", copy, flags=re.MULTILINE)[1:]
            value = json.loads(path.read_text(encoding="utf-8"))
            assert value["appName"]["message"] == fields[0].strip(), locale
            assert value["appDescription"]["message"] == fields[1].strip(), locale
        print(f"ZIP {manifest['version']}: all 51 names and summaries match reviewed copy")

        with sync_playwright() as playwright:
            for locale in ("en", "de", "fa", "zh-CN"):
                context = playwright.chromium.launch_persistent_context(
                    str(workspace / f"profile-{locale}"),
                    channel="chromium",
                    headless=True,
                    executable_path=str(args.executable) if args.executable else None,
                    args=[
                        f"--disable-extensions-except={extension}",
                        f"--load-extension={extension}",
                        f"--lang={locale}",
                    ],
                )
                try:
                    worker = (
                        context.service_workers[0]
                        if context.service_workers
                        else context.wait_for_event("serviceworker")
                    )
                    actual = worker.evaluate("""() => ({
                        locale: chrome.i18n.getUILanguage(),
                        name: chrome.runtime.getManifest().name,
                        summary: chrome.runtime.getManifest().description
                    })""")
                    expected = json.loads(
                        (extension / "_locales" / locale.replace("-", "_") / "messages.json")
                        .read_text(encoding="utf-8")
                    )
                    actual_locale = actual["locale"].lower()
                    assert actual_locale == locale.lower() or (
                        locale == "en" and actual_locale.startswith("en-")
                    ), actual
                    assert actual["name"] == expected["appName"]["message"], actual
                    assert actual["summary"] == expected["appDescription"]["message"], actual
                    print(f"Chromium {locale}: {actual['name']}")
                finally:
                    context.close()


if __name__ == "__main__":
    main()
