"""Postprodukcja w duchu AoE2: redukcja do palety 256 kolorów, twarda przezroczystość, opcjonalny obrys.

  python palette_aoe.py ../godot/assets/sprites --outline

Wymaga Pillow (pip install pillow). Oryginał używał jednej globalnej palety 256 kolorów (plik .pal),
dwustopniowej przezroczystości (pełna + cień 50%) i braku antyaliasingu. Tutaj:
  * kolory RGB są kwantyzowane do palety zbudowanej z ramp barwnych (ziemia, drewno, zieleń, kamień, metal, skóra),
  * alfa < 40 -> przezroczyste, 40..160 -> cień (czarny 50%), > 160 -> kryjące,
  * --outline dodaje 1 px ciemny obrys (styl bardziej "czytelny" na małych sprite'ach).
Pliki są nadpisywane w miejscu, więc uruchamiaj po renderze (render_sprites.py) i przed importem w Godocie.
"""
import argparse
import glob
import os
import sys

try:
    from PIL import Image, ImageChops, ImageFilter
except ImportError:
    sys.exit("Zainstaluj Pillow: pip install pillow")


def ramp(c0, c1, n):
    return [tuple(int(c0[i] + (c1[i] - c0[i]) * k / (n - 1)) for i in range(3)) for k in range(n)]


def build_palette():
    cols = []
    cols += ramp((18, 10, 6), (120, 78, 38), 20)       # drewno
    cols += ramp((60, 40, 20), (210, 180, 120), 24)    # ziemia / strzecha
    cols += ramp((10, 30, 8), (120, 190, 80), 28)      # zieleń
    cols += ramp((20, 20, 22), (230, 230, 225), 40)    # kamień / metal / szarości
    cols += ramp((90, 50, 30), (255, 220, 190), 20)    # skóra
    cols += ramp((60, 10, 10), (255, 90, 70), 16)      # czerwienie (dachy, jagody)
    cols += ramp((80, 60, 10), (255, 235, 120), 16)    # złoto / słoma
    cols += ramp((10, 20, 60), (120, 170, 255), 16)    # błękity (woda, niebo)
    cols += ramp((120, 0, 120), (255, 120, 255), 24)   # magenta: kolor gracza (zachowany dla shadera)
    cols += ramp((40, 25, 60), (200, 170, 230), 12)    # fiolety
    cols += ramp((0, 0, 0), (255, 255, 255), 40)       # pełna skala szarości
    cols = cols[:256]
    while len(cols) < 256:
        cols.append((0, 0, 0))
    pal = Image.new("P", (16, 16))
    pal.putpalette([v for c in cols for v in c])
    return pal


def process(path, pal, outline):
    im = Image.open(path).convert("RGBA")
    r, g, b, a = im.split()
    rgb = Image.merge("RGB", (r, g, b)).quantize(palette=pal, dither=Image.Dither.NONE).convert("RGB")
    # trzy poziomy alfy jak w oryginale: przezroczyste / cień 50% / kryjące
    a3 = a.point(lambda v: 0 if v < 40 else (128 if v < 160 else 255))
    out = Image.merge("RGBA", (*rgb.split(), a3))
    if outline:
        solid = a3.point(lambda v: 255 if v == 255 else 0)
        grown = solid.filter(ImageFilter.MaxFilter(3))
        ring = ImageChops.subtract(grown, solid)       # 1 px wokół sylwetki
        dark = Image.new("RGBA", im.size, (20, 12, 8, 255))
        out = Image.composite(dark, out, ring)
    out.save(path, optimize=True)


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("dir")
    ap.add_argument("--outline", action="store_true")
    args = ap.parse_args()
    pal = build_palette()
    files = sorted(glob.glob(os.path.join(args.dir, "*.png")))
    for f in files:
        process(f, pal, args.outline)
        print("paleta:", os.path.basename(f))
    print(f"gotowe: {len(files)} plików")


if __name__ == "__main__":
    main()
