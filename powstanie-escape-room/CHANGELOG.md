# Historia zmian — GODZINA „W”

Format wpisów: [wersja] — data — zmiany. Wersjonowanie: `0.T.x` w trakcie
semestru (T = numer tygodnia), `1.0.0` przy wydaniu końcowym.

## [0.1.0] — 2026-08-30 — pierwsza grywalna wersja

### Dodane
- 6 etapów gry: konspiracyjne mieszkanie, Harcerska Poczta Polowa,
  radiostacja „Błyskawica”, szpital polowy, kanały, odprawa (quiz);
- 4 typy zagadek: zamek kodowy, szyfr GA-DE-RY-PO-LU-KI, alfabet Morse’a
  (z dźwiękiem Web Audio i tabelą), labirynt kanałów, quiz z wyjaśnieniami;
- zegar 63 minut (1 min = 1 dzień powstania) z karami czasowymi
  i „trybem pamięci” po upływie czasu;
- ekwipunek z przedmiotami wymaganymi fabularnie (latarka, klucz do włazu,
  3 fragmenty planu kanałów), notatnik historyczny „Czy wiesz, że…”;
- system podpowiedzi (3 na zagadkę, koszt 2 min), 6 osiągnięć,
  autozapis w localStorage z możliwością kontynuacji;
- ekran końcowy ze statystykami misji i osiągnięciami;
- testy: `test-danych.mjs` (56 asercji spójności treści)
  i `test-e2e.mjs` (Playwright przechodzi całą grę);
- dokumentacja semestralna: README, GDD, plan semestralny, architektura,
  źródła historyczne, strategia testowania, dziennik pracy.
