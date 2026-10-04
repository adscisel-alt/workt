# Panteon Nilu

Hobbystyczna przeglądarkowa gra strategiczna inspirowana mechaniką planszówki
*Ankh: Gods of Egypt* (Eric M. Lang, CMON 2021). Własna nazwa, własna grafika (proste
kształty SVG i proceduralna scena 3D), własne sformułowania tekstów — bez ilustracji i tekstów wydawcy.

## Uruchomienie

```bash
npm install
npm test          # testy silnika (Vitest)
npm run dev       # gra w przeglądarce (hot-seat, 2 graczy)
npm run build     # typecheck + build produkcyjny
npm run smoke     # test dymny widoku 2D w Chromium (Playwright); CHROMIUM_PATH=... dla własnej przeglądarki
npm run smoke3d -- <katalog>          # test dymny widoku 3D (WebGL przez SwiftShader) + zrzuty ekranu
npm run shot3d -- <plik.png> [midgame|summon] [high|low]   # pojedynczy zrzut sceny 3D
npm run models    # przebudowa modeli figurek (public/models/*.glb) i manifestu
npm run pack:artifact -- <katalog>   # build dla hosta z własnym szkieletem HTML i bez .glb (np. strona-artefakt)
```

## Architektura

- **Silnik** (`src/engine`) to czyste funkcje: `applyMove(stan, ruch) → nowy stan`.
  Stan to zwykły JSON z ziarnem RNG (mulberry32), więc gra jest deterministyczna.
- **Legalne ruchy** generuje silnik (`legalMoves`); UI i bot tylko z nich wybierają.
  `applyMove` odrzuca każdy ruch spoza tej listy.
- **Decyzje w trakcie rozstrzygania** obsługuje pole `pending` (na co silnik czeka)
  i kolejka kroków `queue`. Obie są serializowalne.
- **Ukryte informacje**: `viewFor(stan, gracz)` zakrywa cudze karty i oferty; UI pokazuje
  tajne decyzje dopiero po ekranie przekazania urządzenia.
- **Moce, bogowie i strażnicy** to dane z hookami (`src/content`). Silnik pyta o nie
  tylko przez dispatcher `src/engine/hooks.ts`.
- **Liczby i tory** są w `src/config/rules.ts`, a **scenariusze map** w `src/config/scenarios`.

## Warstwa 3D

Widok 3D (React Three Fiber + drei + @react-three/postprocessing) to tylko inna prezentacja:
czyta stan gry i wysyła te same akcje co plansza SVG (wspólne `interaction` z legalnych ruchów silnika).
Silnik nie zmienił się w tym etapie. Przełącznik **2D / 3D** jest na górnym pasku (zapamiętywany);
bez WebGL2 gra startuje w 2D. Kod 3D (`src/ui3d`) jest w osobnym, leniwie ładowanym fragmencie.

- **Plansza**: heksy jako niskie graniastosłupy z fazowaną krawędzią, jeden `InstancedMesh` na teren.
  Osobne materiały PBR dla żyznych pól, pustyni i dna wody; tekstury rysowane proceduralnie na kanwie
  (własny RNG, bez plików graficznych), UV w przestrzeni świata, więc kafle się nie powtarzają.
  Woda: shader z falami w normalnych (odbicia HDRI). Rzeki, wielbłądy, żetony regionów i wrota też są w 3D.
- **Monumenty** (obelisk, świątynia, piramida) są złożone z prostych brył; znacznik właściciela ma kolor gracza.
- **Figurki**: modele `*.glb` z `public/models` według `manifest.json` (bez sondowania plików).
  Kolejność: `god-<bóg>.glb` → `god.glb`, `warrior-<bóg>.glb` → `warrior.glb`,
  `guardian-<strażnik>.glb` → `guardian.glb`. Materiał o nazwie zaczynającej się od `team` dostaje
  kolor gracza. Model skaluje się do wysokości figurki. Brak pliku albo błąd wczytania → pionek-zastępnik.
  W repozytorium są własne, proceduralne statuetki (`npm run models`): bóg z kompresją **meshopt**,
  wojownik z **Draco**. Dekoder Draco (kopia z `three/examples/jsm/libs/draco/gltf`, Apache 2.0) leży w `public/draco`, bez CDN. Strażnicy celowo nie mają
  modelu, więc pokazują pionek-zastępnik. Manifest może wskazać inny plik dla modelu (pole `files`),
  np. glTF w JSON tam, gdzie host nie serwuje `.glb`; robi to `npm run pack:artifact`.
- **Odporność**: gdy HDRI albo model się nie wczyta, scena działa dalej (proste światło, pionek-zastępnik);
  gdy scena 3D w ogóle nie ruszy, gra przełącza się na widok 2D z komunikatem.
- **Światło**: HDRI `apartment.exr` z pakietu `@pmndrs/assets` (CC0, Poly Haven), jedno światło
  kierunkowe z miękkimi cieniami (PCF), tone mapping ACES.
- **Postprocessing**: okluzja otoczenia (N8AO), bloom, tilt-shift, winieta (+ SMAA). Każdy efekt ma
  przełącznik w panelu **⚙ Grafika**.
- **Kamera**: orbita z limitem kąta i odległości, granice celu w obrębie planszy. Podczas bitwy kamera
  płynnie najeżdża na region (z czerwonym obrysem jego granicy), a po bitwie wraca do poprzedniego ujęcia.
- **Animacje** (czasowe, niezależne od liczby klatek): ruch po łuku z easingiem, pojawienie się przy
  przywołaniu, zapadanie się zabitych figurek, cząsteczki piasku przy lądowaniu i pył nad pustynią,
  pulsujące legalne pola.
- **Interakcja**: raycasting po heksach (niewidoczna warstwa instancji), obrys pola pod kursorem
  (złoty, gdy pole jest legalnym celem), HUD to zwykły HTML nad kanwą.
- **Wydajność**: adaptacyjna rozdzielczość (`PerformanceMonitor`, DPR 0,6–2). Tryb **Niska jakość**
  wyłącza postprocessing, cienie i cząsteczki oraz ogranicza DPR do 1. Licznik FPS (opcja w panelu)
  pokazuje też wywołania rysowania i trójkąty: ok. 35–45 wywołań i 14–15 tys. trójkątów w niskiej jakości
  (2 graczy), ok. 110 wywołań i 32 tys. trójkątów w wysokiej (3 graczy, z cieniami i efektami).
  Celem jest 60 FPS na laptopie z GPU zintegrowanym, ale **nie zmierzyłem tego na prawdziwym GPU**.
  Testy dymne działają na programowym WebGL (SwiftShader, CPU), który daje 1–2 FPS i nie mówi nic
  o wydajności na sprzęcie.

## Źródła danych

| Dane | Źródło |
|---|---|
| Tory akcji: 7 pól (Ruch, Przywołanie, Wyznawcy) i 6 pól (Odblokowanie); starty 5P/4P/3P/2P | Rulebook s. 9 |
| Tor wydarzeń: 18 pól, 5 konfliktów (łączenie po 3., eliminacja po 4., koniec po 5.) | Rulebook s. 9 i 32 |
| Tor oddania: start + 19 czerwonych + 11 niebieskich + szczyt (0–31, czerwone 0–19) | Rulebook s. 11, odczyt z grafiki |
| Komponenty: 10 monumentów każdego typu, 30 wielbłądów, 8 żetonów konfliktu, 15 ankh na boga | Rulebook s. 4–6 |
| Symbol strażnika pod drugim żetonem kolumny poziomu 1 | Rulebook s. 10 i 18 |
| Poziom 3 Olbrzymiego Skorpiona | FAQ 1.0 |

## Otwarte TODO (do potwierdzenia na fizycznej grze)

- Symbol strażnika na poziomach 2 i 3: przyjęto to samo miejsce co na poziomie 1 (drugi żeton kolumny).
- Poziomy strażników 1–2 (Kocia mumia i Satet → 1, Mumia i Apep → 2): instrukcja ich nie wypisuje.
- Tor oddania: liczba pól odczytana z grafiki.
- Mapa „Trzy Krainy” to własny projekt; scenariusze wydawcy są w osobnej książce, której tu nie ma.

## Interpretacje zasad (etap 4)

Miejsca, gdzie instrukcja i FAQ nie mówią wprost, kto decyduje albo jak dokładnie:

- **Satet**: miejsce, na które spychany jest wróg, wybiera właściciel Satet.
- **Skorpion**: celowanie po każdym postawieniu lub ruchu (także zepchnięciu) wybiera jego właściciel;
  gdy możliwy jest tylko jeden kierunek, ustawia się sam. Celować można tylko w pola planszy.
- **Mumia**: pole powrotu obok boga wybiera właściciel; Ra może przy tym nadać słońce (to przywołanie).
- **Izyda**: ocalenie decydowane osobno dla każdej chronionej figurki.
- **Wrota zaświatów**: stawiane na pustym polu lądowym (bez figurki i monumentu), innym niż istniejące wrota.
- **Zew obelisków**: każdą figurkę można przestawić najwyżej raz w danej bitwie.
- **Zapowiedź Amuna**: jawna, przed tajnym wyborem kart wszystkich graczy.
- **Karawana**: linia to ścieżka po krawędziach heksów, której oba końce dotykają rzeki, wody, wielbłąda
  lub brzegu mapy; musi podzielić region na dokładnie dwa, każdy ≥ 6 pól lądowych.

## Łączenie bogów (etap 5) — model

Po połączeniu oba miejsca przy stole grają dalej w swojej kolejności (po 1 akcji), ale sterują jednym
bogiem: „wyższym” (`mergedWith`), który ma wspólne figurki, wyznawców, karty i moce oraz zdolności obu
bogów (`extraGods`). Miejsce „niższe” ma `mergedInto`. Decyzje połączonego boga należą do wyższego
miejsca (instrukcja: przy sporze rozstrzyga gracz wyższego boga).

## Etapy

1. ✅ Silnik: mapa, regiony, sąsiedztwo, 4 akcje, tory, przejęcie monumentu.
2. ✅ Konflikt: dominacja, bitwa (5 kroków), 7 kart, żeton remisu.
3. ✅ UI hot-seat dla 2 graczy: plansza SVG, podświetlanie legalnych ruchów, panele graczy, tory, dziennik, ukryty wybór kart i ofert plagi.
4. ✅ Karawana, 12 mocy ankh, 6 strażników, zdolności 5 bogów.
5. ✅ Łączenie bogów (po 3. konflikcie), zapomniani bogowie (po 4.), rozstawienia dla 3–5 graczy.
6. ✅ Boty (losowy, heurystyczny) i zapis/wczytanie (przeglądarka + plik .json).
7. Warstwa 3D (React Three Fiber) — opis wyżej.

## Boty

- **Losowy** — dowolny legalny ruch, deterministyczny wg ziarna.
- **Heurystyczny** — w decyzjach jawnych wybiera ruch najlepiej oceniany przez `src/bot/evaluate.ts`
  (oddanie, wyznawcy, figurki, monumenty, moce, przewidywany wynik konfliktu w regionach, groźny rywal,
  czerwona strefa), z zachłannym dokończeniem własnych decyzji w turze. Tajne decyzje (karta bitwy,
  licytacja plagi) podejmuje regułami na **własnym widoku** (`viewFor`) — nie zna cudzych kart (jest na to test).
- Siła (testy, 12 partii na każdą liczbę graczy, heurystyczny vs losowi): 2 graczy 12/12,
  3 graczy 8/12, 4 graczy 9/12 wygranych.

## Zapis i wczytanie

`serializeGame` / `deserializeGame` (`src/engine/save.ts`): stan + metadane (nazwa, data, kto steruje
graczami). Wczytanie sprawdza format, wersję i spójność stanu. W UI: „Zapisz” (pamięć przeglądarki,
do 20 zapisów), „Pobierz zapis” (plik .json) oraz lista zapisów i wczytanie pliku na ekranie nowej gry.
