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
NBARS = 44
TOTAL = 112.0
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
PROG = ["D", "A/C#", "Bm", "G", "Em7", "Asus4|A",                 # 0-5   intro + narastanie
        "D", "A/C#", "Bm", "G",                                   # 6-9   tytul
        "Bm", "G", "D", "A", "Bm", "G", "D", "A",                 # 10-17 groove (miejsce)
        "G", "D/F#", "Em", "Bm", "G", "Asus4|A",                  # 18-23 wyciszenie (zachod slonca)
        "D", "A/C#", "Bm", "G", "Em", "A",                        # 24-29 noclegi
        "Bm", "G", "D", "A", "Bm", "G", "D", "A",                 # 30-37 kulminacja
        "D", "D", "G", "A", "D", "D"]                             # 38-43 final
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


# ================================================================ ARANZACJA
# --- INTRO (takty 0-5, 0-15 s)
piano_arps(0, 6, 0.42, lo=57, hi=81, lpf=5000)
pad_part("string_ensemble_1", 0, 4, 50, 69, 0.55, att=1.2, rel=1.0, lpf=2200)
pad_part("choir_aahs", 2, 6, 62, 74, 0.35, att=1.5, rel=1.0, lpf=3000, busname="choir")
pad_part("string_ensemble_1", 4, 6, 45, 76, 1.0, att=0.6, rel=0.2, crescendo=([bt(4), bt(6)], [0.4, 1.4]))
bass_part(0, 4, 0.25, octave=False)
bass_part(4, 6, 0.5)
timpani_roll(bt(5), bt(6) - 0.12, 0.1, 0.9, 38)
riser(bt(4), bt(6) - 0.1, 1.0)
rev_swell(bt(6), 3.0)
for b in range(0, 6, 2):
    note(B["piano"], "glockenspiel", 86 if b % 4 == 0 else 81, bt(b), 2.0, 0.25, -0.4, sustain=False)

# --- TYTUL (takty 6-9, 15-25 s)
for b in (6, 7, 8, 9):
    boom(bt(b), 1.0 if b == 6 else 0.45)
    taiko(bt(b), 41, 1.0)
    taiko(bt(b, 2), 45, 0.6, 0.2)
    taiko(bt(b, 3.5), 48, 0.45, -0.2)
crash(bt(6), 1.2)
downlifter(bt(6), 3.5, 0.8)
pad_part("string_ensemble_1", 6, 10, 43, 79, 1.25, att=0.05, rel=0.5)
pad_part("choir_aahs", 6, 10, 60, 77, 0.9, att=0.15, rel=0.6, busname="choir")
pad_part("brass_section", 6, 10, 45, 62, 0.9, att=0.03, rel=0.4, busname="brass")
melody("french_horn", 6, TITLE_MEL, 1.0, 0, -0.15)
melody("string_ensemble_1", 6, TITLE_MEL, 0.7, 12, 0.2, busname="strings")
bass_part(6, 10, 1.0)
piano_arps(6, 10, 0.35, lo=62, hi=86)
rev_swell(bt(10), 2.0, 0.8)

# --- GROOVE / MIEJSCE (takty 10-17, 25-45 s)
boom(bt(10), 0.6)
crash(bt(10), 0.8)
for b in range(10, 18):
    for k in range(16):
        bb = k * 0.25
        hat(bt(b, bb), 1.0 if k % 2 == 0 else 0.55)
    taiko(bt(b, 0), 41, 0.95)
    taiko(bt(b, 1.5), 45, 0.55)
    taiko(bt(b, 2), 41, 0.75)
    taiko(bt(b, 3.5), 48, 0.5)
    snare(bt(b, 1), 0.45)
    snare(bt(b, 3), 0.5)
    if b in (13, 17):
        for k in range(8):
            taiko(bt(b, 2 + k * 0.25), 48 + (k % 3) * 2, 0.35 + 0.08 * k, 0.3 - 0.08 * k)
ostinato(10, 18, 0.7)
piano_arps(10, 18, 0.38, lo=62, hi=86)
pad_part("string_ensemble_1", 10, 18, 55, 74, 0.6, att=0.4, rel=0.5)
pad_part("choir_aahs", 14, 18, 62, 74, 0.4, att=0.8, rel=0.6, busname="choir")
bass_part(10, 18, 0.85, eighths=True)
melody("french_horn", 14, GROOVE_MEL, 0.95, 0, -0.15)
melody("string_ensemble_1", 14, GROOVE_MEL, 0.5, 12, 0.2)
rev_swell(bt(18), 2.0, 0.6)

# --- WYCISZENIE / ZACHOD SLONCA (takty 18-23, 45-60 s)
boom(bt(18), 0.5)
downlifter(bt(18), 4.0, 0.7)
for k, m in enumerate([62, 66, 69, 74, 78, 81, 86, 90]):
    note(B["piano"], "orchestral_harp", m, bt(18) - 0.5 + k * 0.06, 2.5, 0.5, 0.3 - 0.08 * k, sustain=False)
melody("acoustic_grand_piano", 18, BREAK_MEL, 1.15, 0, -0.1, att=0.0, rel=0.8, busname="piano", sustain=False)
piano_arps(18, 24, 0.3, lo=50, hi=74, lpf=4000)
pad_part("string_ensemble_1", 18, 24, 50, 74, 0.75, att=1.0, rel=1.0, lpf=3500)
pad_part("choir_aahs", 18, 24, 62, 76, 0.55, att=1.2, rel=1.0, busname="choir")
bass_part(18, 24, 0.3)
melody("string_ensemble_1", 20, [(bb - 2, be, d, m - 12) for (bb, be, d, m) in BREAK_MEL if bb >= 2], 0.45, 0, 0.3)
riser(bt(23), bt(24) - 0.05, 0.7)
rev_swell(bt(24), 2.5, 0.8)
timpani_roll(bt(23, 2), bt(24) - 0.08, 0.1, 0.6, 45)

# --- NOCLEGI (takty 24-29, 60-75 s)
boom(bt(24), 0.6)
crash(bt(24), 0.9)
for b in range(24, 30):
    for k in range(8):
        hat(bt(b, k * 0.5), 0.9 if k % 2 == 0 else 0.6)
    taiko(bt(b, 0), 41, 0.85)
    taiko(bt(b, 2), 45, 0.6)
    taiko(bt(b, 2.5), 48, 0.4)
    if b < 28:
        snare(bt(b, 3), 0.35)
piano_arps(24, 30, 0.4, lo=62, hi=86)
ostinato(24, 30, 0.6)
pad_part("string_ensemble_1", 24, 30, 55, 76, 0.65, att=0.3, rel=0.5)
bass_part(24, 30, 0.8, eighths=True)
melody("french_horn", 24, TITLE_MEL, 0.85, 0, -0.15)
pad_part("brass_section", 28, 30, 45, 62, 0.8, att=0.4, rel=0.1,
         busname="brass", crescendo=([bt(28), bt(30)], [0.4, 1.3]))
pad_part("choir_aahs", 28, 30, 62, 77, 0.8, att=0.5, rel=0.1, busname="choir",
         crescendo=([bt(28), bt(30)], [0.3, 1.2]))
snare_roll(bt(28), bt(30) - 0.1, 0.1, 1.0)
riser(bt(28), bt(30) - 0.1, 1.1)
rev_swell(bt(30), 3.0, 1.1)

# --- KULMINACJA (takty 30-37, 75-95 s)
for b in range(30, 38):
    boom(bt(b), 1.1 if b == 30 else (0.5 if b % 2 == 0 else 0.3))
    for k in range(16):
        hat(bt(b, k * 0.25), 1.0 if k % 2 == 0 else 0.5)
    for k in range(8):
        taiko(bt(b, k * 0.5), 41 if k % 4 == 0 else (45 if k % 2 == 0 else 48), 1.0 if k % 4 == 0 else 0.55,
              (k % 3 - 1) * 0.2)
    snare(bt(b, 1), 0.7)
    snare(bt(b, 3), 0.75)
    if b % 2 == 0:
        crash(bt(b), 1.3 if b in (30, 34) else 0.7)
    if b in (33, 37):
        for k in range(8):
            taiko(bt(b, 2 + k * 0.25), 50 - (k % 4) * 2, 0.5 + 0.06 * k, -0.3 + 0.08 * k)
downlifter(bt(30), 3.0, 0.8)
pad_part("string_ensemble_1", 30, 38, 43, 81, 1.2, att=0.08, rel=0.4)
pad_part("choir_aahs", 30, 38, 60, 79, 1.0, att=0.2, rel=0.5, busname="choir")
pad_part("brass_section", 30, 38, 45, 62, 0.85, att=0.03, rel=0.3, busname="brass")
melody("brass_section", 30, CLIMAX_MEL, 1.15, 0, -0.1)
melody("string_ensemble_1", 30, CLIMAX_MEL, 0.8, 0, 0.25)
melody("string_ensemble_1", 30, CLIMAX_MEL, 0.5, 12, -0.3)
melody("glockenspiel", 30, CLIMAX_MEL, 0.35, 12, 0.4, att=0.0, rel=0.5, busname="piano", sustain=False)
ostinato(30, 38, 0.75)
piano_arps(30, 38, 0.35, lo=62, hi=86)
bass_part(30, 38, 1.0, eighths=True)
riser(bt(37), bt(38) - 0.1, 1.0)
rev_swell(bt(38), 2.5, 1.2)
timpani_roll(bt(37), bt(38) - 0.1, 0.2, 1.0, 38)

# --- FINAL (takty 38-43, 95-110 s)
boom(bt(38), 1.25)
crash(bt(38), 1.5, 6.0)
downlifter(bt(38), 4.0, 0.9)
for b, g in ((38, 1.0), (39, 0.55), (40, 0.6), (41, 0.75)):
    taiko(bt(b), 41, g)
for k, bb in enumerate([0, 0.75, 1.5, 2.0]):
    note(B["brass"], "brass_section", 62 if k < 3 else 69, bt(39, bb), BEAT * 0.6, 0.8, -0.1, att=0.01, rel=0.2)
pad_part("string_ensemble_1", 38, 44, 38, 81, 1.15, att=0.1, rel=2.5)
pad_part("choir_aahs", 38, 44, 60, 79, 0.95, att=0.3, rel=2.5, busname="choir")
pad_part("brass_section", 38, 44, 45, 62, 0.8, att=0.05, rel=2.0, busname="brass")
melody("brass_section", 38, END_MEL, 1.0, 0, -0.1, rel=2.0)
melody("string_ensemble_1", 38, END_MEL, 0.6, 12, 0.25, rel=2.5)
bass_part(38, 44, 0.9)
riser(bt(41), bt(42) - 0.1, 0.9)
rev_swell(bt(42), 2.5, 1.2)
timpani_roll(bt(41, 2), bt(42) - 0.1, 0.2, 0.9, 38)
boom(bt(42), 1.3)
crash(bt(42), 1.4, 7.0)
taiko(bt(42), 41, 1.0)
for k, m in enumerate([74, 78, 81, 86, 90, 93, 98]):
    note(B["piano"], "glockenspiel", m, bt(42) + 0.4 + k * 0.09, 2.0, 0.22, -0.3 + 0.1 * k, sustain=False)
for k, m in enumerate([62, 66, 69, 74, 78, 81, 86, 90]):
    note(B["piano"], "orchestral_harp", m, bt(42) + 0.2 + k * 0.07, 3.5, 0.45, 0.3 - 0.08 * k, sustain=False)

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
    secs = [(0, 15), (15, 25), (25, 45), (45, 60), (60, 75), (75, 95), (95, 110)]
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
for t in (bt(6), bt(30), bt(38), bt(42)):
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
fo0, fo1 = int(108.5 * SR), N
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
