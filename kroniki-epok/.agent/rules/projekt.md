---
trigger: always_on
description: Reguły projektu Kroniki Epok (Godot + Blender), obowiązują we wszystkich zadaniach.
---

Przeczytaj `AGENTS.md` w katalogu głównym projektu i stosuj opisane tam polecenia oraz zasady kodu.
Najważniejsze:
1. Po zmianach w `godot/scripts/` uruchom `godot --headless --path godot res://tests/run_tests.tscn`
   oraz `res://tests/sim_test.tscn`; nie kończ zadania z czerwonymi testami.
2. GDScript ze statycznymi typami; wartości z `Dictionary.get()` typuj jawnie.
3. Teksty w grze po polsku; klucze JSON i nazwy plików bez polskich znaków.
4. Nowe jednostki/budynki: najpierw `data/*.json`, potem gałąź w `procedural_art.gd`, na końcu (opcjonalnie) model w `blender/`.
5. Żadnych zasobów z Age of Empires II w repozytorium.
