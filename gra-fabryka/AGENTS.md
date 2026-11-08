# Instrukcje dla agentów (Antigravity, Claude Code, inne)

Ten katalog to gra **„Fabryka 1892 – Rodzina Walczaków”** (Godot 4.6 + modele z Blendera).

## Zasady pracy
- Język użytkownika i wszystkich tekstów w grze: **polski** (z polskimi znakami).
- Logika gry jest w GDScript (`godot/scripts/`), treści edukacyjne w `godot/data/wiedza.json`,
  modele w `blender/generate_assets.py` → `godot/assets/models/*.glb`.
- Nie dodawaj zasobów z gier The Sims (tekstur, sprite'ów, dźwięków) – tylko własne lub CC0.
- Fakty historyczne: podawaj daty i liczby tylko takie, które da się zweryfikować; ceny i płace
  oznaczaj jako orientacyjne.
- Po każdej zmianie skryptów uruchom test headless (poniżej). Zmiany balansu sprawdzaj raportem
  dziennym z tego testu.

## Komendy
```bash
# import + test symulacji 35 dni (wymaga binarki godot 4.6 w PATH)
godot --headless --path godot --import
godot --headless --path godot res://scenes/test_run.tscn --quit-after 3000

# regeneracja modeli, tekstur i dźwięków (pip install bpy numpy)
python blender/generate_assets.py godot/assets/models godot/assets/textures
python blender/generate_audio.py godot/assets/audio

# eksport (szablony Godot 4.6 w ~/.local/share/godot/export_templates/4.6.stable)
godot --headless --path godot --export-release "Web" ../export/web/index.html
godot --headless --path godot --export-release "Windows Desktop" ../export/windows/Fabryka1892.exe

# zrzut ekranu bez monitora (Linux, xvfb)
xvfb-run -a -s "-screen 0 1366x800x24" godot --path godot --rendering-driver opengl3 \
  res://scenes/screenshot.tscn -- shot.png 10.5 24 1
```

## Konwencje
- 1 kafelek = 1 m; `footprint` i `use_offset` w `catalog.gd` opisują obiekt przy obrocie 0;
  obrót o `rot` kroków po 90° realizuje `Interactable.local_to_tile`.
- Potrzeby w skali 0–100, spadek na godzinę gry w `Sim.DECAY`, przyrost przez `rate` czynności.
- Zdarzenia fabularne mają `id` w `wiedza.json` → `events`; wywołanie `Game.request_event(id)`;
  efekty wyborów w `Game._apply_choice_effect`.
- Sygnały zamiast bezpośrednich odwołań z `Game` do HUD.
- Postacie: szkielet 11 kości (`hips, chest, head, upperarm/forearm.L/R, thigh/shin.L/R`), animacje
  `idle, walk, work, sit, sleep` kluczowane w osiach świata (`Rig.rot/loc`). Nowa animacja = nowy
  blok w `animate()` + ewentualnie `anim` w czynności katalogu.
- Dźwięki są syntetyczne (własne, CC0) – nie dodawaj plików o niejasnej licencji.
