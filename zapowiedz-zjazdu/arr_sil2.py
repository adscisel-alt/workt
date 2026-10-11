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

