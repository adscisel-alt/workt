"""
Generator modeli low-poly dla gry „Fabryka 1885”.

Uruchamianie (Blender jako moduł Pythona, bez okna):
    python -m pip install bpy
    python blender/generate_assets.py [katalog_wyjściowy]

albo wewnątrz zainstalowanego Blendera:
    blender --background --python blender/generate_assets.py -- [katalog_wyjściowy]

Każdy model to jeden obiekt zbudowany z prostych bryl (klocki, cylindry),
z materiałami w stylu „płaskie kolory” (bez tekstur) – takie modele czyta Godot
bez dodatkowej konfiguracji, a styl przypomina rzut izometryczny z The Sims 1.

Modele są wyśrodkowane na osiach X/Y, stoją na podłodze (Z = 0 w Blenderze,
po eksporcie Y = 0 w Godot), a 1 jednostka = 1 metr = 1 kafelek siatki w grze.
"""
import math
import os
import sys

import bpy

# ---------------------------------------------------------------------------
# Paleta – stonowane barwy przemysłowej Łodzi końca XIX wieku
# ---------------------------------------------------------------------------
PAL = {
    "drewno_ciemne": (0.33, 0.20, 0.10),
    "drewno_jasne": (0.62, 0.45, 0.27),
    "drewno_szkolne": (0.45, 0.30, 0.17),
    "zelazo": (0.18, 0.19, 0.21),
    "zelazo_jasne": (0.35, 0.36, 0.38),
    "cegla": (0.55, 0.25, 0.17),
    "cegla_ciemna": (0.42, 0.18, 0.12),
    "tynk": (0.80, 0.76, 0.68),
    "len": (0.86, 0.82, 0.70),
    "posciel": (0.78, 0.74, 0.62),
    "koc": (0.45, 0.22, 0.20),
    "mosiadz": (0.72, 0.58, 0.25),
    "szklo": (0.80, 0.90, 0.95),
    "woda": (0.30, 0.45, 0.55),
    "liscie": (0.28, 0.42, 0.20),
    "kreda": (0.10, 0.14, 0.12),
    "papier": (0.92, 0.90, 0.82),
    "kaszana": (0.35, 0.18, 0.15),
    # postacie
    "skora": (0.86, 0.68, 0.55),
    "wlosy_ciemne": (0.20, 0.13, 0.08),
    "wlosy_jasne": (0.70, 0.55, 0.30),
    "ubranie_robotnik": (0.30, 0.32, 0.40),
    "ubranie_kobieta": (0.40, 0.25, 0.30),
    "fartuch": (0.85, 0.83, 0.75),
    "ubranie_chlopiec": (0.36, 0.30, 0.22),
    "ubranie_dziewczynka": (0.50, 0.35, 0.40),
    "czapka": (0.22, 0.20, 0.18),
    "buty": (0.12, 0.08, 0.05),
    "czerwony": (0.65, 0.15, 0.12),
}

_materials = {}


def mat(name):
    """Zwraca (tworząc raz) materiał o płaskim kolorze."""
    if name in _materials:
        return _materials[name]
    m = bpy.data.materials.new("M_" + name)
    m.use_nodes = True
    bsdf = m.node_tree.nodes.get("Principled BSDF")
    # Wartości w PAL są podane tak, jak mają wyglądać na ekranie (sRGB);
    # Blender/glTF przechowują kolor liniowo, więc konwertujemy (gamma 2.2).
    r, g, b = (c ** 2.2 for c in PAL[name])
    bsdf.inputs["Base Color"].default_value = (r, g, b, 1.0)
    bsdf.inputs["Roughness"].default_value = 0.85
    if name in ("zelazo", "zelazo_jasne", "mosiadz"):
        bsdf.inputs["Metallic"].default_value = 0.6
        bsdf.inputs["Roughness"].default_value = 0.45
    _materials[name] = m
    return m


def clear_scene():
    bpy.ops.object.select_all(action="SELECT")
    bpy.ops.object.delete(use_global=False)
    for block in list(bpy.data.meshes):
        if block.users == 0:
            bpy.data.meshes.remove(block)


class Builder:
    """Składa jeden model z prostych bryl i łączy w jeden obiekt."""

    def __init__(self, name):
        self.name = name
        self.parts = []

    def _add(self, obj, material):
        obj.data.materials.append(mat(material))
        self.parts.append(obj)
        return obj

    def box(self, size, loc, material, rot=(0, 0, 0)):
        bpy.ops.mesh.primitive_cube_add(size=1.0, location=loc, rotation=rot)
        o = bpy.context.active_object
        o.scale = size
        return self._add(o, material)

    def cyl(self, radius, depth, loc, material, verts=12, rot=(0, 0, 0)):
        bpy.ops.mesh.primitive_cylinder_add(
            vertices=verts, radius=radius, depth=depth, location=loc, rotation=rot
        )
        return self._add(bpy.context.active_object, material)

    def cone(self, r1, r2, depth, loc, material, verts=12):
        bpy.ops.mesh.primitive_cone_add(
            vertices=verts, radius1=r1, radius2=r2, depth=depth, location=loc
        )
        return self._add(bpy.context.active_object, material)

    def sphere(self, radius, loc, material):
        bpy.ops.mesh.primitive_uv_sphere_add(
            segments=12, ring_count=8, radius=radius, location=loc
        )
        return self._add(bpy.context.active_object, material)

    def finish(self):
        for p in self.parts:
            p.select_set(True)
        bpy.context.view_layer.objects.active = self.parts[0]
        bpy.ops.object.join()
        obj = bpy.context.active_object
        obj.name = self.name
        bpy.ops.object.transform_apply(location=False, rotation=True, scale=True)
        # cieniowanie płaskie – czytelny, „klockowy” styl
        bpy.ops.object.shade_flat()
        return obj


# ---------------------------------------------------------------------------
# Meble i wyposażenie mieszkania robotniczego
# ---------------------------------------------------------------------------
def lozko():
    b = Builder("lozko")  # 1 x 2 kafelki
    b.box((0.95, 1.95, 0.08), (0, 0, 0.42), "drewno_ciemne")  # rama
    for x in (-0.44, 0.44):
        for y in (-0.93, 0.93):
            b.box((0.07, 0.07, 0.45), (x, y, 0.225), "drewno_ciemne")
    b.box((0.95, 0.07, 0.85), (0, -0.96, 0.43), "drewno_ciemne")  # zagłówek
    b.box((0.95, 0.07, 0.65), (0, 0.96, 0.33), "drewno_ciemne")
    b.box((0.88, 1.85, 0.15), (0, 0, 0.54), "posciel")  # siennik
    b.box((0.86, 1.2, 0.08), (0, 0.3, 0.65), "koc")
    b.box((0.6, 0.35, 0.1), (0, -0.7, 0.66), "len")  # poduszka
    return b.finish()


def stol():
    b = Builder("stol")  # 1 x 2 kafelki
    b.box((0.9, 1.8, 0.06), (0, 0, 0.75), "drewno_jasne")
    for x in (-0.38, 0.38):
        for y in (-0.8, 0.8):
            b.box((0.07, 0.07, 0.72), (x, y, 0.36), "drewno_jasne")
    return b.finish()


def krzeslo():
    b = Builder("krzeslo")  # 1 kafelek
    b.box((0.42, 0.42, 0.05), (0, 0, 0.45), "drewno_jasne")
    for x in (-0.17, 0.17):
        for y in (-0.17, 0.17):
            b.box((0.05, 0.05, 0.45), (x, y, 0.225), "drewno_jasne")
    b.box((0.42, 0.05, 0.5), (0, -0.19, 0.72), "drewno_jasne")  # oparcie
    return b.finish()


def piec():
    b = Builder("piec")  # kuchnia kaflowa z płytą żeliwną, 1 x 1
    b.box((0.9, 0.9, 0.85), (0, 0, 0.425), "tynk")
    b.box((0.92, 0.92, 0.06), (0, 0, 0.88), "zelazo")
    b.cyl(0.14, 0.02, (0.2, 0.15, 0.92), "zelazo_jasne")  # fajerka
    b.cyl(0.14, 0.02, (-0.2, -0.15, 0.92), "zelazo_jasne")
    b.box((0.35, 0.06, 0.3), (0, 0.46, 0.35), "zelazo")  # drzwiczki
    b.cyl(0.09, 1.3, (-0.3, -0.3, 1.5), "zelazo")  # rura
    b.box((0.4, 0.3, 0.25), (0.15, 0.1, 1.08), "zelazo_jasne")  # garnek
    return b.finish()


def kredens():
    b = Builder("kredens")  # 1 x 1
    b.box((0.95, 0.45, 0.9), (0, 0, 0.45), "drewno_ciemne")
    b.box((0.95, 0.35, 0.9), (0, -0.05, 1.4), "drewno_ciemne")
    b.box((0.85, 0.02, 0.4), (0, -0.23, 1.45), "szklo")
    b.box((0.3, 0.02, 0.15), (-0.2, -0.24, 1.2), "papier")  # talerze
    b.box((0.3, 0.02, 0.15), (0.2, -0.24, 1.2), "papier")
    return b.finish()


def balia():
    b = Builder("balia")  # pranie / mycie, 1 x 1
    b.cone(0.38, 0.45, 0.5, (0, 0, 0.25), "drewno_jasne", verts=14)
    b.cyl(0.46, 0.03, (0, 0, 0.3), "zelazo")  # obręcz
    b.cyl(0.40, 0.02, (0, 0, 0.47), "woda")
    b.box((0.08, 0.6, 0.06), (0.3, 0, 0.5), "drewno_ciemne")  # kijanka
    return b.finish()


def wiadro():
    b = Builder("wiadro")
    b.cone(0.14, 0.17, 0.32, (0, 0, 0.16), "zelazo_jasne", verts=10)
    b.cyl(0.14, 0.02, (0, 0, 0.3), "woda")
    return b.finish()


def studnia():
    b = Builder("studnia")  # 1 x 1, w podwórzu
    b.cyl(0.5, 0.8, (0, 0, 0.4), "cegla", verts=10)
    b.cyl(0.42, 0.04, (0, 0, 0.8), "woda", verts=10)
    for x in (-0.5, 0.5):
        b.box((0.08, 0.08, 1.8), (x, 0, 0.9), "drewno_ciemne")
    b.cyl(0.06, 1.1, (0, 0, 1.4), "drewno_ciemne", rot=(0, math.pi / 2, 0))
    b.box((1.3, 0.9, 0.06), (0, 0, 1.85), "drewno_ciemne")  # daszek
    b.box((0.06, 0.4, 0.06), (0.6, 0.15, 1.4), "zelazo")  # korba
    return b.finish()


def wychodek():
    b = Builder("wychodek")  # 1 x 1, drewniana sławojka na podwórzu
    b.box((0.95, 0.95, 2.0), (0, 0, 1.0), "drewno_ciemne")
    b.box((0.4, 0.04, 1.6), (0, 0.49, 0.85), "drewno_jasne")  # drzwi
    b.box((0.12, 0.05, 0.3), (0, 0.5, 1.75), "zelazo")  # serduszko/otwór
    b.box((1.1, 1.1, 0.08), (0, 0, 2.05), "zelazo")  # dach
    return b.finish()


def lampa():
    b = Builder("lampa")  # lampa naftowa na stoliku
    b.box((0.4, 0.4, 0.6), (0, 0, 0.3), "drewno_jasne")
    b.cyl(0.08, 0.1, (0, 0, 0.65), "mosiadz")
    b.cyl(0.05, 0.3, (0, 0, 0.85), "szklo")
    b.sphere(0.04, (0, 0, 0.82), "mosiadz")
    return b.finish()


def polka_ksiazki():
    b = Builder("polka_ksiazki")  # półka z książkami – edukacja
    b.box((0.9, 0.3, 1.7), (0, 0, 0.85), "drewno_ciemne")
    for z in (0.5, 1.0, 1.5):
        b.box((0.82, 0.24, 0.04), (0, 0, z), "drewno_jasne")
    cols = ["czerwony", "liscie", "ubranie_robotnik", "koc", "mosiadz"]
    for row, z in enumerate((0.7, 1.2)):
        for i in range(5):
            c = cols[(i + row) % len(cols)]
            b.box((0.12, 0.2, 0.32), (-0.32 + i * 0.16, 0, z), c)
    return b.finish()


def kolyska():
    b = Builder("kolyska")
    b.box((0.5, 0.9, 0.3), (0, 0, 0.45), "drewno_jasne")
    b.box((0.44, 0.84, 0.06), (0, 0, 0.6), "len")
    for y in (-0.4, 0.4):
        b.cyl(0.3, 0.06, (0, y, 0.3), "drewno_ciemne", rot=(math.pi / 2, 0, 0), verts=8)
    return b.finish()


# ---------------------------------------------------------------------------
# Fabryka – maszyny
# ---------------------------------------------------------------------------
def krosno():
    b = Builder("krosno")  # krosno mechaniczne 2 x 2 kafelki
    b.box((1.8, 1.6, 0.1), (0, 0, 0.05), "zelazo")  # podstawa
    for x in (-0.85, 0.85):
        for y in (-0.7, 0.7):
            b.box((0.1, 0.1, 1.6), (x, y, 0.8), "zelazo")
    b.box((1.9, 0.12, 0.12), (0, -0.7, 1.6), "zelazo")  # górne belki
    b.box((1.9, 0.12, 0.12), (0, 0.7, 1.6), "zelazo")
    b.cyl(0.18, 1.7, (0, -0.6, 1.1), "drewno_jasne", rot=(0, math.pi / 2, 0))  # wał osnowy
    b.cyl(0.14, 1.7, (0, 0.65, 0.5), "drewno_jasne", rot=(0, math.pi / 2, 0))  # wał tkaniny
    b.box((1.6, 1.2, 0.02), (0, 0.0, 0.9), "len", rot=(0.3, 0, 0))  # osnowa
    b.box((1.7, 0.08, 0.5), (0, 0.1, 1.0), "drewno_ciemne")  # bidło
    b.cyl(0.35, 0.08, (1.0, 0, 0.9), "zelazo_jasne", rot=(0, math.pi / 2, 0))  # koło pasowe
    b.box((0.06, 0.06, 1.4), (1.0, 0, 1.6), "zelazo_jasne")  # pas transmisyjny
    return b.finish()


def przedzarka():
    b = Builder("przedzarka")  # przędzarka obrączkowa 1 x 3 kafelki
    b.box((0.8, 2.8, 0.9), (0, 0, 0.45), "zelazo")
    b.box((0.9, 2.9, 0.05), (0, 0, 0.92), "zelazo_jasne")
    for i in range(7):
        y = -1.2 + i * 0.4
        b.cyl(0.05, 0.4, (0.2, y, 1.15), "len", verts=8)  # szpule
        b.cyl(0.07, 0.25, (-0.2, y, 1.4), "drewno_jasne", verts=8)
    b.box((0.1, 2.8, 0.1), (-0.2, 0, 1.6), "zelazo")
    b.cyl(0.3, 0.1, (0, 1.5, 0.6), "zelazo_jasne", rot=(math.pi / 2, 0, 0))
    return b.finish()


def maszyna_parowa():
    b = Builder("maszyna_parowa")  # 2 x 3, serce fabryki
    b.box((1.8, 2.8, 0.3), (0, 0, 0.15), "cegla")
    b.cyl(0.55, 2.2, (0, -0.2, 0.9), "zelazo", rot=(math.pi / 2, 0, 0), verts=16)  # kocioł
    b.cyl(0.9, 0.2, (0, 1.3, 1.2), "zelazo_jasne", rot=(math.pi / 2, 0, 0), verts=20)  # koło zamachowe
    b.box((0.2, 0.2, 1.2), (0, 1.3, 0.6), "zelazo")
    b.box((0.3, 1.4, 0.2), (0.6, 0.6, 1.4), "zelazo_jasne")  # korbowód
    b.cyl(0.15, 1.0, (-0.5, -0.9, 2.0), "zelazo", verts=10)  # rurka pary
    b.cyl(0.08, 0.3, (0.3, -1.2, 1.7), "mosiadz", verts=8)  # gwizdek
    return b.finish()


def komin():
    b = Builder("komin")  # komin fabryczny 1 x 1, 12 m
    b.box((1.4, 1.4, 1.0), (0, 0, 0.5), "cegla_ciemna")
    b.cone(0.6, 0.42, 11.0, (0, 0, 6.5), "cegla", verts=12)
    b.cyl(0.5, 0.4, (0, 0, 12.1), "cegla_ciemna", verts=12)
    return b.finish()


def zegar_fabryczny():
    b = Builder("zegar_fabryczny")  # zegar na ścianie fabryki – czas pracy
    b.box((0.8, 0.1, 0.8), (0, 0, 2.2), "drewno_ciemne")
    b.cyl(0.33, 0.04, (0, -0.06, 2.2), "papier", rot=(math.pi / 2, 0, 0), verts=16)
    b.box((0.04, 0.02, 0.26), (0, -0.09, 2.32), "kreda")
    b.box((0.2, 0.02, 0.04), (0.09, -0.09, 2.2), "kreda")
    b.box((0.06, 0.12, 2.0), (0, 0, 1.0), "drewno_ciemne")  # słupek
    return b.finish()


# ---------------------------------------------------------------------------
# Szkoła, sklep, ulica
# ---------------------------------------------------------------------------
def lawka_szkolna():
    b = Builder("lawka_szkolna")  # 1 x 1: pulpit + siedzisko
    b.box((0.9, 0.4, 0.05), (0, -0.2, 0.7), "drewno_szkolne", rot=(0.15, 0, 0))
    b.box((0.9, 0.05, 0.6), (0, -0.4, 0.35), "drewno_szkolne")
    b.box((0.9, 0.3, 0.05), (0, 0.3, 0.45), "drewno_szkolne")
    for x in (-0.4, 0.4):
        b.box((0.06, 0.06, 0.45), (x, 0.3, 0.22), "zelazo")
    b.box((0.25, 0.18, 0.03), (0.15, -0.2, 0.74), "kreda")  # tabliczka łupkowa
    b.box((0.2, 0.26, 0.02), (-0.2, -0.2, 0.74), "papier")  # elementarz
    return b.finish()


def tablica():
    b = Builder("tablica")
    b.box((1.9, 0.08, 1.2), (0, 0, 1.4), "drewno_szkolne")
    b.box((1.76, 0.02, 1.06), (0, -0.05, 1.4), "kreda")
    b.box((0.1, 0.12, 2.0), (-0.9, 0, 1.0), "drewno_szkolne")
    b.box((0.1, 0.12, 2.0), (0.9, 0, 1.0), "drewno_szkolne")
    b.box((0.25, 0.03, 0.02), (-0.5, -0.07, 1.2), "papier")  # kreda napis
    b.box((0.5, 0.03, 0.02), (0.1, -0.07, 1.5), "papier")
    return b.finish()


def lada_sklepowa():
    b = Builder("lada_sklepowa")  # 1 x 2
    b.box((0.9, 1.9, 0.95), (0, 0, 0.475), "drewno_ciemne")
    b.box((1.0, 2.0, 0.05), (0, 0, 0.98), "drewno_jasne")
    b.box((0.3, 0.3, 0.2), (0.2, -0.6, 1.1), "len")  # worek mąki
    b.box((0.25, 0.25, 0.3), (-0.2, 0.3, 1.15), "kaszana")  # słój
    b.cyl(0.12, 0.25, (0.2, 0.6, 1.12), "mosiadz", verts=8)  # waga
    return b.finish()


def latarnia():
    b = Builder("latarnia")  # gazowa latarnia uliczna
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
    return b.finish()


def lawka_parkowa():
    b = Builder("lawka_parkowa")  # 1 x 2
    b.box((0.4, 1.8, 0.05), (0, 0, 0.45), "drewno_jasne")
    b.box((0.05, 1.8, 0.4), (-0.2, 0, 0.72), "drewno_jasne")
    for y in (-0.8, 0.8):
        b.box((0.4, 0.06, 0.45), (0, y, 0.225), "zelazo")
    return b.finish()


def wozek():
    b = Builder("wozek")  # wózek ręczny z belami bawełny 1 x 2
    b.box((0.9, 1.6, 0.1), (0, 0, 0.5), "drewno_jasne")
    for x in (-0.5, 0.5):
        b.cyl(0.35, 0.08, (x, 0, 0.35), "drewno_ciemne", rot=(0, math.pi / 2, 0), verts=12)
    b.box((0.06, 1.0, 0.06), (-0.3, 1.2, 0.6), "drewno_jasne")
    b.box((0.06, 1.0, 0.06), (0.3, 1.2, 0.6), "drewno_jasne")
    b.box((0.8, 0.6, 0.6), (0, -0.4, 0.85), "len")
    b.box((0.8, 0.6, 0.5), (0, 0.3, 0.8), "len")
    return b.finish()


def bramka_fabryczna():
    b = Builder("brama_fabryczna")  # brama z napisem – wejście do pracy, 1 x 3
    for y in (-1.4, 1.4):
        b.box((0.5, 0.5, 3.0), (0, y, 1.5), "cegla")
    b.box((0.5, 3.3, 0.5), (0, 0, 3.2), "cegla")
    b.box((0.08, 2.3, 2.6), (0, 0, 1.3), "zelazo")
    for i in range(6):
        b.box((0.12, 0.08, 2.6), (0, -1.0 + i * 0.4, 1.3), "zelazo_jasne")
    b.box((0.2, 1.6, 0.4), (0, 0, 3.0), "mosiadz")  # tablica z nazwą
    return b.finish()


# ---------------------------------------------------------------------------
# Postacie – rodzina Walczaków
# ---------------------------------------------------------------------------
def postac(name, height, ubranie, wlosy, czapka=None, fartuch=False, spodnica=False):
    """Prosta figurka. height – wzrost w metrach (1.0 dziecko, 1.75 dorosły)."""
    s = height / 1.75
    b = Builder(name)
    glowa = 0.13 * s
    tors_h = 0.6 * s
    nogi_h = 0.8 * s
    # nogi
    if spodnica:
        b.cone(0.22 * s, 0.14 * s, nogi_h, (0, 0, nogi_h / 2), ubranie, verts=10)
    else:
        for x in (-0.09 * s, 0.09 * s):
            b.box((0.14 * s, 0.16 * s, nogi_h), (x, 0, nogi_h / 2), ubranie)
    # buty
    for x in (-0.09 * s, 0.09 * s):
        b.box((0.15 * s, 0.24 * s, 0.08 * s), (x, 0.02, 0.04 * s), "buty")
    # tors
    b.box((0.42 * s, 0.24 * s, tors_h), (0, 0, nogi_h + tors_h / 2), ubranie)
    if fartuch:
        b.box((0.3 * s, 0.03, tors_h * 0.9), (0, -0.135 * s, nogi_h + tors_h * 0.45), "fartuch")
    # ręce
    for x in (-0.27 * s, 0.27 * s):
        b.box((0.11 * s, 0.13 * s, tors_h * 0.9), (x, 0, nogi_h + tors_h * 0.5), ubranie)
        b.box((0.1 * s, 0.1 * s, 0.1 * s), (x, 0, nogi_h + 0.03 * s), "skora")
    # szyja i głowa
    b.cyl(0.06 * s, 0.08 * s, (0, 0, nogi_h + tors_h + 0.03 * s), "skora", verts=8)
    b.box((0.26 * s, 0.26 * s, 0.3 * s), (0, 0, nogi_h + tors_h + 0.22 * s), "skora")
    b.box((0.28 * s, 0.14 * s, 0.14 * s), (0, 0.08 * s, nogi_h + tors_h + 0.33 * s), wlosy)
    b.box((0.28 * s, 0.28 * s, 0.07 * s), (0, 0, nogi_h + tors_h + 0.375 * s), wlosy)
    if czapka:
        b.cyl(0.17 * s, 0.07 * s, (0, 0, nogi_h + tors_h + 0.43 * s), czapka, verts=10)
        b.box((0.26 * s, 0.14 * s, 0.03), (0, -0.14 * s, nogi_h + tors_h + 0.4 * s), czapka)
    # oczy
    for x in (-0.06 * s, 0.06 * s):
        b.box((0.03 * s, 0.01, 0.03 * s), (x, -0.135 * s, nogi_h + tors_h + 0.25 * s), "kreda")
    return b.finish()


POSTACIE = [
    lambda: postac("sim_ojciec", 1.75, "ubranie_robotnik", "wlosy_ciemne", czapka="czapka"),
    lambda: postac("sim_matka", 1.63, "ubranie_kobieta", "wlosy_jasne", fartuch=True, spodnica=True),
    lambda: postac("sim_chlopiec", 1.25, "ubranie_chlopiec", "wlosy_ciemne", czapka="czapka"),
    lambda: postac("sim_dziewczynka", 1.1, "ubranie_dziewczynka", "wlosy_jasne", spodnica=True),
    lambda: postac("npc_majster", 1.78, "czapka", "wlosy_ciemne"),
    lambda: postac("npc_nauczyciel", 1.72, "ubranie_robotnik", "wlosy_jasne"),
]


# ---------------------------------------------------------------------------
# Eksport
# ---------------------------------------------------------------------------
GENERATORS = [
    lozko, stol, krzeslo, piec, kredens, balia, wiadro, studnia, wychodek, lampa,
    polka_ksiazki, kolyska, krosno, przedzarka, maszyna_parowa, komin, zegar_fabryczny,
    lawka_szkolna, tablica, lada_sklepowa, latarnia, drzewo, lawka_parkowa, wozek,
    bramka_fabryczna,
]


def export_obj(obj, out_dir):
    bpy.ops.object.select_all(action="DESELECT")
    obj.select_set(True)
    bpy.context.view_layer.objects.active = obj
    path = os.path.join(out_dir, obj.name + ".glb")
    bpy.ops.export_scene.gltf(
        filepath=path,
        export_format="GLB",
        use_selection=True,
        export_apply=True,
        export_yup=True,
        export_materials="EXPORT",
        export_animations=False,
        export_skins=False,
        export_texcoords=False,
        export_normals=True,
    )
    return path


def main():
    argv = sys.argv
    if "--" in argv:
        argv = argv[argv.index("--") + 1:]
    else:
        argv = argv[1:]
    out_dir = argv[0] if argv else os.path.join(
        os.path.dirname(os.path.abspath(__file__)), "..", "godot", "assets", "models"
    )
    out_dir = os.path.abspath(out_dir)
    os.makedirs(out_dir, exist_ok=True)

    clear_scene()
    count = 0
    for gen in GENERATORS + POSTACIE:
        obj = gen()
        export_obj(obj, out_dir)
        count += 1
        bpy.ops.object.select_all(action="SELECT")
        bpy.ops.object.delete(use_global=False)
    print(f"Wyeksportowano {count} modeli do {out_dir}")


if __name__ == "__main__":
    main()
