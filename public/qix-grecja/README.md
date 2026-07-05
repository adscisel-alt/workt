# QIX ΕΛΛΑΣ — Zabytki starożytnej Grecji

Gra w stylu klasycznego **QIX / Volfied** (lata 80/90) z motywem starożytnej Grecji.
Odgradzasz fragmenty planszy, a spod ciemnego pola **wyłania się obraz zabytku**
(z animacją typu Ken Burns). Po odsłonięciu — lub po ukończeniu poziomu — czytasz
informacje o budowli i jej twórcach.

## Graj online (GitHub Pages)

Po wdrożeniu przez GitHub Actions gra jest dostępna pod adresem:

```
https://adscisel-alt.github.io/workt/qix-grecja/
```

(główna aplikacja repozytorium działa pod `…github.io/workt/`, a gra w podkatalogu `/qix-grecja/`).

## Uruchomienie lokalne

Nie trzeba nic budować — otwórz `index.html` w przeglądarce (dwuklik).

## Grafika — prawdziwe zdjęcia

- Domyślnie gra **pobiera prawdziwe, aktualne zdjęcia zabytków na żywo z
  Wikimedia Commons** (wolne licencje CC / Public Domain) i animuje je.
- Bez internetu (lub gdy pobieranie się nie powiedzie) używa **rysunku
  wektorowego** — dzięki temu gra zawsze działa.
- Chcesz mieć zdjęcia na stałe / offline albo własne? Wrzuć pliki
  `parthenon.jpg`, `erechtheion.jpg`, `sounion.jpg` do folderu `img/`
  (zobacz `img/README.md`) — mają pierwszeństwo. Możesz je pobrać automatycznie:
  ```bash
  node scripts/pobierz-zdjecia.mjs
  ```

## Zasady

- Poruszaj się po **krawędzi** zdobytego obszaru i rysuj linie w głąb pola.
- Zamknięcie pętli zdobywa teren i **odsłania fragment zabytku**.
- Zdobądź **75%** planszy, aby ukończyć poziom i odkryć cały zabytek.
- **Kliknij** odsłonięty zabytek, aby zobaczyć jego historię, datę powstania i architektów.
- Najlepsze wyniki trafiają do **tabeli rekordów** (zapisywanej w przeglądarce).

## Uważaj na

- **Qix** — kolorowa błyskawica krążąca po niezdobytym polu; dotknięcie Twojej linii = utrata życia.
- **Sparx** — iskry patrolujące krawędzie.
- **Lont** — zapala się, gdy zatrzymasz się w trakcie rysowania, i biegnie po Twojej linii.

## Sterowanie

- Klawiatura: **strzałki** lub **WASD**
- Telefon/tablet: **pad dotykowy** pod planszą
- 🔊 — włącz/wyłącz dźwięk

## Zabytki (poziomy)

1. **Partenon** — Akropol, Ateny (447–432 p.n.e.), architekci Iktinos i Kallikrates, rzeźba Fidiasza
2. **Erechtejon** — Ganek Kariatyd, Akropol (421–406 p.n.e.), przypisywany Mnesiklesowi
3. **Świątynia Posejdona** — przylądek Sunion (ok. 444 p.n.e.)
