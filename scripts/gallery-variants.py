"""Pre-sized copies of the archive images in public/gallery.

    python3 scripts/gallery-variants.py

Writes gallery/md/<name>.webp (960 px wide: cards, phone stage) and
gallery/thumb/<name>.webp (240 px wide: thumbnail strip). The originals stay
for the desktop stage and the lightbox. Re-run after adding an image.
"""
from pathlib import Path

from PIL import Image

ROOT = Path(__file__).resolve().parent.parent / "public" / "gallery"
SIZES = {"md": (960, 80), "thumb": (240, 72)}

for src in sorted(ROOT.iterdir()):
    if src.suffix.lower() not in {".jpg", ".jpeg", ".png", ".webp"}:
        continue
    with Image.open(src) as im:
        im = im.convert("RGB")
        for folder, (width, quality) in SIZES.items():
            out = ROOT / folder / f"{src.stem}.webp"
            out.parent.mkdir(exist_ok=True)
            w = min(width, im.width)
            h = round(im.height * w / im.width)
            im.resize((w, h), Image.LANCZOS).save(out, "WEBP", quality=quality, method=6)
            print(f"{out.relative_to(ROOT)}  {w}x{h}  {out.stat().st_size // 1024} KB")
