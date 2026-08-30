# GODZINA „W” ⚓

**Edukacyjna gra przeglądarkowa typu escape room o Powstaniu Warszawskim**,
rozwijana jako projekt semestralny.

Wcielasz się w łączniczkę/łącznika Armii Krajowej i przenosisz meldunek przez
walczącą Warszawę 1944 roku — od konspiracyjnego mieszkania w przeddzień
Godziny „W”, przez Harcerską Pocztę Polową i radiostację „Błyskawica”,
po przejście kanałami ze Starówki do Śródmieścia. Na misję masz **63 minuty —
po jednej za każdy dzień powstania**.

## Jak uruchomić

Gra to czysty HTML/CSS/JavaScript — **bez budowania i bez zależności**:

- **najprościej:** otwórz plik `index.html` w przeglądarce (podwójne kliknięcie),
- **albo lokalny serwer** (ładniejsze adresy, tak działa też hosting):

  ```bash
  cd powstanie-escape-room
  python3 -m http.server 8080      # → http://localhost:8080
  ```

Gra działa w każdej współczesnej przeglądarce (Chrome, Firefox, Edge, Safari),
także na telefonie. Postęp zapisuje się automatycznie w `localStorage` —
można zamknąć kartę i wrócić do misji.

## Rozgrywka w skrócie

| Etap | Miejsce | Zagadka |
|---|---|---|
| 1 | Konspiracyjne mieszkanie (31 VII 1944) | zamek szyfrowy — data i godzina Godziny „W” |
| 2 | Harcerska Poczta Polowa (6 VIII) | prawdziwy szyfr harcerski **GA-DE-RY-PO-LU-KI** |
| 3 | Radiostacja „Błyskawica” (12 VIII) | depesza **alfabetem Morse’a** (z dźwiękiem!) |
| 4 | Szpital polowy na Starówce (28 VIII) | zagadka logiczna — numery sal rannych |
| 5 | Kanały: pl. Krasińskich → Warecka (1 IX) | labirynt — trasa z 3 fragmentów planu |
| 6 | Odprawa w Śródmieściu (2 X) | quiz wiedzy o powstaniu |

Mechaniki: **ekwipunek** (przedmioty znajdowane w pokojach są potrzebne dalej),
**notatnik historyczny** („Czy wiesz, że…” po każdej zagadce), **podpowiedzi**
(kosztują czas), **kary czasowe** za błędy, **6 osiągnięć**, autozapis,
dźwięki generowane Web Audio API (m.in. prawdziwe sygnały Morse’a).

Po upływie czasu gra **nie kończy się porażką** — przechodzi w „tryb pamięci”
(cel edukacyjny jest ważniejszy niż rywalizacja), a wynik zostaje oznaczony.

## Struktura projektu

```
powstanie-escape-room/
├── index.html            # strona gry (ładuje skrypty w ustalonej kolejności)
├── css/styles.css        # cały wygląd (motyw: noc, cegła, biel i czerwień)
├── js/
│   ├── dane.js           # TREŚĆ gry: pokoje, zagadki, notatki, quiz, osiągnięcia
│   ├── dzwiek.js         # dźwięki przez Web Audio API (Morse, sygnały)
│   ├── stan.js           # stan gry, zegar 63 min, zapis/odczyt localStorage
│   ├── ui.js             # modale, toasty, ekwipunek, notatnik, tabela Morse’a
│   └── gra.js            # główna pętla: ekrany, pokoje, typy zagadek
├── testy/
│   ├── test-danych.mjs   # testy spójności treści (czysty Node, bez zależności)
│   └── test-e2e.mjs      # Playwright przechodzi CAŁĄ grę w przeglądarce
└── docs/                 # dokumentacja projektu semestralnego (patrz niżej)
```

Rozdzielenie **treści** (`dane.js`) od **silnika** (pozostałe pliki) jest
celowe: co tydzień można dodawać pokoje, zagadki i notatki bez dotykania
logiki — a testy pilnują spójności.

## Testy

```bash
# testy treści — sprawdzają m.in., że każda zagadka ma rozwiązanie,
# szyfrogramy naprawdę się deszyfrują, a labirynt da się przejść
node testy/test-danych.mjs

# test e2e — bot przechodzi całą grę w Chromium (wymaga `npm install`
# w katalogu głównym repozytorium, gdzie jest Playwright)
node testy/test-e2e.mjs
# w środowiskach z gotowym Chromium: CHROMIUM_PATH=/ścieżka/do/chrome node testy/test-e2e.mjs
```

Test e2e **nie zna odpowiedzi na sztywno** — czyta je z danych gry, więc
pozostaje aktualny w miarę rozwoju treści przez semestr.

## Dokumentacja semestralna (katalog `docs/`)

| Dokument | Zawartość |
|---|---|
| [PLAN-SEMESTRALNY.md](docs/PLAN-SEMESTRALNY.md) | plan 15 tygodni pracy z kamieniami milowymi |
| [GDD.md](docs/GDD.md) | game design document — projekt rozgrywki i zagadek |
| [ARCHITEKTURA.md](docs/ARCHITEKTURA.md) | architektura kodu i decyzje techniczne |
| [ZRODLA-HISTORYCZNE.md](docs/ZRODLA-HISTORYCZNE.md) | fakty użyte w grze + bibliografia |
| [TESTOWANIE.md](docs/TESTOWANIE.md) | strategia testów i scenariusze ręczne |
| [DZIENNIK-PRACY.md](docs/DZIENNIK-PRACY.md) | dziennik postępów (uzupełniany co tydzień) |

Historia zmian: [CHANGELOG.md](CHANGELOG.md).

## Charakter projektu

Gra powstała w celach **edukacyjnych i upamiętniających**. Wszystkie zagadki
oparto na prawdziwych realiach powstania (szyfr GA-DE-RY-PO-LU-KI, radiostacja
„Błyskawica”, Harcerska Poczta Polowa, ewakuacja kanałami). Tematy przemocy
przedstawiono w sposób odpowiedni dla uczniów — gra opowiada o odwadze,
łączności i pamięci, nie o walce. Fakty i liczby wraz ze źródłami zebrano
w [docs/ZRODLA-HISTORYCZNE.md](docs/ZRODLA-HISTORYCZNE.md).
