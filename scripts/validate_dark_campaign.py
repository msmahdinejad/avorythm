"""Verify the approved campaign canvases, PNG encoding, and content hashes."""

from __future__ import annotations

import argparse
import hashlib
import json
from pathlib import Path

from PIL import Image

ROOT = Path(__file__).resolve().parents[1]
DEFAULT_MANIFEST = ROOT / "store-assets/campaign.json"


def validate(manifest_path: Path) -> dict[str, object]:
    entries = json.loads(manifest_path.read_text(encoding="utf-8"))
    invalid: list[str] = []
    verified = 0
    for entry in entries:
        name = entry["path"]
        path = ROOT / name
        try:
            with Image.open(path) as image:
                dimensions, mode, encoding = image.size, image.mode, image.format
                image.verify()
            if dimensions != tuple(entry["dimensions"]) or mode != "RGB" or encoding != "PNG":
                invalid.append(f"{name}: canvas or encoding differs from the approved asset")
            if hashlib.sha256(path.read_bytes()).hexdigest() != entry["sha256"]:
                invalid.append(f"{name}: content differs from the approved asset")
            if entry["postprocessing"] != "whole-image resize and PNG encoding only":
                invalid.append(f"{name}: unexpected postprocessing")
            verified += 1
        except (OSError, ValueError) as error:
            invalid.append(f"{name}: unreadable asset ({error})")
    return {"verified": verified, "invalid": invalid}


def main() -> int:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--manifest", type=Path, default=DEFAULT_MANIFEST)
    args = parser.parse_args()
    report = validate(args.manifest)
    print(json.dumps(report, ensure_ascii=False, indent=2))
    return int(bool(report["invalid"]))


if __name__ == "__main__":
    raise SystemExit(main())
