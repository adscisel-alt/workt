"""Combine the 16 translated page PNGs into a single Polish PDF at the
original page size (832.8 x 832.8 pt = 11.567 in square @ 300 dpi)."""
import os
from PIL import Image

DIR = "/home/user/workt/pl_rulebook"
OUT = os.path.join(DIR, "Anunnaki_instrukcja_PL.pdf")

pages = []
for n in range(1, 17):
    path = os.path.join(DIR, f"out-{n:02d}.png")
    if not os.path.exists(path):
        raise SystemExit(f"missing {path}")
    im = Image.open(path).convert("RGB")
    pages.append(im)

pages[0].save(OUT, save_all=True, append_images=pages[1:], resolution=300.0)
print("wrote", OUT, f"({len(pages)} pages)")
