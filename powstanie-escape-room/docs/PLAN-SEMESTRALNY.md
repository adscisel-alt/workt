# Plan semestralny — GODZINA „W”

Projekt rozwijany przez 15 tygodni semestru. Zasada: **na koniec każdego
tygodnia gra jest w stanie grywalnym** (małe przyrosty zamiast jednej dużej
integracji), a każda zmiana treści przechodzi przez `testy/test-danych.mjs`.

## Kamienie milowe

| Kamień | Termin | Kryterium ukończenia |
|---|---|---|
| **M1 — Prototyp** | tydzień 3 | działa 1 pokój z zagadką, zegar i zapis stanu |
| **M2 — Wersja alfa** | tydzień 7 | komplet 6 etapów przechodnich od startu do końca |
| **M3 — Wersja beta** | tydzień 11 | dźwięk, osiągnięcia, testy e2e, poprawki po testach z graczami |
| **M4 — Wydanie 1.0** | tydzień 15 | publikacja online, dokumentacja, prezentacja końcowa |

## Harmonogram tygodniowy

### Faza 1 — fundamenty (tygodnie 1–3)
- **Tydzień 1.** Research historyczny: wybór wątków (Godzina „W”, poczta polowa,
  „Błyskawica”, kanały), zebranie faktów i źródeł → `ZRODLA-HISTORYCZNE.md`.
  Szkic koncepcji gry i głównej pętli rozgrywki → `GDD.md`.
- **Tydzień 2.** Szkielet techniczny: struktura plików, silnik ekranów,
  stan gry i zegar 63 minut, zapis w `localStorage` (`stan.js`, `gra.js`).
- **Tydzień 3. (M1)** Pokój 1 „Konspiracyjne mieszkanie” z hotspotami
  i zamkiem szyfrowym; pierwsze testy danych.

### Faza 2 — treść (tygodnie 4–7)
- **Tydzień 4.** Pokój 2 „Poczta polowa” — implementacja szyfru
  GA-DE-RY-PO-LU-KI + system ekwipunku i notatnika historycznego.
- **Tydzień 5.** Pokój 3 „Radiostacja” — zagadka Morse’a, generowanie
  sygnałów Web Audio API, tabela Morse’a w interfejsie.
- **Tydzień 6.** Pokój 4 „Szpital polowy” (zagadka logiczna) oraz pokój 5
  „Kanały” (labirynt, fragmenty planu jako przedmioty, kary czasowe).
- **Tydzień 7. (M2)** Pokój 6 „Odprawa” (quiz), ekran końcowy ze statystykami;
  całość przechodnia — pierwsza pełna rozgrywka testowa.

### Faza 3 — jakość (tygodnie 8–11)
- **Tydzień 8.** System podpowiedzi z kosztem czasowym, kary za błędy,
  balans poziomu trudności (czy 63 minuty to dobrze?).
- **Tydzień 9.** Oprawa: dopracowanie stylów, animacje, tryb „prefers-reduced-motion”,
  responsywność na telefonie, dostępność (aria, kontrast, klawiatura).
- **Tydzień 10.** Osiągnięcia i dźwięki; test e2e Playwright przechodzący całą grę.
- **Tydzień 11. (M3)** Testy z prawdziwymi graczami (min. 5 osób z innych grup);
  zebranie uwag → lista poprawek; korekta merytoryczna treści historycznych.

### Faza 4 — wydanie (tygodnie 12–15)
- **Tydzień 12.** Wdrożenie poprawek po testach; korekta językowa wszystkich tekstów.
- **Tydzień 13.** Publikacja na hostingu statycznym (GitHub Pages); instrukcja gry.
- **Tydzień 14.** Uzupełnienie dokumentacji (architektura, testowanie, dziennik);
  przygotowanie prezentacji i scenariusza pokazu na zajęcia.
- **Tydzień 15. (M4)** Prezentacja końcowa, tag `v1.0`, retrospektywa w dzienniku.

## Pomysły na rozszerzenia (jeśli zostanie czas / na kolejny semestr)
- dodatkowe pokoje: zdobycie PAST-y (20 VIII), Przyczółek Czerniakowski,
  zrzuty aliantów;
- tryb dwuosobowy „łącznik i radiotelegrafista” (wspólne rozwiązywanie);
- poziomy trudności (mniej podpowiedzi, krótszy czas);
- wersja angielska danych (`dane.en.js`) — architektura już to umożliwia;
- galeria archiwalnych fotografii (domena publiczna) w notatniku;
- licznik ukończeń i tablica wyników w `localStorage`.

## Ryzyka i przeciwdziałanie

| Ryzyko | Przeciwdziałanie |
|---|---|
| błędy merytoryczne w treści historycznej | każdy fakt z odnośnikiem w `ZRODLA-HISTORYCZNE.md`; korekta w tygodniu 11 |
| zagadki zbyt trudne/łatwe | testy z graczami (tydzień 11) + system podpowiedzi |
| regresje przy cotygodniowych zmianach | `test-danych.mjs` po każdej zmianie treści, e2e przed każdym wydaniem |
| brak czasu na fazę 4 | priorytet: grywalna całość od M2, szlifowanie jest przyrostowe |
