# Protokoły kontroli budynku 📋

Aplikacja webowa (PWA) do tworzenia **protokołów okresowej kontroli stanu technicznego
budynku** (Prawo budowlane, art. 62). Działa na **telefonie i komputerze**, pozwala
**wstawiać zdjęcia** (aparat / wklejanie / przeciąganie) oraz **sterować głosem po polsku**
(komendy + dyktowanie), a gotowy protokół **eksportuje do pliku Word `.docx`**.

Cała praca odbywa się w przeglądarce — dane i zdjęcia zapisują się lokalnie w urządzeniu
(IndexedDB). Nic nie jest wysyłane na żadny serwer.

---

## Funkcje

- **Dane protokołu i obiektu** — numer, daty, adres, właściciel, zarządca, osoby kontrolujące,
  dane techniczne (kondygnacje, powierzchnia, kubatura).
- **Dane budynku** — rodzaj konstrukcji i wyposażenie zaznaczane jak na wzorze
  (eksport pokazuje ☑ / ☐).
- **Rozdział I — wykonanie zaleceń z poprzedniej kontroli** — tabela zaleceń ze
  stopniem pilności i statusem wykonania (Wykonano / Nie wykonano / …).
- **Rozdział II — ustalenia** — sekcje (obszary kontroli) z:
  - oceną ogólną w 5-stopniowej skali (Dobry / Zadowalający / Dostateczny / Zły / Awaryjny),
  - listą ustaleń z **4-stopniowym stopniem pilności** napraw,
  - **galerią zdjęć** z podpisami.
- **Rozdział III — podsumowanie i wnioski** + miejsce na podpisy.
- **Eksport `.docx` wierny wzorowi** — czcionka Calibri, tabele jak w oryginale,
  **stopka z numeracją stron** i identyfikacją protokołu.

## Dyktowanie przez Wispr Flow (i inne)

Aplikacja współpracuje z **Wispr Flow** oraz dowolnym systemowym dyktowaniem
(klawiatura głosowa iOS/Android, dyktowanie Windows/macOS) **bez żadnej dodatkowej
integracji** — te narzędzia działają na poziomie systemu i „wpisują" tekst do
aktywnego pola. Wystarczy kliknąć pole opisu/ustalenia i dyktować; tekst jest od
razu zapisywany. Wbudowany mikrofon w aplikacji obsługuje dodatkowo **komendy
głosowe** (np. „nowa sekcja", „wstaw zdjęcie"), których narzędzia systemowe nie
wykonują — można korzystać z obu naraz: Wispr Flow do długich opisów, wbudowany
mikrofon do sterowania.
- **Zdjęcia**: 📸 aparat (telefon), 🖼️ wybór z plików, **wklejanie `Ctrl+V`**,
  **przeciągnij i upuść**. Zdjęcia są automatycznie zmniejszane (maks. 1600 px).
- **Głos (PL)** — patrz niżej.
- **Eksport do `.docx`** — dokument Word z tabelami i osadzonymi zdjęciami, gotowy do
  dalszej edycji w Wordzie/LibreOffice.
- **Działa offline** (PWA) — można „zainstalować" na telefonie jak aplikację.
- **Autozapis** — dane nie giną po zamknięciu przeglądarki.

## Komendy głosowe

Włącz **🎤 Mikrofon** (najlepiej w przeglądarce **Chrome**), a następnie mów:

| Komenda | Działanie |
|---|---|
| „nowa sekcja [nazwa]” | dodaje obszar kontroli |
| „nowe ustalenie / nowa usterka [opis]” | dodaje wiersz ustaleń |
| „stopień pilności jeden / dwa / trzy / cztery” | ustawia pilność ostatniego ustalenia |
| „ocena dobry / zadowalający / dostateczny / zły / awaryjny” | ocena sekcji |
| „wstaw zdjęcie” | otwiera aparat / wybór pliku |
| „podpis [tekst]” | podpis ostatniego zdjęcia |
| „dyktuj” → mów → „koniec” | dyktowanie do zaznaczonego pola tekstowego |
| „nowy akapit”, „wyczyść pole” | edycja pola |
| „zapisz”, „eksportuj” | zapis i wygenerowanie protokołu Word |

> **Dyktowanie**: kliknij pole tekstowe, powiedz „dyktuj", mów treść, a na koniec „koniec".

## Uruchomienie lokalne

Wymagany **Node.js 18+**.

```bash
npm install
npm run dev       # tryb developerski (http://localhost:5173)
```

## Budowa wersji produkcyjnej

```bash
npm run build     # wynik w katalogu dist/
npm run preview   # podgląd zbudowanej wersji
```

Zawartość `dist/` to statyczne pliki — można je wgrać na dowolny hosting
(GitHub Pages, Netlify, własny serwer).

### Hosting na GitHub Pages

```bash
VITE_BASE=/workt/ npm run build
```

Następnie opublikuj katalog `dist/` (np. przez GitHub Actions lub gałąź `gh-pages`).
`VITE_BASE` ustaw na nazwę repozytorium, pod którą serwowana jest strona.

## Testy

```bash
npm test          # test e2e (Playwright): pełny przepływ + walidacja pliku .docx
```

## Stos technologiczny

- **Vite** + czysty JavaScript (bez frameworka),
- **docx** — generowanie pliku Word w przeglądarce,
- **idb-keyval** — zapis danych i zdjęć w IndexedDB,
- **vite-plugin-pwa** — tryb offline / instalacja,
- **Web Speech API** — rozpoznawanie mowy (pl-PL).

## Uwagi

- Rozpoznawanie mowy działa najlepiej w **Google Chrome** (na Androidzie i komputerze).
  Safari/iOS ma ograniczone wsparcie; pozostałe funkcje działają wszędzie.
- Zdjęcia i dane są przechowywane **wyłącznie lokalnie** w przeglądarce danego urządzenia.
  Po wyczyszczeniu danych przeglądarki zostaną usunięte — eksportuj protokół do `.docx`,
  aby zachować kopię.
