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
    "sukienka_swieto": (0.20, 0.27, 0.40),
    "kokarda": (0.78, 0.18, 0.28),
    "szelki": (0.26, 0.18, 0.12),
    "pasek": (0.17, 0.11, 0.07),
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
    "sukienka_swieto": ("fabric", {}),
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
# Twarze – tekstury proceduralne (oczy, brwi, usta, wąsy, broda, okulary, piegi)
# ---------------------------------------------------------------------------
def _ellipse(size, cx, cy, rx, ry):
    y, x = np.mgrid[0:size, 0:size].astype(np.float32)
    return ((x - cx) / rx) ** 2 + ((y - cy) / ry) ** 2 <= 1.0


def _blend(px, mask, color, alpha=1.0):
    col = np.array(color, dtype=np.float32)
    m = (mask.astype(np.float32) * alpha)[..., None]
    px[...] = px * (1 - m) + col[None, None, :] * m


def make_face(name, skin, iris=(0.35, 0.22, 0.12), brwi=(0.2, 0.13, 0.08), wasy=False, broda=False,
              okulary=False, piegi=False, usmiech=True, rumience=True, zmarszczki=False, wlosy=None):
    """Tekstura twarzy 256×256 mapowana walcowo na głowę (przód twarzy w u = 0.5, v rośnie ku górze)."""
    if name in _materials:
        return name
    s = TEX_SIZE
    rng = np.random.default_rng(abs(hash(name)) % 100000)
    base = np.array(skin, dtype=np.float32)
    n = _noise(s, 10, 3)
    px = np.clip(base[None, None, :] * (0.96 + (n[..., None] - 0.5) * 0.08), 0, 1)
    y, x = np.mgrid[0:s, 0:s].astype(np.float32)
    cx = s * 0.5
    ey = s * 0.58          # wysokość oczu
    dx = s * 0.056         # odległość oczu od osi
    hair = np.array(wlosy if wlosy else brwi, dtype=np.float32)
    # rumieńce
    if rumience:
        for sx in (-1, 1):
            _blend(px, _ellipse(s, cx + sx * s * 0.11, s * 0.47, s * 0.05, s * 0.03), (0.85, 0.45, 0.4), 0.18)
    # oczy
    for sx in (-1, 1):
        ex = cx + sx * dx
        _blend(px, _ellipse(s, ex, ey, s * 0.034, s * 0.021), (0.97, 0.97, 0.95))
        _blend(px, _ellipse(s, ex, ey, s * 0.016, s * 0.016), iris)
        _blend(px, _ellipse(s, ex, ey, s * 0.0075, s * 0.0075), (0.05, 0.04, 0.04))
        _blend(px, _ellipse(s, ex + s * 0.006, ey + s * 0.006, s * 0.004, s * 0.004), (1, 1, 1), 0.9)
        # powieka górna – cienka linia
        _blend(px, _ellipse(s, ex, ey + s * 0.019, s * 0.036, s * 0.004), (0.3, 0.2, 0.15), 0.6)
        # brwi (łuk: elipsa minus elipsa przesunięta w dół)
        brow = _ellipse(s, ex, ey + s * 0.055, s * 0.04, s * 0.014) & ~_ellipse(s, ex, ey + s * 0.045, s * 0.04, s * 0.014)
        _blend(px, brow, brwi, 0.95)
    # nos – delikatny cień
    _blend(px, _ellipse(s, cx, s * 0.50, s * 0.012, s * 0.02), (0.6, 0.4, 0.3), 0.25)
    # usta
    my = s * 0.41
    if usmiech:
        mouth = _ellipse(s, cx, my + s * 0.012, s * 0.045, s * 0.025) & ~_ellipse(s, cx, my + s * 0.024, s * 0.05, s * 0.028)
    else:
        mouth = _ellipse(s, cx, my, s * 0.04, s * 0.006)
    _blend(px, mouth, (0.62, 0.3, 0.28), 0.9)
    if wasy:
        for sx in (-1, 1):
            _blend(px, _ellipse(s, cx + sx * s * 0.03, my + s * 0.035, s * 0.045, s * 0.013), hair, 0.95)
    if broda:
        beard = (y < my - s * 0.02) & (np.abs(x - cx) < s * 0.11 + (my - y) * 0.15) & (y > s * 0.2)
        _blend(px, beard, hair, 0.85)
        _blend(px, _ellipse(s, cx, my - s * 0.08, s * 0.1, s * 0.05), hair, 0.6)
    if okulary:
        for sx in (-1, 1):
            ex = cx + sx * dx
            ring = _ellipse(s, ex, ey, s * 0.045, s * 0.032) & ~_ellipse(s, ex, ey, s * 0.038, s * 0.026)
            _blend(px, ring, (0.15, 0.13, 0.1))
        bridge = (np.abs(y - ey) < s * 0.004) & (np.abs(x - cx) < dx - s * 0.03)
        _blend(px, bridge, (0.15, 0.13, 0.1))
    if piegi:
        for _ in range(26):
            fx = cx + rng.uniform(-0.14, 0.14) * s
            fy = s * 0.47 + rng.uniform(-0.03, 0.04) * s
            _blend(px, _ellipse(s, fx, fy, s * 0.005, s * 0.005), (0.6, 0.38, 0.25), 0.5)
    if zmarszczki:
        for sx in (-1, 1):
            for k in range(2):
                ex = cx + sx * (dx + s * 0.05 + k * s * 0.012)
                _blend(px, _ellipse(s, ex, ey - s * 0.01 * k, s * 0.004, s * 0.03), (0.55, 0.38, 0.3), 0.35)
    rgba = np.concatenate([px, np.ones((s, s, 1), dtype=np.float32)], axis=2)
    img = bpy.data.images.new("tex_" + name, s, s, alpha=False)
    img.pixels.foreach_set(np.ascontiguousarray(rgba, dtype=np.float32).ravel())
    if TEX_DIR:
        img.filepath_raw = os.path.join(TEX_DIR, "tex_" + name + ".png")
        img.file_format = "PNG"
        img.save()
    img.pack()
    m = bpy.data.materials.new("M_" + name)
    m.use_nodes = True
    nodes = m.node_tree.nodes
    bsdf = nodes.get("Principled BSDF")
    bsdf.inputs["Roughness"].default_value = 0.65
    tex = nodes.new("ShaderNodeTexImage")
    tex.image = img
    m.node_tree.links.new(tex.outputs["Color"], bsdf.inputs["Base Color"])
    _materials[name] = m
    return name


def face_uv(obj, mat_name, center, radius):
    """UV walcowe dla wielokątów o materiale twarzy: przód (-Y) w u = 0.5."""
    me = obj.data
    uv = me.uv_layers.active.data
    slot = -1
    for i, m in enumerate(me.materials):
        if m and m.name == "M_" + mat_name:
            slot = i
    if slot < 0:
        return
    cx, cy, cz = center
    mw = obj.matrix_world
    for poly in me.polygons:
        if poly.material_index != slot:
            continue
        for li in poly.loop_indices:
            co = mw @ me.vertices[me.loops[li].vertex_index].co   # współrzędne świata (origin obiektu = pierwsza część)
            u = 0.5 + math.atan2(co.x - cx, -(co.y - cy)) / (2 * math.pi)
            v = 0.5 + (co.z - cz) / (2.0 * radius) * 0.85
            uv[li].uv = (u, v)


# ---------------------------------------------------------------------------
# Postacie ze szkieletem, teksturowaną twarzą, strojami z epoki i animacjami
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
    """Zestaw animacji: idle, walk, work, sit, sleep, talk, eat. h – wzrost (skaluje przesunięcia)."""
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

    # talk: gestykulacja i kiwanie głową
    a = _new_action(arm_obj, "talk")
    rig.reset(1)
    for i, f in enumerate((1, 13, 25, 37, 49)):
        ph = i * math.pi / 2
        sw = math.sin(ph)
        rig.rot("head", f, rx=-4 * sw, rz=6 * math.cos(ph))
        rig.rot("upperarm.R", f, rx=-35 - 15 * sw, rz=15)
        rig.rot("forearm.R", f, rx=-70 + 20 * sw)
        rig.rot("upperarm.L", f, rx=-10 + 5 * sw)
        rig.rot("forearm.L", f, rx=-25)
        rig.rot("chest", f, rz=-3 * sw)
    _push_nla(arm_obj, a, "talk", 49)

    # eat: siedzenie z łyżką do ust
    a = _new_action(arm_obj, "eat")
    rig.reset(1)
    for i, f in enumerate((1, 13, 25, 37, 49)):
        ph = i * math.pi / 2
        sw = 0.5 + 0.5 * math.sin(ph)
        rig.rot("chest", f, rx=-8)
        rig.rot("head", f, rx=-10 * sw)
        rig.rot("upperarm.R", f, rx=-30 - 25 * sw)
        rig.rot("forearm.R", f, rx=-60 - 60 * sw)
        rig.rot("upperarm.L", f, rx=-25)
        rig.rot("forearm.L", f, rx=-70)
    _push_nla(arm_obj, a, "eat", 49)


def postac(name, height, ubranie, wlosy, skora="skora", spodnie=None, czapka=None, kapelusz=None,
           melonik=None, kamizelka=None, fartuch=False, spodnica=False, chustka=False, warkocze=False,
           sutanna=False, kolnierz=False, koloratka=False, guziki=False, pasek=False, szelki=False,
           muszka=False, krawat=False, marynarka=None, chusta=None, kokarda=None, kok=False,
           ponczochy=None, buty_wysokie=False, face=None):
    """Proporcjonalna postać (ok. 7 głów) z rigiem. Przód = -Y. face – parametry make_face."""
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
    spodnie = spodnie or ubranie
    face = dict(face or {})
    face.setdefault("wlosy", PAL.get(wlosy))
    face_mat = make_face("twarz_" + name, PAL[skora], **face)
    head_center = (0, 0, z_head + head_r)
    head_scale = (1.0, 1.05, 1.15)

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
    torso_mat = marynarka or ubranie
    # tułów
    b.sphere(0.17 * s, (0, 0, z_hip + 0.02 * s), spodnie if not spodnica else ubranie, scale=(1.0, 0.75, 0.55), bone="hips")
    b.cone(0.17 * s, 0.20 * s, z_neck - z_chest + 0.05 * s, (0, 0, (z_chest + z_neck) / 2), torso_mat, verts=14, bone="chest")
    b.sphere(0.20 * s, (0, 0, z_shoulder), torso_mat, scale=(1.05, 0.7, 0.35), bone="chest")
    if marynarka:
        # klapy marynarki i koszula pod spodem
        b.box((0.07 * s, 0.02, 0.3 * s), (0, -0.195 * s, (z_chest + z_neck) / 2 + 0.02 * s), "koszula", bone="chest")
        for sx in (-1, 1):
            b.box((0.05 * s, 0.015, 0.24 * s), (sx * 0.055 * s, -0.2 * s, (z_chest + z_neck) / 2 + 0.03 * s), torso_mat, rot=(0, 0, sx * 0.25), bone="chest")
    if kamizelka:
        b.cone(0.18 * s, 0.205 * s, (z_neck - z_chest) * 0.8, (0, 0, (z_chest + z_neck) / 2 - 0.02 * s), kamizelka, verts=14, bone="chest")
        b.box((0.09 * s, 0.02, 0.28 * s), (0, -0.19 * s, (z_chest + z_neck) / 2), "koszula", bone="chest")
    if guziki:
        for k in range(3):
            b.sphere(0.012 * s, (0.0, -0.205 * s, z_chest + 0.08 * s + k * 0.07 * s), "mosiadz", bone="chest", segments=8, rings=6)
    if szelki:
        for sx in (-1, 1):
            b.box((0.035 * s, 0.015, 0.34 * s), (sx * 0.07 * s, -0.19 * s, (z_chest + z_neck) / 2), "szelki", bone="chest")
    if pasek:
        b.cyl(0.175 * s, 0.035 * s, (0, 0, z_hip + 0.05 * s), "pasek", verts=14, bone="hips")
        b.box((0.03 * s, 0.015, 0.03 * s), (0, -0.175 * s, z_hip + 0.05 * s), "mosiadz", bone="hips")
    if fartuch:
        b.box((0.26 * s, 0.02, 0.32 * s), (0, -0.19 * s, z_chest + 0.1 * s), "fartuch", bone="chest")
        b.cone(0.17 * s, 0.26 * s, 0.75 * s, (0, -0.06 * s, z_hip - 0.36 * s), "fartuch", verts=14, bone="hips")
    if chusta:
        b.cone(0.26 * s, 0.17 * s, 0.22 * s, (0, 0.01, z_shoulder - 0.08 * s), chusta, verts=16, bone="chest")
        b.box((0.08 * s, 0.03, 0.3 * s), (0, -0.2 * s, z_chest + 0.08 * s), chusta, bone="chest")
    if kolnierz or koloratka:
        b.cyl(0.075 * s, 0.035 * s, (0, 0, z_neck + 0.03 * s), "bialy", verts=12, bone="head")
        if kolnierz:
            for sx in (-1, 1):
                b.box((0.05 * s, 0.015, 0.06 * s), (sx * 0.04 * s, -0.185 * s, z_neck - 0.02 * s), "bialy", rot=(0, 0, sx * 0.5), bone="chest")
    if muszka:
        for sx in (-1, 1):
            b.box((0.04 * s, 0.02, 0.025 * s), (sx * 0.025 * s, -0.2 * s, z_neck - 0.03 * s), "kokarda", bone="chest")
    if krawat:
        b.box((0.03 * s, 0.015, 0.2 * s), (0, -0.2 * s, z_neck - 0.14 * s), "pasek", bone="chest")
    # nogi lub spódnica/sutanna
    if spodnica or sutanna:
        b.cone(0.17 * s, 0.30 * s, z_hip - 0.04 * s, (0, 0, z_hip / 2), "sutanna" if sutanna else ubranie, verts=16, bone="hips")
    else:
        for side, sx in (("L", 1), ("R", -1)):
            b.cone(0.085 * s, 0.065 * s, z_hip - z_knee, (sx * 0.09 * s, 0, (z_hip + z_knee) / 2), spodnie, verts=10, bone="thigh." + side)
            shin_mat = ponczochy if ponczochy else spodnie
            b.cone(0.065 * s, 0.05 * s, z_knee - z_ankle, (sx * 0.09 * s, 0, (z_knee + z_ankle) / 2), shin_mat, verts=10, bone="shin." + side)
    for side, sx in (("L", 1), ("R", -1)):
        bh = 0.22 * s if buty_wysokie else 0.07 * s
        b.box((0.11 * s, 0.24 * s, 0.07 * s), (sx * 0.09 * s, -0.04 * s, 0.035 * s), "buty", bone="shin." + side)
        if buty_wysokie:
            b.cyl(0.058 * s, bh, (sx * 0.09 * s, 0, bh / 2 + 0.03 * s), "buty", verts=10, bone="shin." + side)
        # ręce
        b.cone(0.065 * s, 0.05 * s, z_shoulder - z_elbow, (sx * sh, 0, (z_shoulder + z_elbow) / 2), torso_mat, verts=10, bone="upperarm." + side)
        sleeve = "koszula" if (fartuch and not chusta) else torso_mat
        b.cone(0.05 * s, 0.045 * s, z_elbow - z_wrist, (sx * sh, 0, (z_elbow + z_wrist) / 2), sleeve, verts=10, bone="forearm." + side)
        b.sphere(0.05 * s, (sx * sh, 0, z_wrist - 0.03 * s), skora, scale=(1, 0.7, 1.3), bone="forearm." + side)
    # szyja, głowa z teksturą twarzy, nos, uszy
    b.cyl(0.05 * s, 0.08 * s, (0, 0, z_neck + 0.02 * s), skora, verts=10, bone="head")
    b.sphere(head_r, head_center, face_mat, scale=head_scale, bone="head", segments=24, rings=16)
    b.sphere(0.02 * s, (0, -head_r * 1.02, z_head + head_r * 0.85), skora, bone="head", segments=8, rings=6)
    for sx in (-1, 1):
        b.sphere(0.025 * s, (sx * head_r * 0.98, 0.0, z_head + head_r * 0.95), skora, scale=(0.5, 0.8, 1.0), bone="head", segments=8, rings=6)
    # włosy – czapa z tyłu i na górze, twarz odsłonięta
    hair = "chustka" if chustka else wlosy
    if not czapka or chustka:
        b.sphere(head_r * 1.07, (0, head_r * 0.22, z_head + head_r * 1.22), hair, scale=(1.0, 0.95, 0.82), bone="head")
        b.box((head_r * 1.9, head_r * 0.7, head_r * 0.9), (0, head_r * 0.8, z_head + head_r * 0.75), hair, bone="head")
    else:
        b.sphere(head_r * 1.03, (0, head_r * 0.2, z_head + head_r * 1.1), wlosy, scale=(1.0, 0.95, 0.8), bone="head")
    if kok:
        b.sphere(head_r * 0.45, (0, head_r * 1.05, z_head + head_r * 1.35), wlosy, bone="head")
    if warkocze:
        for sx in (-1, 1):
            b.cyl(0.02 * s, 0.3 * s, (sx * head_r * 0.95, 0.03, z_head + head_r * 0.6 - 0.1 * s), wlosy, verts=8, bone="head")
            b.box((0.05 * s, 0.03, 0.03 * s), (sx * head_r * 0.95, 0.03, z_head + head_r * 0.6 - 0.26 * s), "kokarda", bone="head")
    if chustka:
        b.box((0.08 * s, 0.03, 0.18 * s), (0, head_r * 1.0, z_head + head_r * 0.2), "chustka", bone="head")
        b.box((0.12 * s, 0.05, 0.04 * s), (0, -head_r * 0.2, z_head + head_r * 1.95), "chustka", bone="head")
    if kokarda:
        for sx in (-1, 1):
            b.box((0.05 * s, 0.03, 0.035 * s), (sx * 0.03 * s, head_r * 0.3, z_head + head_r * 2.0), kokarda, rot=(0, 0.3 * sx, 0), bone="head")
    if czapka:
        b.cyl(head_r * 1.15, 0.05 * s, (0, 0, z_head + head_r * 1.8), czapka, verts=14, bone="head")
        b.box((head_r * 1.8, head_r * 0.9, 0.02), (0, -head_r * 1.1, z_head + head_r * 1.62), czapka, bone="head")
    if kapelusz:
        b.cyl(head_r * 1.6, 0.03, (0, 0, z_head + head_r * 1.85), kapelusz, verts=16, bone="head")
        b.cyl(head_r * 1.0, 0.22 * s, (0, 0, z_head + head_r * 1.85 + 0.11 * s), kapelusz, verts=16, bone="head")
    if melonik:
        b.cyl(head_r * 1.45, 0.025, (0, 0, z_head + head_r * 1.8), melonik, verts=16, bone="head")
        b.sphere(head_r * 1.0, (0, 0, z_head + head_r * 1.75), melonik, scale=(1.0, 1.0, 0.7), bone="head")

    mesh = b.finish(smooth=True)
    face_uv(mesh, face_mat, head_center, head_r * head_scale[2])
    mesh.parent = arm_obj
    mod = mesh.modifiers.new("Armature", "ARMATURE")
    mod.object = arm_obj
    animate(arm_obj, height)
    return arm_obj, mesh


POSTACIE = [
    # rodzina – strój roboczy
    lambda: postac("sim_ojciec", 1.78, "ubranie_robotnik", "wlosy_ciemne", czapka="czapka", kamizelka="kamizelka",
                   pasek=True, kolnierz=True, buty_wysokie=True, face={"wasy": True, "usmiech": False}),
    lambda: postac("sim_matka", 1.64, "ubranie_kobieta", "wlosy_jasne", fartuch=True, spodnica=True, chustka=True,
                   face={"iris": (0.3, 0.45, 0.5)}),
    lambda: postac("sim_chlopiec", 1.30, "ubranie_chlopiec", "wlosy_ciemne", skora="skora_dziecko", czapka="czapka",
                   szelki=True, ponczochy="koszula", face={"piegi": True}),
    lambda: postac("sim_dziewczynka", 1.18, "ubranie_dziewczynka", "wlosy_jasne", skora="skora_dziecko", spodnica=True,
                   warkocze=True, fartuch=True, face={"piegi": True, "iris": (0.3, 0.45, 0.5)}),
    # rodzina – strój świąteczny (niedziela, kościół)
    lambda: postac("sim_ojciec_swieto", 1.78, "koszula", "wlosy_ciemne", spodnie="surdut", marynarka="surdut", melonik="cylinder",
                   kolnierz=True, krawat=True, guziki=True, buty_wysokie=True, face={"wasy": True, "usmiech": False}),
    lambda: postac("sim_matka_swieto", 1.64, "sukienka_swieto", "wlosy_jasne", spodnica=True, kolnierz=True, chusta="koc", kok=True,
                   face={"iris": (0.3, 0.45, 0.5)}),
    lambda: postac("sim_chlopiec_swieto", 1.30, "koszula", "wlosy_ciemne", skora="skora_dziecko", spodnie="surdut", marynarka="surdut",
                   kolnierz=True, muszka=True, ponczochy="koszula", face={"piegi": True}),
    lambda: postac("sim_dziewczynka_swieto", 1.18, "sukienka_swieto", "wlosy_jasne", skora="skora_dziecko", spodnica=True,
                   warkocze=True, kolnierz=True, kokarda="kokarda", face={"piegi": True, "iris": (0.3, 0.45, 0.5)}),
    # postacie niezależne
    lambda: postac("npc_majster", 1.80, "koszula", "wlosy_ciemne", spodnie="surdut", kamizelka="kamizelka", kapelusz="cylinder",
                   pasek=True, guziki=True, buty_wysokie=True, face={"broda": True, "wasy": True, "usmiech": False}),
    lambda: postac("npc_nauczyciel", 1.74, "koszula", "wlosy_siwe", spodnie="surdut", marynarka="surdut", kolnierz=True, krawat=True,
                   face={"broda": True, "okulary": True, "zmarszczki": True, "usmiech": False}),
    lambda: postac("npc_ksiadz", 1.76, "sutanna", "wlosy_siwe", sutanna=True, koloratka=True, face={"okulary": True, "zmarszczki": True}),
    lambda: postac("npc_szynkarz", 1.72, "koszula", "wlosy_ciemne", spodnie="ubranie_robotnik", fartuch=True, pasek=True,
                   face={"wasy": True}),
    lambda: postac("npc_przekupka", 1.60, "ubranie_kobieta", "wlosy_ciemne", spodnica=True, chustka=True, chusta="koc",
                   face={"zmarszczki": True}),
    lambda: postac("npc_robotnik", 1.74, "ubranie_robotnik", "wlosy_jasne", czapka="czapka", pasek=True, face={"wasy": True}),
    lambda: postac("npc_robotnica", 1.62, "ubranie_kobieta", "wlosy_ciemne", spodnica=True, chustka=True, fartuch=True, face={}),
    lambda: postac("npc_pan", 1.78, "koszula", "wlosy_siwe", spodnie="surdut", marynarka="surdut", kapelusz="cylinder", krawat=True,
                   buty_wysokie=True, face={"wasy": True, "broda": True, "usmiech": False}),
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
