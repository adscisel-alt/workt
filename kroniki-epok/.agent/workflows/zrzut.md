---
description: Zrób zrzut ekranu z działającej gry (bez monitora, przez Xvfb) i pokaż go użytkownikowi.
---

1. Upewnij się, że projekt jest zaimportowany: `godot --headless --path godot --import`.
2. Uruchom: `SCREENSHOT_PATH=$PWD/zrzut.png xvfb-run -a -s "-screen 0 1280x720x24" godot --path godot --rendering-driver opengl3 res://tests/screenshot.tscn`
   (na macOS/Windows uruchom grę normalnie i użyj systemowego zrzutu).
3. Otwórz `zrzut.png` i opisz, co widać: pasek surowców, panel dolny, osadnicy w pracy, budowa domu.
4. Jeśli czegoś brakuje (np. panelu), wskaż odpowiedzialny fragment `godot/scripts/hud.gd`.
