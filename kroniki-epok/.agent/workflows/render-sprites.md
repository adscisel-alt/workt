---
description: Wyrenderuj sprite'y z modeli Blendera do godot/assets/sprites (wszystkie lub wybrane modele).
---

1. Sprawdź, czy dostępny jest `blender` (polecenie `blender --version`) albo Python z modułem `bpy` (`python -c "import bpy"`).
2. Jeśli użytkownik podał nazwy modeli, ustaw `MODELS="nazwa1 nazwa2"`; w przeciwnym razie renderuj wszystkie.
3. Uruchom z katalogu `blender/`: `./render_all.sh` (Blender w PATH) lub `PY_BPY=python ./render_all.sh` (moduł bpy).
   Do szybkiego podglądu: `SAMPLES=8 ./render_all.sh`.
4. Jeśli użytkownik chce styl palety AoE2, dodaj `PALETTE=1 OUTLINE=1`.
5. Po renderze uruchom `godot --headless --path godot --import`, aby Godot zaimportował nowe PNG, a potem workflow `/testy`.
6. Pokaż użytkownikowi listę nowych plików `*_idle.png` i ich rozmiary oraz jeden arkusz jednostki do oceny wizualnej.
