# Arkusze sprite'ów

Pliki `<rodzaj>_<animacja>.png` + `<rodzaj>_<animacja>.json` generuje `blender/render_sprites.py`
(uruchamiany przez `blender/render_all.sh`). Rodzaj = klucz z `data/jednostki.json`, `data/budynki.json`
lub nazwa złoża (`drzewo`, `krzaki`, `zloto`, `kamien`). Animacje: `idle`, `walk`, `attack`, `gather`, `build`.

Układ: wiersze = kierunki (0 = S, zgodnie z ruchem wskazówek zegara), kolumny = klatki. JSON:

```json
{"frame_w": 96, "frame_h": 96, "frames": 8, "directions": 8, "fps": 10, "origin": [48, 79], "player_color": true}
```

Brak pliku = encja rysuje się proceduralnie (`scripts/procedural_art.gd`). Katalog `_frames/` (klatki pośrednie)
nie trafia do repozytorium.
