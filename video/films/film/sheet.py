"""Labelled contact sheet: python sheet.py out.png cols thumb_width file1.png file2.png ..."""
import sys
from pathlib import Path
from PIL import Image, ImageDraw, ImageFont

out, cols, tw_ = sys.argv[1], int(sys.argv[2]), int(sys.argv[3])
files = sys.argv[4:]
ims = [Image.open(f).convert("RGB") for f in files]
th = int(tw_ * ims[0].height / ims[0].width)
rows = (len(ims) + cols - 1) // cols
pad = 4
sheet = Image.new("RGB", (cols * (tw_ + pad) + pad, rows * (th + pad) + pad), (40, 40, 40))
try:
    font = ImageFont.truetype("C:/Windows/Fonts/consola.ttf", max(14, tw_ // 28))
except OSError:
    font = ImageFont.load_default()
d = ImageDraw.Draw(sheet)
for i, (f, im) in enumerate(zip(files, ims)):
    x, y = pad + (i % cols) * (tw_ + pad), pad + (i // cols) * (th + pad)
    sheet.paste(im.resize((tw_, th), Image.LANCZOS), (x, y))
    label = Path(f).stem.lstrip("t").lstrip("0") or "0"
    label = label if not label.startswith(".") else "0" + label
    d.rectangle([x + 4, y + 4, x + 12 + len(label) * (tw_ // 50), y + 8 + tw_ // 26], fill=(0, 0, 0))
    d.text((x + 8, y + 5), label + "s", fill=(255, 230, 0), font=font)
sheet.save(out)
print("sheet ->", out)
