---
description: Dodaje nowy obiekt (mebel/maszynę) do gry od modelu po czynności Simów
---
1. W `blender/generate_assets.py` napisz funkcję `nazwa()` zwracającą `Builder("nazwa").finish()` i dodaj ją do `GENERATORS`.
2. Uruchom workflow `/modele-blender`.
3. W `godot/scripts/catalog.gd` dodaj wpis `"nazwa": {name, model, footprint, price, use_offset, category, actions}`.
4. Jeśli obiekt ma stać na parceli od początku – dodaj do `World.OBJECTS`; jeśli ma być kupowany – do `Catalog.BUYABLE`.
5. Uruchom workflow `/test-symulacji` i sprawdź, czy Simowie używają obiektu autonomicznie.
