"""Renderuje model .blend do arkuszy sprite'ów w stylu Age of Empires II.

  blender -b -P render_sprites.py -- --model models/osadnik.blend --out ../godot/assets/sprites
  python render_sprites.py --model models/osadnik.blend --out ../godot/assets/sprites   (moduł bpy)

Opcje: --engine cycles|eevee  --samples N  --dirs 8|5|1  --anims walk,attack  --scale 1|2
Wynik: <out>/<model>_<anim>.png + .json (patrz pack_sheets.py), klatki pośrednie w <out>/_frames/.
Kamera i światło są budowane od zera (ustawienia w pliku .blend nie mają znaczenia).
"""
import argparse
import json
import math
import os
import shutil

import bpy
from mathutils import Vector

from common import CAM_PITCH_DEG, FPS, origin_px, ortho_scale_for, script_args, target_z_for
import pack_sheets


def setup_render(scene, engine, samples, frame_px):
    r = scene.render
    r.resolution_x = frame_px
    r.resolution_y = frame_px
    r.resolution_percentage = 100
    r.film_transparent = True
    r.image_settings.file_format = "PNG"
    r.image_settings.color_mode = "RGBA"
    r.image_settings.color_depth = "8"
    r.filter_size = 1.0  # ostre krawędzie, mniej rozmycia na małych sprite'ach
    scene.view_settings.view_transform = "Standard"
    if engine == "cycles":
        scene.render.engine = "CYCLES"
        scene.cycles.samples = samples
        scene.cycles.use_denoising = samples >= 16
        scene.cycles.device = "CPU"
        scene.cycles.max_bounces = 3
        scene.cycles.film_transparent_glass = False
    else:
        for name in ("BLENDER_EEVEE_NEXT", "BLENDER_EEVEE"):
            try:
                scene.render.engine = name
                break
            except TypeError:
                continue
        if hasattr(scene, "eevee"):
            scene.eevee.taa_render_samples = max(8, samples)


def build_rig(scene, frame_px, anchor):
    """Empty "CamRig" w początku układu; kamera i słońce są jego dziećmi, obrót rigu = kierunek sprite'a."""
    rig = bpy.data.objects.new("CamRig", None)
    scene.collection.objects.link(rig)
    cam_data = bpy.data.cameras.new("SpriteCam")
    cam_data.type = "ORTHO"
    cam_data.ortho_scale = ortho_scale_for(frame_px)
    cam_data.clip_start = 0.1
    cam_data.clip_end = 200
    cam = bpy.data.objects.new("SpriteCam", cam_data)
    scene.collection.objects.link(cam)
    cam.parent = rig
    pitch = math.radians(CAM_PITCH_DEG)
    # bazowa pozycja: azymut -45 st. (ćwiartka +X,-Y), 30 st. nad horyzontem
    dist = 40.0
    direction = Vector((math.sin(pitch) * math.cos(math.radians(-45)), math.sin(pitch) * math.sin(math.radians(-45)), math.cos(pitch)))
    cam.location = direction * dist
    cam.rotation_euler = (pitch, 0, math.radians(45))
    # punkt (0,0,0) ma wypaść na wysokości `anchor` klatki: przesuwamy kadr (shift_y w jednostkach szerokości klatki)
    cam_data.shift_y = (anchor - 0.5)
    scene.camera = cam
    # słońce: z lewego górnego rogu ekranu
    sun_data = bpy.data.lights.new("Sun", "SUN")
    sun_data.energy = 4.0
    sun_data.angle = math.radians(3)
    sun = bpy.data.objects.new("Sun", sun_data)
    scene.collection.objects.link(sun)
    sun.parent = rig
    # kierunek światła w układzie świata (dla rigu w pozycji bazowej): w lewo-górę ekranu = -X świata, z góry
    # światło biegnie w stronę (+X, +Y, w dół): pada z lewej-góry ekranu, oświetla lewą (frontową) ścianę,
    # a cienie kładą się w prawo i lekko w dół, jak w AoE2
    light_dir = Vector((0.8, 0.6, -1.1)).normalized()
    sun.rotation_euler = light_dir.to_track_quat("-Z", "Y").to_euler()
    sun.location = (0, 0, 10)
    # delikatne światło wypełniające, by cienie nie były czarne
    scene.world = scene.world or bpy.data.worlds.new("World")
    scene.world.use_nodes = True
    bg = scene.world.node_tree.nodes.get("Background")
    if bg:
        bg.inputs[0].default_value = (0.55, 0.6, 0.7, 1)
        bg.inputs[1].default_value = 0.6
    return rig, cam


def add_shadow_catcher(scene):
    bpy.ops.mesh.primitive_plane_add(size=60, location=(0, 0, 0))
    plane = bpy.context.object
    plane.name = "ShadowCatcher"
    plane.is_shadow_catcher = True
    mat = bpy.data.materials.new("ShadowCatcherMat")
    mat.use_nodes = True
    plane.data.materials.append(mat)
    return plane


def has_player_color():
    return any(m.name.startswith("PlayerColor") for m in bpy.data.materials)


def render_model(model_path, out_dir, engine, samples, dirs_override, anims_filter, scale):
    bpy.ops.wm.open_mainfile(filepath=os.path.abspath(model_path))
    scene = bpy.context.scene
    name = scene.get("model_name") or os.path.splitext(os.path.basename(model_path))[0]
    anims = json.loads(scene.get("sprite_anims", '{"idle": [1, 1]}'))
    frame_px = int(scene.get("frame_px", 96)) * scale
    anchor = float(scene.get("anchor", 0.8))
    directions = dirs_override or int(scene.get("directions", 8))
    if anims_filter:
        anims = {k: v for k, v in anims.items() if k in anims_filter}
    setup_render(scene, engine, samples, frame_px)
    rig, cam = build_rig(scene, frame_px, anchor)
    if engine == "cycles":
        add_shadow_catcher(scene)
    pc = has_player_color()
    os.makedirs(out_dir, exist_ok=True)
    done = {}  # (f0, f1) -> nazwa animacji już wyrenderowanej (aliasy, np. gather == attack)
    for anim, (f0, f1) in anims.items():
        if (f0, f1) in done:
            src = done[(f0, f1)]
            for ext in (".png", ".json"):
                shutil.copyfile(os.path.join(out_dir, f"{name}_{src}{ext}"), os.path.join(out_dir, f"{name}_{anim}{ext}"))
            print(f"[{name}] {anim}: kopia arkusza {src}")
            continue
        done[(f0, f1)] = anim
        frames_dir = os.path.join(out_dir, "_frames", f"{name}_{anim}")
        os.makedirs(frames_dir, exist_ok=True)
        n = f1 - f0 + 1
        for d in range(directions):
            # jednostki: kierunek 0 = przodem do widza (kamera na -Y); budynki (1 kierunek): widok po przekątnej siatki
            rig.rotation_euler = (0, 0, math.radians(45 * d - 45)) if directions > 1 else (0, 0, 0)
            for i in range(n):
                scene.frame_set(f0 + i)
                scene.render.filepath = os.path.join(frames_dir, f"d{d}_f{i:03d}.png")
                bpy.ops.render.render(write_still=True)
        meta = pack_sheets.pack(frames_dir, os.path.join(out_dir, f"{name}_{anim}"), directions, n, frame_px,
                                origin_px(frame_px, anchor), FPS, pc)
        print(f"[{name}] {anim}: {directions} kier. x {n} klatek -> {name}_{anim}.png", meta["origin"])
    return name


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("--model", required=True, nargs="+")
    ap.add_argument("--out", default=os.path.join(os.path.dirname(os.path.abspath(__file__)), "..", "godot", "assets", "sprites"))
    ap.add_argument("--engine", choices=["cycles", "eevee"], default="cycles")
    ap.add_argument("--samples", type=int, default=32)
    ap.add_argument("--dirs", type=int, default=0, help="nadpisz liczbę kierunków (8, 5 lub 1)")
    ap.add_argument("--anims", default="", help="lista animacji, np. walk,attack")
    ap.add_argument("--scale", type=int, default=1, help="1 = jak AoE2 (64x32 kafelek), 2 = wersja HD")
    ap.add_argument("--keep-frames", action="store_true")
    args = ap.parse_args(script_args())
    anims_filter = [a for a in args.anims.split(",") if a]
    for m in args.model:
        render_model(m, args.out, args.engine, args.samples, args.dirs, anims_filter, args.scale)
    if not args.keep_frames:
        shutil.rmtree(os.path.join(args.out, "_frames"), ignore_errors=True)


if __name__ == "__main__":
    main()
