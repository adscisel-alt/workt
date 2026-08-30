# Architektura — GODZINA „W”

## Założenia techniczne

- **Czysty HTML/CSS/JS, zero zależności produkcyjnych, zero kroku budowania.**
  Grę uruchamia się, otwierając `index.html` (działa też z `file://`).
  Uzasadnienie: projekt semestralny ma być łatwy do uruchomienia na każdej
  szkolnej maszynie i łatwy do oceny; brak łańcucha narzędzi = brak awarii
  łańcucha narzędzi.
- **Zwykłe skrypty + przestrzeń nazw `GRA`** zamiast modułów ES — moduły nie
  działają z `file://`, a jawna kolejność `<script>` w `index.html` pełni rolę
  grafu zależności: `dane → dzwiek → stan → ui → gra`.
- Pliki przypisują się do `globalThis.GRA` (nie `window`), dzięki czemu
  `dane.js` daje się zaimportować w testach node’owych bez przeglądarki.

## Podział na warstwy

```
┌───────────────────────────────────────────────┐
│ gra.js — sterowanie: ekrany, pokoje, zagadki  │
├──────────────┬──────────────┬─────────────────┤
│ ui.js        │ stan.js      │ dzwiek.js       │
│ modale,      │ stan gry,    │ Web Audio:      │
│ toasty,      │ zegar, zapis │ Morse, sygnały  │
│ el()         │ localStorage │                 │
├──────────────┴──────────────┴─────────────────┤
│ dane.js — WYŁĄCZNIE treść (pokoje, zagadki,   │
│ notatki, quiz, osiągnięcia, kary, teksty)     │
└───────────────────────────────────────────────┘
```

Kluczowa decyzja: **treść oddzielona od silnika**. Cotygodniowy rozwój
w semestrze to głównie edycja `dane.js` (nowe pokoje/zagadki/notatki);
silnik zmienia się rzadko. Ubocznie umożliwia to przyszłe tłumaczenia
(np. `dane.en.js`).

## Model danych (dane.js)

```js
pokoj = {
  id, etap, tytul, data, miejsce, opis,
  wymagane?: [idPrzedmiotu],        // bramka wejścia (np. latarka w kanałach)
  hotspoty?: [{ id, nazwa, ikona, tekst,
                przedmiot?: {id, nazwa, ikona, opis},
                notatkaTytul? }],
  zagadka: { typ: 'kod' | 'morse' | 'kanaly' | 'quiz', ... }
}
```

Typy zagadek obsługiwane przez `gra.js`:

| typ | dane specyficzne | renderer |
|---|---|---|
| `kod` | `odpowiedzi[]`, `podpowiedzi[]`, `placeholder` | pole tekstowe + „Sprawdź” |
| `morse` | jak `kod` + `slowo` (nadawane dźwiękiem i pokazywane zapisem) | jw. + odtwarzacz + tabela |
| `kanaly` | `sciezka[]` (L/P), `skrzyzowania[]`, `zlySkret` | labirynt krok po kroku |
| `quiz` | `pytania[] {p, odp[4], poprawna, wyjasnienie}` | pytanie po pytaniu |

Dodanie nowego typu zagadki = nowa gałąź w `renderZagadka()` + dane + testy.

## Stan gry i zapis (stan.js)

Jeden obiekt `stan.dane` serializowany do `localStorage` (klucz
`godzina-w-zapis-v1`; pole `wersja` pozwoli w przyszłości migrować zapisy).
Czas liczony metodą znaczników: przy każdym zapisie doliczany jest czas od
`ostatniZnacznik`; przy wczytaniu znacznik jest resetowany, więc **czas poza
grą nie biegnie**. Zegar to `GRA.DANE.czasGrySekundy − czasGry − kary`;
kary (podpowiedzi, błędy) tylko powiększają składnik `karySekundy`.

Brak `localStorage` (tryb prywatny) jest tolerowany — gra działa bez zapisu
(wszystkie odwołania w `try/catch`).

## Odpowiedzi gracza

`GRA.normalizuj()` sprowadza odpowiedź i wzorzec do wspólnej postaci:
wielkie litery, bez polskich znaków, bez interpunkcji i spacji. Dzięki temu
„Błyskawica!” = „blyskawica” = „BLYSKAWICA”. Wszystkie porównania odpowiedzi
przechodzą przez tę funkcję — to jedyne źródło prawdy o dopasowaniu.

## Dźwięk (dzwiek.js)

Web Audio API bez plików: oscylator + obwiednia głośności (bez trzasków).
`AudioContext` tworzony leniwie po pierwszym geście użytkownika (wymóg
przeglądarek). Morse: kropka 90 ms, kreska 3×, przerwy wg standardu.
Sygnał ma zawsze równoważnik wizualny — dźwięk nigdy nie jest jedynym
kanałem informacji (dostępność).

## Testy

- `testy/test-danych.mjs` (czysty Node): spójność treści — patrz
  [TESTOWANIE.md](TESTOWANIE.md). Uruchamiany po każdej zmianie `dane.js`.
- `testy/test-e2e.mjs` (Playwright): bot przechodzi całą grę, czytając
  odpowiedzi ze struktur `window.GRA` — test nie wymaga aktualizacji przy
  dodawaniu treści, o ile nowe pokoje używają istniejących typów zagadek.

## Znane ograniczenia / dług techniczny

- brak wersji audio dla osób niewidomych ponad wbudowane `aria` — do
  przeglądu w tygodniu 9 planu;
- tasowanie odpowiedzi quizu jest deterministyczne (stabilne między
  odświeżeniami) — celowe, ale prymitywne; można zastąpić tasowaniem
  z ziarnem zapisanym w stanie gry;
- jeden slot zapisu (nowa gra nadpisuje poprzednią po potwierdzeniu).
