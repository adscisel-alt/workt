---
description: Eksportuje grę do przeglądarki i na Windows (wymaga szablonów eksportu Godot 4.6)
---
1. Zainstaluj szablony: pobierz `Godot_v4.6-stable_export_templates.tpz` z GitHuba godotengine/godot i rozpakuj do `~/.local/share/godot/export_templates/4.6.stable` (Linux) lub użyj Editor → Manage Export Templates.
2. `godot --headless --path gra-fabryka/godot --import`
3. `godot --headless --path gra-fabryka/godot --export-release "Web" ../export/web/index.html`
4. `godot --headless --path gra-fabryka/godot --export-release "Windows Desktop" ../export/windows/Fabryka1892.exe`
5. Wersję Web sprawdź lokalnie: `python -m http.server -d gra-fabryka/export/web 8080` i otwórz http://localhost:8080 (preset bez wątków, nie wymaga COOP/COEP).
6. W CI to samo robi `.github/workflows/build-game.yml` (artefakty, Release po tagu `gra-v*`). Gra nie jest wdrażana razem z aplikacją protokołów – publikację Web zrób w osobnym repozytorium (README, sekcja „Publikacja w przeglądarce”).
