#!/usr/bin/env python3
"""Wersja 3 (ok. 3:20): wersja 2 + wstawka "Slask, jakiego nie znacie" przed zachodem slonca.

python3 build3.py shots [nr ...] -> ujecia wstawki (shots3/)
python3 build3.py ass            -> napisy (titles3.ass)
python3 build3.py final          -> film (out/zapowiedz_zjazd_2027_v3.mp4)
"""
import json
import math
import os
import re
import subprocess
import sys
from concurrent.futures import ThreadPoolExecutor

import build as b
import build2 as b2

S = b.S
SH3 = f"{S}/shots3"
SL = f"{S}/slask"
FPS, W, H = 30, 1920, 1080
T0 = 47.5          # poczatek wstawki
L = 92.5           # dlugosc wstawki (37 taktow)
TOTAL = b2.TOTAL + L
os.makedirs(SH3, exist_ok=True)

# zrodla wstawki: (plik, kl./s, profil)
b2.VSRC.update({k: (f"{SL}/{k}_clean.mp4", fps, prof) for k, fps, prof in [
    ("m05", 30, "scope"), ("m06", 24, "hd2"), ("m07", 24, "hd2"), ("m08", 24, "hd2"), ("m09", 24, "hd2"),
    ("m11", 30, "hd2"), ("m12", 30, "hd2"), ("m13", 30, "hd2"), ("m14", 30, "hd2"), ("m15", 30, "hd2"),
    ("m16", 30, "hd2"), ("m17", 30, "hd2")]})
_orig_scale = b2.scale_chain


def scale_chain(profile):
    if profile == "hd2":
        return ["hqdn3d=1:1:2:2", f"scale={W}:{H}:flags=lanczos", "cas=strength=0.4"]
    if profile == "scope":
        return ["hqdn3d=2:2:3:3", f"scale={W}:-2:flags=lanczos", "cas=strength=0.45",
                f"pad={W}:{H}:(ow-iw)/2:(oh-ih)/2:black"]
    return _orig_scale(profile)


b2.scale_chain = scale_chain

SOFT = "eq=contrast=1.03:saturation=1.05"
# Wstawka - czasy wzgledem T0. kind: v (pelny kadr), pair (dwa pionowe obok siebie)
SIL = [
    dict(cut=0.0, kind="v", src="m08", a=9.0, sp=1.0, g="photo", tr="fade", d=1.2),
    dict(cut=5.0, kind="v", src="m05", a=0.2, sp=1.0, g="photo", tr="fade", d=0.08),
    dict(cut=12.5, kind="pair", A=("m02", 0.0), B=("m03", 4.3), tr="fade", d=0.5),
    dict(cut=17.5, kind="pair", A=("m01", 0.0), B=("m01", 4.3), tr="fade", d=0.5),
    dict(cut=22.5, kind="pair", A=("m04", 0.0), B=("m10", 0.3), tr="fade", d=0.5),
    dict(cut=27.5, kind="pair", A=("m10", 5.8), B=("m10", 10.6), tr="fade", d=0.5),
    dict(cut=32.5, kind="v", src="m06", a=0.0, sp=0.93, g="photo", tr="fade", d=0.08),
    dict(cut=40.0, kind="v", src="m08", a=0.3, sp=1.0, g="photo", tr="fade", d=0.6),
    dict(cut=45.0, kind="v", src="m07", a=0.0, sp=1.0, g="photo", tr="fade", d=0.6),
    dict(cut=50.0, kind="v", src="m17", a=0.0, sp=1.0, g="photo", tr="fade", d=0.6, name="c00"),
    dict(cut=52.5, kind="v", src="m16", a=0.86, sp=0.7, g="photo", tr="fade", d=0.4, name="c01"),
    dict(cut=55.0, kind="v", src="m16", a=2.93, sp=0.68, g="photo", tr="fade", d=0.4, name="c02"),
    dict(cut=57.5, kind="v", src="m17", a=3.6, sp=0.6, g="photo", tr="fade", d=0.4, name="c03"),
    dict(cut=60.0, kind="v", src="m09", a=0.0, sp=1.0, g="photo", tr="fade", d=0.6, name="w09"),
    dict(cut=67.5, kind="v", src="m11", a=0.0, sp=1.0, g="photo", tr="fade", d=0.08, name="w10"),
    dict(cut=70.0, kind="v", src="m13", a=0.2, sp=1.0, g="photo", tr="fade", d=0.08, name="w11"),
    dict(cut=72.5, kind="v", src="m14", a=0.0, sp=0.86, g="photo", tr="fade", d=0.08, name="w12"),
    dict(cut=75.0, kind="v", src="m12", a=0.4, sp=1.0, g="photo", tr="fade", d=0.08, name="w13"),
    dict(cut=77.5, kind="v", src="m15", a=6.0, sp=1.0, g="photo", tr="fade", d=0.08, name="w14"),
    dict(cut=87.5, kind="v", src="m07", a=4.0, sp=1.0, g="photo", tr="fade", d=0.6, name="w15"),
]
CREDITS = {"m01": "fragment: YouTube", "m02": "materiał: Kopalnia Guido • podziemnaprzygoda.pl",
           "m03": "materiał: Kopalnia Guido • podziemnaprzygoda.pl", "m04": "fragment: Facebook",
           "m05": "fragment: Busem przez Świat • YouTube", "m06": "fragment: @freeasabird360 • YouTube",
           "m07": "fragment: @freeasabird360 • YouTube", "m08": "fragment: @freeasabird360 • YouTube",
           "m09": "fragment: @freeasabird360 • YouTube", "m10": "fragment: Miasta Gwarków • Facebook",
           "m11": "fragment: @BawtasieTV • YouTube", "m12": "fragment: @BawtasieTV • YouTube",
           "m13": "fragment: @BawtasieTV • YouTube", "m14": "fragment: @BawtasieTV • YouTube",
           "m15": "fragment: @BawtasieTV • YouTube", "m16": "fragment: From The Sky",
           "m17": "fragment: From The Sky"}


def timeline():
    """Pelna os czasu: v2 do T0, wstawka, reszta v2 przesunieta o L. Zwraca (wpis, plik ujecia)."""
    out = []
    for i, s in enumerate(b2.TL):
        if s["cut"] < T0:
            out.append((dict(s), f"{b2.SH}/s{i:02d}.mp4"))
    for j, s in enumerate(SIL):
        e = dict(s)
        e["cut"] = T0 + s["cut"]
        out.append((e, f"{SH3}/{s.get('name', f'w{j:02d}')}.mp4"))
    for i, s in enumerate(b2.TL):
        if s["cut"] >= T0:
            e = dict(s)
            e["cut"] = s["cut"] + L
            out.append((e, f"{b2.SH}/s{i:02d}.mp4"))
    return out


def durations(tl):
    ds = []
    for i, (s, _) in enumerate(tl):
        nxt = tl[i + 1][0]["cut"] if i + 1 < len(tl) else TOTAL
        dn = tl[i + 1][0]["d"] if i + 1 < len(tl) else 0.0
        ds.append(round(nxt - s["cut"] + s["d"] / 2 + dn / 2, 4))
    return ds


def probe_size(path):
    r = subprocess.run(["ffprobe", "-v", "error", "-select_streams", "v", "-show_entries", "stream=width,height",
                        "-of", "csv=p=0", path], capture_output=True, text=True)
    w, h = r.stdout.strip().split(",")[:2]
    return int(w), int(h)


PH, TOP, GAP = 820, 40, 70


def pair_geometry(s):
    wa = [2 * round(PH * probe_size(f"{SL}/{k}_clean.mp4")[0] / probe_size(f"{SL}/{k}_clean.mp4")[1] / 2)
          for k in (s["A"][0], s["B"][0])]
    tot = wa[0] + wa[1] + 16 + GAP
    xa = (W - tot) // 2
    xb = xa + wa[0] + 8 + GAP
    return wa, xa, xb


def render_pair(out, s, dur):
    (ka, aa), (kb, ab) = s["A"], s["B"]
    wa, xa, xb = pair_geometry(s)
    fc = (f"[0:v]fps={FPS},split[a][g];"
          f"[g]scale={W}:{H}:force_original_aspect_ratio=increase,crop={W}:{H},gblur=sigma=42,"
          f"eq=brightness=-0.2:saturation=1.15[bg];"
          f"[a]scale={wa[0]}:{PH}:flags=lanczos,cas=strength=0.35,pad=iw+8:ih+8:4:4:color=0xE9C46A[pa];"
          f"[1:v]fps={FPS},scale={wa[1]}:{PH}:flags=lanczos,cas=strength=0.35,pad=iw+8:ih+8:4:4:color=0xE9C46A[pb];"
          f"[bg][pa]overlay=x={xa}:y={TOP}[t];[t][pb]overlay=x={xb}:y={TOP},{SOFT},"
          f"tpad=stop_mode=clone:stop_duration=3,trim=duration={dur + 0.1:.4f},setpts=PTS-STARTPTS[v]")
    b.run(["ffmpeg", "-nostdin", "-v", "error", "-y",
           "-ss", f"{aa:.3f}", "-t", f"{dur + 0.5:.3f}", "-i", f"{SL}/{ka}_clean.mp4",
           "-ss", f"{ab:.3f}", "-t", f"{dur + 0.5:.3f}", "-i", f"{SL}/{kb}_clean.mp4",
           "-filter_complex", fc, "-map", "[v]", "-frames:v", str(b2.nframes(dur)), *b.enc_args(out)])
    return out


def cmd_shots(only=None):
    tl = timeline()
    ds = durations(tl)
    jobs = []
    with ThreadPoolExecutor(max_workers=4) as ex:
        for k, ((s, path), d) in enumerate(zip(tl, ds)):
            if not path.startswith(SH3):
                continue
            j = os.path.basename(path)[:-4]
            if only is not None and j not in only:
                continue
            if s["kind"] == "pair":
                jobs.append((j, ex.submit(render_pair, path, s, d)))
            else:
                def rv(path=path, s=s, d=d, k=k):
                    tmp = b2.render_video(100 + k, s, d)
                    os.replace(tmp, path)
                    return path
                jobs.append((j, ex.submit(rv)))
        for j, job in jobs:
            print("gotowe", job.result(), flush=True)


# ------------------------------------------------------------------ NAPISY
def shift_events(lines):
    out = []
    pat = re.compile(r"^(Dialogue: \d+,)(\d+):(\d\d):(\d\d\.\d\d),(\d+):(\d\d):(\d\d\.\d\d),(.*)$")
    for ln in lines:
        m = pat.match(ln)
        t0 = int(m.group(2)) * 3600 + int(m.group(3)) * 60 + float(m.group(4))
        t1 = int(m.group(5)) * 3600 + int(m.group(6)) * 60 + float(m.group(7))
        if t0 >= T0 - 0.1:
            t0 += L
            t1 += L
        out.append(f"{m.group(1)}{b.ts(t0)},{b.ts(t1)},{m.group(8)}")
    return out


def credit(t0, t1, text, x=1890, y=1052, an=3):
    b.dlg(4, t0, t1, "{\\an%d\\pos(%d,%d)\\fnZjMontSemi\\fs24\\1c&HFFFFFF&\\1a&H50&\\bord1\\3c&H000000&\\3a&H90&"
          "\\shad0\\fad(300,300)}%s" % (an, x, y, text))


def cmd_ass():
    b2.cmd_ass()
    base = shift_events(list(b.EV))
    b.EV.clear()
    T, plate, ornament = b.T, b.plate, b.ornament
    GOLD, WHITE, CREAM = b.GOLD, b.WHITE, b.CREAM
    cx = 960
    a = T0
    # tytul wstawki
    plate(a + 0.2, a + 4.8, cx, 540, 1700, 420, "&H70&", fin=200, blur=70)
    T(a + 0.2, a + 4.8, cx, 450, "ŚLĄSK,", "ZjCinzelBlack", 170, GOLD, (6, 16), anim="slam", glow=GOLD, sweep=True)
    T(a + 0.2, a + 4.8, cx, 620, "JAKIEGO NIE ZNACIE", "ZjCinzelBold", 104, WHITE, (4, 12), glow=GOLD, delay=0.45)
    ornament(a + 0.2, a + 4.8, cx, 720, 640, delay=0.8)
    # pod ziemie
    plate(a + 5.6, a + 11.8, cx, 880, 1300, 220, fin=800, blur=50)
    T(a + 5.8, a + 11.7, cx, 880, "ZEJDŹ POD ZIEMIĘ…", "ZjCinzelBold", 100, WHITE, (6, 14), glow=GOLD, fin=900)

    def pair_cap(t0, t1, title, sub):
        plate(t0, t1, cx, 975, 1500, 170, "&H60&", fin=400, blur=40)
        T(t0, t1, cx, 942, title, "ZjCinzelBold", 64, GOLD, (2, 6), glow=GOLD, fin=400, rise=14)
        T(t0, t1, cx, 1018, sub, "ZjMontSemi", 36, WHITE, (8, 12), delay=0.3, fin=400, rise=10)

    pair_cap(a + 12.8, a + 17.3, "ZABYTKOWA KOPALNIA WĘGLA GUIDO", "ZABRZE")
    pair_cap(a + 17.8, a + 22.3, "ZABYTKOWA KOPALNIA SREBRA", "TARNOWSKIE GÓRY  •  UNESCO")
    # para z dwoma miejscami - podpis pod kazdym panelem
    s4 = SIL[4]
    wa, xa, xb = pair_geometry(s4)
    for (x, t1, t2) in ((xa + 4 + wa[0] // 2, "NIKISZOWIEC", "KATOWICE"),
                        (xb + 4 + wa[1] // 2, "TARNOGÓRSKA KOLEJ WĄSKOTOROWA", "TARNOWSKIE GÓRY")):
        plate(a + 22.8, a + 27.3, x, 975, 900, 160, "&H60&", fin=400, blur=40)
        T(a + 22.8, a + 27.3, x, 945, t1, "ZjCinzelBold", 46 if len(t1) > 14 else 60, GOLD, (1, 4), glow=GOLD,
          fin=400, rise=14)
        T(a + 22.8, a + 27.3, x, 1015, t2, "ZjMontSemi", 34, WHITE, (6, 10), delay=0.3, fin=400, rise=10)
    pair_cap(a + 27.8, a + 32.3, "PAROWOZY WCIĄŻ NA SZLAKU", "TARNOWSKIE GÓRY")
    # zielen
    plate(a + 32.8, a + 39.8, cx, 230, 1600, 300)
    T(a + 32.9, a + 39.7, cx, 180, "…I ODETCHNIJ ZIELENIĄ", "ZjCinzelBold", 104, WHITE, (2, 10), glow=GOLD, fin=500)
    T(a + 32.9, a + 39.7, cx, 300, "PARK ŚLĄSKI  •  CHORZÓW", "ZjMontSemi", 58, GOLD, (10, 18), delay=0.4)
    plate(a + 50.3, a + 59.6, cx, 880, 1500, 280, blur=50)
    T(a + 50.4, a + 59.5, cx, 840, "REJS STATKIEM", "ZjCinzelBold", 96, WHITE, (2, 10), glow=GOLD, fin=600)
    T(a + 50.4, a + 59.5, cx, 945, "PO KANALE GLIWICKIM", "ZjMontSemi", 58, GOLD, (10, 18), delay=0.35, fin=600)
    plate(a + 60.3, a + 67.2, cx, 900, 1300, 260, blur=50)
    T(a + 60.4, a + 67.1, cx, 860, "PLANETARIUM ŚLĄSKIE", "ZjCinzelBold", 96, WHITE, (2, 10), glow=GOLD)
    T(a + 60.4, a + 67.1, cx, 960, "CHORZÓW", "ZjMontSemi", 52, GOLD, (12, 20), delay=0.35)
    # Legendia
    plate(a + 67.5, a + 72.3, cx, 545, 1600, 380, "&H70&", fin=100)
    T(a + 67.5, a + 72.25, cx, 480, "LEGENDIA", "ZjCinzelBlack", 170, GOLD, (6, 16), anim="slam", glow=GOLD,
      sweep=True)
    T(a + 67.5, a + 72.25, cx, 620, "ŚLĄSKIE WESOŁE MIASTECZKO  •  CHORZÓW", "ZjMontSemi", 52, WHITE, (4, 10),
      delay=0.3)
    plate(a + 77.7, a + 82.3, cx, 880, 1400, 220, "&H70&", fin=100, blur=50)
    T(a + 77.7, a + 82.25, cx, 880, "EMOCJE GWARANTOWANE!", "ZjMontXBold", 110, GOLD, (2, 8), anim="pop",
      glow=GOLD, sweep=True)
    # zamkniecie
    plate(a + 87.7, a + 92.4, cx, 545, 1700, 400, "&H68&", fin=200)
    T(a + 87.8, a + 92.35, cx, 470, "ŚLĄSK", "ZjCinzelBlack", 150, GOLD, (8, 20), anim="slam", glow=GOLD,
      sweep=True)
    ornament(a + 87.8, a + 92.35, cx, 565, 600, delay=0.4)
    T(a + 87.8, a + 92.35, cx, 650, "TU HISTORIA SPOTYKA PRZYGODĘ", "ZjCinzelBold", 76, WHITE, (3, 10),
      glow=GOLD, delay=0.6)
    # podpisy zrodel
    tl = timeline()
    ds = durations(tl)
    for (s, path), d in zip(tl, ds):
        if not path.startswith(SH3):
            continue
        keys = [s["A"][0], s["B"][0]] if s["kind"] == "pair" else [s["src"]]
        txt = "  |  ".join(dict.fromkeys(CREDITS[k] for k in keys))
        credit(s["cut"] + 0.3, s["cut"] + d - s["d"] - 0.2, txt,
               y=1066 if s["kind"] == "pair" else 1052)
    hdr = open(f"{S}/titles.ass", encoding="utf-8").read().split("[Events]")[0]
    with open(f"{S}/titles3.ass", "w", encoding="utf-8") as f:
        f.write(hdr + "[Events]\nFormat: Layer, Start, End, Style, Name, MarginL, MarginR, MarginV, Effect, Text\n"
                + "\n".join(base + b.EV) + "\n")
    print("napisy:", len(base) + len(b.EV))


FLASHES = [(t + (L if t >= T0 else 0), g) for t, g in b2.FLASHES] + [
    (T0, 0.55), (T0 + 32.5, 0.6), (T0 + 67.5, 0.6), (T0 + 77.5, 0.3), (T0 + 87.5, 0.5)]


def cmd_final():
    src = f"{S}/music3.wav"
    out_a = f"{S}/music3_master.wav"
    pre = ("highpass=f=32:poles=2,equalizer=f=50:t=q:w=1.2:g=-2.5,equalizer=f=2800:t=q:w=1.0:g=1.5,"
           "highshelf=f=6500:g=2.5")
    r = subprocess.run(["ffmpeg", "-nostdin", "-hide_banner", "-y", "-i", src, "-af",
                        pre + ",loudnorm=I=-14:TP=-1.5:LRA=11:print_format=json", "-f", "null", "-"],
                       capture_output=True, text=True)
    m = json.loads(r.stderr[r.stderr.rfind("{"):r.stderr.rfind("}") + 1])
    ln = (f"loudnorm=I=-14:TP=-1.5:LRA=11:measured_I={m['input_i']}:measured_TP={m['input_tp']}:"
          f"measured_LRA={m['input_lra']}:measured_thresh={m['input_thresh']}:offset={m['target_offset']}:linear=true")
    b.run(["ffmpeg", "-nostdin", "-v", "error", "-y", "-i", src, "-af", pre + "," + ln + ",aresample=48000",
           "-ar", "48000", out_a])
    tl = timeline()
    inputs = []
    for _, path in tl:
        inputs += ["-i", path]
    inputs += ["-i", out_a]
    fc = []
    n = len(tl)
    for i in range(n):
        pad = 4.0 if i == n - 1 else 0.3
        fc.append(f"[{i}:v]settb=1/{FPS},setpts=PTS-STARTPTS,tpad=stop_mode=clone:stop_duration={pad},"
                  f"format=yuv420p[v{i}]")
    prev = "v0"
    for i in range(1, n):
        s = tl[i][0]
        off = s["cut"] - s["d"] / 2
        fc.append(f"[{prev}][v{i}]xfade=transition={s['tr']}:duration={s['d']}:offset={off:.4f}[x{i}]")
        prev = f"x{i}"
    flash = "+".join(f"{g}*exp(-max(t-{t},0)/0.22)*gte(t,{t})" for t, g in FLASHES)
    fc.append(f"[{prev}]vignette=angle=PI/5.6,eq=brightness='{flash}':eval=frame,fade=t=in:st=0:d=1.8,"
              f"subtitles=filename={S}/titles3.ass:fontsdir={b.FONTS},"
              f"fade=t=out:st={TOTAL - 3.4}:d=2.8,format=yuv420p[vout]")
    fc.append(f"[{n}:a]atrim=0:{TOTAL},afade=t=out:st={TOTAL - 2.5}:d=2.5[aout]")
    out = f"{b.OUTD}/zapowiedz_zjazd_2027_v3.mp4"
    b.run(["ffmpeg", "-nostdin", "-v", "error", "-y", *inputs, "-filter_complex", ";".join(fc),
           "-map", "[vout]", "-map", "[aout]",
           "-c:v", "libx264", "-preset", "slow", "-crf", "17", "-maxrate", "14M", "-bufsize", "28M",
           "-profile:v", "high", "-level", "4.1", "-pix_fmt", "yuv420p", "-r", str(FPS), "-g", "60",
           "-c:a", "aac", "-b:a", "256k", "-ar", "48000", "-movflags", "+faststart", "-t", str(TOTAL), out])
    print("film:", out)


if __name__ == "__main__":
    c = sys.argv[1]
    if c == "shots":
        cmd_shots(set(sys.argv[2:]) if len(sys.argv) > 2 else None)
    elif c == "ass":
        cmd_ass()
    elif c == "final":
        cmd_final()
    elif c == "durs":
        tl = timeline()
        for (s, p), d in zip(tl, durations(tl)):
            print(f"{s['cut']:7.2f} {d:6.2f} {s['kind']:6s} {os.path.basename(p)} "
                  f"{s.get('src', s.get('A', ''))} {s.get('a', '')}")
