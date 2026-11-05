"""Składa pojedyncze klatki PNG w arkusz sprite'ów + plik .json z metadanymi dla Godota.

Układ arkusza: wiersze = kierunki (0..N-1), kolumny = klatki animacji.
Używa wyłącznie bpy + numpy (dostępne w Pythonie wbudowanym w Blendera), więc działa bez Pillow.
"""
import json
import os

import bpy
import numpy as np


def load_rgba(path):
    img = bpy.data.images.load(path, check_existing=False)
    w, h = img.size
    px = np.array(img.pixels[:], dtype=np.float32).reshape(h, w, 4)
    bpy.data.images.remove(img)
    return px[::-1]  # Blender trzyma wiersze od dołu; odwracamy na porządek "od góry"


def save_rgba(path, arr):
    h, w, _ = arr.shape
    img = bpy.data.images.new("sheet_tmp", width=w, height=h, alpha=True, float_buffer=False)
    img.colorspace_settings.name = "sRGB"
    img.pixels = arr[::-1].astype(np.float32).ravel().tolist()
    img.filepath_raw = path
    img.file_format = "PNG"
    img.save()
    bpy.data.images.remove(img)


def pack(frames_dir, out_base, directions, frames, frame_px, origin, fps, player_color):
    sheet = np.zeros((directions * frame_px, frames * frame_px, 4), dtype=np.float32)
    for d in range(directions):
        for f in range(frames):
            p = os.path.join(frames_dir, f"d{d}_f{f:03d}.png")
            if not os.path.exists(p):
                raise FileNotFoundError(p)
            a = load_rgba(p)
            sheet[d * frame_px:(d + 1) * frame_px, f * frame_px:(f + 1) * frame_px] = a
    save_rgba(out_base + ".png", sheet)
    meta = {
        "frame_w": frame_px, "frame_h": frame_px, "frames": frames, "directions": directions,
        "fps": fps, "origin": origin, "player_color": bool(player_color),
    }
    with open(out_base + ".json", "w", encoding="utf-8") as fh:
        json.dump(meta, fh, indent=1)
    return meta
