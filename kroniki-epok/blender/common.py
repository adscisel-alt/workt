"""Wspólne stałe i narzędzia potoku sprite'ów (Blender -> Godot).

Konwencje (muszą być zgodne z godot/scripts/iso.gd i sprite_lib.gd):
  * 1 jednostka Blendera = 1 kafelek mapy (romb 64x32 px na ekranie).
  * Rzut dimetryczny 2:1 jak w Age of Empires II: kamera ortograficzna,
    nachylona 30 stopni nad horyzont (rotacja X = 60 stopni), obrócona o 45 stopni wokół Z.
  * Kierunek 0 = jednostka zwrócona "w dół ekranu" (S), kolejne zgodnie z ruchem wskazówek zegara.
  * Światło pada z lewego górnego rogu ekranu (jak w pierwowzorze).
  * Materiał o nazwie "PlayerColor" to kolor gracza: w Godocie shader podmienia magentę na kolor drużyny.
"""
import math
import sys

TILE_W = 64                       # szerokość rombu kafelka w px
PPU = TILE_W / math.sqrt(2.0)     # pikseli na jednostkę świata w poziomie ekranu (45.25)
CAM_PITCH_DEG = 60.0              # rotacja X kamery (60 = 30 stopni nad horyzontem -> rzut 2:1)
VERT_SCALE = math.cos(math.radians(30.0))  # skala pionowej osi świata na ekranie
PLAYER_COLOR = (1.0, 0.0, 1.0, 1.0)
FPS = 10


def script_args():
    """Argumenty po '--' (uruchomienie przez `blender -b -P`) lub wszystkie (moduł bpy)."""
    argv = sys.argv
    if "--" in argv:
        return argv[argv.index("--") + 1:]
    return argv[1:]


def ortho_scale_for(frame_px):
    return frame_px / PPU


def origin_px(frame_px, anchor):
    """Piksel (x, y) odpowiadający punktowi (0,0,0) modelu w klatce o rozmiarze frame_px."""
    return [frame_px / 2.0, round(frame_px * anchor)]


def target_z_for(frame_px, anchor):
    """Wysokość (w jednostkach świata), w którą celuje kamera, aby punkt (0,0,0) wypadł na `anchor` wysokości klatki."""
    d_px = (anchor - 0.5) * frame_px
    return d_px / (PPU * VERT_SCALE)
