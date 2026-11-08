"""
Generator dźwięków (syntetycznych, własnych – licencja CC0) dla gry „Fabryka 1892”.
Wymaga tylko numpy. Zapisuje pliki WAV 22,05 kHz, mono, 16-bit.

    python blender/generate_audio.py [katalog_wyjściowy]
"""
import os
import sys
import wave

import numpy as np

SR = 22050
rng = np.random.default_rng(7)


def save(name, data, out_dir):
    data = np.clip(data, -1.0, 1.0)
    pcm = (data * 32767).astype(np.int16)
    with wave.open(os.path.join(out_dir, name + ".wav"), "wb") as w:
        w.setnchannels(1)
        w.setsampwidth(2)
        w.setframerate(SR)
        w.writeframes(pcm.tobytes())


def env(n, attack, release):
    e = np.ones(n)
    a = int(attack * SR)
    r = int(release * SR)
    if a > 0:
        e[:a] = np.linspace(0, 1, a)
    if r > 0:
        e[-r:] = np.linspace(1, 0, r)
    return e


def lowpass(x, alpha):
    y = np.empty_like(x)
    acc = 0.0
    for i in range(len(x)):
        acc += alpha * (x[i] - acc)
        y[i] = acc
    return y


def syrena(out_dir):
    """Syrena fabryczna: narastający i opadający ton z harmonicznymi, 4 s."""
    n = SR * 4
    t = np.arange(n) / SR
    f = 320 + 260 * np.sin(np.pi * np.clip(t / 4.0, 0, 1)) ** 0.7
    phase = 2 * np.pi * np.cumsum(f) / SR
    sig = 0.6 * np.sin(phase) + 0.25 * np.sin(2 * phase) + 0.1 * np.sin(3 * phase)
    sig += 0.05 * rng.standard_normal(n)
    save("syrena", sig * env(n, 0.3, 0.8) * 0.8, out_dir)


def krosna(out_dir):
    """Pętla stukotu krosien: rytmiczne uderzenia + szum maszynowy, 4 s (zapętlana)."""
    n = SR * 4
    t = np.arange(n) / SR
    sig = 0.12 * lowpass(rng.standard_normal(n), 0.08)
    beat = int(SR / 3.2)
    for i in range(0, n, beat):
        ln = min(int(0.06 * SR), n - i)
        click = rng.standard_normal(ln) * np.exp(-np.arange(ln) / (0.012 * SR))
        sig[i:i + ln] += 0.7 * click
        j = i + beat // 2
        if j + ln < n:
            sig[j:j + ln] += 0.35 * rng.standard_normal(ln) * np.exp(-np.arange(ln) / (0.008 * SR))
    hum = 0.05 * np.sin(2 * np.pi * 50 * t) + 0.03 * np.sin(2 * np.pi * 100 * t)
    save("krosna_petla", (sig + hum) * 0.9, out_dir)


def dzwon(out_dir):
    """Dzwon kościelny: suma tłumionych tonów niehormonicznych, 3 uderzenia."""
    n = SR * 6
    t = np.arange(n) / SR
    sig = np.zeros(n)
    partials = [(1.0, 1.0), (2.0, 0.6), (2.4, 0.4), (3.0, 0.3), (4.1, 0.2), (5.4, 0.1)]
    for k in range(3):
        start = int(k * 1.8 * SR)
        tt = t[: n - start]
        tone = np.zeros_like(tt)
        for ratio, amp in partials:
            tone += amp * np.sin(2 * np.pi * 220 * ratio * tt) * np.exp(-tt * (0.6 + ratio * 0.35))
        sig[start:] += tone
    save("dzwon", sig / np.max(np.abs(sig)) * 0.8, out_dir)


def klik(out_dir):
    n = int(0.08 * SR)
    t = np.arange(n) / SR
    sig = np.sin(2 * np.pi * 1800 * t) * np.exp(-t * 80) * 0.5
    save("klik", sig, out_dir)


def monety(out_dir):
    n = int(0.5 * SR)
    t = np.arange(n) / SR
    sig = np.zeros(n)
    for k, f in enumerate((3200, 4100, 3700)):
        st = int(k * 0.09 * SR)
        tt = t[: n - st]
        sig[st:] += np.sin(2 * np.pi * f * tt) * np.exp(-tt * 30) * 0.4
    save("monety", sig, out_dir)


def ptaki(out_dir):
    """Ćwierkanie ptaków na podwórzu/skwerze – pętla 6 s."""
    n = SR * 6
    sig = np.zeros(n)
    for _ in range(14):
        st = int(rng.uniform(0, 5.5) * SR)
        ln = int(rng.uniform(0.08, 0.2) * SR)
        if st + ln >= n:
            continue
        tt = np.arange(ln) / SR
        f0 = rng.uniform(2500, 4200)
        f = f0 + rng.uniform(-900, 900) * np.sin(2 * np.pi * rng.uniform(8, 20) * tt)
        ph = 2 * np.pi * np.cumsum(f) / SR
        sig[st:st + ln] += np.sin(ph) * env(ln, 0.02, 0.04) * rng.uniform(0.15, 0.3)
    save("ptaki_petla", sig, out_dir)


def gwar(out_dir):
    """Gwar szynku/targu – filtrowany szum z modulacją, pętla 5 s."""
    n = SR * 5
    t = np.arange(n) / SR
    base = lowpass(rng.standard_normal(n), 0.03)
    mod = 0.6 + 0.4 * np.sin(2 * np.pi * 0.7 * t) * np.sin(2 * np.pi * 1.9 * t + 1.0)
    save("gwar_petla", base * mod * 0.5, out_dir)


def main():
    out_dir = sys.argv[1] if len(sys.argv) > 1 else os.path.join(
        os.path.dirname(os.path.abspath(__file__)), "..", "godot", "assets", "audio")
    out_dir = os.path.abspath(out_dir)
    os.makedirs(out_dir, exist_ok=True)
    for fn in (syrena, krosna, dzwon, klik, monety, ptaki, gwar):
        fn(out_dir)
    print("Zapisano dźwięki do", out_dir)


if __name__ == "__main__":
    main()
