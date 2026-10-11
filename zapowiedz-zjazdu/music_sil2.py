#!/usr/bin/env python3
"""Oryginalny, podniosly podklad orkiestrowy do zapowiedzi zjazdu.

Tempo 96 BPM -> takt = 2.5 s. 44 takty + wybrzmienie = 112 s.
Sample: FluidR3_GM (licencja MIT) + syntetyczne uderzenia/efekty.
Uzycie: music.py <katalog_sampli> <wyjscie.wav>
"""
import os
import subprocess
import sys

import numpy as np
from scipy import signal

SR = 44100
SD, OUT = sys.argv[1], sys.argv[2]
BPM = 96.0
BEAT = 60.0 / BPM
BAR = 4 * BEAT
NBARS = 37
TOTAL = 97.5
N = int(TOTAL * SR)
rng = np.random.default_rng(11)


def bt(bar, beat=0.0):
    return bar * BAR + beat * BEAT


# ---------------------------------------------------------------- filtry
def _sos(kind, f, order=2):
    if isinstance(f, (list, tuple)):
        wn = [x / (SR / 2) for x in f]
    else:
        wn = f / (SR / 2)
    return signal.butter(order, wn, btype=kind, output="sos")


def lp(x, f, order=2):
    return signal.sosfilt(_sos("lowpass", f, order), x, axis=0)


def hp(x, f, order=2):
    return signal.sosfilt(_sos("highpass", f, order), x, axis=0)


def bp(x, f1, f2, order=2):
    return signal.sosfilt(_sos("bandpass", [f1, f2], order), x, axis=0)


# ---------------------------------------------------------------- sample
_cache = {}


def samp(inst, m):
    k = (inst, m)
    if k not in _cache:
        p = f"{SD}/{inst}/{m}.mp3"
        if not os.path.exists(p):
            raise FileNotFoundError(p)
        r = subprocess.run(["ffmpeg", "-v", "error", "-i", p, "-f", "f32le", "-ac", "2",
                            "-ar", str(SR), "-"], capture_output=True, check=True)
        _cache[k] = np.frombuffer(r.stdout, dtype=np.float32).reshape(-1, 2).astype(np.float64)
    return _cache[k]


REF = {"acoustic_grand_piano": 62, "string_ensemble_1": 62, "choir_aahs": 62, "brass_section": 62,
       "french_horn": 62, "timpani": 43, "taiko_drum": 48, "contrabass": 40, "orchestral_harp": 62,
       "glockenspiel": 86, "reverse_cymbal": 60}
IGAIN = {}
for _i, _m in REF.items():
    _x = samp(_i, _m)
    if _i in ("timpani", "taiko_drum", "glockenspiel", "orchestral_harp", "acoustic_grand_piano", "reverse_cymbal"):
        IGAIN[_i] = 0.5 / (np.abs(_x).max() + 1e-9)
    else:
        IGAIN[_i] = 0.1 / (np.sqrt(np.mean(_x[int(0.3 * SR):int(2.5 * SR)] ** 2)) + 1e-9)


def extend(x, L):
    """Przedluza sampel o trwalym brzmieniu przez petlowanie z przenikaniem."""
    if len(x) >= L:
        return x[:L].copy()
    X = int(0.3 * SR)
    B = int(2.95 * SR)
    out = np.zeros((L + len(x), 2))
    out[:B] = x[:B]
    pos = B
    while pos < L:
        a = int(rng.uniform(0.55, 0.9) * SR)
        b = int(rng.uniform(2.6, 2.95) * SR)
        seg = x[a:b].copy()
        start = pos - X
        fade = np.linspace(0, 1, X)
        out[start:start + X] *= np.sqrt(1 - fade)[:, None]
        seg[:X] *= np.sqrt(fade)[:, None]
        out[start:start + len(seg)] += seg
        pos = start + len(seg)
    return out[:L]


def pan_gains(p):
    a = (p + 1) * np.pi / 4
    return np.cos(a) * np.sqrt(2), np.sin(a) * np.sqrt(2)


def place(buf, x, t, gain=1.0, pan=0.0):
    i = int(round(t * SR))
    if i >= len(buf) or i + len(x) <= 0:
        return
    if i < 0:
        x = x[-i:]
        i = 0
    n = min(len(x), len(buf) - i)
    gl, gr = pan_gains(pan)
    if x.ndim == 1:
        buf[i:i + n, 0] += x[:n] * gain * gl
        buf[i:i + n, 1] += x[:n] * gain * gr
    else:
        buf[i:i + n, 0] += x[:n, 0] * gain * gl
        buf[i:i + n, 1] += x[:n, 1] * gain * gr


RANGE = {}


def note(buf, inst, m, t, dur, vel=1.0, pan=0.0, att=0.0, rel=0.3, lpf=None, sustain=True, human=True):
    if inst not in RANGE:
        ms = [int(f[:-4]) for f in os.listdir(f"{SD}/{inst}") if f.endswith(".mp3")]
        RANGE[inst] = (min(ms), max(ms))
    lo_, hi_ = RANGE[inst]
    while m > hi_:
        m -= 12
    while m < lo_:
        m += 12
    x = samp(inst, m)
    L = int((dur + rel) * SR)
    if sustain:
        y = extend(x, L)
    else:
        y = np.zeros((L, 2))
        n = min(L, len(x))
        y[:n] = x[:n]
    env = np.ones(len(y))
    if att > 0:
        na = min(int(att * SR), len(y))
        env[:na] = np.sin(np.linspace(0, np.pi / 2, na)) ** 2
    d = int(dur * SR)
    nr = len(y) - d
    if nr > 0:
        env[d:] *= np.cos(np.linspace(0, np.pi / 2, nr)) ** 1.5
    y *= env[:, None]
    if lpf:
        y = lp(y, lpf)
    if human:
        t += rng.normal(0, 0.006)
        vel *= rng.uniform(0.92, 1.05)
    place(buf, y, t, vel * IGAIN[inst], pan)


# ---------------------------------------------------------------- harmonia
CH = {
    "D": (38, [2, 6, 9]), "A/C#": (37, [9, 1, 4]), "Bm": (35, [11, 2, 6]), "G": (31, [7, 11, 2]),
    "Em7": (40, [4, 7, 11, 2]), "Asus4": (33, [9, 2, 4]), "A": (33, [9, 1, 4]),
    "D/F#": (42, [2, 6, 9]), "Em": (40, [4, 7, 11]),
}
PROG = ["Bm", "G",                                                # 0-1   tytul
        "Bm", "Bm", "G",                                          # 2-4   pod ziemie
        "Bm", "G", "D", "A", "Bm", "G", "Em", "A",                # 5-12  kopalnie / zabytki
        "D", "A/C#", "Bm", "G", "D", "A", "G",                    # 13-19 Park Slaski
        "A", "D", "A/C#", "Bm",                                   # 20-23 rejs Kanalem Gliwickim
        "G", "D", "Asus4|A",                                      # 24-26 Planetarium
        "D", "A", "Bm", "G", "D", "A", "G", "A",                  # 27-34 Legendia
        "G", "Asus4|A"]                                           # 35-36 zamkniecie
assert len(PROG) == NBARS


def segments(b0, b1):
    """(start, dur, chordname) dla taktow b0..b1-1 (z podzialem 'X|Y' na polowki)."""
    out = []
    for b in range(b0, b1):
        parts = PROG[b].split("|")
        d = 4 / len(parts)
        for k, c in enumerate(parts):
            out.append((bt(b, k * d), d * BEAT, c))
    # scal powtarzajace sie akordy
    merged = []
    for s in out:
        if merged and merged[-1][2] == s[2] and abs(merged[-1][0] + merged[-1][1] - s[0]) < 1e-6:
            merged[-1] = (merged[-1][0], merged[-1][1] + s[1], s[2])
        else:
            merged.append(s)
    return merged


def chord_at(b, beat=0.0):
    parts = PROG[b].split("|")
    return parts[min(int(beat // (4 / len(parts))), len(parts) - 1)]


def voicing(pcs, lo, hi):
    return [m for m in range(lo, hi + 1) if m % 12 in pcs]


# ---------------------------------------------------------------- szyny
def bus():
    return np.zeros((N, 2))


B = {k: bus() for k in ("strings", "choir", "brass", "piano", "perc", "drums", "fx", "bass", "pad")}


def pad_part(inst, b0, b1, lo, hi, vel, att=0.35, rel=0.6, lpf=None, busname=None, crescendo=None):
    busname = busname or {"string_ensemble_1": "strings", "choir_aahs": "choir", "brass_section": "brass"}[inst]
    for (t, d, c) in segments(b0, b1):
        ms = voicing(CH[c][1], lo, hi)
        for m in ms:
            p = 0.55 - 1.1 * (m - lo) / max(1, hi - lo)
            v = vel
            if crescendo:
                v = vel * np.interp(t, crescendo[0], crescendo[1])
            note(B[busname], inst, m, t, d + 0.05, v / np.sqrt(len(ms)), p, att=att, rel=rel, lpf=lpf)


def bass_part(b0, b1, vel, eighths=False, octave=True):
    for (t, d, c) in segments(b0, b1):
        r = CH[c][0]
        while r < 33:
            r += 12
        if eighths:
            n8 = int(round(d / (BEAT / 2)))
            for k in range(n8):
                acc = 1.0 if k % 2 == 0 else 0.7
                note(B["bass"], "contrabass", r, t + k * BEAT / 2, BEAT / 2 * 0.8, vel * acc, 0.1, rel=0.08)
                synth_bass(t + k * BEAT / 2, BEAT / 2 * 0.85, r, vel * acc * 0.9)
        else:
            note(B["bass"], "contrabass", r, t, d + 0.05, vel, 0.1, att=0.08, rel=0.5)
            if octave and r - 12 >= 28:
                note(B["bass"], "contrabass", r - 12, t, d + 0.05, vel * 0.6, 0.1, att=0.1, rel=0.5)
            synth_bass(t, d, r, vel)


def synth_bass(t, d, m, vel):
    f = 440 * 2 ** ((m - 69) / 12)
    n = int((d + 0.15) * SR)
    tt = np.arange(n) / SR
    x = np.sin(2 * np.pi * f * tt) + 0.25 * np.sin(4 * np.pi * f * tt)
    env = np.minimum(1, tt / 0.012) * np.where(tt < d, 1.0, np.exp(-(tt - d) / 0.05))
    x = np.tanh(1.5 * x * env) * 0.1 * vel
    place(B["bass"], x, t, 1.0, 0.0)


def piano_arps(b0, b1, vel, lo=57, hi=81, lpf=None, pattern=(0, 1, 2, 3, 2, 1, 2, 3)):
    for b in range(b0, b1):
        for k in range(8):
            beat = k * 0.5
            c = chord_at(b, beat)
            ms = voicing(CH[c][1], lo, hi)[:4]
            m = ms[pattern[k] % len(ms)]
            acc = 1.0 if k in (0, 4) else 0.8
            note(B["piano"], "acoustic_grand_piano", m, bt(b, beat), BEAT * 1.2, vel * acc,
                 0.25 - 0.5 * (m - lo) / (hi - lo), rel=0.6, lpf=lpf, sustain=False)
        r = CH[chord_at(b, 0)][0] + 12
        note(B["piano"], "acoustic_grand_piano", r, bt(b), BAR, vel * 0.9, 0.1, rel=0.8, lpf=lpf, sustain=False)


def ostinato(b0, b1, vel, lo=50, hi=64):
    patt = [0, 0, 2, 0, 1, 0, 2, 1]
    for b in range(b0, b1):
        for k in range(8):
            beat = k * 0.5
            c = chord_at(b, beat)
            ms = voicing(CH[c][1], lo, hi)
            m = ms[patt[k] % len(ms)]
            acc = 1.0 if k in (0, 3, 6) else 0.65
            note(B["strings"], "string_ensemble_1", m, bt(b, beat), BEAT * 0.32, vel * acc, 0.25, att=0.01, rel=0.09)
            note(B["strings"], "string_ensemble_1", m + 12, bt(b, beat), BEAT * 0.32, vel * acc * 0.6, -0.3, att=0.01, rel=0.09)


def melody(inst, bar0, mel, vel, transpose=0, pan=0.0, att=0.06, rel=0.35, busname=None, lpf=None, sustain=True):
    busname = busname or ("brass" if inst in ("brass_section", "french_horn") else "strings")
    for (bb, beat, dur, m) in mel:
        note(B[busname], inst, m + transpose, bt(bar0 + bb, beat), dur * BEAT, vel, pan, att=att, rel=rel, lpf=lpf,
             sustain=sustain)


TITLE_MEL = [(0, 0, 2, 74), (0, 2, 1, 69), (0, 3, 1, 66),
             (1, 0, 2, 69), (1, 2, 1.5, 76), (1, 3.5, 0.5, 73),
             (2, 0, 2, 74), (2, 2, 1, 73), (2, 3, 1, 71),
             (3, 0, 3, 71), (3, 3, 1, 69)]
GROOVE_MEL = [(0, 0, 1.5, 66), (0, 1.5, 0.5, 69), (0, 2, 2, 71),
              (1, 0, 1.5, 74), (1, 1.5, 0.5, 71), (1, 2, 2, 67),
              (2, 0, 1.5, 69), (2, 1.5, 0.5, 66), (2, 2, 2, 62),
              (3, 0, 3, 64), (3, 3, 1, 61)]
BREAK_MEL = [(0, 0, 1.5, 79), (0, 1.5, 0.5, 78), (0, 2, 2, 74),
             (1, 0, 1.5, 78), (1, 1.5, 0.5, 76), (1, 2, 2, 74),
             (2, 0, 1, 76), (2, 1, 1, 79), (2, 2, 2, 83),
             (3, 0, 3, 78), (3, 3, 1, 74),
             (4, 0, 1.5, 74), (4, 1.5, 0.5, 76), (4, 2, 2, 79),
             (5, 0, 2, 76), (5, 2, 2, 73)]
CLIMAX_MEL = [(0, 0, 1.5, 71), (0, 1.5, 0.5, 69), (0, 2, 1, 66), (0, 3, 1, 69),
              (1, 0, 2, 71), (1, 2, 1, 74), (1, 3, 1, 71),
              (2, 0, 3, 69), (2, 3, 1, 66),
              (3, 0, 2, 69), (3, 2, 2, 73),
              (4, 0, 1.5, 74), (4, 1.5, 0.5, 73), (4, 2, 1, 71), (4, 3, 1, 69),
              (5, 0, 2, 71), (5, 2, 1, 74), (5, 3, 1, 76),
              (6, 0, 3, 78), (6, 3, 0.5, 76), (6, 3.5, 0.5, 74),
              (7, 0, 4, 76)]
END_MEL = [(0, 0, 8, 74), (2, 0, 2, 71), (2, 2, 2, 74), (3, 0, 2, 73), (3, 2, 2, 76), (4, 0, 7, 74)]


# ---------------------------------------------------------------- perkusja i efekty (synteza)
def boom(t, g=1.0):
    n = int(3.0 * SR)
    tt = np.arange(n) / SR
    f = 42 + 90 * np.exp(-tt / 0.06)
    ph = 2 * np.pi * np.cumsum(f) / SR
    body = np.tanh(2.2 * np.sin(ph) * np.exp(-tt / 0.9)) / np.tanh(2.2)
    click = lp(rng.standard_normal(n) * np.exp(-tt / 0.01), 4000) * 0.6
    rumble = bp(rng.standard_normal(n), 45, 160, 2) * np.exp(-tt / 0.5) * 1.2
    x = body * 0.9 + click + rumble
    y = np.stack([x, x], 1)
    place(B["perc"], y, t, 0.55 * g)


def crash(t, g=1.0, length=4.5):
    n = int(length * SR)
    tt = np.arange(n) / SR
    out = np.zeros((n, 2))
    for ch in range(2):
        w = rng.standard_normal(n)
        x = hp(w, 3500, 2) * np.exp(-tt / 1.4)
        x += bp(w, 6000, 12000) * np.exp(-tt / 0.6) * 0.6
        ring = sum(np.sin(2 * np.pi * f * tt + rng.uniform(0, 6)) * np.exp(-tt / rng.uniform(0.6, 1.4))
                   for f in rng.uniform(3000, 9000, 14)) * 0.02
        out[:, ch] = (x + ring) * np.minimum(1, tt / 0.002)
    place(B["fx"], out, t, 0.11 * g)


def rev_swell(t_end, length=2.5, g=1.0):
    n = int(length * SR)
    tt = np.arange(n) / SR
    out = np.zeros((n, 2))
    for ch in range(2):
        w = rng.standard_normal(n)
        x = hp(w, 2500, 2) * np.exp(-tt / (length / 3.2))
        out[:, ch] = x[::-1]
    out *= np.linspace(0, 1, n)[:, None] ** 0.5
    place(B["fx"], out, t_end - length, 0.09 * g)
    # sampel odwrotnej czyneli (szczyt ok. 1.38 s)
    note(B["fx"], "reverse_cymbal", 60, t_end - 1.38, 1.38, 0.5 * g, 0.0, rel=0.02, sustain=False, human=False)


def riser(t0, t1, g=1.0):
    n = int((t1 - t0) * SR)
    u = np.arange(n) / n
    w = rng.standard_normal(n)
    f, tseg, Z = signal.stft(w, SR, nperseg=2048)
    tu = np.clip(tseg / (t1 - t0), 0, 1)
    fc = 250 * (40 ** tu)                       # 250 Hz -> 10 kHz
    lf = np.log2(np.maximum(f, 20))[:, None]
    mask = np.exp(-0.5 * ((lf - np.log2(fc)[None, :]) / 0.9) ** 2)
    _, y = signal.istft(Z * mask, SR, nperseg=2048)
    y = y[:n]
    y = y / (np.abs(y).max() + 1e-9)
    # tonalny skok w gore (pila, przefiltrowana)
    fr = 110 * 2 ** (3 * u)
    tone = np.zeros(n)
    for det in (-0.12, 0, 0.12):
        ph = np.cumsum(fr * 2 ** (det / 12)) / SR
        tone += 2 * (ph % 1) - 1
    tone = lp(tone, 2500) / 3
    x = (y * 0.9 + tone * 0.25) * u ** 2.2
    x[-int(0.02 * SR):] *= np.linspace(1, 0, int(0.02 * SR))
    st = np.stack([x, np.roll(x, 90)], 1)
    place(B["fx"], st, t0, 0.32 * g)


def downlifter(t, length=3.0, g=1.0):
    n = int(length * SR)
    u = np.arange(n) / n
    w = rng.standard_normal(n)
    f, tseg, Z = signal.stft(w, SR, nperseg=2048)
    tu = np.clip(tseg / length, 0, 1)
    fc = 8000 * (0.03 ** tu)
    lf = np.log2(np.maximum(f, 20))[:, None]
    mask = np.exp(-0.5 * ((lf - np.log2(fc)[None, :]) / 1.0) ** 2)
    _, y = signal.istft(Z * mask, SR, nperseg=2048)
    y = y[:n] / (np.abs(y[:n]).max() + 1e-9)
    x = y * (1 - u) ** 1.6
    place(B["fx"], np.stack([x, np.roll(x, 120)], 1), t, 0.2 * g)


HATS = []
for _k in range(4):
    _n = int(0.2 * SR)
    _tt = np.arange(_n) / SR
    HATS.append(hp(rng.standard_normal(_n), 7500, 4) * np.exp(-_tt / 0.03))
OHAT = hp(rng.standard_normal(int(0.6 * SR)), 6500, 4) * np.exp(-np.arange(int(0.6 * SR)) / SR / 0.18)


def hat(t, g=1.0, open_=False, pan=0.2):
    x = OHAT if open_ else HATS[rng.integers(0, 4)]
    place(B["drums"], x, t + rng.normal(0, 0.003), 0.06 * g * rng.uniform(0.85, 1.1), pan)


def snare(t, g=1.0):
    n = int(0.5 * SR)
    tt = np.arange(n) / SR
    w = rng.standard_normal(n)
    nz = bp(w, 1200, 8000) * np.exp(-tt / 0.13)
    body = np.sin(2 * np.pi * 185 * tt) * np.exp(-tt / 0.05) * 0.8
    clap = np.zeros(n)
    for d in (0.0, 0.011, 0.022):
        i = int(d * SR)
        clap[i:] += bp(w[:n - i], 900, 3000) * np.exp(-tt[:n - i] / 0.012)
    x = nz + body + clap * 0.7
    place(B["drums"], np.stack([x, x], 1), t, 0.25 * g, -0.05)


def taiko(t, m=41, g=1.0, pan=0.0):
    note(B["perc"], "taiko_drum", m, t, 2.0, g, pan, rel=0.05, sustain=False)
    # warstwa sub dla mocy
    n = int(0.6 * SR)
    tt = np.arange(n) / SR
    f = 45 + 60 * np.exp(-tt / 0.03)
    x = np.sin(2 * np.pi * np.cumsum(f) / SR) * np.exp(-tt / 0.18)
    place(B["perc"], x, t, 0.1 * g, pan)


def timpani_roll(t0, t1, g0=0.15, g1=1.0, m=38):
    k = 0
    step = BEAT / 8
    t = t0
    while t < t1 - 1e-6:
        u = (t - t0) / (t1 - t0)
        note(B["perc"], "timpani", m, t, 0.5, (g0 + (g1 - g0) * u ** 1.5) * (1.0 if k % 2 == 0 else 0.85),
             0.15, rel=0.2, sustain=False)
        t += step
        k += 1


def snare_roll(t0, t1, g0=0.1, g1=0.9):
    t = t0
    while t < t1 - 1e-6:
        u = (t - t0) / (t1 - t0)
        step = BEAT / 4 if u < 0.5 else BEAT / 8
        snare(t, (g0 + (g1 - g0) * u ** 1.3) * 0.7)
        t += step


# ================================================================ ARANZACJA: SLASK (33 takty, wstawka)
# 0-1 tytul | 2-4 pod ziemie | 5-12 kopalnie/zabytki (industrialnie) | 13-22 zielen
# 23-30 Legendia | 31-32 zamkniecie + narastanie do zachodu slonca


def clang(t, g=1.0, pan=0.0, f0=310.0):
    """Metaliczne uderzenie (kowadlo / szyna) - akcent "industrialny"."""
    n = int(1.6 * SR)
    tt = np.arange(n) / SR
    ratios = (1.0, 2.76, 5.40, 8.93, 13.34)
    x = sum(np.sin(2 * np.pi * f0 * r * tt + rng.uniform(0, 6)) * np.exp(-tt / (0.55 / (1 + 0.6 * k)))
            for k, r in enumerate(ratios)) / len(ratios)
    x += hp(rng.standard_normal(n), 3000, 2) * np.exp(-tt / 0.012) * 0.5
    x *= np.minimum(1, tt / 0.001)
    place(B["perc"], x, t + rng.normal(0, 0.003), 0.09 * g, pan)


def heartbeat(t, g=1.0):
    n = int(0.5 * SR)
    tt = np.arange(n) / SR
    f = 38 + 50 * np.exp(-tt / 0.04)
    x = np.sin(2 * np.pi * np.cumsum(f) / SR) * np.exp(-tt / 0.16)
    place(B["perc"], x, t, 0.32 * g)
    place(B["perc"], x * 0.7, t + 0.24, 0.32 * g)


DARK_MEL = [(0, 0, 2, 71), (0, 2, 1, 74), (0, 3, 1, 73), (1, 0, 3, 71), (1, 3, 1, 69)]
DARK_MEL2 = [(0, 0, 1.5, 66), (0, 1.5, 0.5, 69), (0, 2, 2, 71), (1, 0, 1.5, 74), (1, 1.5, 0.5, 73),
             (1, 2, 2, 71), (2, 0, 1.5, 69), (2, 1.5, 0.5, 66), (2, 2, 2, 64), (3, 0, 3, 66), (3, 3, 1, 69)]

# --- TYTUL "SLASK, JAKIEGO NIE ZNACIE" (takty 0-1)
boom(bt(0), 1.25)
crash(bt(0), 1.3, 6.0)
downlifter(bt(0), 4.0, 0.9)
taiko(bt(0), 41, 1.0)
taiko(bt(0, 2), 45, 0.6, 0.2)
taiko(bt(1), 41, 0.8)
taiko(bt(1, 2.5), 48, 0.5, -0.2)
pad_part("string_ensemble_1", 0, 2, 38, 74, 1.15, att=0.05, rel=1.2)
pad_part("choir_aahs", 0, 2, 59, 74, 0.9, att=0.2, rel=1.2, busname="choir")
pad_part("brass_section", 0, 2, 45, 62, 0.85, att=0.03, rel=0.8, busname="brass")
melody("french_horn", 0, DARK_MEL, 1.0, 0, -0.15, rel=0.9)
melody("string_ensemble_1", 0, DARK_MEL, 0.6, 12, 0.2, rel=0.9)
bass_part(0, 2, 1.0)

# --- POD ZIEMIE (takty 2-4): ciemno, tajemniczo
rev_swell(bt(2), 1.5, 0.6)
pad_part("string_ensemble_1", 2, 5, 38, 62, 0.7, att=1.0, rel=0.8, lpf=1600)
pad_part("choir_aahs", 3, 5, 57, 66, 0.35, att=1.5, rel=0.8, lpf=2200, busname="choir")
bass_part(2, 5, 0.45, octave=True)
for b in (2, 3, 4):
    heartbeat(bt(b), 0.9)
    heartbeat(bt(b, 2), 0.6)
    clang(bt(b, 1), 0.5, -0.4, 290)
    clang(bt(b, 3), 0.35, 0.4, 330)
for k, m in enumerate([47, 50, 54, 59]):
    note(B["piano"], "acoustic_grand_piano", m, bt(2) + k * 0.6, 3.0, 0.5, -0.2, rel=1.0, lpf=3000, sustain=False)
note(B["piano"], "acoustic_grand_piano", 71, bt(3, 2), 2.0, 0.45, 0.1, rel=1.0, sustain=False)
note(B["piano"], "acoustic_grand_piano", 74, bt(4), 2.0, 0.45, 0.1, rel=1.0, sustain=False)
timpani_roll(bt(4, 2), bt(5) - 0.1, 0.1, 0.8, 35)
riser(bt(4), bt(5) - 0.08, 0.7)

# --- KOPALNIE / ZABYTKI (takty 5-12): industrialny puls
boom(bt(5), 0.8)
for b in range(5, 13):
    for k in range(8):
        hat(bt(b, k * 0.5), 0.8 if k % 2 == 0 else 0.5)
    taiko(bt(b, 0), 41, 0.95)
    taiko(bt(b, 0.75), 41, 0.45)
    taiko(bt(b, 2), 45, 0.7)
    taiko(bt(b, 3.5), 48, 0.45)
    clang(bt(b, 1), 0.7, -0.35, 300)
    clang(bt(b, 3), 0.8, 0.35, 335)
    if b % 2 == 1:
        clang(bt(b, 2.5), 0.4, 0.0, 420)
    if b in (8, 12):
        for k in range(8):
            taiko(bt(b, 2 + k * 0.25), 48 + (k % 3) * 2, 0.35 + 0.08 * k, 0.3 - 0.08 * k)
ostinato(5, 13, 0.75, lo=45, hi=59)
pad_part("string_ensemble_1", 5, 13, 50, 69, 0.55, att=0.4, rel=0.5, lpf=3200)
pad_part("choir_aahs", 9, 13, 59, 71, 0.45, att=0.8, rel=0.5, busname="choir")
bass_part(5, 13, 0.9, eighths=True)
melody("french_horn", 5, DARK_MEL2, 0.95, 0, -0.15)
melody("french_horn", 9, DARK_MEL2, 1.0, 0, -0.15)
melody("string_ensemble_1", 9, DARK_MEL2, 0.55, 12, 0.25)
pad_part("brass_section", 11, 13, 45, 62, 0.7, att=0.4, rel=0.1, busname="brass",
         crescendo=([bt(11), bt(13)], [0.4, 1.2]))
snare_roll(bt(11, 2), bt(13) - 0.1, 0.1, 0.9)
riser(bt(11), bt(13) - 0.08, 1.0)
rev_swell(bt(13), 2.5, 1.0)

# --- ZIELEN: PARK SLASKI, ZOO, STAW (13-19), REJS KANALEM GLIWICKIM (20-23), PLANETARIUM (24-26)
boom(bt(13), 1.1)
crash(bt(13), 1.2, 5.0)
downlifter(bt(13), 3.5, 0.8)
for k, m in enumerate([62, 66, 69, 74, 78, 81, 86, 90]):
    note(B["piano"], "orchestral_harp", m, bt(13) + 0.1 + k * 0.06, 2.5, 0.45, 0.3 - 0.08 * k, sustain=False)
piano_arps(13, 27, 0.4, lo=62, hi=86)
pad_part("string_ensemble_1", 13, 27, 50, 76, 0.7, att=0.5, rel=0.6)
pad_part("choir_aahs", 16, 27, 62, 76, 0.45, att=1.0, rel=0.6, busname="choir")
bass_part(13, 27, 0.6)
for b in range(13, 27):
    for k in range(8):
        hat(bt(b, k * 0.5), 0.6 if k % 2 == 0 else 0.35)
    taiko(bt(b, 0), 41, 0.6)
    taiko(bt(b, 2), 45, 0.4)
melody("french_horn", 13, GROOVE_MEL, 0.9, 0, -0.15)
melody("string_ensemble_1", 17, GROOVE_MEL, 0.6, 12, 0.2)
# rejs: plynna melodia fortepianu i smyczkow
for k, m in enumerate([62, 66, 69, 74, 78, 81]):
    note(B["piano"], "orchestral_harp", m, bt(20) + 0.1 + k * 0.07, 2.0, 0.35, 0.3 - 0.1 * k, sustain=False)
melody("acoustic_grand_piano", 21, [x for x in BREAK_MEL if x[0] < 4], 1.0, 0, -0.1, att=0.0, rel=0.8,
       busname="piano", sustain=False)
melody("string_ensemble_1", 21, [x for x in BREAK_MEL if x[0] < 4], 0.45, -12, 0.3)
for b in (24, 25, 26):
    for k in range(4):
        m = voicing(CH[chord_at(b, k)][1], 81, 98)[k % 3]
        note(B["piano"], "glockenspiel", m, bt(b, k), 1.5, 0.22, 0.3 - 0.2 * (k % 2), sustain=False)
pad_part("choir_aahs", 24, 27, 69, 81, 0.35, att=1.2, rel=0.4, busname="choir")
riser(bt(26), bt(27) - 0.08, 0.9)
rev_swell(bt(27), 2.0, 0.9)
timpani_roll(bt(26, 2), bt(27) - 0.08, 0.15, 0.8, 38)

# --- LEGENDIA (takty 27-34): zabawa i adrenalina
boom(bt(27), 1.1)
crash(bt(27), 1.2)
for b in range(27, 35):
    for k in range(16):
        hat(bt(b, k * 0.25), 1.0 if k % 2 == 0 else 0.55)
    for k in range(8):
        taiko(bt(b, k * 0.5), 41 if k % 4 == 0 else (45 if k % 2 == 0 else 48), 0.95 if k % 4 == 0 else 0.5,
              (k % 3 - 1) * 0.2)
    snare(bt(b, 1), 0.6)
    snare(bt(b, 3), 0.65)
    for bb in (0, 1.5, 2.5):
        c = chord_at(b, bb)
        for m in voicing(CH[c][1], 50, 64):
            note(B["brass"], "brass_section", m, bt(b, bb), BEAT * 0.45, 0.45, -0.1, att=0.01, rel=0.15)
ostinato(27, 35, 0.75)
piano_arps(27, 35, 0.35, lo=62, hi=86)
pad_part("string_ensemble_1", 27, 35, 50, 76, 0.8, att=0.3, rel=0.3)
bass_part(27, 35, 0.95, eighths=True)
melody("brass_section", 27, GROOVE_MEL, 0.95, 12, -0.1)
melody("string_ensemble_1", 31, CLIMAX_MEL[:11], 0.7, 0, 0.25)
riser(bt(30), bt(31) - 0.08, 0.9)
crash(bt(31), 1.3)
boom(bt(31), 0.9)
downlifter(bt(31), 3.0, 0.9)
crash(bt(33), 1.0)
snare_roll(bt(34), bt(35) - 0.1, 0.15, 0.95)
riser(bt(33, 2), bt(35) - 0.08, 1.0)
rev_swell(bt(35), 2.5, 1.1)

# --- ZAMKNIECIE (takty 35-36) i narastanie do zachodu slonca
boom(bt(35), 1.2)
crash(bt(35), 1.4, 6.0)
taiko(bt(35), 41, 1.0)
pad_part("string_ensemble_1", 35, 37, 38, 81, 1.15, att=0.08, rel=2.0)
pad_part("choir_aahs", 35, 37, 60, 79, 0.95, att=0.3, rel=2.0, busname="choir")
pad_part("brass_section", 35, 37, 45, 62, 0.8, att=0.05, rel=1.5, busname="brass")
melody("brass_section", 35, TITLE_MEL[:6], 1.0, 0, -0.1, rel=1.5)
bass_part(35, 37, 0.9)
timpani_roll(bt(36, 2), bt(37) - 0.1, 0.15, 0.85, 38)
riser(bt(36), bt(37) - 0.08, 0.8)


# ================================================================ MIKS
def make_ir(rt_lo, rt_hi, length, pre):
    n = int(length * SR)
    tt = np.arange(n) / SR
    ir = np.zeros((n + int(pre * SR), 2))
    for ch in range(2):
        w = rng.standard_normal(n)
        x = lp(w, 1500) * np.exp(-6.9 * tt / rt_lo) + hp(w, 1500) * np.exp(-6.9 * tt / rt_hi) * 0.6
        x[:int(0.008 * SR)] *= np.linspace(0, 1, int(0.008 * SR))
        x = lp(x, 9000)
        ir[int(pre * SR):, ch] = x
    return ir / np.sqrt(np.sum(ir ** 2) / 2)


HALL = make_ir(3.2, 1.8, 4.0, 0.03)
ROOM = make_ir(1.1, 0.6, 1.5, 0.01)

# bus: (dry, hall_send, room_send)
MIX = {"strings": (0.9, 0.55, 0.0), "choir": (0.75, 0.7, 0.0), "brass": (0.85, 0.5, 0.0),
       "piano": (0.8, 0.45, 0.0), "perc": (0.95, 0.28, 0.25), "drums": (1.25, 0.12, 0.2),
       "fx": (0.8, 0.35, 0.0), "bass": (0.7, 0.05, 0.0), "pad": (0.6, 0.6, 0.0)}

if os.environ.get("STATS"):
    secs = [(0, 5), (5, 12.5), (12.5, 32.5), (32.5, 50), (50, 60), (60, 67.5), (67.5, 87.5), (87.5, 92.5)]
    for k in B:
        print(f"{k:8s}", " ".join(f"{20*np.log10(np.sqrt(np.mean(B[k][int(a*SR):int(b*SR)]**2))+1e-9):6.1f}" for a, b in secs))
dry = np.zeros((N, 2))
hall_in = np.zeros((N, 2))
room_in = np.zeros((N, 2))
for k, (d, h, r) in MIX.items():
    x = B[k]
    if k != "bass":
        x = hp(x, 40)
    dry += x * d
    hall_in += x * h
    room_in += x * r
hall_in = hp(lp(hall_in, 8000), 120)
wet = np.zeros((N, 2))
for ch in range(2):
    wet[:, ch] = signal.oaconvolve(hall_in[:, ch], HALL[:, ch])[:N] * 0.32
    wet[:, ch] += signal.oaconvolve(room_in[:, ch], ROOM[:, ch])[:N] * 0.25
mix = dry + wet

# "zassanie" ciszy przed glownymi uderzeniami
g = np.ones(N)
for t in (bt(13), bt(27), bt(35)):
    i0, i1 = int((t - 0.14) * SR), int((t - 0.005) * SR)
    g[i0:i1] = np.minimum(g[i0:i1], np.linspace(1, 0.12, i1 - i0) ** 0.5)
mix *= g[:, None]

# lagodna kompresja sklejajaca
mix /= np.abs(mix).max() + 1e-9
lvl = np.sqrt(signal.lfilter([1 - np.exp(-1 / (0.06 * SR))], [1, -np.exp(-1 / (0.06 * SR))],
                             np.mean(mix ** 2, axis=1)) + 1e-12)
thr = 10 ** (-16 / 20)
gain = np.where(lvl > thr, (lvl / thr) ** (1 / 2.5 - 1), 1.0)
mix *= gain[:, None]

# wyciszenie koncowe
fo0, fo1 = N - int(0.6 * SR), N
mix[fo0:fo1] *= np.linspace(1, 0, fo1 - fo0)[:, None] ** 1.5
fi = int(0.05 * SR)
mix[:fi] *= np.linspace(0, 1, fi)[:, None]

mix /= np.abs(mix).max() + 1e-9
mix *= 0.89
pcm = (np.clip(mix, -1, 1) * 32767).astype(np.int16)
import wave

with wave.open(OUT, "wb") as w:
    w.setnchannels(2)
    w.setsampwidth(2)
    w.setframerate(SR)
    w.writeframes(pcm.tobytes())
print("zapisano", OUT, f"{N / SR:.1f}s")
