"""Split the Avorythm logo into its colour components (sound arcs, arrows, core) so the films can assemble it.

usage: python -I video/tools/logo-split.py
Writes video/src/assets/logo/<colour>_<n>.png and parts.json (positions in the 1254 px source canvas).
"""
import json
from pathlib import Path

import cv2
import numpy as np
from PIL import Image

ROOT = Path(__file__).resolve().parents[2]
SRC = ROOT / "assets" / "branding" / "avorythm-logo.png"
OUT = ROOT / "video" / "src" / "assets" / "logo"
OUT.mkdir(parents=True, exist_ok=True)
for old in OUT.glob("*.png"):
    old.unlink()

im = np.array(Image.open(SRC).convert("RGBA")).astype(np.float32)
H, W = im.shape[:2]
rgb, alpha = im[..., :3], im[..., 3]
palette = {"purple": (107, 47, 255), "cyan": (64, 245, 245), "navy": (11, 18, 87)}
names = list(palette)
dist = np.stack([((rgb - np.array(c)) ** 2).sum(-1) for c in palette.values()], -1)
cls = dist.argmin(-1)

parts = []
for ci, name in enumerate(names):
    mask = ((cls == ci) & (alpha > 8)).astype(np.uint8)
    n, lab, stats, cent = cv2.connectedComponentsWithStats((mask & (alpha > 128)).astype(np.uint8), 8)
    for k in range(1, n):
        x, y, w, h, area = stats[k]
        if area < 400:
            continue
        comp = cv2.dilate((lab == k).astype(np.uint8), np.ones((5, 5), np.uint8)) & mask  # keep the anti-aliased rim
        x0, y0, x1, y1 = max(0, x - 4), max(0, y - 4), min(W, x + w + 4), min(H, y + h + 4)
        rgba = np.zeros((y1 - y0, x1 - x0, 4), np.uint8)
        sub = comp[y0:y1, x0:x1].astype(bool)
        rgba[..., :3][sub] = im[y0:y1, x0:x1, :3][sub]
        rgba[..., 3][sub] = im[y0:y1, x0:x1, 3][sub]
        fn = f"{name}_{sum(1 for p in parts if p['c'] == name)}.png"
        Image.fromarray(rgba).save(OUT / fn, optimize=True)
        parts.append({"f": fn, "c": name, "x": int(x0), "y": int(y0), "w": int(x1 - x0), "h": int(y1 - y0), "cx": float(cent[k][0]), "cy": float(cent[k][1]), "area": int(area)})

(OUT / "parts.json").write_text(json.dumps({"width": W, "height": H, "parts": parts}, indent=1), encoding="utf-8")
Image.open(SRC).convert("RGBA").save(OUT / "logo-full.png", optimize=True)
print(f"{len(parts)} parts -> {OUT}")
for p in parts:
    print(p["f"], p["x"], p["y"], p["w"], p["h"], p["area"])
