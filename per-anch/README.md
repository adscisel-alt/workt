# Per-Anch: Akademia Hieroglifów (Dom Życia)

Samodzielna aplikacja webowa (jeden plik `index.html`, bez zależności poza fontami Google)
do nauki czytania i analizowania autentycznych inskrypcji ze ścian egipskich świątyń i grobowców.

Uruchomienie: otwórz `per-anch/index.html` w przeglądarce (albo udostępnij katalog dowolnym
serwerem statycznym). Fonty (Noto Sans Egyptian Hieroglyphs, Gentium Plus, Marcellus,
Source Sans 3) ładują się z Google Fonts – bez internetu znaki hieroglificzne mogą się nie
wyświetlić, jeśli system nie ma własnego fontu z blokiem Unicode 13000–1342F.

## Sale

- **Analizator Ściany Świątyni** – 12 sfotografowanych ścian, reliefów i papirusów z klikalnymi
  ramkami na fragmentach tekstu (zdjęcia z Wikimedia Commons na wolnych licencjach, podpisy
  autorów i licencji w `img/credits.json`), plus 6 inskrypcji w samej transkrypcji. Księgi zaświatów
  i malowidła grobowe: tytuł Księgi Umarłych (grobowiec Sennedżema), hymn do Ra (Papirus Ani),
  zaklęcie serca 30B, Negatywne Wyznanie z rozdziału 125, Teksty Piramid Unisa, Wielki Hymn do
  Atona. Tytulatury i formuły świątynne: formuła „obdarzony życiem,
  trwałością i władzą jak Ra na wieki”, kartusze Tutanchamona i Ramzesa II, Wielka Formuła
  Ofiarna (ḥtp-dỉ-nswt), dedykacja z Karnaku, imię horusowe Setiego I z Abydos. Klikalne
  znaki, przełącznik kierunku czytania L→P / P→L z odbiciem znaków, zagadka pod każdym reliefem.
- **Baza Znaków Gardinera** – 130 znaków (alfabet jednoliterowy, dwu- i trzyliterowe,
  ideogramy, determinatywy) z wyszukiwarką po rysunku, kodzie i wymowie.
- **Trening i Zabawa** – układanka bloków kamiennych, quiz z rangami skryby, generator
  królewskiego kartusza (imię zapisane fonetycznie, determinatyw osoby, formuła po kartuszu).

Znaki są renderowane jako Unicode Egyptian Hieroglyphs; kody wg listy Gardinera.

## Zdjęcia

Pliki w `per-anch/img/` pobrano z Wikimedia Commons (domena publiczna, CC0, CC BY, CC BY-SA);
autor, licencja i link do strony pliku są w `img/credits.json` i pod każdym zdjęciem w aplikacji.
Pobieranie wykonuje workflow `.github/workflows/per-anch-commons.yml` na runnerze GitHub
(skrypt `tools/fetch_commons.py`); tryb ustawia się w `tools/commons-mode.txt`
(`search` – podglądy kandydatów wg `commons-queries.json`, `fetch` – wybrane pliki z
`commons-chosen.json`, `off` – nic).
