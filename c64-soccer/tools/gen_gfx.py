#!/usr/bin/env python3
"""Generator grafiki gry: mapa boiska + zestaw znaków (multicolor), sprite'y zawodników,
piłka, cień, czcionka HUD. Wynik: src/gfx.s i src/gfx.h (dla cc65).

Uruchom: python3 tools/gen_gfx.py
"""
import math, os, sys

OUT_S = os.path.join(os.path.dirname(__file__), '..', 'src', 'gfx.s')
OUT_H = os.path.join(os.path.dirname(__file__), '..', 'src', 'gfx.h')

# ---------------------------------------------------------------- boisko
MAP_COLS = 40
MAP_ROWS = 84                 # 84 * 8 = 672 px wysokości świata
W = MAP_COLS * 4              # szerokość w "szerokich" pikselach (multicolor = 2 px)
H = MAP_ROWS * 8

# wartości: 0 trawa A (tło), 1 trawa B (pas), 2 linia biała, 3 kolor z Color RAM (czarny - siatka)
pix = [[0] * W for _ in range(H)]

# pasy koszenia co 16 px
for y in range(H):
    if (y // 16) % 2 == 1:
        for x in range(W):
            pix[y][x] = 1

def hline(y, x0, x1, v=2, thick=2):
    for yy in range(y, y + thick):
        for x in range(x0, x1 + 1):
            if 0 <= yy < H and 0 <= x < W:
                pix[yy][x] = v

def vline(x, y0, y1, v=2):
    for y in range(y0, y1 + 1):
        if 0 <= y < H and 0 <= x < W:
            pix[y][x] = v

def rect(x0, y0, x1, y1):
    hline(y0, x0, x1); hline(y1 - 1, x0, x1)
    vline(x0, y0, y1); vline(x1, y0, y1)

# Współrzędne w szerokich pikselach (x) i liniach (y). Świat px = (2*x, y).
PX0, PX1 = 8, 151            # linie boczne (świat x 16 i 302)
PY0, PY1 = 24, 647           # linie bramkowe
rect(PX0, PY0, PX1, PY1)
hline(335, PX0, PX1)         # linia środkowa
# koło środkowe
cx, cy = 80, 336
for i in range(720):
    a = i * math.pi / 360
    x = int(round(cx + 20 * math.cos(a)))
    y = int(round(cy + 40 * math.sin(a)))
    pix[y][x] = 2
    pix[y + 1][x] = 2
# pole karne / bramkowe / punkt karny
def box(xw, depth, top):
    x0 = 80 - xw // 2; x1 = 80 + xw // 2
    if top:
        hline(PY0 + depth, x0, x1); vline(x0, PY0, PY0 + depth); vline(x1, PY0, PY0 + depth)
    else:
        hline(PY1 - depth - 1, x0, x1); vline(x0, PY1 - depth, PY1); vline(x1, PY1 - depth, PY1)
for top in (True, False):
    box(104, 64, top)   # pole karne: 208 px szer., 64 px głęb.
    box(48, 24, top)    # pole bramkowe: 96 px szer., 24 px głęb.
hline(PY0 + 48, 79, 80); hline(PY1 - 49, 79, 80)   # punkty karne
# bramki: słupki na x=63 i x=96 (świat 126 i 192), głębokość 14 px
GX0, GX1 = 63, 96
for top in (True, False):
    y0, y1 = (10, PY0) if top else (PY1, 661)
    for y in range(y0, y1 + 1):
        for x in range(GX0 + 1, GX1):
            if (x + y) % 2 == 0:
                pix[y][x] = 3
    vline(GX0, y0, y1); vline(GX1, y0, y1)
    hline(y0 if top else y1 - 1, GX0, GX1)

# podział na znaki 4x8, deduplikacja
chars = []
char_index = {}
pmap = []
for r in range(MAP_ROWS):
    for c in range(MAP_COLS):
        data = []
        for yy in range(8):
            b = 0
            for xx in range(4):
                b = (b << 2) | pix[r * 8 + yy][c * 4 + xx]
            data.append(b)
        key = bytes(data)
        if key not in char_index:
            char_index[key] = len(chars)
            chars.append(key)
        pmap.append(char_index[key])
assert len(chars) <= 256, len(chars)

# ---------------------------------------------------------------- sprite'y
# Wartości: 0 przezroczysty, 1 = $D025 (wspólny: czarny), 2 = kolor sprite'a (koszulka), 3 = $D026 (wspólny: skóra)
def blank():
    return [[0] * 12 for _ in range(21)]

def put(g, x, y, v):
    if 0 <= x < 12 and 0 <= y < 21:
        g[y][x] = v

def fill(g, x0, y0, x1, y1, v):
    for y in range(y0, y1 + 1):
        for x in range(x0, x1 + 1):
            put(g, x, y, v)

def player(d, f):
    """d: 0=góra,1=góra-prawo,2=prawo,3=dół-prawo,4=dół,5=dół-lewo,6=lewo,7=góra-lewo; f: klatka 0..2"""
    g = blank()
    up = d in (7, 0, 1)
    down = d in (3, 4, 5)
    side = d in (2, 6)
    hx = 4 + (1 if d in (1, 2, 3) else (-1 if d in (5, 6, 7) else 0))
    # głowa 4x4
    fill(g, hx, 1, hx + 3, 4, 3)
    fill(g, hx, 1, hx + 3, 1, 1)                   # włosy
    if up:
        fill(g, hx, 2, hx + 3, 2, 1)               # tył głowy
    elif down:
        put(g, hx, 3, 1); put(g, hx + 3, 3, 1)     # oczy (po bokach: widok z góry/przodu)
    elif side:
        put(g, hx + (3 if d == 2 else 0), 3, 1)    # oko z boku
        fill(g, hx + (0 if d == 2 else 2), 2, hx + (1 if d == 2 else 3), 2, 1)
    # tułów
    if side:
        fill(g, 4, 5, 7, 10, 2)
        ax = 8 if d == 2 else 3                    # ręka z przodu
        swing = (0, 1, -1)[f]
        fill(g, ax, 6 + swing, ax, 9 + swing, 3)
    else:
        fill(g, 3, 5, 8, 10, 2)
        swing = (0, 1, -1)[f]
        fill(g, 2, 6 + swing, 2, 9 + swing, 3)
        fill(g, 9, 6 - swing, 9, 9 - swing, 3)
    # spodenki
    if side:
        fill(g, 4, 11, 7, 13, 1)
    else:
        fill(g, 3, 11, 8, 13, 1)
    # nogi + buty
    if side:
        spread = (0, 2, 1)[f]
        lx = 5 - spread; rx = 6 + spread
        fill(g, lx, 14, lx, 19, 3); put(g, lx, 20, 1)
        fill(g, rx, 14, rx, 19, 3); put(g, rx, 20, 1)
        if f == 0:
            fill(g, 4, 14, 7, 19, 3); fill(g, 4, 20, 7, 20, 1)
    else:
        ll = (19, 16, 19)[f]
        rl = (19, 19, 16)[f]
        fill(g, 3, 14, 4, ll, 3); fill(g, 3, ll + 1, 4, ll + 1, 1)
        fill(g, 7, 14, 8, rl, 3); fill(g, 7, rl + 1, 8, rl + 1, 1)
    return g

def encode_mc(g):
    out = []
    for row in g:
        bits = 0
        for v in row:
            bits = (bits << 2) | v
        out += [(bits >> 16) & 255, (bits >> 8) & 255, bits & 255]
    return out + [0]

def encode_hires(rows):
    """rows: lista 21 stringów 24 znaków ('#' = piksel)"""
    out = []
    rows = list(rows) + [''] * (21 - len(rows))
    for r in rows:
        r = r.ljust(24, '.')
        for b in range(3):
            byte = 0
            for i in range(8):
                byte = (byte << 1) | (1 if r[b * 8 + i] == '#' else 0)
            out.append(byte)
    return out + [0]

sprites = []
for d in range(8):
    for f in range(3):
        sprites.append(encode_mc(player(d, f)))
SPR_PLAYER = 0
# piłka (multicolor, 4 szerokie px x 5)
ball = blank()
ballpat = ["0220", "2122", "2212", "2222", "0220"]
for y, row in enumerate(ballpat):
    for x, ch in enumerate(row):
        put(ball, x, y, int(ch))
SPR_BALL = len(sprites); sprites.append(encode_mc(ball))
# cień (hires, czarny)
shadow = [".######.", "########", ".######."]
SPR_SHADOW = len(sprites); sprites.append(encode_hires(shadow))
# dwa sprite'y HUD (hires, wypełniane w czasie gry)
SPR_HUD = len(sprites); sprites.append(encode_hires([])); sprites.append(encode_hires([]))

# ---------------------------------------------------------------- czcionka 4x5 (HUD)
FONT = {
 '0': ["###.", "#..#", "#..#", "#..#", ".###"], '1': ["..#.", ".##.", "..#.", "..#.", ".###"],
 '2': ["###.", "...#", ".##.", "#...", "####"], '3': ["###.", "...#", ".##.", "...#", "###."],
 '4': ["#..#", "#..#", "####", "...#", "...#"], '5': ["####", "#...", "###.", "...#", "###."],
 '6': [".##.", "#...", "###.", "#..#", ".##."], '7': ["####", "...#", "..#.", ".#..", ".#.."],
 '8': [".##.", "#..#", ".##.", "#..#", ".##."], '9': [".##.", "#..#", ".###", "...#", ".##."],
 ':': ["....", ".#..", "....", ".#..", "...."], '-': ["....", "....", ".##.", "....", "...."],
 '!': [".#..", ".#..", ".#..", "....", ".#.."], ' ': ["....", "....", "....", "....", "...."],
 'A': [".##.", "#..#", "####", "#..#", "#..#"], 'C': [".###", "#...", "#...", "#...", ".###"],
 'D': ["###.", "#..#", "#..#", "#..#", "###."], 'E': ["####", "#...", "###.", "#...", "####"],
 'F': ["####", "#...", "###.", "#...", "#..."], 'G': [".###", "#...", "#.##", "#..#", ".###"],
 'H': ["#..#", "#..#", "####", "#..#", "#..#"], 'I': ["###.", ".#..", ".#..", ".#..", "###."],
 'K': ["#..#", "#.#.", "##..", "#.#.", "#..#"], 'L': ["#...", "#...", "#...", "#...", "####"],
 'M': ["#..#", "####", "####", "#..#", "#..#"], 'N': ["#..#", "##.#", "#.##", "#..#", "#..#"],
 'O': [".##.", "#..#", "#..#", "#..#", ".##."], 'P': ["###.", "#..#", "###.", "#...", "#..."],
 'R': ["###.", "#..#", "###.", "#.#.", "#..#"], 'S': [".###", "#...", ".##.", "...#", "###."],
 'T': ["####", ".#..", ".#..", ".#..", ".#.."], 'U': ["#..#", "#..#", "#..#", "#..#", ".##."],
 'W': ["#..#", "#..#", "####", "####", "#..#"], 'Y': ["#..#", "#..#", ".##.", ".#..", ".#.."],
}
FONT_ORDER = "0123456789:-! ACDEFGHIKLMNOPRSTUWY"
font_bytes = []
for ch in FONT_ORDER:
    for row in FONT[ch]:
        b = 0
        for i, c in enumerate(row):
            if c == '#':
                b |= 0x80 >> i
        font_bytes.append(b)

# tablica glifów przesuniętych pod 5 pozycji (po 5 px): [pozycja][glif][wiersz*2 + bajt]
NGLYPH = len(FONT_ORDER)
glyph_sh = []
for pos in range(5):
    shift = (pos * 5) & 7
    for gi in range(NGLYPH):
        for r in range(5):
            g = font_bytes[gi * 5 + r]
            glyph_sh.append((g >> shift) & 255)
            glyph_sh.append(((g << (8 - shift)) & 255) if shift > 4 else 0)

# ---------------------------------------------------------------- zapis
def dump(f, name, data, per=16):
    f.write(f"{name}:\n")
    for i in range(0, len(data), per):
        f.write("\t.byte " + ",".join(f"${b:02x}" for b in data[i:i + per]) + "\n")

with open(OUT_S, 'w') as f:
    f.write("; Plik wygenerowany przez tools/gen_gfx.py - nie edytować ręcznie\n")
    f.write(".export _pitch_map, _charset_data, _sprite_data, _font_data, _pitch_row_lo, _pitch_row_hi\n")
    f.write(".export _glyph_sh, gsh_pos_lo, gsh_pos_hi, gsh_g10_lo, gsh_g10_hi\n")
    f.write(f".export charset_len = {len(chars) * 8}\n")
    f.write(f".export sprite_len = {len(sprites) * 64}\n")
    f.write('.segment "RODATA"\n')
    dump(f, "_pitch_map", pmap, MAP_COLS)
    f.write("_pitch_row_lo:\n")
    for r in range(MAP_ROWS):
        f.write(f"\t.byte <(_pitch_map+{r * MAP_COLS})\n")
    f.write("_pitch_row_hi:\n")
    for r in range(MAP_ROWS):
        f.write(f"\t.byte >(_pitch_map+{r * MAP_COLS})\n")
    dump(f, "_charset_data", b"".join(chars), 8)
    flat = []
    for s in sprites:
        flat += s
    dump(f, "_sprite_data", flat, 16)
    dump(f, "_font_data", font_bytes, 5)
    dump(f, "_glyph_sh", glyph_sh, 10)
    f.write("gsh_pos_lo:\n" + "".join(f"\t.byte <(_glyph_sh+{p * NGLYPH * 10})\n" for p in range(5)))
    f.write("gsh_pos_hi:\n" + "".join(f"\t.byte >(_glyph_sh+{p * NGLYPH * 10})\n" for p in range(5)))
    f.write("gsh_g10_lo:\n" + "".join(f"\t.byte <{g * 10}\n" for g in range(NGLYPH)))
    f.write("gsh_g10_hi:\n" + "".join(f"\t.byte >{g * 10}\n" for g in range(NGLYPH)))

with open(OUT_H, 'w') as f:
    f.write("/* Plik wygenerowany przez tools/gen_gfx.py */\n#ifndef GFX_H\n#define GFX_H\n")
    f.write(f"#define MAP_COLS {MAP_COLS}\n#define MAP_ROWS {MAP_ROWS}\n")
    f.write(f"#define NUM_CHARS {len(chars)}\n#define NUM_SPRITES {len(sprites)}\n")
    f.write(f"#define SPR_PLAYER {SPR_PLAYER}\n#define SPR_BALL {SPR_BALL}\n#define SPR_SHADOW {SPR_SHADOW}\n#define SPR_HUD {SPR_HUD}\n")
    f.write(f'#define FONT_CHARS "{FONT_ORDER}"\n#define NGLYPH {NGLYPH}\n')
    f.write("#endif\n")

print(f"znaków: {len(chars)}, sprite'ów: {len(sprites)}, mapa: {len(pmap)} B")

# podgląd ASCII sprite'ów (opcjonalnie: --show)
if '--show' in sys.argv:
    for d in range(8):
        for f_ in range(3):
            g = player(d, f_)
            print(f"dir {d} frame {f_}")
            for row in g:
                print("".join(" .#o"[v] for v in row))
