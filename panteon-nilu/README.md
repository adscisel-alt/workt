# Panteon Nilu

Hobbystyczna przeglądarkowa gra strategiczna inspirowana mechaniką planszówki
*Ankh: Gods of Egypt* (Eric M. Lang, CMON 2021). Własna nazwa, własna grafika (proste
kształty SVG), własne sformułowania tekstów — bez ilustracji i tekstów wydawcy.

## Uruchomienie

```bash
npm install
npm test          # testy silnika (Vitest)
npm run dev       # gra w przeglądarce (hot-seat, 2 graczy)
npm run build     # typecheck + build produkcyjny
npm run smoke     # test dymny w Chromium (Playwright); CHROMIUM_PATH=... dla własnej przeglądarki
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
6. Bot, zapis i wczytanie.
