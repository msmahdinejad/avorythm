"""Request complete campaign images from the user-selected local Codex-LB.

No drawing, typography, compositing, or image layout is performed by this script.
It saves the model's original PNG and, optionally, resizes that entire image for
the destination's required dimensions. Credentials never enter output files.
"""

from __future__ import annotations

import argparse
import base64
import io
import json
import os
import time
from concurrent.futures import ThreadPoolExecutor, as_completed
from pathlib import Path
from urllib.error import HTTPError
from urllib.request import Request, urlopen

from PIL import Image

ROOT = Path(__file__).resolve().parents[1]
OUT = ROOT / "output/imagegen/2026-10-05"
SPEC = OUT / "briefs.json"


def generate(job: dict, force: bool = False, out_dir: Path = OUT) -> str:
    destination = out_dir / job["name"]
    original = destination.with_name(destination.stem + "-original.png")
    if destination.exists() and not force:
        return f"KEEP {job['name']}"
    inputs = [{"type": "input_text", "text": job["prompt"]}]
    for relative in job.get("references", []):
        reference = ROOT / relative
        encoded = base64.b64encode(reference.read_bytes()).decode("ascii")
        inputs.append({"type": "input_image", "image_url": "data:image/png;base64," + encoded})
    payload = {
        "model": "gpt-6-sol",
        "input": [{"role": "user", "content": inputs}],
        "tools": [
            {
                "type": "image_generation",
                "model": "gpt-image-2.5-sunburst",
                "quality": "high",
                "size": "x".join(map(str, job.get("generation_size", job["size"]))),
            }
        ],
    }
    request = Request(
        "http://127.0.0.1:2455/v1/responses",
        data=json.dumps(payload).encode("utf-8"),
        headers={
            "Authorization": "Bearer " + os.environ["CODEX_LB_API_KEY"],
            "Content-Type": "application/json",
        },
    )
    print(f"START {job['name']}", flush=True)
    for attempt in range(3):
        try:
            with urlopen(request, timeout=600) as response:
                result = json.load(response)
            break
        except HTTPError as error:
            if error.code not in {429, 500, 502, 503, 504} or attempt == 2:
                raise RuntimeError(
                    f"Local LB HTTP {error.code}; response omitted for privacy"
                ) from None
            time.sleep(8 * (attempt + 1))
    call = next(
        (
            entry
            for entry in result.get("output", [])
            if entry.get("type") == "image_generation_call"
        ),
        None,
    )
    if not call or not call.get("result"):
        types = [entry.get("type") for entry in result.get("output", [])]
        raise RuntimeError(f"No generated image; output types: {types}")
    data = base64.b64decode(call["result"], validate=True)
    if not data.startswith(b"\x89PNG\r\n\x1a\n"):
        raise RuntimeError("Model did not return a PNG")
    destination.parent.mkdir(parents=True, exist_ok=True)
    original.write_bytes(data)
    target = tuple(job["size"])
    with Image.open(io.BytesIO(data)) as im:
        received = im.size
        if "A" in im.getbands() and im.getchannel("A").getextrema()[0] < 255:
            raise RuntimeError(
                "Model returned transparency for an opaque listing asset; original retained, "
                "final not replaced. Regenerate with an explicitly opaque background."
            )
        aspect_error = abs((received[0] / received[1]) / (target[0] / target[1]) - 1)
        if aspect_error > 0.03:
            raise RuntimeError(
                f"Canvas aspect differs by {aspect_error:.1%}; original retained, "
                "final not replaced. Regenerate with an explicit canvas brief."
            )
        # The generator may return a nearby supported canvas. Keep the complete
        # model image (no crop or content edits) and use only a mechanical resize
        # for the store's exact slot dimensions.
        # Mechanical resize only: no text, layout, cropping, or overlays.
        im.convert("RGB").resize(target, Image.Resampling.LANCZOS).save(destination, optimize=True)
    metadata = {
        "name": job["name"],
        "generator": "codex-lb / gpt-image-2.5-sunburst",
        "original_size": received,
        "final_size": target,
        "postprocessing": "whole-image resize and PNG encoding only",
    }
    destination.with_suffix(".json").write_text(
        json.dumps(metadata, ensure_ascii=False, indent=2), encoding="utf-8"
    )
    return f"DONE {job['name']} {received} -> {target}"


def main() -> None:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("names", nargs="*")
    parser.add_argument("--workers", type=int, default=2)
    parser.add_argument("--force", action="store_true")
    parser.add_argument("--spec", type=Path, default=SPEC)
    parser.add_argument("--out-dir", type=Path, default=OUT)
    args = parser.parse_args()
    if not os.environ.get("CODEX_LB_API_KEY"):
        raise SystemExit("CODEX_LB_API_KEY is not configured locally.")
    jobs = json.loads(args.spec.read_text(encoding="utf-8"))
    if args.names:
        selected = set(args.names)
        jobs = [job for job in jobs if job["name"] in selected]
        missing = selected - {job["name"] for job in jobs}
        if missing:
            raise SystemExit(f"Unknown briefs: {sorted(missing)}")
    failures = []
    with ThreadPoolExecutor(max_workers=max(1, min(3, args.workers))) as pool:
        futures = {
            pool.submit(generate, job, args.force, args.out_dir): job["name"] for job in jobs
        }
        for future in as_completed(futures):
            try:
                print(future.result(), flush=True)
            except Exception as error:
                name = futures[future]
                print(f"FAILED {name}: {type(error).__name__}: {error}", flush=True)
                failures.append(name)
    if failures:
        raise SystemExit(f"Failed jobs: {', '.join(failures)}")


if __name__ == "__main__":
    main()
