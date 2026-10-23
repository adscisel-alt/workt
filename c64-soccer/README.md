# C64 Soccer – prototyp meczu w stylu Microprose Soccer (Commodore 64)

Prototyp gry piłkarskiej na **Commodore 64** wzorowany na mechanice *Microprose Soccer*
(Sensible Software, 1988): widok z góry, pionowo przewijane boisko, mecz 6 na 6,
drybling, strzał z mocą, **podkręcona piłka („banan”)**, wślizgi, bramkarze,
auty, rożne, wybicia, zegar i wynik. Cała grafika jest własna (wygenerowana
skryptem), nic nie jest skopiowane z oryginału.

Gra działa **w przeglądarce** (wbudowany emulator C64) oraz jako zwykły plik
`.prg` na prawdziwym C64 / w emulatorze VICE.

## Uruchomienie w przeglądarce

Po wdrożeniu na GitHub Pages strona jest pod adresem
`https://adscisel-alt.github.io/workt/c64-soccer/`.

Lokalnie: w katalogu `web/` uruchom dowolny serwer statyczny, np.

```
cd c64-soccer/web
python3 -m http.server 8765
```

i otwórz `http://localhost:8765/`. Kliknij **Uruchom grę** – program wczyta
się i wystartuje automatycznie (kilka sekund „ekranu BASIC”).

## Sterowanie

| Klawisz (przeglądarka)      | C64 (klawiatura)  | Działanie |
|-----------------------------|-------------------|-----------|
| strzałki                    | W / A / S / D     | bieg w 8 kierunkach (sterujesz zawodnikiem najbliżej piłki – drużyna czerwona) |
| spacja, Z lub lewy Ctrl     | spacja            | z piłką: **przytrzymaj i puść** = strzał/podanie (dłużej = mocniej i wyżej); bez piłki: **wślizg** |
| po strzale: kierunek w bok  |                   | **podkręcenie** lotu piłki (banan), do przodu zaraz po strzale = wyższy lot |
| po meczu: strzał            |                   | nowy mecz |

Na prawdziwym C64 działa też **joystick w porcie 2**. Na telefonie pod ekranem
pojawiają się przyciski dotykowe.

## Zasady prototypu

- 6 na 6 (bramkarz + 5 w polu), dwie połowy po 45 „minut” (1 minuta meczu ≈ 2,4 s),
  zmiana stron w przerwie.
- Piłkę przejmuje zawodnik, który do niej dobiegnie (chyba że posiadacz ma ją
  „chronioną” przez chwilę po przejęciu); wślizg odbiera piłkę także chronioną.
- Aut: wznowienie dla drużyny przeciwnej przy linii. Piłka za linią bramkową:
  rzut rożny lub wybicie od bramki (bramkarz).
- Gol: piłka w świetle bramki poniżej poprzeczki. Komunikat **GOAL!**, wznowienie
  ze środka dla drużyny, która straciła gola.
- Komputer: najbliższy zawodnik goni piłkę, reszta trzyma formację zależną od
  pozycji piłki; z piłką dryblują do bramki, podają przy zagrożeniu i strzelają
  z pola karnego; bramkarze wychodzą do piłki w polu bramkowym i wykopują ją
  do najdalej wysuniętego kolegi.

## Budowanie programu C64

Wymagania: [cc65](https://cc65.github.io/) (`cl65` w `PATH` lub `CC65_HOME`),
Python 3, GNU make.

```
cd c64-soccer
make            # generuje grafikę (tools/gen_gfx.py) i buduje build/soccer.prg -> web/soccer.prg
make DEBUG=1    # wersja z profilowaniem (licznik pominiętych ramek, czas sekcji logiki)
```

## Struktura

```
c64-soccer/
├── src/main.c       logika gry (cc65 C): zawodnicy, piłka, AI, zasady, HUD, kamera
├── src/vic.s        warstwa sprzętowa: VIC-II, przerwania rastrowe, multiplekser
│                    16 sprite'ów wirtualnych na 8 sprzętowych, podwójnie buforowany
│                    przewijany ekran, odczyt klawiatury/joysticka
├── src/game.s       gorące ścieżki logiki w asemblerze (ruch zawodników,
│                    odległości, lista sprite'ów, tekst HUD)
├── src/gfx.s/.h     wygenerowana grafika (nie edytować ręcznie)
├── tools/gen_gfx.py generator: boisko (mapa znaków multicolor), sprite'y zawodników
│                    8 kierunków x 3 klatki, piłka, cień, czcionka 4x5
├── tools/c64run.mjs bezokienkowy C64 w Node (ten sam rdzeń co w przeglądarce):
│                    zrzuty ekranu, wstrzykiwanie klawiszy/joysticka, podgląd zmiennych
├── tools/webtest.mjs test dymny strony w Chromium (Playwright z zależności repo)
├── web/index.html   strona z emulatorem
├── web/soccer.prg   zbudowana gra
└── web/emu/         emulator c64-ready (MIT) – rdzeń WASM + moduły JS
```

### Testy bez okna (Node)

```
node tools/c64run.mjs web/soccer.prg --lbl build/soccer.lbl --frames 3000 \
  --joy 1@40-300 --joy 16@300-306 \
  --shot shot.png@1000 --scale 2 --trace 500 --tr score --tr owner --tr bx:16
```

`--joy KIERUNEK@od-do` (1 góra, 2 dół, 4 lewo, 8 prawo, 16 strzał), `--key W@od-do`
(nazwy z `C64_KEY`), `--tr nazwa[:16]` wypisuje zmienną z pliku etykiet,
`--shoton zmienna=plik.png@opóźnienie` robi zrzut, gdy zmienna stanie się niezerowa.

## Układ pamięci (C64)

- `$0801-$BFFF` program i dane (cc65), stos C poniżej `$C000`
- `$C000` / `$C400` dwa ekrany (przewijanie pionowe, YSCROLL + przerzucanie buforów)
- `$C800` zestaw znaków boiska (multicolor: trawa, pas, linie, siatka)
- `$E000` dane sprite'ów (28 sprite'ów), wektory IRQ/NMI w RAM pod `$FFFA`
- Logika gry: 25 kroków na sekundę (co drugą ramkę PAL); multiplekser i
  przewijanie pracują w przerwaniu co ramkę.

## Co dalej (poza prototypem)

11 na 11 i większe boisko, turniej/menu, lepsze sprite'y (własne lub od grafika),
główki i przewrotki, dźwięk SID, gra na dwóch joystickach, zapis wyników.
