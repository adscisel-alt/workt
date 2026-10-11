#!/usr/bin/env python3
"""Wersja 2 zapowiedzi: oryginalne nagrania, ujecia z drona, zdjecia 4000 px, kolaze.

python3 build2.py shots [nr ...]  -> ujecia (shots2/sNN.mp4)
python3 build2.py ass             -> napisy (titles2.ass)
python3 build2.py final           -> film (out/zapowiedz_zjazd_2027_v2.mp4)
"""
import math
import os
import subprocess
import sys
from concurrent.futures import ThreadPoolExecutor

from PIL import Image, ImageDraw, ImageEnhance, ImageFilter

import build as b  # napisy (ASS), gradacje, kodowanie

S = b.S
SH = f"{S}/shots2"
OUTD = b.OUTD
FONTS = b.FONTS
W, H, FPS = 1920, 1080, 30
TOTAL = 119.0
os.makedirs(SH, exist_ok=True)

P = f"{S}/src2"
O = f"{S}/orig"
WA = f"{S}/src"            # filmy z WhatsAppa (848x478) - tylko zachod slonca
GRADE_PHOTO = ("eq=contrast=1.04:saturation=1.06:gamma=0.99,"
               "colorbalance=rh=0.02:bh=-0.02,curves=all='0/0.01 0.5/0.5 1/0.99'")
GRADE_DRONE = "eq=contrast=1.06:saturation=1.12:gamma=0.98,colorbalance=rh=0.03:bh=-0.02"

# zrodla wideo: (plik, kl./s, profil skalowania)
VSRC = {"drone": (f"{O}/drone25.mp4", 25, "hd"), "a1": (f"{O}/a1.mp4", 30, "720"),
        "a2": (f"{O}/a2.mp4", 30, "720"), "a3": (f"{O}/a3.mp4", 30, "720"),
        "v2": (f"{WA}/v2.mp4", 30, "wa"), "sala": (f"{O}/b1_sala.mp4", 30, "sq")}

# ------------------------------------------------------------------ OS CZASU (takt = 2,5 s)
# kb = ((fx, fy, fw), (fx, fy, fw)) - okno 16:9 jako ulamek szerokosci/wysokosci zdjecia
TL = [
    dict(cut=0.0, kind="photo", img=f"{P}/drone_frame0.png", d=0.0, tr="fade", g="drone",
         kb=((0, 0, 1.0), (0.035, 0.035, 0.93))),
    dict(cut=7.5, kind="v", src="drone", a=0.0, sp=0.906, stab=False, g="drone", tr="fade", d=1.0),
    dict(cut=22.5, kind="photo", img=f"{P}/07_balkon_widok.jpg", tr="fade", d=0.08,
         kb=((0, 0.10, 1.0), (0.05, 0.12, 0.88))),
    dict(cut=27.5, kind="v", src="a2", a=1.0, sp=1.0, stab=True, g="day", tr="smoothleft", d=0.6),
    dict(cut=32.5, kind="photo", img=f"{P}/29_marina_motorowka.jpg", tr="smoothright", d=0.6,
         kb=((0, 0.30, 1.0), (0.06, 0.33, 0.88))),
    dict(cut=37.5, kind="square", src="sala", a=0.0, tr="fade", d=0.6),
    dict(cut=42.5, kind="cards", tr="fade", d=0.3, card=(560, 560), cy=500,
         imgs=[(f"{P}/09_rowerki_kajaki.jpg", 0.5), (f"{P}/10_sauna.jpg", 0.5), (f"{P}/14_plac_zabaw.jpg", 0.5)]),
    dict(cut=45.0, kind="cards", tr="slideleft", d=0.4, card=(560, 560), cy=500,
         imgs=[(f"{P}/11_ogrodek_parasole.jpg", 0.5), (f"{P}/18_rowerki.jpg", 0.5),
               (f"{P}/01_jezioro_labedzie.jpg", 0.5)]),
    dict(cut=47.5, kind="v", src="v2", a=21.0, sp=1.0, stab=True, g="dusk", tr="fade", d=1.2),
    dict(cut=52.5, kind="photo", img=f"{P}/25_domki_zachod.jpg", tr="fade", d=1.2, g="dusk",
         kb=((0.0, 0.12, 1.0), (0.08, 0.15, 0.86))),
    dict(cut=57.5, kind="v", src="v2", a=3.6, sp=1.0, stab=True, g="dusk", tr="fade", d=1.2),
    dict(cut=62.5, kind="photo", img=f"{P}/16_domki_slonce.jpg", tr="fade", d=0.08,
         kb=((0, 0.12, 1.0), (0.08, 0.14, 0.85))),
    dict(cut=65.0, kind="photo", img=f"{P}/21_domek_nr1.jpg", tr="smoothleft", d=0.5,
         kb=((0, 0.08, 1.0), (0.06, 0.10, 0.88))),
    dict(cut=67.5, kind="photo", img=f"{P}/24_domek_wierzba.jpg", tr="smoothleft", d=0.5,
         kb=((0.0, 0.06, 1.0), (0.07, 0.08, 0.86))),
    dict(cut=70.0, kind="cards", tr="fade", d=0.5, card=(520, 680), cy=455,
         imgs=[(f"{P}/26_pokoj_zolte_lozko.jpg", 0.52), (f"{P}/08_pokoj_2lozka.jpg", 0.47),
               (f"{P}/12_pokoj_balkon.jpg", 0.55)]),
    dict(cut=73.75, kind="cards", tr="slideleft", d=0.4, card=(520, 680), cy=455,
         imgs=[(f"{P}/20_aneks.jpg", 0.5), (f"{P}/19_lazienka.jpg", 0.5), (f"{P}/23_domek_sypialnia.jpg", 0.5)],
         bright=(1.0, 1.0, 1.35)),
    dict(cut=77.5, kind="photo", img=f"{P}/05_dron_resort.jpg", tr="fade", d=0.08,
         kb=((0, 0, 1.0), (0.08, 0.08, 0.84))),
    dict(cut=80.0, kind="v", src="a1", a=1.6, sp=1.0, stab=True, g="day", tr="fade", d=0.08),
    dict(cut=82.5, kind="square", src="sala", a=6.0, tr="fade", d=0.08),
    dict(cut=85.0, kind="photo", img=f"{P}/15_domki_pion.jpg", tr="fade", d=0.08,
         kb=((0, 0.30, 1.0), (0.05, 0.33, 0.90))),
    dict(cut=87.5, kind="v", src="a3", a=5.0, sp=1.0, stab=True, g="day", tr="fade", d=0.08),
    dict(cut=90.0, kind="photo", img=f"{P}/13_domki_lezaki_jezioro.jpg", tr="fade", d=0.08,
         kb=((0, 0.25, 1.0), (0.06, 0.28, 0.88))),
    dict(cut=92.5, kind="v", src="drone", a=4.3, sp=1.0, stab=False, g="drone", tr="fade", d=0.08),
    dict(cut=95.0, kind="photo", img=f"{P}/02_lodki.jpg", tr="fade", d=0.08,
         kb=((0, 0.22, 1.0), (0.05, 0.24, 0.90))),
    dict(cut=97.5, kind="v", src="v2", a=21.2, sp=1.0, stab=True, g="end", tr="fade", d=0.08),
    dict(cut=107.5, kind="v", src="drone", a=4.0, sp=0.5, stab=False, g="drone", tr="fade", d=0.08),
    dict(cut=112.5, kind="v", src="drone", a=12.75, sp=0.4, stab=False, g="drone", tr="fade", d=0.8,
         maxsrc=14.4),
]
FLASHES = [(2.5, 0.75), (22.5, 0.32), (62.5, 0.35), (77.5, 0.75), (82.5, 0.22), (87.5, 0.28),
           (92.5, 0.22), (97.5, 0.8), (107.5, 0.55)]


def durations():
    out = []
    for i, s in enumerate(TL):
        nxt = TL[i + 1]["cut"] if i + 1 < len(TL) else TOTAL
        dn = TL[i + 1]["d"] if i + 1 < len(TL) else 0.0
        out.append(round(nxt - s["cut"] + s["d"] / 2 + dn / 2, 4))
    return out


def nframes(dur):
    return math.ceil(dur * FPS) + 1


def grade(g):
    return {"dusk": b.GRADE_DUSK, "day": b.GRADE_DAY, "drone": GRADE_DRONE, "photo": GRADE_PHOTO,
            "end": b.GRADE_DUSK + ",gblur=sigma=3.5,eq=brightness=-0.06:saturation=1.1"}[g]


def scale_chain(profile):
    if profile == "wa":     # 848x478, mocno skompresowane
        return ["hqdn3d=3:3:5:5", f"scale={W}:{H + 2}:flags=lanczos", f"crop={W}:{H}", "cas=strength=0.55"]
    if profile == "720":
        return ["hqdn3d=1.2:1.2:2:2", f"scale={W}:{H}:flags=lanczos", "cas=strength=0.45"]
    return ["cas=strength=0.25"]


# ------------------------------------------------------------------ WIDEO
def render_video(i, s, dur):
    out = f"{SH}/s{i:02d}.mp4"
    path, sfps, prof = VSRC[s["src"]]
    sp = s["sp"]
    srcdur = dur * sp + 0.3
    if s.get("maxsrc"):
        srcdur = min(srcdur, s["maxsrc"] - s["a"])
    inp = ["-ss", f"{s['a']:.3f}", "-t", f"{srcdur:.3f}", "-i", path]
    chain = []
    if s.get("stab"):
        trf = f"{SH}/s{i:02d}.trf"
        b.run(["ffmpeg", "-nostdin", "-v", "error", "-y", *inp, "-vf",
               f"vidstabdetect=shakiness=5:accuracy=15:result={trf}", "-f", "null", "-"])
        chain.append(f"vidstabtransform=input={trf}:smoothing=15:zoom=2:optzoom=0:interpol=bicubic")
    if sp < 0.999 or sfps != FPS:
        chain.append(f"minterpolate=fps={FPS / sp:.4f}:mi_mode=mci:mc_mode=aobmc:me_mode=bidir:vsbmc=1")
        if sp < 0.999:
            chain.append(f"setpts=PTS/{sp}")
    chain += [f"fps={FPS}"] + scale_chain(prof) + [grade(s["g"]),
                                                    f"tpad=stop_mode=clone:stop_duration=4",
                                                    f"trim=duration={dur + 0.1:.4f},setpts=PTS-STARTPTS"]
    b.run(["ffmpeg", "-nostdin", "-v", "error", "-y", *inp, "-vf", ",".join(chain),
           "-frames:v", str(nframes(dur)), *b.enc_args(out)])
    return out


def render_square(i, s, dur):
    """Kwadratowe nagranie (sala) na rozmytym tle z niego samego."""
    out = f"{SH}/s{i:02d}.mp4"
    path = VSRC[s["src"]][0]
    fc = (f"[0:v]fps={FPS},split[a][c];"
          f"[a]scale={W}:{W},crop={W}:{H},gblur=sigma=38,eq=brightness=-0.16:saturation=1.15[bg];"
          f"[c]scale=1000:1000:flags=lanczos,cas=strength=0.3,pad=1008:1008:4:4:color=0xE9C46A[fg];"
          f"[bg][fg]overlay=(W-w)/2:(H-h)/2,{b.GRADE_DAY},tpad=stop_mode=clone:stop_duration=2,"
          f"trim=duration={dur + 0.1:.4f},setpts=PTS-STARTPTS[v]")
    b.run(["ffmpeg", "-nostdin", "-v", "error", "-y", "-ss", f"{s['a']:.3f}", "-t", f"{dur + 0.3:.3f}", "-i", path,
           "-filter_complex", fc, "-map", "[v]", "-frames:v", str(nframes(dur)), *b.enc_args(out)])
    return out


# ------------------------------------------------------------------ ZDJECIA
def ease(u):
    return 0.5 - 0.5 * math.cos(math.pi * u)


def load_scaled(path, max_w):
    """Wczytuje zdjecie i zmniejsza je (Lanczos), zeby ruch kamery nie migotal."""
    img = Image.open(path).convert("RGB")
    if img.width > max_w:
        img = img.resize((max_w, round(img.height * max_w / img.width)), Image.LANCZOS)
    return img


def render_photo(i, s, dur):
    out = f"{SH}/s{i:02d}.mp4"
    (fx0, fy0, fw0), (fx1, fy1, fw1) = s["kb"]
    img0 = Image.open(s["img"])
    need = W * 1.2 / min(fw0, fw1)          # szerokosc zdjecia, przy ktorej okno ~ 1:1,2
    img = load_scaled(s["img"], int(max(need, W)))
    iw, ih = img.size
    n = nframes(dur)
    p = b.ffmpeg_sink(out, grade(s.get("g", "photo")) + ",cas=strength=0.2")
    for k in range(n):
        u = 0.15 * (k / max(1, n - 1)) + 0.85 * ease(k / max(1, n - 1))
        fx = fx0 + (fx1 - fx0) * u
        fy = fy0 + (fy1 - fy0) * u
        fw = fw0 + (fw1 - fw0) * u
        w = fw * iw
        h = w * H / W
        x, y = fx * iw, fy * ih
        y = min(y, ih - h)
        fr = img.transform((W, H), Image.AFFINE, (w / W, 0, x, 0, h / H, y), resample=Image.BICUBIC)
        p.stdin.write(fr.tobytes())
    p.stdin.close()
    p.wait()
    del img0
    return out


def render_cards(i, s, dur):
    """Kolaz: trzy karty ze zdjeciami (pokoje / atrakcje) na rozmytym tle."""
    out = f"{SH}/s{i:02d}.mp4"
    CW, CHh = s["card"]
    gold = (233, 196, 106)
    bright = s.get("bright", (1.0, 1.0, 1.0))
    srcs = []
    for (path, cxf), br in zip(s["imgs"], bright):
        im = load_scaled(path, 2400)
        if br != 1.0:
            im = ImageEnhance.Brightness(im).enhance(br)
        # wycinek o proporcjach karty, wysrodkowany w poziomie na cxf
        ar = CW / CHh
        if im.width / im.height > ar:
            ch_ = im.height
            cw_ = ch_ * ar
        else:
            cw_ = im.width
            ch_ = cw_ / ar
        x0 = min(max(0, cxf * im.width - cw_ / 2), im.width - cw_)
        y0 = (im.height - ch_) / 2
        srcs.append((im, x0, y0, cw_, ch_))
    bgim = srcs[1][0].resize((W, round(srcs[1][0].height * W / srcs[1][0].width)))
    if bgim.height < H:
        bgim = bgim.resize((round(bgim.width * H / bgim.height), H))
    bgim = ImageEnhance.Brightness(bgim.filter(ImageFilter.GaussianBlur(30))).enhance(0.4)
    shadow = Image.new("RGBA", (CW + 120, CHh + 120), (0, 0, 0, 0))
    ImageDraw.Draw(shadow).rectangle([60, 70, 60 + CW, 70 + CHh], fill=(0, 0, 0, 170))
    shadow = shadow.filter(ImageFilter.GaussianBlur(22))
    gap = (W - 3 * CW) // 4
    centers = [(gap + CW // 2 + j * (CW + gap), s["cy"]) for j in range(3)]
    n = nframes(dur)
    p = b.ffmpeg_sink(out, GRADE_PHOTO)
    for k in range(n):
        t = k / FPS
        z = 1.0 + 0.05 * (k / n)
        bw, bh = int(bgim.width * z), int(bgim.height * z)
        bg = bgim.resize((bw, bh), Image.BILINEAR).crop(((bw - W) // 2, (bh - H) // 2, (bw - W) // 2 + W,
                                                          (bh - H) // 2 + H)).convert("RGBA")
        for j, (cx, cy) in enumerate(centers):
            t0 = 0.12 + 0.18 * j
            u = min(1.0, max(0.0, (t - t0) / 0.6))
            if u <= 0:
                continue
            e = 1 - (1 - u) ** 3
            alpha = int(255 * min(1.0, u * 1.6))
            dy = int(80 * (1 - e))
            im, x0, y0, cw_, ch_ = srcs[j]
            zz = 1.0 + 0.07 * (t / dur)
            cw2, ch2 = cw_ / zz, ch_ / zz
            sx, sy = x0 + (cw_ - cw2) / 2, y0 + (ch_ - ch2) / 2
            card = im.transform((CW, CHh), Image.AFFINE, (cw2 / CW, 0, sx, 0, ch2 / CHh, sy),
                                resample=Image.BICUBIC).convert("RGBA")
            framed = Image.new("RGBA", (CW + 8, CHh + 8), gold + (255,))
            framed.paste(card, (4, 4))
            layer = Image.new("RGBA", (W, H), (0, 0, 0, 0))
            layer.alpha_composite(shadow, (cx - CW // 2 - 60, cy - CHh // 2 - 60 + dy))
            layer.alpha_composite(framed, (cx - CW // 2 - 4, cy - CHh // 2 - 4 + dy))
            if alpha < 255:
                layer.putalpha(layer.getchannel("A").point(lambda v, al=alpha: v * al // 255))
            bg.alpha_composite(layer)
        p.stdin.write(bg.convert("RGB").tobytes())
    p.stdin.close()
    p.wait()
    return out


def cmd_shots(only=None):
    ds = durations()
    with ThreadPoolExecutor(max_workers=4) as ex:
        jobs = []
        for i, (s, d) in enumerate(zip(TL, ds)):
            if only is not None and i not in only:
                continue
            fn = {"v": render_video, "photo": render_photo, "cards": render_cards, "square": render_square}[s["kind"]]
            jobs.append((i, ex.submit(fn, i, s, d)))
        for i, j in jobs:
            print("gotowe", j.result(), flush=True)


# ------------------------------------------------------------------ NAPISY
def cmd_ass():
    T, plate, ornament = b.T, b.plate, b.ornament
    GOLD, GOLD_L, WHITE, CREAM = b.GOLD, b.GOLD_L, b.WHITE, b.CREAM
    b.EV.clear()
    cx = 960
    # --- PLANSZA OTWIERAJACA (uderzenie 2,5 s)
    plate(0.6, 7.3, cx, 545, 1500, 760, "&H6A&", fin=900, blur=70, fout=700)
    T(0.9, 7.2, cx, 290, "JUBILEUSZ", "ZjMontSemi", 60, CREAM, (16, 30), fin=900, fout=600)
    ornament(0.9, 7.2, cx, 350, 600, delay=0.5, fout=600)
    T(2.5, 7.2, cx, 565, "10.", "ZjCinzelBlack", 400, GOLD, (0, 6), anim="slam", glow=GOLD, sweep=True, fout=600)
    T(2.5, 7.2, cx, 820, "ZJAZD PRZYJACIÓŁ", "ZjCinzelBold", 124, WHITE, (4, 12), glow=GOLD, delay=0.35, fout=600)
    # --- DATA na ujeciu z motorowka (dron)
    plate(11.6, 15.7, cx, 560, 1400, 380)
    T(11.7, 15.6, cx, 500, "26–30 MAJA 2027 R.", "ZjCinzelBold", 112, GOLD, (4, 14), glow=GOLD, sweep=True)
    ornament(11.7, 15.6, cx, 600, 560)
    T(11.7, 15.6, cx, 680, "WEEKEND BOŻEGO CIAŁA", "ZjMontSemi", 66, WHITE, (10, 20), delay=0.4)
    # --- MIEJSCE
    plate(22.7, 27.2, cx, 540, 1250, 250)
    T(22.8, 27.1, cx, 540, "GÓRNY ŚLĄSK", "ZjCinzelBold", 140, WHITE, (6, 18), glow=GOLD, fin=300)
    plate(27.7, 32.2, cx, 545, 1700, 300)
    T(27.8, 32.1, cx, 520, "GRAND MARINA RESORT", "ZjCinzelBlack", 132, GOLD, (2, 10), glow=GOLD, sweep=True)
    ornament(27.8, 32.1, cx, 625, 700)
    plate(32.7, 37.2, cx, 545, 1350, 380)
    T(32.8, 37.1, cx, 480, "MAZURY", "ZjCinzelBlack", 190, WHITE, (10, 24), glow=GOLD)
    T(32.8, 37.1, cx, 630, "NA GÓRNYM ŚLĄSKU", "ZjMontSemi", 64, GOLD, (14, 22), delay=0.35)
    plate(37.7, 42.2, cx, 190, 1200, 260)
    T(37.8, 42.1, cx, 185, "Poczuj ten klimat", "Great Vibes", 190, WHITE, (0, 4), glow=GOLD, fin=700)
    # --- ZACHOD SLONCA
    plate(47.8, 54.8, cx, 545, 1650, 330, fin=900)
    T(48.0, 54.7, cx, 470, "ZACHWYĆ SIĘ", "ZjMontSemi", 58, WHITE, (16, 26), fin=900)
    T(48.0, 54.7, cx, 590, "PRZEPIĘKNYM WIDOKIEM", "ZjCinzelBold", 112, GOLD, (2, 10), glow=GOLD, delay=0.5, fin=900)
    plate(55.1, 62.2, cx, 545, 1700, 330, fin=900)
    T(55.3, 62.1, cx, 480, "I ZACHODEM SŁOŃCA", "ZjCinzelBold", 112, WHITE, (2, 10), glow=GOLD, fin=900)
    T(55.3, 62.1, cx, 605, "NAD JEZIOREM DZIERŻNO MAŁE", "ZjMontSemi", 62, GOLD, (8, 16), delay=0.6, fin=900)
    # --- NOCLEGI
    plate(62.7, 69.8, cx, 560, 1100, 380, fin=300)
    T(62.8, 69.7, cx, 470, "DO WYBORU", "ZjMontSemi", 62, CREAM, (18, 26), fin=300)
    T(62.8, 69.7, cx, 615, "DOMKI", "ZjCinzelBlack", 210, GOLD, (8, 22), glow=GOLD, delay=0.25, sweep=True)
    plate(70.3, 77.3, cx, 950, 1500, 230, fin=300, blur=35)
    T(70.4, 77.2, cx, 912, "ALBO POKOJE", "ZjCinzelBlack", 118, WHITE, (4, 12), glow=GOLD, fin=400)
    T(70.4, 77.2, cx, 1012, "W RÓŻNYCH WARIANTACH", "ZjMontSemi", 54, GOLD, (10, 18), delay=0.35, fin=400)
    # --- KULMINACJA
    plate(77.5, 82.3, cx, 385, 1600, 400, "&H70&", fin=100)
    T(77.5, 82.25, cx, 290, "NIE MOŻE CIĘ", "ZjMontXBold", 104, WHITE, (2, 8), anim="pop", glow=GOLD)
    T(77.5, 82.25, cx, 455, "ZABRAKNĄĆ!!!", "ZjMontXBold", 190, GOLD, (2, 10), anim="slam", glow=GOLD,
      delay=0.3, sweep=True)
    plate(82.5, 87.3, cx, 545, 1700, 400, "&H70&", fin=100)
    T(82.5, 87.25, cx, 455, "POBIJMY", "ZjMontXBold", 104, WHITE, (6, 14), anim="pop", glow=GOLD)
    T(82.5, 87.25, cx, 610, "REKORD OBECNOŚCI", "ZjMontXBold", 140, GOLD, (2, 8), anim="slam", glow=GOLD,
      delay=0.3, sweep=True)
    plate(87.5, 92.3, cx, 545, 1500, 400, "&H70&", fin=100)
    T(87.5, 92.25, cx, 450, "JUŻ NIEBAWEM", "ZjMontXBold", 104, WHITE, (4, 12), anim="pop", glow=GOLD)
    T(87.5, 92.25, cx, 625, "ZAPISY", "ZjMontXBold", 210, GOLD, (8, 22), anim="slam", glow=GOLD, delay=0.3,
      sweep=True)
    plate(92.5, 97.3, cx, 545, 1600, 400, "&H70&", fin=100)
    T(92.5, 97.25, cx, 450, "NIE PRZEGAP", "ZjMontXBold", 104, WHITE, (4, 12), anim="pop", glow=GOLD)
    T(92.5, 97.25, cx, 620, "TEJ OKAZJI", "ZjMontXBold", 170, GOLD, (4, 14), anim="slam", glow=GOLD, delay=0.3,
      sweep=True)
    # --- PLANSZA KONCOWA
    e1 = 107.1
    plate(97.5, e1, cx, 540, 1760, 900, "&H58&", fin=300, blur=80)
    T(97.6, e1, cx, 175, "JUBILEUSZ", "ZjMontSemi", 50, CREAM, (22, 28), fin=400)
    T(97.6, e1, cx, 290, "10. ZJAZD PRZYJACIÓŁ", "ZjCinzelBlack", 128, GOLD, (2, 8), anim="slam", glow=GOLD,
      sweep=True, delay=0.15)
    ornament(97.6, e1, cx, 385, 820, delay=0.6)
    T(97.6, e1, cx, 465, "26–30 MAJA 2027 R.  •  WEEKEND BOŻEGO CIAŁA", "ZjMontSemi", 54, WHITE, (3, 6), delay=0.9)
    T(97.6, e1, cx, 595, "GRAND MARINA RESORT", "ZjCinzelBold", 104, GOLD, (3, 8), glow=GOLD, delay=1.4)
    T(97.6, e1, cx, 690, "JEZIORO DZIERŻNO MAŁE  •  GÓRNY ŚLĄSK", "ZjMontSemi", 46, WHITE, (6, 10), delay=1.8)
    T(97.6, e1, cx, 815, "DO WYBORU DOMKI ALBO POKOJE W RÓŻNYCH WARIANTACH", "ZjMontSemi", 46, GOLD_L, (2, 5),
      delay=2.4)
    T(97.6, e1, cx, 900, "JUŻ NIEBAWEM ZAPISY", "ZjMontXBold", 58, WHITE, (6, 12), delay=3.0)
    # --- FINAL (uderzenie 107,5 s)
    plate(107.5, 116.0, cx, 540, 1700, 520, "&H5A&", fin=150, blur=70, fout=1500)
    T(107.5, 115.9, cx, 430, "NIE MOŻE WAS", "ZjMontXBold", 112, WHITE, (4, 12), anim="pop", glow=GOLD, fout=1500)
    T(107.5, 115.9, cx, 625, "ZABRAKNĄĆ!", "ZjCinzelBlack", 220, GOLD, (2, 10), anim="slam", glow=GOLD,
      delay=0.2, sweep=True, fout=1500)
    ornament(107.5, 115.9, cx, 760, 760, delay=0.6, fout=1500)
    hdr = open(f"{S}/titles.ass", encoding="utf-8").read().split("[Events]")[0]
    with open(f"{S}/titles2.ass", "w", encoding="utf-8") as f:
        f.write(hdr + "[Events]\nFormat: Layer, Start, End, Style, Name, MarginL, MarginR, MarginV, Effect, Text\n"
                + "\n".join(b.EV) + "\n")
    print("napisy:", len(b.EV))


# ------------------------------------------------------------------ SKLADANIE
def master_audio():
    import json
    src = f"{S}/music2.wav"
    out = f"{S}/music2_master.wav"
    pre = ("highpass=f=32:poles=2,equalizer=f=50:t=q:w=1.2:g=-2.5,equalizer=f=2800:t=q:w=1.0:g=1.5,"
           "highshelf=f=6500:g=2.5")
    r = subprocess.run(["ffmpeg", "-nostdin", "-hide_banner", "-y", "-i", src, "-af",
                        pre + ",loudnorm=I=-14:TP=-1.5:LRA=11:print_format=json", "-f", "null", "-"],
                       capture_output=True, text=True)
    m = json.loads(r.stderr[r.stderr.rfind("{"):r.stderr.rfind("}") + 1])
    ln = (f"loudnorm=I=-14:TP=-1.5:LRA=11:measured_I={m['input_i']}:measured_TP={m['input_tp']}:"
          f"measured_LRA={m['input_lra']}:measured_thresh={m['input_thresh']}:offset={m['target_offset']}:linear=true")
    b.run(["ffmpeg", "-nostdin", "-v", "error", "-y", "-i", src, "-af", pre + "," + ln + ",aresample=48000",
           "-ar", "48000", out])
    return out


def cmd_final():
    audio = master_audio()
    inputs = []
    for i in range(len(TL)):
        inputs += ["-i", f"{SH}/s{i:02d}.mp4"]
    inputs += ["-i", audio]
    fc = []
    for i in range(len(TL)):
        pad = 4.0 if i == len(TL) - 1 else 0.3
        fc.append(f"[{i}:v]settb=1/{FPS},setpts=PTS-STARTPTS,tpad=stop_mode=clone:stop_duration={pad},"
                  f"format=yuv420p[v{i}]")
    prev = "v0"
    for i in range(1, len(TL)):
        off = TL[i]["cut"] - TL[i]["d"] / 2
        fc.append(f"[{prev}][v{i}]xfade=transition={TL[i]['tr']}:duration={TL[i]['d']}:offset={off:.4f}[x{i}]")
        prev = f"x{i}"
    flash = "+".join(f"{a}*exp(-max(t-{t},0)/0.22)*gte(t,{t})" for t, a in FLASHES)
    fc.append(f"[{prev}]vignette=angle=PI/5.6,eq=brightness='{flash}':eval=frame,fade=t=in:st=0:d=1.8,"
              f"subtitles=filename={S}/titles2.ass:fontsdir={FONTS},"
              f"fade=t=out:st=115.6:d=2.8,format=yuv420p[vout]")
    fc.append(f"[{len(TL)}:a]atrim=0:{TOTAL},afade=t=out:st={TOTAL - 2.5}:d=2.5[aout]")
    out = f"{OUTD}/zapowiedz_zjazd_2027_v2.mp4"
    b.run(["ffmpeg", "-nostdin", "-v", "error", "-y", *inputs, "-filter_complex", ";".join(fc),
           "-map", "[vout]", "-map", "[aout]",
           "-c:v", "libx264", "-preset", "slow", "-crf", "17", "-maxrate", "14M", "-bufsize", "28M",
           "-profile:v", "high", "-level", "4.1", "-pix_fmt", "yuv420p", "-r", str(FPS), "-g", "60",
           "-c:a", "aac", "-b:a", "256k", "-ar", "48000", "-movflags", "+faststart", "-t", str(TOTAL), out])
    print("film:", out)


if __name__ == "__main__":
    c = sys.argv[1]
    if c == "shots":
        cmd_shots(set(int(x) for x in sys.argv[2:]) if len(sys.argv) > 2 else None)
    elif c == "ass":
        cmd_ass()
    elif c == "final":
        cmd_final()
    elif c == "durs":
        for i, (s, d) in enumerate(zip(TL, durations())):
            extra = ""
            if s["kind"] == "v":
                extra = f"src {s['a']:.2f}-{s['a'] + d * s['sp']:.2f}"
            print(i, s["cut"], d, s["kind"], s.get("src", os.path.basename(s.get("img", ""))), extra)
