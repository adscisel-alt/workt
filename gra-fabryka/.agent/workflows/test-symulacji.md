---
description: Uruchamia test headless gry (35 dni) i sprawdza błędy skryptów oraz balans
---
1. Upewnij się, że binarka Godot 4.6 jest dostępna jako `godot` (lub ustaw zmienną `GODOT`).
2. Zaimportuj zasoby: `godot --headless --path gra-fabryka/godot --import`
3. Uruchom symulację: `godot --headless --path gra-fabryka/godot res://scenes/test_run.tscn --quit-after 3000`
4. Sprawdź wynik: brak linii `SCRIPT ERROR` / `ERROR`; w raporcie `== KONIEC` zdrowie rodziny > 50,
   edukacja dzieci rośnie, zapasy jedzenia nie są stale równe 0.
5. Jeśli balans jest zły, popraw stawki w `godot/scripts/catalog.gd` lub `Sim.DECAY` i powtórz.
