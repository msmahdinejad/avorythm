"""Generate the web-sized brand and screenshot assets in site/src/img from the files already in the repo.

usage: python -I site/tools/make-images.py
"""
import base64
import io
from pathlib import Path

from PIL import Image, ImageChops, ImageDraw, ImageFilter

ROOT = Path(__file__).resolve().parents[2]
OUT = ROOT / "site" / "src" / "img"
OUT.mkdir(parents=True, exist_ok=True)

LOGO = Image.open(ROOT / "assets/branding/avorythm-logo.png").convert("RGBA")
BBOX = (86, 265, 1167, 979)  # true content bounds of the mark (alpha > 8)
MARK = LOGO.crop(BBOX)


def tile(size: int, bleed: bool = False) -> Image.Image:
    """Dark rounded app tile with the logo mark, matching the extension's brand mark."""
    scale = 4
    s = size * scale
    base = Image.new("RGBA", (s, s), (10, 14, 31, 255))
    glow = Image.new("RGBA", (s, s), (0, 0, 0, 0))
    gd = ImageDraw.Draw(glow)
    gd.ellipse((s * 0.35, -s * 0.25, s * 1.15, s * 0.55), fill=(117, 97, 245, 120))
    gd.ellipse((-s * 0.25, s * 0.5, s * 0.55, s * 1.25), fill=(63, 249, 249, 60))
    glow = glow.filter(ImageFilter.GaussianBlur(s * 0.12))
    base = Image.alpha_composite(base, glow)
    mark = MARK.copy()
    target_w = int(s * 0.74)
    mark = mark.resize((target_w, int(mark.height * target_w / mark.width)), Image.LANCZOS)
    base.alpha_composite(mark, ((s - mark.width) // 2, (s - mark.height) // 2))
    if not bleed:
        mask = Image.new("L", (s, s), 0)
        ImageDraw.Draw(mask).rounded_rectangle((0, 0, s - 1, s - 1), radius=int(s * 0.225), fill=255)
        base.putalpha(ImageChops.multiply(base.getchannel("A"), mask))
        ImageDraw.Draw(base).rounded_rectangle((0, 0, s - 1, s - 1), radius=int(s * 0.225), outline=(255, 255, 255, 34), width=scale)
    return base.resize((size, size), Image.LANCZOS)


for size in (64, 128, 256, 512):
    tile(size).save(OUT / f"logo-{size}.webp", quality=92, method=6)
tile(32).save(OUT / "favicon-32.png", optimize=True)
tile(192).save(OUT / "icon-192.png", optimize=True)
tile(512).save(OUT / "icon-512.png", optimize=True)
tile(180, bleed=True).convert("RGB").save(OUT / "apple-touch-icon.png", optimize=True)

# A self-contained SVG favicon (embeds a 64 px PNG so it stays crisp in every browser tab).
buf = io.BytesIO()
tile(64).save(buf, format="PNG", optimize=True)
b64 = base64.b64encode(buf.getvalue()).decode()
(OUT / "favicon.svg").write_text(
    f'<svg xmlns="http://www.w3.org/2000/svg" xmlns:xlink="http://www.w3.org/1999/xlink" viewBox="0 0 64 64" width="64" height="64">'
    f'<image width="64" height="64" xlink:href="data:image/png;base64,{b64}"/></svg>\n',
    encoding="utf-8",
)


def shot(src: str, name: str, max_w: int, quality: int = 84) -> None:
    im = Image.open(ROOT / src).convert("RGB")
    if im.width > max_w:
        im = im.resize((max_w, round(im.height * max_w / im.width)), Image.LANCZOS)
    im.save(OUT / f"shot-{name}.webp", quality=quality, method=6)


for loc in ("en", "fa", "zh-CN"):
    shot(f"docs/images/extension/popup-{loc}.png", f"popup-{loc}", 780)
    shot(f"docs/images/extension/settings-{loc}.png", f"settings-{loc}", 822, 88)
    shot(f"docs/images/extension/subtitles-{loc}.png", f"subtitles-{loc}", 1400)
    shot(f"docs/images/extension/player-{loc}.png", f"player-{loc}", 1400)
    shot(f"docs/images/extension/sync-settings-{loc}.png", f"sync-settings-{loc}", 822, 88)
for loc in ("en", "fa"):
    shot(f"docs/images/app-{loc}.png", f"app-{loc}", 1265)
shot("docs/images/audio-routing-guide.png", "audio-routing", 1400)
shot("docs/images/campaign/settings-en.png", "outputs-en", 1400, 88)
shot("docs/images/campaign/settings-fa.png", "outputs-fa", 1400, 88)
shot("docs/images/campaign/settings-zh-CN.png", "outputs-zh-CN", 1400, 88)

total = sum(f.stat().st_size for f in OUT.iterdir())
print(f"wrote {len(list(OUT.iterdir()))} files, {total / 1024:.0f} KB total -> {OUT}")
