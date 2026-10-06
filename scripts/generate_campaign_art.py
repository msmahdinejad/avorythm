"""Generate the campaign's original artwork through the user-configured local LB.

Only public art briefs are submitted. Credentials are read from the environment
and never included in the prompts, repository, or output.
"""

from __future__ import annotations

import base64
import json
import os
from concurrent.futures import ThreadPoolExecutor
from pathlib import Path
from urllib.request import Request, urlopen

ROOT = Path(__file__).resolve().parents[1]
BRIEFS = {
    "assets/marketing/source-demo-v3.png": (
        "Use case: photorealistic-natural. Asset: original demo-video still for an "
        "open-source AI audio translator. Create a breathtaking but believable aerial "
        "editorial photograph of a winding coastal road above the Atlantic, pale chalk "
        "cliffs and teal sea, rolling sage-green hills, early golden sunlight, delicate "
        "sea mist in the far distance. Landscape 16:9, horizon in the upper third, "
        "a single sweeping road as a confident visual leading line. Sophisticated "
        "travel documentary cinematography, natural textures, detailed water and rock, "
        "restrained warm film color grading, beautifully balanced composition. The "
        "bottom-center area must be quiet enough for subtitles to be composited later. "
        "No people, cars, buildings, text, logos, watermark, UI, panels, collage, "
        "fantasy islands or oversaturated colors. One uninterrupted photograph."
    ),
}


def generate(item: tuple[str, str]) -> None:
    relative, prompt = item
    destination = ROOT / relative
    if destination.exists():
        print(f"Keeping existing artwork: {relative}", flush=True)
        return
    request = Request(
        "http://127.0.0.1:2455/v1/responses",
        data=json.dumps({
            "model": "gpt-6-sol", "input": prompt,
            "tools": [{"type": "image_generation", "model": "gpt-image-2.5-sunburst",
                       "quality": "high"}],
        }).encode(),
        headers={"Authorization": "Bearer " + os.environ["CODEX_LB_API_KEY"],
                 "Content-Type": "application/json"},
    )
    with urlopen(request, timeout=600) as response:
        result = json.load(response)
    image = next((entry for entry in result.get("output", [])
                  if entry.get("type") == "image_generation_call"), None)
    if not image or not image.get("result"):
        raise RuntimeError(f"No generated image returned for {relative}")
    payload = base64.b64decode(image["result"], validate=True)
    if not payload.startswith(b"\x89PNG\r\n\x1a\n"):
        raise RuntimeError(f"Expected PNG output for {relative}")
    destination.parent.mkdir(parents=True, exist_ok=True)
    destination.write_bytes(payload)
    print(f"Generated {relative} ({len(payload):,} bytes)", flush=True)


if __name__ == "__main__":
    if not os.environ.get("CODEX_LB_API_KEY"):
        raise SystemExit("Configure CODEX_LB_API_KEY locally; do not paste it into the repository.")
    with ThreadPoolExecutor(max_workers=2) as executor:
        list(executor.map(generate, BRIEFS.items()))
