#!/usr/bin/env python3
"""Montaz zapowiedzi: JUBILEUSZOWY 10. ZJAZD PRZYJACIOL - Grand Marina Resort.

python3 build.py shots   -> renderuje ujecia (shots/sNN.mp4)
python3 build.py ass     -> generuje napisy (titles.ass)
python3 build.py final   -> sklada film (out/zapowiedz.mp4)
"""
import json
import math
import os
import subprocess
import sys
from concurrent.futures import ThreadPoolExecutor

from PIL import Image, ImageDraw, ImageFilter, ImageFont

S = os.path.dirname(os.path.abspath(__file__))
SRC = f"{S}/src"
SHOTS = f"{S}/shots"
OUTD = f"{S}/out"
FONTS = f"{S}/fonts"
W, H, FPS = 1920, 1080, 30
TOTAL = 112.0
os.makedirs(SHOTS, exist_ok=True)
os.makedirs(OUTD, exist_ok=True)

GRADE_DUSK = ("eq=contrast=1.07:saturation=1.25:gamma=0.97,"
              "colorbalance=rs=-0.03:gs=-0.01:bs=0.04:rh=0.05:gh=0.01:bh=-0.04,"
              "curves=all='0/0.015 0.25/0.22 0.5/0.5 0.75/0.79 1/0.985'")
GRADE_DAY = ("eq=contrast=1.06:saturation=1.18:gamma=0.98,"
             "colorbalance=rs=-0.02:bs=0.02:rh=0.03:bh=-0.03,"
             "curves=all='0/0.01 0.25/0.23 0.5/0.5 0.75/0.78 1/0.99'")
GRADE_ROOM = ("eq=contrast=1.05:saturation=1.12:gamma=1.04,"
              "colorbalance=rh=0.03:bh=-0.03,curves=all='0/0.02 0.5/0.52 1/1'")

# ------------------------------------------------------------------ OS CZASU
# cut = moment ciecia (s), d = dlugosc przejscia wchodzacego, tr = typ xfade
TL = [
    dict(cut=0.0, kind="v", src="v3", a=0.0, sp=0.75, g="dusk", tr="fade", d=0.0),
    dict(cut=5.0, kind="v", src="v2", a=0.0, sp=0.8, g="dusk", tr="fade", d=1.0),
    dict(cut=10.0, kind="v", src="v1", a=9.45, sp=0.7, g="dusk", tr="fade", d=1.0),
    dict(cut=15.0, kind="v", src="v2", a=21.0, sp=0.75, g="dusk", tr="fade", d=0.08),
    dict(cut=20.0, kind="v", src="v2", a=5.0, sp=0.75, g="dusk", tr="fade", d=1.0),
    dict(cut=25.0, kind="v", src="v4", a=0.0, sp=0.6, g="day", tr="fade", d=0.08),
    dict(cut=30.0, kind="v", src="v5", a=8.5, sp=0.75, g="day", tr="smoothleft", d=0.6),
    dict(cut=35.0, kind="v", src="v4", a=6.0, sp=0.8, g="day", tr="smoothright", d=0.6),
    dict(cut=40.0, kind="v", src="v5", a=20.0, sp=0.8, g="day", tr="smoothleft", d=0.6),
    dict(cut=45.0, kind="v", src="v2", a=9.0, sp=0.7, g="dusk", tr="fade", d=1.4),
    dict(cut=50.0, kind="v", src="v2", a=26.0, sp=0.75, g="dusk", tr="fade", d=1.2),
    dict(cut=55.0, kind="v", src="v3", a=13.2, sp=0.6, g="dusk", tr="fade", d=1.2),
    dict(cut=60.0, kind="photo", img="2", tr="fade", d=0.08,
         kb=((0, 130, 1700), (220, 230, 1440))),
    dict(cut=65.0, kind="photo", img="3", tr="smoothleft", d=0.6,
         kb=((40, 300, 1600), (150, 340, 1420))),
    dict(cut=70.0, kind="rooms", tr="fade", d=0.6),
    dict(cut=75.0, kind="v", src="v4", a=3.0, sp=0.8, g="day", tr="fade", d=0.08),
    dict(cut=77.5, kind="v", src="v5", a=1.6, sp=0.8, g="day", tr="fade", d=0.08),
    dict(cut=80.0, kind="photo", img="2", tr="fade", d=0.08,
         kb=((260, 260, 1380), (380, 330, 1180))),
    dict(cut=82.5, kind="v", src="v5", a=9.6, sp=0.8, g="day", tr="fade", d=0.08),
    dict(cut=85.0, kind="v", src="v4", a=13.6, sp=0.8, g="day", tr="fade", d=0.08),
    dict(cut=87.5, kind="v", src="v1", a=0.0, sp=0.8, g="dusk", tr="fade", d=0.08),
    dict(cut=90.0, kind="v", src="v5", a=22.0, sp=0.8, g="day", tr="fade", d=0.08),
    dict(cut=92.5, kind="v", src="v3", a=5.0, sp=0.85, g="dusk", tr="fade", d=0.08),
    dict(cut=95.0, kind="v", src="v2", a=21.5, sp=0.5, g="end", tr="fade", d=0.08),
]
FLASHES = [(15.0, 0.75), (25.0, 0.32), (60.0, 0.38), (75.0, 0.75), (80.0, 0.22), (85.0, 0.28),
           (90.0, 0.22), (95.0, 0.8), (105.0, 0.55)]


def durations():
    out = []
    for i, s in enumerate(TL):
        nxt = TL[i + 1]["cut"] if i + 1 < len(TL) else TOTAL
        dn = TL[i + 1]["d"] if i + 1 < len(TL) else 0.0
        out.append(round(nxt - s["cut"] + s["d"] / 2 + dn / 2, 4))
    return out


def run(cmd):
    r = subprocess.run(cmd, capture_output=True, text=True)
    if r.returncode:
        print(" ".join(cmd)[:2000], "\n", r.stderr[-3000:])
        raise SystemExit(1)
    return r


def enc_args(path):
    return ["-c:v", "libx264", "-preset", "medium", "-crf", "13", "-pix_fmt", "yuv420p",
            "-r", str(FPS), "-an", path]


# ------------------------------------------------------------------ UJECIA WIDEO
def render_video(i, s, dur):
    out = f"{SHOTS}/s{i:02d}.mp4"
    sp = s["sp"]
    srcdur = dur * sp + 0.25
    trf = f"{SHOTS}/s{i:02d}.trf"
    inp = ["-ss", f"{s['a']:.3f}", "-t", f"{srcdur:.3f}", "-i", f"{SRC}/{s['src']}.mp4"]
    run(["ffmpeg", "-nostdin", "-v", "error", "-y", *inp, "-vf",
         f"vidstabdetect=shakiness=5:accuracy=15:result={trf}", "-f", "null", "-"])
    fps_mi = FPS / sp
    chain = [f"vidstabtransform=input={trf}:smoothing=18:zoom=3:optzoom=0:interpol=bicubic"]
    if sp < 0.999:
        chain.append(f"minterpolate=fps={fps_mi:.4f}:mi_mode=mci:mc_mode=aobmc:me_mode=bidir:vsbmc=1")
        chain.append(f"setpts=PTS/{sp}")
    chain += [f"fps={FPS}", "hqdn3d=1.5:1.5:3:3",
              f"scale={W}:{H + 2}:flags=lanczos", f"crop={W}:{H}", "unsharp=5:5:0.7:5:5:0"]
    g = s["g"]
    if g == "dusk":
        chain.append(GRADE_DUSK)
    elif g == "day":
        chain.append(GRADE_DAY)
    elif g == "end":
        chain += [GRADE_DUSK, "gblur=sigma=3.5", "eq=brightness=-0.05:saturation=1.1"]
    chain.append(f"trim=duration={dur:.4f},setpts=PTS-STARTPTS")
    run(["ffmpeg", "-nostdin", "-v", "error", "-y", *inp, "-vf", ",".join(chain),
         "-frames:v", str(math.ceil(dur * FPS) + 1), *enc_args(out)])
    return out


# ------------------------------------------------------------------ ZDJECIA (Ken Burns)
def ease(u):
    return 0.5 - 0.5 * math.cos(math.pi * u)


def ffmpeg_sink(out, vf):
    return subprocess.Popen(["ffmpeg", "-nostdin", "-v", "error", "-y", "-f", "rawvideo", "-pix_fmt", "rgb24",
                             "-s", f"{W}x{H}", "-r", str(FPS), "-i", "-", "-vf", vf, *enc_args(out)],
                            stdin=subprocess.PIPE)


def render_photo(i, s, dur):
    out = f"{SHOTS}/s{i:02d}.mp4"
    img = Image.open(f"{SRC}/{s['img']}.jpg").convert("RGB")
    (x0, y0, w0), (x1, y1, w1) = s["kb"]
    n = math.ceil(dur * FPS) + 1
    p = ffmpeg_sink(out, GRADE_DUSK + ",unsharp=5:5:0.4:5:5:0")
    for k in range(n):
        u = 0.15 * (k / max(1, n - 1)) + 0.85 * ease(k / max(1, n - 1))
        x = x0 + (x1 - x0) * u
        y = y0 + (y1 - y0) * u
        w = w0 + (w1 - w0) * u
        h = w * H / W
        fr = img.transform((W, H), Image.AFFINE, (w / W, 0, x, 0, h / H, y), resample=Image.BICUBIC)
        p.stdin.write(fr.tobytes())
    p.stdin.close()
    p.wait()
    return out


def render_rooms(i, s, dur):
    """Kolaz pokoi: trzy karty na rozmytym tle."""
    out = f"{SHOTS}/s{i:02d}.mp4"
    photos = [Image.open(f"{SRC}/{k}.jpg").convert("RGB") for k in ("1", "4", "5")]
    # rozjasnienie ciemniejszego zdjecia (4)
    from PIL import ImageEnhance
    photos[1] = ImageEnhance.Brightness(photos[1]).enhance(1.25)
    photos[1] = ImageEnhance.Contrast(photos[1]).enhance(1.05)
    crops = [(470, 0), (430, 0), (420, 0)]          # lewy gorny rog wycinka (pion 1157x1500)
    CW, CHh = 520, 680
    gold = (233, 196, 106)
    bg_src = photos[2].resize((W, int(W * 1500 / 2000))).filter(ImageFilter.GaussianBlur(28))
    bg_src = ImageEnhance.Brightness(bg_src).enhance(0.42)
    shadow = Image.new("RGBA", (CW + 120, CHh + 120), (0, 0, 0, 0))
    ImageDraw.Draw(shadow).rectangle([60, 70, 60 + CW, 70 + CHh], fill=(0, 0, 0, 170))
    shadow = shadow.filter(ImageFilter.GaussianBlur(22))
    n = math.ceil(dur * FPS) + 1
    p = ffmpeg_sink(out, GRADE_ROOM)
    centers = [(960 - 590, 455), (960, 455), (960 + 590, 455)]
    for k in range(n):
        t = k / FPS
        z = 1.0 + 0.05 * (k / n)
        bw, bh = int(W * z), int(bg_src.height * z)
        bg = bg_src.resize((bw, bh), Image.BILINEAR).crop(((bw - W) // 2, (bh - H) // 2, (bw - W) // 2 + W,
                                                            (bh - H) // 2 + H)).convert("RGBA")
        for j, (cx, cy) in enumerate(centers):
            t0 = 0.2 + 0.22 * j
            u = min(1.0, max(0.0, (t - t0) / 0.75))
            if u <= 0:
                continue
            e = 1 - (1 - u) ** 3
            alpha = int(255 * min(1.0, u * 1.6))
            dy = int(90 * (1 - e))
            zz = 1.0 + 0.07 * (t / dur)
            cw_src = 1157 / zz
            ch_src = 1500 / zz
            ox, oy = crops[j]
            sx = ox + (1157 - cw_src) / 2
            sy = oy + (1500 - ch_src) / 2
            card = photos[j].transform((CW, CHh), Image.AFFINE, (cw_src / CW, 0, sx, 0, ch_src / CHh, sy),
                                       resample=Image.BICUBIC).convert("RGBA")
            framed = Image.new("RGBA", (CW + 8, CHh + 8), gold + (255,))
            framed.paste(card, (4, 4))
            layer = Image.new("RGBA", (W, H), (0, 0, 0, 0))
            layer.alpha_composite(shadow, (cx - CW // 2 - 60, cy - CHh // 2 - 60 + dy))
            layer.alpha_composite(framed, (cx - CW // 2 - 4, cy - CHh // 2 - 4 + dy))
            if alpha < 255:
                a = layer.getchannel("A").point(lambda v, al=alpha: v * al // 255)
                layer.putalpha(a)
            bg.alpha_composite(layer)
        p.stdin.write(bg.convert("RGB").tobytes())
    p.stdin.close()
    p.wait()
    return out


def cmd_shots(only=None):
    ds = durations()
    jobs = []
    with ThreadPoolExecutor(max_workers=4) as ex:
        for i, (s, d) in enumerate(zip(TL, ds)):
            if only is not None and i not in only:
                continue
            fn = {"v": render_video, "photo": render_photo, "rooms": render_rooms}[s["kind"]]
            jobs.append((i, ex.submit(fn, i, s, d)))
        for i, j in jobs:
            print("gotowe", j.result(), flush=True)


# ------------------------------------------------------------------ NAPISY (ASS)
GOLD = "&H006AC4E9&"
GOLD_L = "&H8DD5F4&"
GOLD_D = "&H1F4A6A&"
WHITE = "&HFFFFFF&"
CREAM = "&HE6F4FB&"
FONTFILE = {"ZjCinzelBold": "ZjCinzelBold.ttf", "ZjCinzelBlack": "ZjCinzelBlack.ttf",
            "ZjMontLight": "ZjMontLight.ttf", "ZjMontSemi": "ZjMontSemi.ttf", "ZjMontXBold": "ZjMontXBold.ttf",
            "Great Vibes": "GreatVibes-Regular.ttf"}
_fcache = {}


def text_w(text, font, size, fsp=0):
    """Przyblizona szerokosc napisu w pikselach (jak w libass)."""
    from fontTools.ttLib import TTFont
    if font not in _fcache:
        path = f"{FONTS}/{FONTFILE[font]}"
        tt = TTFont(path)
        os2 = tt["OS/2"]
        scale = tt["head"].unitsPerEm / (os2.usWinAscent + os2.usWinDescent)
        _fcache[font] = (path, scale)
    path, scale = _fcache[font]
    f = ImageFont.truetype(path, max(1, int(round(size * scale))))
    return f.getlength(text) + fsp * max(0, len(text) - 1)


def ts(t):
    t = max(0.0, t)
    h = int(t // 3600)
    m = int(t % 3600 // 60)
    s = t % 60
    return f"{h}:{m:02d}:{s:05.2f}"


EV = []


def dlg(layer, t0, t1, text):
    EV.append(f"Dialogue: {layer},{ts(t0)},{ts(t1)},Base,,0,0,0,,{text}")


def T(t0, t1, x, y, text, font="ZjCinzelBold", size=100, color=WHITE, fsp=(0, 0), anim="fade",
      glow=None, fin=500, fout=400, delay=0.0, sweep=False, outline=GOLD_D, rise=26):
    """Napis z warstwami: poswiata + tekst (+ opcjonalny blysk przesuwajacy sie po literach)."""
    t0 += delay
    dur_ms = int((t1 - t0) * 1000)
    f0, f1 = fsp
    if anim == "pop":
        mov = f"\\pos({x},{y})"
        a = (f"\\fad(60,{fout})\\fscx150\\fscy150\\t(0,280,0.45,\\fscx100\\fscy100)"
             f"\\blur10\\t(0,260,\\blur0.7)\\fsp{f0}\\t(0,{dur_ms},\\fsp{f1})")
    elif anim == "slam":
        mov = f"\\pos({x},{y})"
        a = (f"\\fad(40,{fout})\\fscx230\\fscy230\\t(0,220,0.4,\\fscx100\\fscy100)"
             f"\\blur14\\t(0,220,\\blur0.7)\\fsp{f0}\\t(0,{dur_ms},\\fsp{f1})")
    else:
        mov = f"\\move({x},{y + rise},{x},{y},0,{fin + 300})"
        a = (f"\\fad({fin},{fout})\\blur7\\t(0,{fin},\\blur0.7)"
             f"\\fsp{f0}\\t(0,{dur_ms},\\fsp{f1})")
    base = f"\\an5{mov}\\fn{font}\\fs{size}"
    if glow:
        dlg(1, t0, t1, "{" + base + a + f"\\1a&HFF&\\3c{glow}\\3a&H70&\\bord{max(4, size // 14)}"
            f"\\shad0\\blur{max(8, size // 7)}" + "}" + text)
    dlg(2, t0, t1, "{" + base + a + f"\\1c{color}\\3c{outline}\\bord1.3\\4c&H000000&\\4a&H55&\\shad3" + "}" + text)
    if sweep:
        wpx = text_w(text, font, size, (f0 + f1) / 2)
        xl, xr = int(x - wpx / 2 - 80), int(x + wpx / 2 + 80)
        st = int(fin + 250)
        dlg(3, t0, t1, "{" + base + a + f"\\1c&HF2FBFF&\\1a&H30&\\bord0\\shad0"
            f"\\clip({xl},0,{xl + 70},{H})\\t({st},{st + 1100},\\clip({xr - 70},0,{xr},{H}))" + "}" + text)


def plate(t0, t1, x, y, w, h, alpha="&H84&", fin=500, fout=400, blur=70):
    """Miekki cien pod napisem: kilka wspolsrodkowych owali = gladki gradient bez widocznej krawedzi."""
    target = 1 - int(alpha.strip("&H"), 16) / 255          # docelowe krycie w srodku
    layers = (0.6, 0.85, 1.1, 1.4)
    a_each = 1 - (1 - target) ** (1 / len(layers))
    al = f"&H{int(round(255 * (1 - a_each))):02X}&"
    k = 0.5523
    for sc in layers:
        ww, hh = w * 1.15 * sc, h * 1.2 * sc
        rx, ry = ww / 2, hh / 2
        cx, cy = rx, ry
        d = (f"m {cx - rx:.0f} {cy:.0f} "
             f"b {cx - rx:.0f} {cy - k * ry:.0f} {cx - k * rx:.0f} {cy - ry:.0f} {cx:.0f} {cy - ry:.0f} "
             f"b {cx + k * rx:.0f} {cy - ry:.0f} {cx + rx:.0f} {cy - k * ry:.0f} {cx + rx:.0f} {cy:.0f} "
             f"b {cx + rx:.0f} {cy + k * ry:.0f} {cx + k * rx:.0f} {cy + ry:.0f} {cx:.0f} {cy + ry:.0f} "
             f"b {cx - k * rx:.0f} {cy + ry:.0f} {cx - rx:.0f} {cy + k * ry:.0f} {cx - rx:.0f} {cy:.0f}")
        dlg(0, t0, t1, "{\\an5\\pos(%d,%d)\\bord0\\shad0\\1c&H000000&\\1a%s\\blur%d\\fad(%d,%d)\\p1}%s{\\p0}"
            % (x, y, al, int(blur * (0.6 + 0.4 * sc)), fin, fout, d))


def line(t0, t1, x, y, w, color=GOLD, fout=400, delay=0.15, thick=3):
    t0 += delay
    dlg(2, t0, t1, "{\\an5\\pos(%d,%d)\\bord0\\shad0\\1c%s\\blur0.8\\fscx0\\t(0,700,0.5,\\fscx100)\\fad(0,%d)\\p1}"
        "m 0 0 l %d 0 l %d %d l 0 %d{\\p0}" % (x, y, color, fout, w, w, thick, thick))


def diamond(t0, t1, x, y, r=7, color=GOLD, delay=0.5):
    t0 += delay
    dlg(2, t0, t1, "{\\an5\\pos(%d,%d)\\bord0\\shad0\\1c%s\\blur0.6\\fad(300,400)\\p1}m 0 %d l %d 0 l 0 %d l %d 0{\\p0}"
        % (x, y, color, -r, r, r, -r))


def ornament(t0, t1, x, y, w, delay=0.15, fout=400):
    """Zloty ozdobnik: dwie linie z rombem posrodku."""
    gap = 22
    half = (w - 2 * gap) / 2
    line(t0, t1, x - gap - half / 2, y, half, fout=fout, delay=delay)
    line(t0, t1, x + gap + half / 2, y, half, fout=fout, delay=delay)
    diamond(t0, t1, x, y + 1, 8, delay=delay + 0.35)


def cmd_ass():
    EV.clear()
    cx = 960
    # --- INTRO
    plate(0.6, 4.7, cx, 540, 1250, 260)
    T(0.8, 4.6, cx, 520, "26–30 MAJA 2027 R.", "ZjCinzelBold", 112, GOLD, (4, 14), glow=GOLD, sweep=True)
    ornament(0.8, 4.6, cx, 625, 560)
    plate(5.4, 9.7, cx, 540, 1400, 220)
    T(5.6, 9.6, cx, 540, "WEEKEND BOŻEGO CIAŁA", "ZjMontSemi", 74, WHITE, (10, 22), glow=GOLD)
    plate(10.4, 14.7, cx, 540, 1500, 240)
    T(10.6, 14.75, cx, 540, "JUBILEUSZOWY", "ZjCinzelBold", 128, WHITE, (8, 34), glow=GOLD, fout=150)
    # --- TYTUL (BOOM 15.0)
    plate(15.0, 24.8, cx, 545, 1500, 760, "&H6A&", fin=200, blur=70)
    T(15.0, 24.7, cx, 290, "JUBILEUSZOWY", "ZjMontSemi", 56, CREAM, (24, 30), fin=300, fout=500)
    ornament(15.0, 24.7, cx, 345, 640, delay=0.1, fout=500)
    T(15.0, 24.7, cx, 560, "10.", "ZjCinzelBlack", 400, GOLD, (0, 6), anim="slam", glow=GOLD, sweep=True, fout=500)
    T(15.0, 24.7, cx, 815, "ZJAZD PRZYJACIÓŁ", "ZjCinzelBold", 124, WHITE, (4, 12), glow=GOLD, delay=0.45,
      fout=500)
    # --- MIEJSCE
    plate(25.2, 29.7, cx, 540, 1250, 250)
    T(25.3, 29.6, cx, 540, "GÓRNY ŚLĄSK", "ZjCinzelBold", 140, WHITE, (6, 18), glow=GOLD, fin=300)
    plate(30.2, 34.7, cx, 545, 1700, 300)
    T(30.3, 34.6, cx, 520, "GRAND MARINA RESORT", "ZjCinzelBlack", 132, GOLD, (2, 10), glow=GOLD, sweep=True)
    ornament(30.3, 34.6, cx, 625, 700)
    plate(35.2, 39.7, cx, 545, 1350, 380)
    T(35.3, 39.6, cx, 480, "MAZURY", "ZjCinzelBlack", 190, WHITE, (10, 24), glow=GOLD)
    T(35.3, 39.6, cx, 630, "NA GÓRNYM ŚLĄSKU", "ZjMontSemi", 64, GOLD, (14, 22), delay=0.35)
    plate(40.2, 44.7, cx, 545, 1200, 300)
    T(40.3, 44.6, cx, 535, "Poczuj ten klimat", "Great Vibes", 200, WHITE, (0, 4), glow=GOLD, fin=700)
    # --- ZACHOD SLONCA
    plate(45.5, 52.3, cx, 545, 1650, 330, fin=900)
    T(45.7, 52.2, cx, 470, "ZACHWYĆ SIĘ", "ZjMontSemi", 58, WHITE, (16, 26), fin=900)
    T(45.7, 52.2, cx, 590, "PRZEPIĘKNYM WIDOKIEM", "ZjCinzelBold", 112, GOLD, (2, 10), glow=GOLD, delay=0.5,
      fin=900)
    plate(52.6, 59.7, cx, 545, 1700, 330, fin=900)
    T(52.8, 59.6, cx, 480, "I ZACHODEM SŁOŃCA", "ZjCinzelBold", 112, WHITE, (2, 10), glow=GOLD, fin=900)
    T(52.8, 59.6, cx, 605, "NAD JEZIOREM DZIERŻNO MAŁE", "ZjMontSemi", 62, GOLD, (8, 16), delay=0.6, fin=900)
    # --- NOCLEGI
    plate(60.2, 69.7, cx, 560, 1100, 380, fin=300)
    T(60.3, 69.6, cx, 470, "DO WYBORU", "ZjMontSemi", 62, CREAM, (18, 26), fin=300)
    T(60.3, 69.6, cx, 615, "DOMKI", "ZjCinzelBlack", 210, GOLD, (8, 22), glow=GOLD, delay=0.25, sweep=True)
    plate(70.3, 74.7, cx, 950, 1500, 230, fin=300, blur=35)
    T(70.4, 74.6, cx, 912, "ALBO POKOJE", "ZjCinzelBlack", 118, WHITE, (4, 12), glow=GOLD, fin=400)
    T(70.4, 74.6, cx, 1012, "W RÓŻNYCH WARIANTACH", "ZjMontSemi", 54, GOLD, (10, 18), delay=0.35, fin=400)
    # --- KULMINACJA
    plate(75.0, 79.8, cx, 385, 1600, 400, "&H70&", fin=100)
    T(75.0, 79.75, cx, 290, "NIE MOŻE CIĘ", "ZjMontXBold", 104, WHITE, (2, 8), anim="pop", glow=GOLD)
    T(75.0, 79.75, cx, 455, "ZABRAKNĄĆ!!!", "ZjMontXBold", 190, GOLD, (2, 10), anim="slam", glow=GOLD,
      delay=0.3, sweep=True)
    plate(80.0, 84.8, cx, 545, 1700, 400, "&H70&", fin=100)
    T(80.0, 84.75, cx, 455, "POBIJMY", "ZjMontXBold", 104, WHITE, (6, 14), anim="pop", glow=GOLD)
    T(80.0, 84.75, cx, 610, "REKORD OBECNOŚCI", "ZjMontXBold", 140, GOLD, (2, 8), anim="slam", glow=GOLD,
      delay=0.3, sweep=True)
    plate(85.0, 89.8, cx, 545, 1500, 400, "&H70&", fin=100)
    T(85.0, 89.75, cx, 450, "JUŻ NIEBAWEM", "ZjMontXBold", 104, WHITE, (4, 12), anim="pop", glow=GOLD)
    T(85.0, 89.75, cx, 625, "ZAPISY", "ZjMontXBold", 210, GOLD, (8, 22), anim="slam", glow=GOLD, delay=0.3,
      sweep=True)
    plate(90.0, 94.8, cx, 545, 1600, 400, "&H70&", fin=100)
    T(90.0, 94.75, cx, 450, "NIE PRZEGAP", "ZjMontXBold", 104, WHITE, (4, 12), anim="pop", glow=GOLD)
    T(90.0, 94.75, cx, 620, "TEJ OKAZJI", "ZjMontXBold", 170, GOLD, (4, 14), anim="slam", glow=GOLD, delay=0.3,
      sweep=True)
    # --- PLANSZA KONCOWA
    e1 = 104.6
    plate(95.0, e1, cx, 540, 1760, 900, "&H58&", fin=300, blur=80)
    T(95.1, e1, cx, 175, "JUBILEUSZOWY", "ZjMontSemi", 50, CREAM, (22, 28), fin=400)
    T(95.1, e1, cx, 290, "10. ZJAZD PRZYJACIÓŁ", "ZjCinzelBlack", 128, GOLD, (2, 8), anim="slam", glow=GOLD,
      sweep=True, delay=0.15)
    ornament(95.1, e1, cx, 385, 820, delay=0.6)
    T(95.1, e1, cx, 465, "26–30 MAJA 2027 R.  •  WEEKEND BOŻEGO CIAŁA", "ZjMontSemi", 54, WHITE, (3, 6),
      delay=0.9)
    T(95.1, e1, cx, 595, "GRAND MARINA RESORT", "ZjCinzelBold", 104, GOLD, (3, 8), glow=GOLD, delay=1.4)
    T(95.1, e1, cx, 690, "JEZIORO DZIERŻNO MAŁE  •  GÓRNY ŚLĄSK", "ZjMontSemi", 46, WHITE, (6, 10), delay=1.8)
    T(95.1, e1, cx, 815, "DO WYBORU DOMKI ALBO POKOJE W RÓŻNYCH WARIANTACH", "ZjMontSemi", 46, GOLD_L, (2, 5),
      delay=2.4)
    T(95.1, e1, cx, 900, "JUŻ NIEBAWEM ZAPISY", "ZjMontXBold", 58, WHITE, (6, 12), delay=3.0)
    # --- FINAL (BOOM 105.0)
    plate(105.0, 111.0, cx, 540, 1700, 520, "&H5A&", fin=150, blur=70)
    T(105.0, 110.9, cx, 430, "NIE MOŻE WAS", "ZjMontXBold", 112, WHITE, (4, 12), anim="pop", glow=GOLD, fout=900)
    T(105.0, 110.9, cx, 625, "ZABRAKNĄĆ!", "ZjCinzelBlack", 220, GOLD, (2, 10), anim="slam", glow=GOLD,
      delay=0.2, sweep=True, fout=900)
    ornament(105.0, 110.9, cx, 760, 760, delay=0.6, fout=900)

    hdr = f"""[Script Info]
ScriptType: v4.00+
PlayResX: {W}
PlayResY: {H}
WrapStyle: 2
ScaledBorderAndShadow: yes
YCbCr Matrix: TV.709

[V4+ Styles]
Format: Name, Fontname, Fontsize, PrimaryColour, SecondaryColour, OutlineColour, BackColour, Bold, Italic, Underline, StrikeOut, ScaleX, ScaleY, Spacing, Angle, BorderStyle, Outline, Shadow, Alignment, MarginL, MarginR, MarginV, Encoding
Style: Base,ZjMontSemi,60,&H00FFFFFF,&H00FFFFFF,&H00000000,&H80000000,0,0,0,0,100,100,0,0,1,1,2,5,0,0,0,1

[Events]
Format: Layer, Start, End, Style, Name, MarginL, MarginR, MarginV, Effect, Text
"""
    with open(f"{S}/titles.ass", "w", encoding="utf-8") as f:
        f.write(hdr + "\n".join(EV) + "\n")
    print("napisy:", len(EV), "zdarzen")


# ------------------------------------------------------------------ SKLADANIE
def master_audio():
    src = f"{S}/music_v2.wav"
    out = f"{S}/music_master.wav"
    pre = "highpass=f=32:poles=2,equalizer=f=50:t=q:w=1.2:g=-2.5,equalizer=f=2800:t=q:w=1.0:g=1.5,highshelf=f=6500:g=2.5"
    r = subprocess.run(["ffmpeg", "-nostdin", "-hide_banner", "-y", "-i", src, "-af",
                        pre + ",loudnorm=I=-14:TP=-1.5:LRA=11:print_format=json", "-f", "null", "-"],
                       capture_output=True, text=True)
    js = r.stderr[r.stderr.rfind("{"):r.stderr.rfind("}") + 1]
    m = json.loads(js)
    ln = (f"loudnorm=I=-14:TP=-1.5:LRA=11:measured_I={m['input_i']}:measured_TP={m['input_tp']}:"
          f"measured_LRA={m['input_lra']}:measured_thresh={m['input_thresh']}:offset={m['target_offset']}:linear=true")
    run(["ffmpeg", "-nostdin", "-v", "error", "-y", "-i", src, "-af", pre + "," + ln + ",aresample=48000",
         "-ar", "48000", out])
    return out


def cmd_final(preview=False):
    ds = durations()
    audio = master_audio()
    inputs = []
    for i in range(len(TL)):
        inputs += ["-i", f"{SHOTS}/s{i:02d}.mp4"]
    inputs += ["-i", audio]
    fc = []
    for i in range(len(TL)):
        fc.append(f"[{i}:v]settb=1/{FPS},setpts=PTS-STARTPTS,tpad=stop_mode=clone:stop_duration=0.2,"
                  f"format=yuv420p[v{i}]")
    prev = "v0"
    for i in range(1, len(TL)):
        off = TL[i]["cut"] - TL[i]["d"] / 2
        fc.append(f"[{prev}][v{i}]xfade=transition={TL[i]['tr']}:duration={TL[i]['d']}:offset={off:.4f}[x{i}]")
        prev = f"x{i}"
    flash = "+".join(f"{a}*exp(-(t-{t})/0.22)*gte(t,{t})" for t, a in FLASHES)
    fc.append(f"[{prev}]vignette=angle=PI/5.6,noise=alls=2:allf=t,"
              f"eq=brightness='{flash}':eval=frame,"
              f"fade=t=in:st=0:d=1.2,"
              f"subtitles=filename={S}/titles.ass:fontsdir={FONTS},"
              f"fade=t=out:st=109.3:d=2.7,format=yuv420p[vout]")
    fc.append(f"[{len(TL)}:a]atrim=0:{TOTAL},afade=t=out:st=110.0:d=2.0[aout]")
    out = f"{OUTD}/zapowiedz_zjazd_2027.mp4"
    cmd = ["ffmpeg", "-nostdin", "-v", "error", "-y", *inputs, "-filter_complex", ";".join(fc),
           "-map", "[vout]", "-map", "[aout]",
           "-c:v", "libx264", "-preset", "slow", "-crf", "19", "-maxrate", "9M", "-bufsize", "18M",
           "-profile:v", "high", "-level", "4.1",
           "-pix_fmt", "yuv420p", "-r", str(FPS), "-g", "60", "-bf", "2",
           "-c:a", "aac", "-b:a", "256k", "-ar", "48000", "-movflags", "+faststart", "-t", str(TOTAL), out]
    run(cmd)
    print("film:", out)


if __name__ == "__main__":
    c = sys.argv[1]
    if c == "shots":
        only = set(int(x) for x in sys.argv[2:]) if len(sys.argv) > 2 else None
        cmd_shots(only)
    elif c == "ass":
        cmd_ass()
    elif c == "final":
        cmd_final()
    elif c == "durs":
        for i, (s, d) in enumerate(zip(TL, durations())):
            print(i, s["cut"], d, s.get("src", s["kind"]), s.get("a"), s.get("sp"),
                  round(d * s.get("sp", 1) + s.get("a", 0) + 0.25, 2) if s["kind"] == "v" else "")
