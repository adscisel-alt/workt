# Strategia testowania — GODZINA „W”

## Poziomy testów

### 1. Testy treści (`testy/test-danych.mjs`)

Czysty Node, bez zależności: `node testy/test-danych.mjs`.
Uruchamiane **po każdej zmianie `dane.js`** — pilnują, żeby cotygodniowy
rozwój treści nie zepsuł gry. Sprawdzają m.in.:

- unikalność identyfikatorów pokoi, hotspotów i przedmiotów;
- że każda zagadka ma niepuste odpowiedzi, ≥2 podpowiedzi i notatkę historyczną;
- **spójność fabularną**: szyfrogram GA-DE-RY-PO-LU-KI naprawdę deszyfruje się
  do odpowiedzi; słowo Morse’a jest jednocześnie odpowiedzią i ma zapis
  w tabeli; wskazówki zagadki logicznej dają dokładnie jedno rozwiązanie
  (test rozwiązuje ją brute-force); trasa kanałów zgadza się z fragmentami
  planu; przedmioty wymagane w pokoju są zdobywalne wcześniej;
- poprawność quizu (4 różne odpowiedzi, właściwy indeks, wyjaśnienia);
- parametry gry (63 minuty, dodatnie kary).

### 2. Test przejścia e2e (`testy/test-e2e.mjs`)

Playwright + Chromium: bot przechodzi **całą grę** od ekranu startowego do
końcowego. Odpowiedzi czyta ze struktur `window.GRA` w trakcie gry, więc test
pozostaje aktualny po dodaniu nowych pokoi (dopóki używają istniejących typów
zagadek). Weryfikuje: render ekranów, wszystkie typy zagadek, zbieranie
przedmiotów i notatek, osiągnięcia oraz brak błędów JS (`pageerror`).
Robi też zrzuty ekranu do `testy/zrzuty/` (poglądowe, poza repozytorium).

Uruchomienie: `npm install` w katalogu głównym repozytorium (tam jest
Playwright), potem `node powstanie-escape-room/testy/test-e2e.mjs`
(opcjonalnie `CHROMIUM_PATH=…` dla gotowej instalacji Chromium).

### 3. Testy ręczne (przed każdym kamieniem milowym)

Scenariusze do odhaczenia:

- [ ] nowa gra → przerwij (⏸) → „Kontynuuj misję” wznawia w tym samym miejscu,
      a czas spędzony poza grą **nie** został odliczony;
- [ ] odświeżenie strony w środku pokoju nie gubi postępu ani ekwipunku;
- [ ] błędna odpowiedź: kara −30 s widoczna na zegarze, toast, dźwięk błędu;
- [ ] podpowiedzi: koszt 2 min, kolejne podpowiedzi pozostają widoczne;
- [ ] zły skręt w kanałach: modal, kara −2 min, powrót na to samo skrzyżowanie;
- [ ] upływ czasu do zera: modal „Czas minął”, gra kontynuuje w trybie pamięci,
      wynik końcowy oznaczony „po czasie”;
- [ ] wyłączenie dźwięku (🔇) wycisza również sygnał Morse’a; zagadkę da się
      rozwiązać z samego zapisu wizualnego;
- [ ] telefon (~375 px): wszystko czytelne, przyciski klikalne, brak
      poziomego przewijania;
- [ ] nawigacja klawiaturą: Tab po hotspotach i przyciskach, Enter zatwierdza
      odpowiedź, Esc zamyka modale (poza wymuszonymi);
- [ ] tryb prywatny przeglądarki (brak localStorage): gra działa, tylko bez zapisu.

### 4. Testy z graczami (tydzień 11 planu)

Minimum 5 osób, obserwacja bez podpowiadania. Notujemy dla każdej zagadki:
czas, liczbę błędnych prób, użyte podpowiedzi, momenty frustracji oraz
odpowiedź na pytanie po grze: „wymień trzy rzeczy, których się nauczyłaś/eś”
(miara celu edukacyjnego). Wyniki → `DZIENNIK-PRACY.md` + lista poprawek.

## Definicja ukończenia (Definition of Done) dla zmiany treści

1. `node testy/test-danych.mjs` — zielone;
2. nowe fakty wpisane do `ZRODLA-HISTORYCZNE.md` ze źródłem;
3. nowa zagadka ma 3 stopniowane podpowiedzi i notatkę „Czy wiesz, że…”;
4. szybki test ręczny nowego fragmentu w przeglądarce;
5. wpis w `DZIENNIK-PRACY.md` i `CHANGELOG.md`.
