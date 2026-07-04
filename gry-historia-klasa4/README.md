# Gry historyczne — klasa IV 🦅📜

Zestaw trzech gier edukacyjnych z **historii dla klasy IV** szkoły podstawowej.
Treść pytań i haseł oparta jest na **podstawie programowej** dla tego etapu:
historia jako nauka, legendy polskie, władcy Polski, wielcy Polacy oraz daty
i symbole narodowe.

Gry działają **całkowicie offline** — bez internetu, logowania i instalacji.
Można w nie grać na komputerze, tablecie i telefonie (obsługa dotyku i klawiatury).

## Jak uruchomić

Najprościej: **kliknij dwukrotnie plik `index.html`** — otworzy się w przeglądarce.

Można też umieścić cały folder na dysku, pendrivie lub na stronie WWW i otworzyć
`index.html`. Nie jest potrzebny żaden serwer ani budowanie projektu.

## Gry

1. **💀 Wisielec** — odgadywanie haseł z historii (imiona władców, pojęcia,
   miejsca) litera po literze. Do każdego hasła jest podpowiedź. Im mniej
   błędów, tym więcej punktów.

2. **🎰 Teleturniej Va Banque** — plansza z 5 kategoriami i pytaniami o rosnącej
   wartości (100–500 pkt). Dobra odpowiedź dodaje punkty, zła — odejmuje.
   Celem jest zdobycie jak największej liczby punktów.

3. **🎮 Łap odpowiedź** (gra zręcznościowa) — u góry pojawia się pytanie, a z
   góry spadają bąbelki z odpowiedziami. Zadaniem gracza jest złapać koszykiem
   **poprawną** odpowiedź (strzałki ◀ ▶, przyciski lub przesuwanie palcem).
   Złapanie błędnej lub przegapienie poprawnej to utrata życia. Poziom trudności
   rośnie wraz z liczbą trafień.

## Pliki

| Plik            | Zawartość                                                        |
| --------------- | ---------------------------------------------------------------- |
| `index.html`    | Interfejs i style wszystkich gier                                |
| `gry.js`        | Logika trzech gier (nawigacja, wisielec, Va Banque, zręcznościowa) |
| `dane.js`       | Bank haseł i pytań quizowych z kategoriami                       |
| `test-gry.mjs`  | Automatyczny test (Playwright) sprawdzający działanie gier       |

## Rozbudowa

Aby dodać własne pytania lub hasła, edytuj `dane.js`:

- **hasła do wisielca** — tablica `HASLA` (`slowo` + `wskazowka`),
- **pytania quizowe** — tablica `KATEGORIE`; każde pytanie ma treść `q`,
  odpowiedzi `o` oraz indeks poprawnej `k` (liczony od 0), a `p` to liczba punktów.

Nowe pytania automatycznie trafiają do teleturnieju i gry zręcznościowej.

## Test

Jeśli w projekcie zainstalowano zależności (`npm install`), można uruchomić:

```bash
node gry-historia-klasa4/test-gry.mjs
```

Test wczytuje gry w przeglądarce i sprawdza, że każda działa bez błędów.
