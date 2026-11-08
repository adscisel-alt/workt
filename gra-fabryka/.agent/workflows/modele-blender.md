---
description: Regeneruje modele GLB skryptem Blendera i reimportuje je w Godot
---
1. `python -m pip install bpy` (Python 3.11–3.13; wariant: `blender --background --python ...`).
2. `python gra-fabryka/blender/generate_assets.py gra-fabryka/godot/assets/models`
3. `godot --headless --path gra-fabryka/godot --import`
4. Zrób zrzut ekranu: `xvfb-run -a -s "-screen 0 1366x800x24" godot --path gra-fabryka/godot --rendering-driver opengl3 res://scenes/screenshot.tscn -- shot.png 10.5 24 1`
5. Obejrzyj `shot.png`; popraw proporcje/kolory w `PAL` lub funkcjach modeli i powtórz.
