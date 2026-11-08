"""
Generator zasobów dla gry „Fabryka 1892” – wersja 2 (styl The Sims 3).

Tworzy:
  * proceduralne tekstury (drewno, cegła, tynk, bruk, tkaniny, trawa, ziemia) → PNG
  * meble, maszyny i elementy miasta jako modele z teksturami → GLB
  * postacie proporcjonalne ze szkieletem (armature) i animacjami:
    idle, walk, work, sit, sleep → GLB ze skinningiem

Uruchamianie (Blender jako moduł Pythona, bez okna):
    python -m pip install bpy
    python blender/generate_assets.py [katalog_modeli] [katalog_tekstur]

albo w zainstalowanym Blenderze:
    blender --background --python blender/generate_assets.py -- [katalog_modeli] [katalog_tekstur]

Jednostki: 1 m = 1 kafelek gry. Modele stoją na Z = 0 (po eksporcie Y = 0 w Godot),
przód modelu to -Y w Blenderze (= +Z w Godot).
"""
import math
import os
import sys
from math import radians

import bpy
import numpy as np
from mathutils import Matrix, Vector

# ---------------------------------------------------------------------------
# Paleta (wartości tak, jak mają wyglądać na ekranie – sRGB)
# ---------------------------------------------------------------------------
PAL = {
    "drewno_ciemne": (0.36, 0.22, 0.12),
    "drewno_jasne": (0.66, 0.48, 0.29),
    "drewno_szkolne": (0.50, 0.33, 0.18),
    "zelazo": (0.20, 0.21, 0.23),
    "zelazo_jasne": (0.38, 0.39, 0.41),
    "cegla": (0.60, 0.28, 0.19),
    "cegla_ciemna": (0.45, 0.20, 0.13),
    "tynk": (0.82, 0.78, 0.70),
    "len": (0.88, 0.84, 0.72),
    "posciel": (0.80, 0.76, 0.64),
    "koc": (0.50, 0.24, 0.22),
    "mosiadz": (0.76, 0.60, 0.26),
    "szklo": (0.80, 0.90, 0.95),
    "woda": (0.30, 0.45, 0.55),
    "liscie": (0.30, 0.46, 0.22),
    "kreda": (0.10, 0.14, 0.12),
    "papier": (0.93, 0.91, 0.83),
    "kaszana": (0.38, 0.19, 0.16),
    "zloto": (0.85, 0.70, 0.30),
    "czerwony": (0.65, 0.15, 0.12),
    "bialy": (0.95, 0.95, 0.93),
    "warzywa": (0.55, 0.65, 0.25),
    "jablka": (0.75, 0.25, 0.18),
    "piwo": (0.80, 0.60, 0.20),
    # postacie
    "skora": (0.88, 0.70, 0.57),
    "skora_dziecko": (0.92, 0.76, 0.64),
    "wlosy_ciemne": (0.22, 0.14, 0.09),
    "wlosy_jasne": (0.72, 0.56, 0.30),
    "wlosy_siwe": (0.70, 0.70, 0.68),
    "oko": (0.08, 0.08, 0.1),
    "ubranie_robotnik": (0.30, 0.33, 0.42),
    "kamizelka": (0.28, 0.20, 0.16),
    "koszula": (0.86, 0.84, 0.76),
    "ubranie_kobieta": (0.42, 0.25, 0.32),
    "chustka": (0.70, 0.30, 0.25),
    "fartuch": (0.88, 0.86, 0.78),
    "ubranie_chlopiec": (0.38, 0.32, 0.24),
    "ubranie_dziewczynka": (0.52, 0.36, 0.42),
    "czapka": (0.24, 0.22, 0.20),
    "buty": (0.14, 0.09, 0.06),
    "sutanna": (0.08, 0.08, 0.09),
    "surdut": (0.16, 0.16, 0.20),
    "cylinder": (0.1, 0.1, 0.1),
}

## Materiały, które dostają teksturę zamiast płaskiego koloru: nazwa → (generator, parametry)
TEXTURED = {
    "drewno_ciemne": ("wood", {}),
    "drewno_jasne": ("wood", {}),
    "drewno_szkolne": ("wood", {}),
    "cegla": ("brick", {}),
    "cegla_ciemna": ("brick", {}),
    "tynk": ("plaster", {}),
    "len": ("fabric", {}),
    "posciel": ("fabric", {}),
    "koc": ("fabric", {"stripes": True}),
    "zelazo": ("iron", {}),
    "zelazo_jasne": ("iron", {}),
    "ubranie_robotnik": ("fabric", {}),
    "ubranie_kobieta": ("fabric", {}),
    "ubranie_chlopiec": ("fabric", {}),
    "ubranie_dziewczynka": ("fabric", {}),
    "kamizelka": ("fabric", {}),
    "fartuch": ("fabric", {}),
    "koszula": ("fabric", {}),
    "sutanna": ("fabric", {}),
    "surdut": ("fabric", {}),
    "chustka": ("fabric", {"stripes": True}),
}

## Tekstury podłóg/ścian używane bezpośrednio przez Godot (nazwa pliku → generator, kolor)
FLOOR_TEXTURES = {
    "deski": ("wood", (0.60, 0.45, 0.28)),
    "deski_ciemne": ("wood", (0.46, 0.33, 0.20)),
    "bruk": ("cobble", (0.46, 0.45, 0.43)),
    "cegla": ("brick", (0.60, 0.28, 0.19)),
    "cegla_podloga": ("brick", (0.42, 0.31, 0.26)),
    "tynk": ("plaster", (0.82, 0.78, 0.70)),
    "trawa": ("grass", (0.38, 0.50, 0.26)),
    "ziemia": ("dirt", (0.48, 0.39, 0.28)),
    "drewno_sciana": ("wood", (0.48, 0.34, 0.21)),
    "kamien": ("cobble", (0.62, 0.60, 0.55)),
}

TEX_SIZE = 256
_materials = {}
_images = {}
TEX_DIR = None


def srgb_to_linear(c):
    return tuple(v ** 2.2 for v in c)


# ---------------------------------------------------------------------------
# Proceduralne tekstury (numpy)
# ---------------------------------------------------------------------------
_rng = np.random.default_rng(1892)


def _noise(size, scale, octaves=3):
    """Prosty szum wartościowy w zakresie 0..1 (interpolacja dwuliniowa siatek losowych)."""
    out = np.zeros((size, size), dtype=np.float32)
    amp = 1.0
    total = 0.0
    for o in range(octaves):
        n = max(2, int(scale / (2 ** o)))
        grid = _rng.random((n + 1, n + 1)).astype(np.float32)
        xs = np.linspace(0, n, size, endpoint=False)
        x0 = np.floor(xs).astype(int)
        fx = (xs - x0)[None, :]
        fy = (xs - x0)[:, None]
        a = grid[x0[:, None], x0[None, :]]
        b = grid[x0[:, None], (x0 + 1)[None, :]]
        c = grid[(x0 + 1)[:, None], x0[None, :]]
        d = grid[(x0 + 1)[:, None], (x0 + 1)[None, :]]
        fx = fx * fx * (3 - 2 * fx)
        fy = fy * fy * (3 - 2 * fy)
        v = (a * (1 - fx) + b * fx) * (1 - fy) + (c * (1 - fx) + d * fx) * fy
        out += v * amp
        total += amp
        amp *= 0.5
    return out / total


def _tex_wood(base):
    s = TEX_SIZE
    y, x = np.mgrid[0:s, 0:s].astype(np.float32)
    n = _noise(s, 6, 3)
    grain = 0.5 + 0.5 * np.sin((y / s) * 70.0 + n * 3.0 + (x / s) * 2.0)
    planks = ((x // (s // 4)) % 2) * 0.05
    seam = ((x % (s // 4)) < 2).astype(np.float32)
    return 0.88 + grain * 0.07 + planks - seam * 0.3 + (n - 0.5) * 0.08


def _tex_brick(base):
    s = TEX_SIZE
    y, x = np.mgrid[0:s, 0:s].astype(np.float32)
    bh, bw = s // 8, s // 4
    row = (y // bh).astype(int)
    xo = (x + (row % 2) * (bw // 2)) % bw
    yo = y % bh
    mortar = ((xo < 3) | (yo < 3)).astype(np.float32)
    n = _noise(s, 16, 2)
    per_brick = _noise(s, 6, 1)
    shade = 0.85 + (per_brick - 0.5) * 0.35 + (n - 0.5) * 0.12
    return shade * (1 - mortar) + mortar * 1.25


def _tex_plaster(base):
    n = _noise(TEX_SIZE, 12, 4)
    return 0.9 + (n - 0.5) * 0.18


def _tex_fabric(base, stripes=False):
    s = TEX_SIZE
    y, x = np.mgrid[0:s, 0:s].astype(np.float32)
    weave = 0.5 + 0.5 * np.sin(x * 1.3) * np.sin(y * 1.3)
    n = _noise(s, 10, 2)
    shade = 0.9 + weave * 0.12 + (n - 0.5) * 0.1
    if stripes:
        shade = shade + ((y // (s // 8)) % 2) * 0.18
    return shade


def _tex_iron(base):
    n = _noise(TEX_SIZE, 20, 4)
    scratches = _noise(TEX_SIZE, 60, 1)
    return 0.85 + (n - 0.5) * 0.3 + (scratches > 0.8) * 0.15


def _tex_cobble(base):
    s = TEX_SIZE
    y, x = np.mgrid[0:s, 0:s].astype(np.float32)
    cs = s // 6
    row = (y // cs).astype(int)
    xo = (x + (row % 2) * (cs // 2)) % cs
    yo = y % cs
    dx = (xo - cs / 2) / (cs / 2)
    dy = (yo - cs / 2) / (cs / 2)
    r = np.sqrt(dx * dx + dy * dy)
    stone = np.clip(1.15 - r * 0.45, 0.55, 1.1)
    per = _noise(s, 6, 1)
    return stone * (0.85 + (per - 0.5) * 0.3)


def _tex_grass(base):
    n = _noise(TEX_SIZE, 24, 4)
    fine = _noise(TEX_SIZE, 90, 1)
    return 0.85 + (n - 0.5) * 0.25 + (fine - 0.5) * 0.12


def _tex_dirt(base):
    n = _noise(TEX_SIZE, 14, 4)
    return 0.88 + (n - 0.5) * 0.3


GENERATORS_TEX = {
    "wood": _tex_wood, "brick": _tex_brick, "plaster": _tex_plaster, "fabric": _tex_fabric,
    "iron": _tex_iron, "cobble": _tex_cobble, "grass": _tex_grass, "dirt": _tex_dirt,
}


def make_texture(name, kind, color_srgb, **params):
    """Tworzy obraz (kolor × cieniowanie proceduralne), zapisuje PNG i pakuje do .blend."""
    if name in _images:
        return _images[name]
    shade = np.clip(GENERATORS_TEX[kind](color_srgb, **params), 0.0, 1.6)
    rgb = np.array(color_srgb, dtype=np.float32)
    px = np.clip(shade[..., None] * rgb[None, None, :], 0, 1)
    rgba = np.concatenate([px, np.ones((TEX_SIZE, TEX_SIZE, 1), dtype=np.float32)], axis=2)
    img = bpy.data.images.new(name, TEX_SIZE, TEX_SIZE, alpha=False)
    img.pixels.foreach_set(np.ascontiguousarray(rgba, dtype=np.float32).ravel())
    if TEX_DIR:
        img.filepath_raw = os.path.join(TEX_DIR, name + ".png")
        img.file_format = "PNG"
        img.save()
    img.pack()
    _images[name] = img
    return img


def mat(name):
    """Materiał z palety: z teksturą (jeśli w TEXTURED) lub płaskim kolorem."""
    if name in _materials:
        return _materials[name]
    m = bpy.data.materials.new("M_" + name)
    m.use_nodes = True
    nodes = m.node_tree.nodes
    bsdf = nodes.get("Principled BSDF")
    bsdf.inputs["Roughness"].default_value = 0.8
    if name in TEXTURED:
        kind, params = TEXTURED[name]
        img = make_texture("tex_" + name, kind, PAL[name], **params)
        tex = nodes.new("ShaderNodeTexImage")
        tex.image = img
        tex.location = (-400, 300)
        m.node_tree.links.new(tex.outputs["Color"], bsdf.inputs["Base Color"])
    else:
        bsdf.inputs["Base Color"].default_value = (*srgb_to_linear(PAL[name]), 1.0)
    if name in ("zelazo", "zelazo_jasne", "mosiadz", "zloto"):
        bsdf.inputs["Metallic"].default_value = 0.7
        bsdf.inputs["Roughness"].default_value = 0.4
    if name == "szklo":
        bsdf.inputs["Roughness"].default_value = 0.1
    _materials[name] = m
    return m


# ---------------------------------------------------------------------------
# Budowanie brył
# ---------------------------------------------------------------------------
def clear_scene():
    bpy.ops.object.select_all(action="SELECT")
    bpy.ops.object.delete(use_global=False)
    for coll in (bpy.data.meshes, bpy.data.armatures, bpy.data.actions):
        for block in list(coll):
            if block.users == 0:
                coll.remove(block)


def box_uv(obj, scale=1.0):
    """Rzutowanie sześcienne UV w metrach – tekstura nie rozciąga się na długich belkach."""
    me = obj.data
    if not me.uv_layers:
        me.uv_layers.new(name="UVMap")
    uv = me.uv_layers.active.data
    for poly in me.polygons:
        n = poly.normal
        ax = max(range(3), key=lambda i: abs(n[i]))
        for li in poly.loop_indices:
            co = me.vertices[me.loops[li].vertex_index].co
            if ax == 0:
                u, v = co.y, co.z
            elif ax == 1:
                u, v = co.x, co.z
            else:
                u, v = co.x, co.y
            uv[li].uv = (u * scale, v * scale)


class Builder:
    """Składa jeden model z prostych bryl; opcjonalnie przypisuje części do kości."""

    def __init__(self, name):
        self.name = name
        self.parts = []

    def _add(self, obj, material, bone=None):
        obj.data.materials.append(mat(material))
        if bone:
            vg = obj.vertex_groups.new(name=bone)
            vg.add(list(range(len(obj.data.vertices))), 1.0, "REPLACE")
        self.parts.append(obj)
        return obj

    def box(self, size, loc, material, rot=(0, 0, 0), bone=None):
        bpy.ops.mesh.primitive_cube_add(size=1.0, location=loc, rotation=rot)
        o = bpy.context.active_object
        o.scale = size
        return self._add(o, material, bone)

    def cyl(self, radius, depth, loc, material, verts=12, rot=(0, 0, 0), bone=None):
        bpy.ops.mesh.primitive_cylinder_add(vertices=verts, radius=radius, depth=depth, location=loc, rotation=rot)
        return self._add(bpy.context.active_object, material, bone)

    def cone(self, r1, r2, depth, loc, material, verts=12, rot=(0, 0, 0), bone=None):
        bpy.ops.mesh.primitive_cone_add(vertices=verts, radius1=r1, radius2=r2, depth=depth, location=loc, rotation=rot)
        return self._add(bpy.context.active_object, material, bone)

    def sphere(self, radius, loc, material, scale=(1, 1, 1), bone=None, segments=16, rings=10):
        bpy.ops.mesh.primitive_uv_sphere_add(segments=segments, ring_count=rings, radius=radius, location=loc)
        o = bpy.context.active_object
        o.scale = scale
        return self._add(o, material, bone)

    def finish(self, smooth=False, uv_scale=1.0):
        for p in self.parts:
            p.select_set(True)
        bpy.context.view_layer.objects.active = self.parts[0]
        bpy.ops.object.join()
        obj = bpy.context.active_object
        obj.name = self.name
        bpy.ops.object.transform_apply(location=False, rotation=True, scale=True)
        box_uv(obj, uv_scale)
        if smooth:
            bpy.ops.object.shade_smooth()
        else:
            bpy.ops.object.shade_flat()
        return obj


# ---------------------------------------------------------------------------
# Meble i wyposażenie mieszkania robotniczego
# ---------------------------------------------------------------------------
def lozko():
    b = Builder("lozko")
    b.box((0.95, 1.95, 0.08), (0, 0, 0.42), "drewno_ciemne")
    for x in (-0.44, 0.44):
        for y in (-0.93, 0.93):
            b.box((0.07, 0.07, 0.45), (x, y, 0.225), "drewno_ciemne")
    b.box((0.95, 0.07, 0.85), (0, -0.96, 0.43), "drewno_ciemne")
    b.box((0.95, 0.07, 0.65), (0, 0.96, 0.33), "drewno_ciemne")
    b.box((0.88, 1.85, 0.15), (0, 0, 0.54), "posciel")
    b.box((0.86, 1.2, 0.08), (0, 0.3, 0.65), "koc")
    b.box((0.6, 0.35, 0.1), (0, -0.7, 0.66), "len")
    return b.finish()


def stol():
    b = Builder("stol")
    b.box((0.9, 1.8, 0.06), (0, 0, 0.75), "drewno_jasne")
    for x in (-0.38, 0.38):
        for y in (-0.8, 0.8):
            b.box((0.07, 0.07, 0.72), (x, y, 0.36), "drewno_jasne")
    b.box((0.3, 0.4, 0.02), (0.1, -0.4, 0.79), "papier")
    return b.finish()


def krzeslo():
    b = Builder("krzeslo")
    b.box((0.42, 0.42, 0.05), (0, 0, 0.45), "drewno_jasne")
    for x in (-0.17, 0.17):
        for y in (-0.17, 0.17):
            b.box((0.05, 0.05, 0.45), (x, y, 0.225), "drewno_jasne")
    b.box((0.42, 0.05, 0.5), (0, 0.19, 0.72), "drewno_jasne")
    return b.finish()


def piec():
    b = Builder("piec")
    b.box((0.9, 0.9, 0.85), (0, 0, 0.425), "tynk")
    b.box((0.92, 0.92, 0.06), (0, 0, 0.88), "zelazo")
    b.cyl(0.14, 0.02, (0.2, 0.15, 0.92), "zelazo_jasne")
    b.cyl(0.14, 0.02, (-0.2, -0.15, 0.92), "zelazo_jasne")
    b.box((0.35, 0.06, 0.3), (0, -0.46, 0.35), "zelazo")
    b.cyl(0.09, 1.3, (-0.3, 0.3, 1.5), "zelazo")
    b.box((0.4, 0.3, 0.25), (0.15, 0.1, 1.08), "zelazo_jasne")
    return b.finish()


def kredens():
    b = Builder("kredens")
    b.box((0.95, 0.45, 0.9), (0, 0, 0.45), "drewno_ciemne")
    b.box((0.95, 0.35, 0.9), (0, 0.05, 1.4), "drewno_ciemne")
    b.box((0.85, 0.02, 0.4), (0, -0.13, 1.45), "szklo")
    b.box((0.3, 0.02, 0.15), (-0.2, -0.14, 1.2), "papier")
    b.box((0.3, 0.02, 0.15), (0.2, -0.14, 1.2), "papier")
    return b.finish()


def balia():
    b = Builder("balia")
    b.cone(0.38, 0.45, 0.5, (0, 0, 0.25), "drewno_jasne", verts=14)
    b.cyl(0.46, 0.03, (0, 0, 0.3), "zelazo")
    b.cyl(0.40, 0.02, (0, 0, 0.47), "woda")
    b.box((0.08, 0.6, 0.06), (0.3, 0, 0.5), "drewno_ciemne")
    return b.finish()


def wiadro():
    b = Builder("wiadro")
    b.cone(0.14, 0.17, 0.32, (0, 0, 0.16), "zelazo_jasne", verts=10)
    b.cyl(0.14, 0.02, (0, 0, 0.3), "woda")
    return b.finish()


def studnia():
    b = Builder("studnia")
    b.cyl(0.5, 0.8, (0, 0, 0.4), "cegla", verts=10)
    b.cyl(0.42, 0.04, (0, 0, 0.8), "woda", verts=10)
    for x in (-0.5, 0.5):
        b.box((0.08, 0.08, 1.8), (x, 0, 0.9), "drewno_ciemne")
    b.cyl(0.06, 1.1, (0, 0, 1.4), "drewno_ciemne", rot=(0, math.pi / 2, 0))
    b.box((1.3, 0.9, 0.06), (0, 0, 1.85), "drewno_ciemne")
    b.box((0.06, 0.4, 0.06), (0.6, 0.15, 1.4), "zelazo")
    return b.finish()


def wychodek():
    b = Builder("wychodek")
    b.box((0.95, 0.95, 2.0), (0, 0, 1.0), "drewno_ciemne")
    b.box((0.4, 0.04, 1.6), (0, -0.49, 0.85), "drewno_jasne")
    b.box((0.12, 0.05, 0.3), (0, -0.5, 1.75), "zelazo")
    b.box((1.1, 1.1, 0.08), (0, 0, 2.05), "zelazo")
    return b.finish()


def lampa():
    b = Builder("lampa")
    b.box((0.4, 0.4, 0.6), (0, 0, 0.3), "drewno_jasne")
    b.cyl(0.08, 0.1, (0, 0, 0.65), "mosiadz")
    b.cyl(0.05, 0.3, (0, 0, 0.85), "szklo")
    b.sphere(0.04, (0, 0, 0.82), "mosiadz")
    return b.finish()


def polka_ksiazki():
    b = Builder("polka_ksiazki")
    b.box((0.9, 0.3, 1.7), (0, 0, 0.85), "drewno_ciemne")
    for z in (0.5, 1.0, 1.5):
        b.box((0.82, 0.24, 0.04), (0, 0, z), "drewno_jasne")
    cols = ["czerwony", "liscie", "ubranie_robotnik", "koc", "mosiadz"]
    for row, z in enumerate((0.7, 1.2)):
        for i in range(5):
            b.box((0.12, 0.2, 0.32), (-0.32 + i * 0.16, 0, z), cols[(i + row) % len(cols)])
    return b.finish()


def kolyska():
    b = Builder("kolyska")
    b.box((0.5, 0.9, 0.3), (0, 0, 0.45), "drewno_jasne")
    b.box((0.44, 0.84, 0.06), (0, 0, 0.6), "len")
    for y in (-0.4, 0.4):
        b.cyl(0.3, 0.06, (0, y, 0.3), "drewno_ciemne", rot=(math.pi / 2, 0, 0), verts=8)
    return b.finish()


# ---------------------------------------------------------------------------
# Fabryka
# ---------------------------------------------------------------------------
def krosno():
    b = Builder("krosno")
    b.box((1.8, 1.6, 0.1), (0, 0, 0.05), "zelazo")
    for x in (-0.85, 0.85):
        for y in (-0.7, 0.7):
            b.box((0.1, 0.1, 1.6), (x, y, 0.8), "zelazo")
    b.box((1.9, 0.12, 0.12), (0, -0.7, 1.6), "zelazo")
    b.box((1.9, 0.12, 0.12), (0, 0.7, 1.6), "zelazo")
    b.cyl(0.18, 1.7, (0, 0.6, 1.1), "drewno_jasne", rot=(0, math.pi / 2, 0))
    b.cyl(0.14, 1.7, (0, -0.65, 0.5), "drewno_jasne", rot=(0, math.pi / 2, 0))
    b.box((1.6, 1.2, 0.02), (0, 0.0, 0.9), "len", rot=(-0.3, 0, 0))
    b.box((1.7, 0.08, 0.5), (0, -0.1, 1.0), "drewno_ciemne")
    b.cyl(0.35, 0.08, (1.0, 0, 0.9), "zelazo_jasne", rot=(0, math.pi / 2, 0))
    b.box((0.06, 0.06, 1.4), (1.0, 0, 1.6), "zelazo_jasne")
    return b.finish()


def przedzarka():
    b = Builder("przedzarka")
    b.box((0.8, 2.8, 0.9), (0, 0, 0.45), "zelazo")
    b.box((0.9, 2.9, 0.05), (0, 0, 0.92), "zelazo_jasne")
    for i in range(7):
        y = -1.2 + i * 0.4
        b.cyl(0.05, 0.4, (0.2, y, 1.15), "len", verts=8)
        b.cyl(0.07, 0.25, (-0.2, y, 1.4), "drewno_jasne", verts=8)
    b.box((0.1, 2.8, 0.1), (-0.2, 0, 1.6), "zelazo")
    b.cyl(0.3, 0.1, (0, 1.5, 0.6), "zelazo_jasne", rot=(math.pi / 2, 0, 0))
    return b.finish()


def maszyna_parowa():
    b = Builder("maszyna_parowa")
    b.box((1.8, 2.8, 0.3), (0, 0, 0.15), "cegla")
    b.cyl(0.55, 2.2, (0, -0.2, 0.9), "zelazo", rot=(math.pi / 2, 0, 0), verts=16)
    b.cyl(0.9, 0.2, (0, 1.3, 1.2), "zelazo_jasne", rot=(math.pi / 2, 0, 0), verts=20)
    b.box((0.2, 0.2, 1.2), (0, 1.3, 0.6), "zelazo")
    b.box((0.3, 1.4, 0.2), (0.6, 0.6, 1.4), "zelazo_jasne")
    b.cyl(0.15, 1.0, (-0.5, -0.9, 2.0), "zelazo", verts=10)
    b.cyl(0.08, 0.3, (0.3, -1.2, 1.7), "mosiadz", verts=8)
    return b.finish()


def komin():
    b = Builder("komin")
    b.box((1.4, 1.4, 1.0), (0, 0, 0.5), "cegla_ciemna")
    b.cone(0.6, 0.42, 11.0, (0, 0, 6.5), "cegla", verts=12)
    b.cyl(0.5, 0.4, (0, 0, 12.1), "cegla_ciemna", verts=12)
    return b.finish(uv_scale=0.5)


def zegar_fabryczny():
    b = Builder("zegar_fabryczny")
    b.box((0.8, 0.1, 0.8), (0, 0, 2.2), "drewno_ciemne")
    b.cyl(0.33, 0.04, (0, -0.06, 2.2), "papier", rot=(math.pi / 2, 0, 0), verts=16)
    b.box((0.04, 0.02, 0.26), (0, -0.09, 2.32), "kreda")
    b.box((0.2, 0.02, 0.04), (0.09, -0.09, 2.2), "kreda")
    b.box((0.06, 0.12, 2.0), (0, 0, 1.0), "drewno_ciemne")
    return b.finish()


def wozek():
    b = Builder("wozek")
    b.box((0.9, 1.6, 0.1), (0, 0, 0.5), "drewno_jasne")
    for x in (-0.5, 0.5):
        b.cyl(0.35, 0.08, (x, 0, 0.35), "drewno_ciemne", rot=(0, math.pi / 2, 0), verts=12)
    b.box((0.06, 1.0, 0.06), (-0.3, 1.2, 0.6), "drewno_jasne")
    b.box((0.06, 1.0, 0.06), (0.3, 1.2, 0.6), "drewno_jasne")
    b.box((0.8, 0.6, 0.6), (0, -0.4, 0.85), "len")
    b.box((0.8, 0.6, 0.5), (0, 0.3, 0.8), "len")
    return b.finish()


def brama_fabryczna():
    b = Builder("brama_fabryczna")
    for y in (-1.4, 1.4):
        b.box((0.5, 0.5, 3.0), (0, y, 1.5), "cegla")
    b.box((0.5, 3.3, 0.5), (0, 0, 3.2), "cegla")
    b.box((0.08, 2.3, 2.6), (0, 0, 1.3), "zelazo")
    for i in range(6):
        b.box((0.12, 0.08, 2.6), (0, -1.0 + i * 0.4, 1.3), "zelazo_jasne")
    b.box((0.2, 1.6, 0.4), (0, 0, 3.0), "mosiadz")
    return b.finish()


# ---------------------------------------------------------------------------
# Szkoła, sklep, ulica, kościół, szynk, targ
# ---------------------------------------------------------------------------
def lawka_szkolna():
    b = Builder("lawka_szkolna")
    b.box((0.9, 0.4, 0.05), (0, 0.2, 0.7), "drewno_szkolne", rot=(-0.15, 0, 0))
    b.box((0.9, 0.05, 0.6), (0, 0.4, 0.35), "drewno_szkolne")
    b.box((0.9, 0.3, 0.05), (0, -0.3, 0.45), "drewno_szkolne")
    for x in (-0.4, 0.4):
        b.box((0.06, 0.06, 0.45), (x, -0.3, 0.22), "zelazo")
    b.box((0.25, 0.18, 0.03), (0.15, 0.2, 0.74), "kreda")
    b.box((0.2, 0.26, 0.02), (-0.2, 0.2, 0.74), "papier")
    return b.finish()


def tablica():
    b = Builder("tablica")
    b.box((1.9, 0.08, 1.2), (0, 0, 1.4), "drewno_szkolne")
    b.box((1.76, 0.02, 1.06), (0, -0.05, 1.4), "kreda")
    b.box((0.1, 0.12, 2.0), (-0.9, 0, 1.0), "drewno_szkolne")
    b.box((0.1, 0.12, 2.0), (0.9, 0, 1.0), "drewno_szkolne")
    b.box((0.25, 0.03, 0.02), (-0.5, -0.07, 1.2), "papier")
    b.box((0.5, 0.03, 0.02), (0.1, -0.07, 1.5), "papier")
    return b.finish()


def lada_sklepowa():
    b = Builder("lada_sklepowa")
    b.box((0.9, 1.9, 0.95), (0, 0, 0.475), "drewno_ciemne")
    b.box((1.0, 2.0, 0.05), (0, 0, 0.98), "drewno_jasne")
    b.box((0.3, 0.3, 0.2), (0.2, -0.6, 1.1), "len")
    b.box((0.25, 0.25, 0.3), (-0.2, 0.3, 1.15), "kaszana")
    b.cyl(0.12, 0.25, (0.2, 0.6, 1.12), "mosiadz", verts=8)
    return b.finish()


def latarnia():
    b = Builder("latarnia")
    b.cyl(0.14, 0.3, (0, 0, 0.15), "zelazo", verts=8)
    b.cyl(0.05, 3.2, (0, 0, 1.75), "zelazo", verts=8)
    b.box((0.35, 0.35, 0.45), (0, 0, 3.55), "szklo")
    b.cone(0.3, 0.05, 0.25, (0, 0, 3.9), "zelazo", verts=4)
    return b.finish()


def drzewo():
    b = Builder("drzewo")
    b.cyl(0.14, 1.6, (0, 0, 0.8), "drewno_ciemne", verts=8)
    b.sphere(0.9, (0, 0, 2.2), "liscie")
    b.sphere(0.6, (0.5, 0.3, 2.8), "liscie")
    b.sphere(0.55, (-0.5, -0.2, 2.7), "liscie")
    return b.finish(smooth=True)


def lawka_parkowa():
    b = Builder("lawka_parkowa")
    b.box((0.4, 1.8, 0.05), (0, 0, 0.45), "drewno_jasne")
    b.box((0.05, 1.8, 0.4), (0.2, 0, 0.72), "drewno_jasne")
    for y in (-0.8, 0.8):
        b.box((0.4, 0.06, 0.45), (0, y, 0.225), "zelazo")
    return b.finish()


def oltarz():
    """Ołtarz z krzyżem i świecami – kościół (2 x 1)."""
    b = Builder("oltarz")
    b.box((1.8, 0.8, 1.0), (0, 0, 0.5), "tynk")
    b.box((1.9, 0.9, 0.06), (0, 0, 1.03), "bialy")
    b.box((0.12, 0.12, 1.6), (0, 0.25, 1.85), "zloto")
    b.box((0.7, 0.12, 0.12), (0, 0.25, 2.3), "zloto")
    for x in (-0.6, 0.6):
        b.cyl(0.04, 0.5, (x, 0, 1.3), "zloto", verts=8)
        b.sphere(0.05, (x, 0, 1.58), "piwo")
    return b.finish()


def lawka_koscielna():
    """Ławka kościelna z klęcznikiem (1 x 2)."""
    b = Builder("lawka_koscielna")
    b.box((0.45, 1.9, 0.05), (0, 0, 0.45), "drewno_ciemne")
    b.box((0.05, 1.9, 0.5), (0.22, 0, 0.7), "drewno_ciemne")
    for y in (-0.9, 0.9):
        b.box((0.45, 0.06, 0.95), (0, y, 0.475), "drewno_ciemne")
    b.box((0.2, 1.9, 0.05), (-0.45, 0, 0.15), "drewno_ciemne")
    return b.finish()


def szynkwas():
    """Lada w szynku z beczką i kuflami (1 x 2)."""
    b = Builder("szynkwas")
    b.box((0.9, 1.9, 1.0), (0, 0, 0.5), "drewno_ciemne")
    b.box((1.0, 2.0, 0.06), (0, 0, 1.03), "drewno_jasne")
    b.cyl(0.3, 0.6, (0.1, 0.5, 1.36), "drewno_ciemne", rot=(0, math.pi / 2, 0), verts=12)
    b.cyl(0.32, 0.04, (-0.1, 0.5, 1.36), "zelazo", rot=(0, math.pi / 2, 0), verts=12)
    for i in range(3):
        b.cyl(0.06, 0.14, (-0.2 + i * 0.2, -0.5, 1.13), "szklo", verts=8)
        b.cyl(0.05, 0.03, (-0.2 + i * 0.2, -0.5, 1.21), "bialy", verts=8)
    return b.finish()


def stol_szynk():
    """Stolik w szynku z kuflem (1 x 1)."""
    b = Builder("stol_szynk")
    b.cyl(0.42, 0.05, (0, 0, 0.74), "drewno_ciemne", verts=12)
    b.cyl(0.07, 0.72, (0, 0, 0.36), "drewno_ciemne", verts=8)
    b.cyl(0.3, 0.05, (0, 0, 0.03), "drewno_ciemne", verts=12)
    b.cyl(0.06, 0.14, (0.15, 0.1, 0.83), "szklo", verts=8)
    b.cyl(0.05, 0.03, (0.15, 0.1, 0.91), "bialy", verts=8)
    return b.finish()


def beczka():
    b = Builder("beczka")
    b.cone(0.3, 0.34, 0.45, (0, 0, 0.225), "drewno_jasne", verts=12)
    b.cone(0.34, 0.3, 0.45, (0, 0, 0.675), "drewno_jasne", verts=12)
    for z in (0.15, 0.45, 0.75):
        b.cyl(0.345, 0.03, (0, 0, z), "zelazo", verts=12)
    return b.finish()


def stragan():
    """Stragan targowy z daszkiem, warzywami i jabłkami (2 x 2)."""
    b = Builder("stragan")
    b.box((1.8, 0.9, 0.8), (0, -0.4, 0.4), "drewno_jasne")
    b.box((1.9, 1.0, 0.05), (0, -0.4, 0.83), "drewno_ciemne")
    b.box((0.7, 0.6, 0.25), (-0.45, -0.4, 0.95), "warzywa")
    b.box((0.7, 0.6, 0.22), (0.45, -0.4, 0.94), "jablka")
    for x in (-0.9, 0.9):
        for y in (-0.85, 0.85):
            b.box((0.07, 0.07, 2.2), (x, y, 1.1), "drewno_ciemne")
    b.box((2.1, 2.1, 0.05), (0, 0, 2.2), "chustka", rot=(0.12, 0, 0))
    return b.finish()


def kosz():
    b = Builder("kosz")
    b.cone(0.18, 0.24, 0.3, (0, 0, 0.15), "drewno_jasne", verts=10)
    b.sphere(0.12, (0, 0, 0.3), "jablka")
    return b.finish()


# ---------------------------------------------------------------------------
# Postacie ze szkieletem i animacjami
# ---------------------------------------------------------------------------
def make_armature(name, bones):
    arm = bpy.data.armatures.new(name + "_armature")
    arm_obj = bpy.data.objects.new(name + "_rig", arm)
    bpy.context.collection.objects.link(arm_obj)
    bpy.ops.object.select_all(action="DESELECT")
    bpy.context.view_layer.objects.active = arm_obj
    arm_obj.select_set(True)
    bpy.ops.object.mode_set(mode="EDIT")
    eb = {}
    for bname, (head, tail, parent) in bones.items():
        b = arm.edit_bones.new(bname)
        b.head = Vector(head)
        b.tail = Vector(tail)
        if parent:
            b.parent = eb[parent]
        eb[bname] = b
    bpy.ops.object.mode_set(mode="OBJECT")
    return arm_obj


class Rig:
    """Kluczowanie póz w osiach świata – niezależnie od orientacji kości."""

    def __init__(self, arm_obj):
        self.arm = arm_obj
        self.rest = {b.name: b.matrix_local.to_3x3() for b in arm_obj.data.bones}
        for pb in arm_obj.pose.bones:
            pb.rotation_mode = "QUATERNION"

    def rot(self, bone, frame, rx=0.0, ry=0.0, rz=0.0):
        """Obrót kości (stopnie) wokół osi świata X, Y, Z – względem rodzica."""
        R = Matrix.Rotation(radians(rz), 3, "Z") @ Matrix.Rotation(radians(ry), 3, "Y") @ Matrix.Rotation(radians(rx), 3, "X")
        B = self.rest[bone]
        pb = self.arm.pose.bones[bone]
        pb.rotation_quaternion = (B.inverted() @ R @ B).to_quaternion()
        pb.keyframe_insert("rotation_quaternion", frame=frame)

    def loc(self, bone, frame, dx=0.0, dy=0.0, dz=0.0):
        B = self.rest[bone]
        pb = self.arm.pose.bones[bone]
        pb.location = B.inverted() @ Vector((dx, dy, dz))
        pb.keyframe_insert("location", frame=frame)

    def reset(self, frame):
        for pb in self.arm.pose.bones:
            pb.rotation_quaternion = (1, 0, 0, 0)
            pb.location = (0, 0, 0)
            pb.keyframe_insert("rotation_quaternion", frame=frame)
            pb.keyframe_insert("location", frame=frame)


def _new_action(arm_obj, name):
    action = bpy.data.actions.new(name)
    if arm_obj.animation_data is None:
        arm_obj.animation_data_create()
    arm_obj.animation_data.action = action
    return action


def _push_nla(arm_obj, action, name, length):
    ad = arm_obj.animation_data
    ad.action = None
    track = ad.nla_tracks.new()
    track.name = name
    strip = track.strips.new(name, 1, action)
    strip.name = name
    strip.action_frame_start = 1
    strip.action_frame_end = length


def animate(arm_obj, h):
    """Zestaw animacji: idle, walk, work, sit, sleep. h – wzrost (skaluje przesunięcia)."""
    rig = Rig(arm_obj)
    s = h / 1.75

    a = _new_action(arm_obj, "idle")
    rig.reset(1)
    for f, k in ((1, 0.0), (25, 1.0), (49, 0.0)):
        rig.rot("chest", f, rx=-2.0 * k)
        rig.rot("head", f, rz=4.0 * k)
        rig.rot("upperarm.L", f, rx=3.0 * k)
        rig.rot("upperarm.R", f, rx=-3.0 * k)
        rig.loc("hips", f, dz=0.01 * k)
    _push_nla(arm_obj, a, "idle", 49)

    a = _new_action(arm_obj, "walk")
    rig.reset(1)
    for i, f in enumerate((1, 7, 13, 19, 25)):
        ph = i * math.pi / 2
        sw = math.sin(ph)
        rig.rot("thigh.L", f, rx=-32 * sw)
        rig.rot("thigh.R", f, rx=32 * sw)
        rig.rot("shin.L", f, rx=40 * max(0.0, math.cos(ph)) if sw > -0.1 else 10)
        rig.rot("shin.R", f, rx=40 * max(0.0, -math.cos(ph)) if sw < 0.1 else 10)
        rig.rot("upperarm.L", f, rx=25 * sw)
        rig.rot("upperarm.R", f, rx=-25 * sw)
        rig.rot("forearm.L", f, rx=-15)
        rig.rot("forearm.R", f, rx=-15)
        rig.rot("chest", f, rz=4 * sw)
        rig.loc("hips", f, dz=0.025 * abs(math.cos(ph)) * s)
    _push_nla(arm_obj, a, "walk", 25)

    a = _new_action(arm_obj, "work")
    rig.reset(1)
    for i, f in enumerate((1, 13, 25, 37, 49)):
        ph = i * math.pi / 2
        sw = math.sin(ph)
        rig.rot("chest", f, rx=-10 + 3 * sw)
        rig.rot("upperarm.L", f, rx=-55 + 15 * sw, rz=-10)
        rig.rot("upperarm.R", f, rx=-55 - 15 * sw, rz=10)
        rig.rot("forearm.L", f, rx=-40 - 10 * sw)
        rig.rot("forearm.R", f, rx=-40 + 10 * sw)
        rig.rot("head", f, rx=-12)
    _push_nla(arm_obj, a, "work", 49)

    a = _new_action(arm_obj, "sit")
    rig.reset(1)
    for f in (1, 25):
        rig.loc("hips", f, dz=-0.40 * s)
        rig.rot("thigh.L", f, rx=-85, rz=-5)
        rig.rot("thigh.R", f, rx=-85, rz=5)
        rig.rot("shin.L", f, rx=80)
        rig.rot("shin.R", f, rx=80)
        rig.rot("upperarm.L", f, rx=-30)
        rig.rot("upperarm.R", f, rx=-30)
        rig.rot("forearm.L", f, rx=-50)
        rig.rot("forearm.R", f, rx=-50)
        rig.rot("chest", f, rx=-4)
    _push_nla(arm_obj, a, "sit", 25)

    a = _new_action(arm_obj, "sleep")
    rig.reset(1)
    for f, k in ((1, 0.0), (25, 1.0), (49, 0.0)):
        rig.rot("hips", f, rx=-90)
        rig.loc("hips", f, dz=-0.92 * s + 0.62)
        rig.rot("upperarm.L", f, rz=-10)
        rig.rot("upperarm.R", f, rz=10)
        rig.rot("chest", f, rx=-1.5 * k)
    _push_nla(arm_obj, a, "sleep", 49)


def postac(name, height, ubranie, wlosy, skora="skora", czapka=None, kapelusz=None, kamizelka=False,
           fartuch=False, spodnica=False, chustka=False, warkocze=False, sutanna=False, broda=False):
    """Proporcjonalna postać (ok. 7 głów) z rigiem. Przód = -Y."""
    s = height / 1.75
    head_r = 0.115 * (s ** 0.75)
    z_hip = 0.92 * s
    z_knee = 0.47 * s
    z_ankle = 0.06 * s
    z_chest = 1.15 * s
    z_neck = 1.47 * s
    z_head = z_neck + 0.05 * s
    z_top = z_head + head_r * 2.0
    sh = 0.19 * s
    z_shoulder = 1.42 * s
    z_elbow = z_shoulder - 0.30 * s
    z_wrist = z_elbow - 0.27 * s

    bones = {
        "hips": ((0, 0, z_hip), (0, 0, z_chest), None),
        "chest": ((0, 0, z_chest), (0, 0, z_neck), "hips"),
        "head": ((0, 0, z_neck), (0, 0, z_top), "chest"),
        "upperarm.L": ((sh, 0, z_shoulder), (sh, 0, z_elbow), "chest"),
        "forearm.L": ((sh, 0, z_elbow), (sh, 0, z_wrist), "upperarm.L"),
        "upperarm.R": ((-sh, 0, z_shoulder), (-sh, 0, z_elbow), "chest"),
        "forearm.R": ((-sh, 0, z_elbow), (-sh, 0, z_wrist), "upperarm.R"),
        "thigh.L": ((0.09 * s, 0, z_hip), (0.09 * s, 0, z_knee), "hips"),
        "shin.L": ((0.09 * s, 0, z_knee), (0.09 * s, 0, z_ankle), "thigh.L"),
        "thigh.R": ((-0.09 * s, 0, z_hip), (-0.09 * s, 0, z_knee), "hips"),
        "shin.R": ((-0.09 * s, 0, z_knee), (-0.09 * s, 0, z_ankle), "thigh.R"),
    }
    arm_obj = make_armature(name, bones)

    b = Builder(name)
    torso_mat = ubranie
    b.sphere(0.17 * s, (0, 0, z_hip + 0.02 * s), ubranie, scale=(1.0, 0.75, 0.55), bone="hips")
    b.cone(0.17 * s, 0.20 * s, z_neck - z_chest + 0.05 * s, (0, 0, (z_chest + z_neck) / 2), torso_mat, verts=14, bone="chest")
    b.sphere(0.20 * s, (0, 0, z_shoulder), torso_mat, scale=(1.05, 0.7, 0.35), bone="chest")
    if kamizelka:
        b.cone(0.18 * s, 0.205 * s, (z_neck - z_chest) * 0.8, (0, 0, (z_chest + z_neck) / 2 - 0.02 * s), "kamizelka", verts=14, bone="chest")
        b.box((0.09 * s, 0.02, 0.28 * s), (0, -0.19 * s, (z_chest + z_neck) / 2), "koszula", bone="chest")
    if fartuch:
        b.box((0.26 * s, 0.02, 0.32 * s), (0, -0.19 * s, z_chest + 0.1 * s), "fartuch", bone="chest")
        b.cone(0.17 * s, 0.26 * s, 0.75 * s, (0, -0.06 * s, z_hip - 0.36 * s), "fartuch", verts=14, bone="hips")
    if spodnica or sutanna:
        b.cone(0.17 * s, 0.30 * s, z_hip - 0.04 * s, (0, 0, z_hip / 2), "sutanna" if sutanna else ubranie, verts=16, bone="hips")
        if sutanna:
            b.box((0.26 * s, 0.03, 0.05 * s), (0, -0.19 * s, z_neck - 0.02 * s), "bialy", bone="chest")
    else:
        for side, sx in (("L", 1), ("R", -1)):
            b.cone(0.085 * s, 0.065 * s, z_hip - z_knee, (sx * 0.09 * s, 0, (z_hip + z_knee) / 2), ubranie, verts=10, bone="thigh." + side)
            b.cone(0.065 * s, 0.05 * s, z_knee - z_ankle, (sx * 0.09 * s, 0, (z_knee + z_ankle) / 2), ubranie, verts=10, bone="shin." + side)
    for side, sx in (("L", 1), ("R", -1)):
        b.box((0.11 * s, 0.24 * s, 0.07 * s), (sx * 0.09 * s, -0.04 * s, 0.035 * s), "buty", bone="shin." + side)
        b.cone(0.065 * s, 0.05 * s, z_shoulder - z_elbow, (sx * sh, 0, (z_shoulder + z_elbow) / 2), torso_mat, verts=10, bone="upperarm." + side)
        b.cone(0.05 * s, 0.045 * s, z_elbow - z_wrist, (sx * sh, 0, (z_elbow + z_wrist) / 2), torso_mat if not fartuch else "koszula", verts=10, bone="forearm." + side)
        b.sphere(0.05 * s, (sx * sh, 0, z_wrist - 0.03 * s), skora, scale=(1, 0.7, 1.3), bone="forearm." + side)
    b.cyl(0.05 * s, 0.08 * s, (0, 0, z_neck + 0.02 * s), skora, verts=10, bone="head")
    b.sphere(head_r, (0, 0, z_head + head_r), skora, scale=(1.0, 1.05, 1.15), bone="head")
    for sx in (-1, 1):
        b.sphere(0.018 * s, (sx * 0.045 * s, -head_r * 0.92, z_head + head_r * 1.05), "oko", bone="head", segments=8, rings=6)
    b.sphere(0.02 * s, (0, -head_r * 1.02, z_head + head_r * 0.85), skora, bone="head", segments=8, rings=6)
    if not czapka or chustka:
        hair = "chustka" if chustka else wlosy
        b.sphere(head_r * 1.08, (0, 0.02 * s, z_head + head_r * 1.12), hair, scale=(1.0, 1.0, 0.95), bone="head")
        b.box((head_r * 2.0, head_r * 0.6, head_r * 0.5), (0, head_r * 0.85, z_head + head_r * 0.7), hair, bone="head")
    else:
        b.sphere(head_r * 1.04, (0, 0.02 * s, z_head + head_r * 1.05), wlosy, scale=(1.0, 1.0, 0.9), bone="head")
    if warkocze:
        for sx in (-1, 1):
            b.cyl(0.02 * s, 0.3 * s, (sx * head_r * 0.95, 0.02, z_head + head_r * 0.6 - 0.1 * s), wlosy, verts=8, bone="head")
    if chustka:
        b.box((0.08 * s, 0.03, 0.18 * s), (0, head_r * 1.0, z_head + head_r * 0.2), "chustka", bone="head")
    if broda:
        b.box((head_r * 1.4, head_r * 0.6, head_r * 0.5), (0, -head_r * 0.75, z_head + head_r * 0.45), wlosy, bone="head")
    if czapka:
        b.cyl(head_r * 1.15, 0.05 * s, (0, 0, z_head + head_r * 1.8), czapka, verts=14, bone="head")
        b.box((head_r * 1.8, head_r * 0.9, 0.02), (0, -head_r * 1.1, z_head + head_r * 1.62), czapka, bone="head")
    if kapelusz:
        b.cyl(head_r * 1.6, 0.03, (0, 0, z_head + head_r * 1.85), kapelusz, verts=16, bone="head")
        b.cyl(head_r * 1.0, 0.22 * s, (0, 0, z_head + head_r * 1.85 + 0.11 * s), kapelusz, verts=16, bone="head")

    mesh = b.finish(smooth=True)
    mesh.parent = arm_obj
    mod = mesh.modifiers.new("Armature", "ARMATURE")
    mod.object = arm_obj
    animate(arm_obj, height)
    return arm_obj, mesh


POSTACIE = [
    lambda: postac("sim_ojciec", 1.78, "ubranie_robotnik", "wlosy_ciemne", czapka="czapka", kamizelka=True),
    lambda: postac("sim_matka", 1.64, "ubranie_kobieta", "wlosy_jasne", fartuch=True, spodnica=True, chustka=True),
    lambda: postac("sim_chlopiec", 1.30, "ubranie_chlopiec", "wlosy_ciemne", skora="skora_dziecko", czapka="czapka"),
    lambda: postac("sim_dziewczynka", 1.18, "ubranie_dziewczynka", "wlosy_jasne", skora="skora_dziecko", spodnica=True, warkocze=True),
    lambda: postac("npc_majster", 1.80, "kamizelka", "wlosy_ciemne", kapelusz="cylinder", broda=True),
    lambda: postac("npc_nauczyciel", 1.74, "surdut", "wlosy_siwe", broda=True),
    lambda: postac("npc_ksiadz", 1.76, "sutanna", "wlosy_siwe", sutanna=True),
    lambda: postac("npc_szynkarz", 1.72, "koszula", "wlosy_ciemne", fartuch=True, broda=True),
    lambda: postac("npc_przekupka", 1.60, "ubranie_kobieta", "wlosy_ciemne", spodnica=True, chustka=True),
]

GENERATORS = [
    lozko, stol, krzeslo, piec, kredens, balia, wiadro, studnia, wychodek, lampa,
    polka_ksiazki, kolyska, krosno, przedzarka, maszyna_parowa, komin, zegar_fabryczny,
    lawka_szkolna, tablica, lada_sklepowa, latarnia, drzewo, lawka_parkowa, wozek,
    brama_fabryczna, oltarz, lawka_koscielna, szynkwas, stol_szynk, beczka, stragan, kosz,
]


# ---------------------------------------------------------------------------
# Eksport
# ---------------------------------------------------------------------------
def export_selection(name, out_dir, animated=False):
    path = os.path.join(out_dir, name + ".glb")
    kwargs = dict(
        filepath=path, export_format="GLB", use_selection=True, export_apply=True,
        export_yup=True, export_materials="EXPORT", export_image_format="AUTO",
        export_texcoords=True, export_normals=True,
    )
    if animated:
        kwargs.update(export_animations=True, export_skins=True, export_animation_mode="NLA_TRACKS",
                      export_frame_range=False, export_force_sampling=True)
    else:
        kwargs.update(export_animations=False, export_skins=False)
    bpy.ops.export_scene.gltf(**kwargs)
    return path


def main():
    global TEX_DIR
    argv = sys.argv
    argv = argv[argv.index("--") + 1:] if "--" in argv else argv[1:]
    base = os.path.join(os.path.dirname(os.path.abspath(__file__)), "..", "godot", "assets")
    out_dir = os.path.abspath(argv[0] if argv else os.path.join(base, "models"))
    TEX_DIR = os.path.abspath(argv[1] if len(argv) > 1 else os.path.join(base, "textures"))
    os.makedirs(out_dir, exist_ok=True)
    os.makedirs(TEX_DIR, exist_ok=True)
    bpy.context.scene.render.fps = 24

    clear_scene()
    for fname, (kind, color) in FLOOR_TEXTURES.items():
        make_texture("floor_" + fname, kind, color)
    count = 0
    for gen in GENERATORS:
        obj = gen()
        bpy.ops.object.select_all(action="DESELECT")
        obj.select_set(True)
        bpy.context.view_layer.objects.active = obj
        export_selection(obj.name, out_dir)
        count += 1
        bpy.ops.object.select_all(action="SELECT")
        bpy.ops.object.delete(use_global=False)
    for gen in POSTACIE:
        arm_obj, mesh = gen()
        bpy.ops.object.select_all(action="DESELECT")
        arm_obj.select_set(True)
        mesh.select_set(True)
        bpy.context.view_layer.objects.active = arm_obj
        export_selection(mesh.name, out_dir, animated=True)
        count += 1
        bpy.ops.object.select_all(action="SELECT")
        bpy.ops.object.delete(use_global=False)
    print(f"Wyeksportowano {count} modeli do {out_dir}; tekstury w {TEX_DIR}")


if __name__ == "__main__":
    main()
