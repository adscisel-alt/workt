# Kroniki Epok — instrukcje dla agentów (Antigravity, Claude Code, Cursor…)

Projekt składa się z gry w Godocie (`godot/`), potoku sprite'ów w Blenderze (`blender/`) i danych edukacyjnych
w JSON (`godot/data/`). Język interfejsu, komentarzy w danych i komunikatów: **polski**. Nazwy plików i kluczy JSON
bez polskich znaków (`zywnosc`, `wlocznik`).

## Polecenia

| Cel | Polecenie |
|---|---|
| testy jednostkowe | `godot --headless --path godot res://tests/run_tests.tscn` |
| symulacja rozgrywki | `godot --headless --path godot res://tests/sim_test.tscn` |
| szybki start gry bez błędów skryptów | `godot --headless --path godot --quit-after 300` |
| zrzut ekranu (Linux, bez monitora) | `SCREENSHOT_PATH=/tmp/z.png xvfb-run -a -s "-screen 0 1280x720x24" godot --path godot --rendering-driver opengl3 res://tests/screenshot.tscn` |
| modele zastępcze + render sprite'ów | `cd blender && ./render_all.sh` (lub `PY_BPY=python ./render_all.sh`) |
| jeden model | `blender -b -P blender/render_sprites.py -- --model blender/models/dom.blend --out godot/assets/sprites` |
| paleta AoE2 | `python blender/palette_aoe.py godot/assets/sprites --outline` |

Po każdej zmianie w `scripts/` uruchom oba testy. Po zmianie w `data/*.json` sprawdź poprawność JSON i uruchom
`run_tests` (waliduje odpowiedzi quizu, odwołania budynków do jednostek itp.).

## Zasady kodu (GDScript, Godot 4.3+)

* Statyczne typowanie; **nie** używaj `:=` dla wartości z `Dictionary.get()` ani z pól typu `Node` — podaj typ jawnie
  (projekt traktuje ostrzeżenie „inferred from Variant” jako błąd).
* Nowe encje dziedziczą po `Entity`; jednostki po `Unit`; budynki konfiguruje się w `data/budynki.json`, nie w kodzie.
* Interfejs jest budowany w kodzie (`hud.gd`); style przez `UITheme`. Nie dodawaj scen `.tscn` poza `scenes/main.tscn`
  i testami, chyba że to konieczne.
* Pauza: wszystkie okna (quiz, kodeks, pomoc, wydarzenie) pauzują drzewo; HUD ma `PROCESS_MODE_ALWAYS`.
* Każda nowa jednostka lub budynek musi działać **bez sprite'a** (dodaj gałąź w `procedural_art.gd`).

## Konwencje sprite'ów

* `godot/assets/sprites/<rodzaj>_<animacja>.png` + `.json`; animacje: `idle`, `walk`, `attack`, `gather`, `build`.
* Wiersze arkusza = kierunki (0 = S, zgodnie z ruchem wskazówek zegara), kolumny = klatki. 8 lub 5 kierunków.
* `origin` w JSON to piksel stóp / środka podstawy. Materiał `PlayerColor` (magenta) = kolor gracza.
* 1 jednostka Blendera = 1 kafelek (64×32 px). Kamera: ortograficzna, rotacja X 60°, Z 45°. Zob. `blender/common.py`.

## Treści edukacyjne

* Każde pytanie quizu ma 4 odpowiedzi, pole `poprawna` (indeks) i `wyjasnienie` (1–3 zdania z datą lub przykładem).
  Odpowiedzi są tasowane w grze, więc poprawna może być pierwsza w pliku.
* Wpisy Kodeksu: 60–120 słów, konkret (daty, miejsca, przykłady z Polski), bez oceniania i anachronizmów.
* Nie dodawaj treści, których nie da się zweryfikować w podręczniku lub encyklopedii.

## Czego nie robić

* Nie dodawaj do repozytorium materiałów z Age of Empires II (sprite'y, palety, dźwięki, nazwy własne Microsoftu).
* Nie commituj `godot/.godot/`, `godot/assets/sprites/_frames/` ani plików `.blend1`.
