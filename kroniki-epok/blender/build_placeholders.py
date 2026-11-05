"""Buduje proste modele low-poly (zastępcze, bez tekstur) i zapisuje je do models/*.blend.

Uruchomienie:
  blender -b -P build_placeholders.py -- --out models
  python build_placeholders.py --out models          (z zainstalowanym modułem bpy)

Każdy plik .blend ma:
  * obiekty w kolekcji "Model" (wszystko, co ma trafić do sprite'a),
  * właściwości sceny: sprite_anims (JSON: nazwa -> [od, do]), frame_px, anchor, directions,
  * materiał "PlayerColor" na elementach w kolorze gracza.
Prawdziwe modele (z Blendera/zakupione/własne) wystarczy zapisać w tym samym formacie,
a render_sprites.py wyrenderuje je identycznie.
"""
import argparse
import json
import math
import os

import bpy
from mathutils import Vector

from common import PLAYER_COLOR, script_args

# ---------------------------------------------------------------- narzędzia

def reset_scene():
    bpy.ops.wm.read_factory_settings(use_empty=True)
    scene = bpy.context.scene
    scene.render.fps = 10
    return scene


def material(name, rgba, roughness=0.9, emission=0.0):
    mat = bpy.data.materials.get(name)
    if mat:
        return mat
    mat = bpy.data.materials.new(name)
    mat.use_nodes = True
    bsdf = mat.node_tree.nodes.get("Principled BSDF")
    bsdf.inputs["Base Color"].default_value = rgba
    bsdf.inputs["Roughness"].default_value = roughness
    if emission > 0:
        bsdf.inputs["Emission Color"].default_value = rgba
        bsdf.inputs["Emission Strength"].default_value = emission
    return mat


MAT = {}

def mats():
    if MAT:
        return MAT
    MAT.update({
        "skin": material("Skin", (0.85, 0.62, 0.45, 1)),
        "tunic": material("Tunic", (0.42, 0.28, 0.16, 1)),
        "cloth": material("Cloth", (0.70, 0.62, 0.48, 1)),
        "armor": material("Armor", (0.45, 0.46, 0.50, 1), 0.4),
        "wood": material("Wood", (0.36, 0.22, 0.10, 1)),
        "wood_light": material("WoodLight", (0.58, 0.40, 0.22, 1)),
        "thatch": material("Thatch", (0.72, 0.58, 0.28, 1)),
        "stone": material("Stone", (0.55, 0.54, 0.50, 1)),
        "plaster": material("Plaster", (0.82, 0.76, 0.62, 1)),
        "roof_red": material("RoofRed", (0.55, 0.22, 0.14, 1)),
        "roof_slate": material("RoofSlate", (0.30, 0.33, 0.40, 1)),
        "leaf": material("Leaf", (0.12, 0.36, 0.10, 1)),
        "leaf2": material("Leaf2", (0.18, 0.46, 0.14, 1)),
        "gold": material("Gold", (0.85, 0.65, 0.15, 1), 0.5),
        "rock": material("Rock", (0.5, 0.5, 0.48, 1)),
        "berry": material("Berry", (0.75, 0.10, 0.12, 1)),
        "soil": material("Soil", (0.36, 0.24, 0.12, 1)),
        "crop": material("Crop", (0.35, 0.55, 0.18, 1)),
        "player": material("PlayerColor", PLAYER_COLOR, 0.6),
        "steel": material("Steel", (0.8, 0.82, 0.85, 1), 0.3),
    })
    return MAT


def link(obj, coll):
    for c in obj.users_collection:
        c.objects.unlink(obj)
    coll.objects.link(obj)


def box(coll, name, size, loc, mat, rot=(0, 0, 0)):
    bpy.ops.mesh.primitive_cube_add(size=1.0, location=loc, rotation=rot)
    o = bpy.context.object
    o.name = name
    o.scale = size
    o.data.materials.append(mat)
    link(o, coll)
    return o


def cyl(coll, name, r, h, loc, mat, verts=12, rot=(0, 0, 0)):
    bpy.ops.mesh.primitive_cylinder_add(vertices=verts, radius=r, depth=h, location=loc, rotation=rot)
    o = bpy.context.object
    o.name = name
    o.data.materials.append(mat)
    link(o, coll)
    return o


def sphere(coll, name, r, loc, mat, subdiv=2):
    bpy.ops.mesh.primitive_ico_sphere_add(subdivisions=subdiv, radius=r, location=loc)
    o = bpy.context.object
    o.name = name
    o.data.materials.append(mat)
    link(o, coll)
    return o


def cone(coll, name, r, h, loc, mat, verts=4, rot=(0, 0, 0)):
    bpy.ops.mesh.primitive_cone_add(vertices=verts, radius1=r, radius2=0, depth=h, location=loc, rotation=rot)
    o = bpy.context.object
    o.name = name
    o.data.materials.append(mat)
    link(o, coll)
    return o


def pyramid_roof(coll, name, half, base_z, height, mat, overhang=0.1):
    """Dach czterospadowy ustawiony krawędziami równolegle do osi (jak ściany)."""
    o = cone(coll, name, (half + overhang) * math.sqrt(2), height, (0, 0, base_z + height / 2), mat, verts=4,
             rot=(0, 0, math.radians(45)))
    return o


def shade_smooth(o):
    for p in o.data.polygons:
        p.use_smooth = True


def new_model_scene(name, frame_px, anchor, directions, anims):
    scene = reset_scene()
    coll = bpy.data.collections.new("Model")
    scene.collection.children.link(coll)
    scene["sprite_anims"] = json.dumps(anims)
    scene["frame_px"] = frame_px
    scene["anchor"] = anchor
    scene["directions"] = directions
    scene["model_name"] = name
    MAT.clear()
    mats()
    return scene, coll


def save(scene, out_dir, name):
    anims = json.loads(scene["sprite_anims"])
    last = max(v[1] for v in anims.values())
    scene.frame_start = 1
    scene.frame_end = last
    path = os.path.join(out_dir, name + ".blend")
    bpy.ops.wm.save_as_mainfile(filepath=path)
    print("zapisano", path)


def key_rot(obj, frame, rot_deg):
    obj.rotation_euler = tuple(math.radians(a) for a in rot_deg)
    obj.keyframe_insert("rotation_euler", frame=frame)


def key_loc(obj, frame, loc):
    obj.location = loc
    obj.keyframe_insert("location", frame=frame)

# ---------------------------------------------------------------- postacie

UNIT_ANIMS = {"idle": [1, 1], "walk": [1, 8], "attack": [10, 17], "gather": [10, 17], "build": [10, 17]}


def humanoid(coll, m, body_mat, helmet=False):
    """Prosta postać z osobnych brył; kończyny mają pivot w stawie, aby dało się je animować."""
    root = bpy.data.objects.new("Root", None)
    link(root, coll)
    torso = box(coll, "Torso", (0.28, 0.18, 0.34), (0, 0, 0.60), body_mat)
    torso.parent = root
    belt = box(coll, "Belt", (0.30, 0.20, 0.06), (0, 0, 0.47), m["player"])
    belt.parent = root
    head = sphere(coll, "Head", 0.12, (0, 0, 0.90), m["skin"])
    head.parent = root
    if helmet:
        hm = sphere(coll, "Helmet", 0.135, (0, 0, 0.93), m["armor"])
        hm.scale = (1, 1, 0.8)
        hm.parent = root
    limbs = {}
    for side, sx in (("L", -1), ("R", 1)):
        hip = bpy.data.objects.new(f"Hip{side}", None)
        hip.location = (sx * 0.08, 0, 0.44)
        link(hip, coll)
        hip.parent = root
        leg = box(coll, f"Leg{side}", (0.10, 0.12, 0.42), (0, 0, -0.21), m["tunic"])
        leg.parent = hip
        shoulder = bpy.data.objects.new(f"Shoulder{side}", None)
        shoulder.location = (sx * 0.19, 0, 0.74)
        link(shoulder, coll)
        shoulder.parent = root
        arm = box(coll, f"Arm{side}", (0.09, 0.10, 0.36), (0, 0, -0.16), m["skin"])
        arm.parent = shoulder
        limbs[side] = (hip, shoulder)
    return root, limbs


def animate_humanoid(limbs, swing=28, work=True):
    """Chód (1-8) i praca/atak (10-17) jako wahania kończyn w osi X (przód = -Y)."""
    hipL, shL = limbs["L"]
    hipR, shR = limbs["R"]
    for f in range(1, 9):
        a = math.sin((f - 1) / 8.0 * 2 * math.pi) * swing
        key_rot(hipL, f, (a, 0, 0)); key_rot(hipR, f, (-a, 0, 0))
        key_rot(shL, f, (-a * 0.8, 0, 0)); key_rot(shR, f, (a * 0.8, 0, 0))
    if work:
        for f in range(10, 18):
            t = (f - 10) / 8.0
            a = -70 + 110 * (1 - abs(math.sin(t * math.pi)))  # zamach prawą ręką
            key_rot(shR, f, (a, 0, 0))
            key_rot(shL, f, (-15, 0, 0))
            key_rot(hipL, f, (0, 0, 0)); key_rot(hipR, f, (0, 0, 0))


def build_osadnik(out):
    scene, coll = new_model_scene("osadnik", 96, 0.82, 8, UNIT_ANIMS)
    m = mats()
    root, limbs = humanoid(coll, m, m["cloth"])
    _, shR = limbs["R"]
    axe = box(coll, "AxeHandle", (0.04, 0.04, 0.5), (0, -0.05, -0.45), m["wood"])
    axe.parent = shR
    blade = box(coll, "AxeBlade", (0.03, 0.14, 0.10), (0, -0.12, -0.66), m["steel"])
    blade.parent = shR
    hat = cone(coll, "Hat", 0.16, 0.12, (0, 0, 1.03), m["thatch"], verts=12)
    hat.parent = root
    animate_humanoid(limbs)
    save(scene, out, "osadnik")


def build_milicja(out):
    scene, coll = new_model_scene("milicja", 96, 0.82, 8, UNIT_ANIMS)
    m = mats()
    root, limbs = humanoid(coll, m, m["armor"], helmet=True)
    hipL, shL = limbs["L"]
    _, shR = limbs["R"]
    sword = box(coll, "Sword", (0.03, 0.05, 0.55), (0, -0.08, -0.55), m["steel"])
    sword.parent = shR
    shield = cyl(coll, "Shield", 0.17, 0.03, (-0.06, -0.08, -0.22), m["player"], verts=16, rot=(math.radians(90), 0, 0))
    shield.parent = shL
    animate_humanoid(limbs)
    save(scene, out, "milicja")

# ---------------------------------------------------------------- budynki

STATIC = {"idle": [1, 1]}


def building_scene(name, tiles, height_hint):
    frame = {1: 128, 2: 160, 3: 224, 4: 288}[tiles]
    return new_model_scene(name, frame, 0.80, 1, STATIC)


def build_dom(out):
    scene, coll = building_scene("dom", 2, 1.0)
    m = mats()
    box(coll, "Walls", (1.5, 1.5, 0.75), (0, 0, 0.375), m["plaster"])
    for i, (x, y, rot) in enumerate([(0.75, 0, 0), (-0.75, 0, 0), (0, 0.75, 1), (0, -0.75, 1)]):
        beam = box(coll, f"Beam{i}", (0.06, 1.5, 0.06) if rot == 0 else (1.5, 0.06, 0.06), (x, y, 0.74), m["wood"])
    pyramid_roof(coll, "Roof", 0.75, 0.75, 0.65, m["thatch"], overhang=0.15)
    box(coll, "Door", (0.30, 0.05, 0.45), (0.2, -0.76, 0.23), m["wood"])
    save(scene, out, "dom")


def build_centrum(out):
    scene, coll = building_scene("centrum", 3, 1.6)
    m = mats()
    box(coll, "Base", (2.8, 2.8, 0.45), (0, 0, 0.225), m["stone"])
    box(coll, "Hall", (1.9, 1.9, 1.0), (0, 0, 0.95), m["plaster"])
    for i in range(4):
        a = math.radians(45 + 90 * i)
        cyl(coll, f"Post{i}", 0.08, 1.3, (math.cos(a) * 1.25, math.sin(a) * 1.25, 1.1), m["wood"])
    pyramid_roof(coll, "Roof", 1.35, 1.45, 0.75, m["roof_red"], overhang=0.1)
    pole = cyl(coll, "Pole", 0.03, 0.8, (0, 0, 2.55), m["wood"], verts=6)
    flag = box(coll, "Flag", (0.02, 0.45, 0.25), (0, -0.22, 2.8), m["player"])
    save(scene, out, "centrum")


def build_koszary(out):
    scene, coll = building_scene("koszary", 3, 1.3)
    m = mats()
    box(coll, "Walls", (2.6, 2.4, 1.0), (0, 0, 0.5), m["wood_light"])
    box(coll, "Stone", (2.65, 2.45, 0.3), (0, 0, 0.15), m["stone"])
    pyramid_roof(coll, "Roof", 1.3, 1.0, 0.7, m["roof_red"], overhang=0.12)
    box(coll, "Gate", (0.6, 0.05, 0.7), (0, -1.21, 0.35), m["wood"])
    cyl(coll, "Pole", 0.03, 0.9, (0.9, -0.9, 1.6), m["wood"], verts=6)
    box(coll, "Banner", (0.02, 0.35, 0.5), (0.9, -1.08, 1.75), m["player"])
    save(scene, out, "koszary")


def build_mlyn(out):
    scene, coll = building_scene("mlyn", 2, 1.8)
    m = mats()
    cyl(coll, "Tower", 0.6, 1.4, (0, 0, 0.7), m["plaster"], verts=10)
    cone(coll, "Roof", 0.7, 0.6, (0, 0, 1.7), m["roof_red"], verts=10)
    hub = cyl(coll, "Hub", 0.08, 0.3, (0, -0.72, 1.35), m["wood"], verts=8, rot=(math.radians(90), 0, 0))
    for i in range(4):
        sail = box(coll, f"Sail{i}", (0.18, 0.03, 1.0), (0, -0.85, 1.35), m["cloth"], rot=(0, math.radians(45 + 90 * i), 0))
        sail.location = (math.sin(math.radians(45 + 90 * i)) * 0.5, -0.85, 1.35 + math.cos(math.radians(45 + 90 * i)) * 0.5)
    box(coll, "Door", (0.3, 0.05, 0.5), (0, -0.6, 0.25), m["wood"])
    save(scene, out, "mlyn")


def build_hut(name, out, prop):
    scene, coll = building_scene(name, 2, 0.9)
    m = mats()
    box(coll, "Walls", (1.3, 1.1, 0.6), (-0.2, 0.2, 0.3), m["wood"])
    roof = pyramid_roof(coll, "Roof", 0.65, 0.6, 0.4, m["thatch"], overhang=0.12)
    roof.location.x = -0.2
    roof.location.y = 0.2
    if prop == "logs":
        for i in range(3):
            cyl(coll, f"Log{i}", 0.12, 0.9, (0.55, -0.45 + i * 0.25, 0.12 + (i % 2) * 0.1), m["wood_light"], verts=8, rot=(0, math.radians(90), 0))
    else:
        for i, (x, y, r) in enumerate([(0.5, -0.5, 0.22), (0.7, -0.2, 0.17), (0.35, -0.2, 0.14)]):
            sphere(coll, f"Rock{i}", r, (x, y, r * 0.8), m["rock"], subdiv=1)
        sphere(coll, "Nugget", 0.09, (0.55, -0.45, 0.42), m["gold"], subdiv=1)
    save(scene, out, name)


def build_farma(out):
    scene, coll = building_scene("farma", 2, 0.1)
    m = mats()
    box(coll, "Soil", (1.9, 1.9, 0.04), (0, 0, 0.02), m["soil"])
    for i in range(6):
        box(coll, f"Row{i}", (1.8, 0.14, 0.08), (0, -0.8 + i * 0.32, 0.07), m["crop"])
    save(scene, out, "farma")

# ---------------------------------------------------------------- przyroda

def build_drzewo(out):
    scene, coll = new_model_scene("drzewo", 128, 0.86, 1, STATIC)
    m = mats()
    cyl(coll, "Trunk", 0.09, 0.9, (0, 0, 0.45), m["wood"], verts=8)
    for i, (x, y, z, r, mat) in enumerate([(0, 0, 1.25, 0.42, "leaf"), (-0.25, 0.1, 1.0, 0.32, "leaf2"), (0.25, -0.1, 1.05, 0.30, "leaf"), (0, 0, 1.65, 0.28, "leaf2")]):
        s = sphere(coll, f"Crown{i}", r, (x, y, z), m[mat], subdiv=1)
    save(scene, out, "drzewo")


def build_krzaki(out):
    scene, coll = new_model_scene("krzaki", 96, 0.80, 1, STATIC)
    m = mats()
    b = sphere(coll, "Bush", 0.42, (0, 0, 0.3), m["leaf2"], subdiv=1)
    b.scale = (1, 1, 0.7)
    for i in range(10):
        a = i * 0.63
        sphere(coll, f"Berry{i}", 0.05, (math.cos(a) * 0.33, math.sin(a) * 0.33, 0.3 + math.sin(a * 2) * 0.12), m["berry"], subdiv=1)
    save(scene, out, "krzaki")


def build_rocks(name, out, mat_name):
    scene, coll = new_model_scene(name, 96, 0.80, 1, STATIC)
    m = mats()
    for i, (x, y, r) in enumerate([(-0.25, 0.15, 0.30), (0.25, -0.1, 0.26), (0.0, -0.3, 0.2), (0.1, 0.25, 0.18)]):
        s = sphere(coll, f"Rock{i}", r, (x, y, r * 0.75), m["rock"], subdiv=1)
        s.scale = (1.2, 1.0, 0.8)
    if mat_name == "gold":
        for i, (x, y) in enumerate([(-0.25, 0.15), (0.25, -0.1), (0.0, -0.3)]):
            sphere(coll, f"Vein{i}", 0.1, (x, y - 0.12, 0.3), m["gold"], subdiv=1)
    save(scene, out, name)


BUILDERS = {
    "osadnik": build_osadnik,
    "milicja": build_milicja,
    "dom": build_dom,
    "centrum": build_centrum,
    "koszary": build_koszary,
    "mlyn": build_mlyn,
    "tartak": lambda out: build_hut("tartak", out, "logs"),
    "kopalnia": lambda out: build_hut("kopalnia", out, "rocks"),
    "farma": build_farma,
    "drzewo": build_drzewo,
    "krzaki": build_krzaki,
    "zloto": lambda out: build_rocks("zloto", out, "gold"),
    "kamien": lambda out: build_rocks("kamien", out, "rock"),
}


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("--out", default=os.path.join(os.path.dirname(os.path.abspath(__file__)), "models"))
    ap.add_argument("--only", nargs="*", default=None, help="nazwy modeli (domyślnie wszystkie)")
    args = ap.parse_args(script_args())
    os.makedirs(args.out, exist_ok=True)
    names = args.only or list(BUILDERS)
    for n in names:
        BUILDERS[n](args.out)


if __name__ == "__main__":
    main()
