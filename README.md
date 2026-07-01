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

## Wiele protokołów (wybór projektu przy wejściu)

Po otwarciu aplikacji pojawia się **ekran wyboru**:
- **➕ Nowy protokół** — zaczyna nowy przegląd,
- lista **zapisanych protokołów nazwanych ulicami** (z numerem protokołu i datą) —
  kliknij, aby kontynuować pracę.

W trakcie pracy przyciskiem **📂 Projekty** wrócisz do listy i przełączysz się na inny
protokół (bieżący zapisuje się automatycznie). Każdy protokół to osobny projekt w pamięci
urządzenia; nazwa jest tworzona automatycznie z adresu (ulicy).

## Kopia w chmurze (Google Drive)

Aplikacja może automatycznie zapisywać kopie protokołów **na Twoim Dysku Google**
(logowanie kontem Google). Dane trafiają wyłącznie na Twój Dysk — nie na żaden inny serwer.
Działa nadal bez własnego backendu (wszystko po stronie przeglądarki).

### Jednorazowa konfiguracja (darmowa) — identyfikator Google (Client ID)
1. Wejdź na **https://console.cloud.google.com/** i zaloguj się.
2. Utwórz projekt (np. „Protokoły”).
3. **APIs & Services → Library** → wyszukaj **Google Drive API** → **Enable**.
4. **APIs & Services → OAuth consent screen**: User Type = **External**, podaj nazwę
   aplikacji i swój e-mail; w sekcji **Test users** dodaj swój adres Gmail. Zapisz
   (można zostać w trybie „Testing”).
5. **APIs & Services → Credentials → Create credentials → OAuth client ID**:
   - Application type: **Web application**
   - **Authorized JavaScript origins**: `https://adscisel-alt.github.io`
     (dla testów lokalnych dodaj też `http://localhost:5173`)
6. Skopiuj **Client ID** (kończy się na `.apps.googleusercontent.com`).
7. W aplikacji: **☁️ Chmura → wklej Client ID → Zapisz → 🔐 Zaloguj przez Google**.

> Przy pierwszym logowaniu Google pokaże ostrzeżenie „aplikacja niezweryfikowana”
> (bo to Twój prywatny projekt) — wybierz **Zaawansowane → Przejdź**. Dostęp mają tylko
> dodani przez Ciebie „Test users”. Zakres uprawnień to `drive.file` — aplikacja widzi
> **tylko własne pliki** utworzone na Twoim Dysku, nic więcej.

Po zalogowaniu: **automatyczna kopia** po zmianach (można wyłączyć), przycisk
**„Zrób kopię teraz”** oraz **„Przywróć z chmury”** (np. na drugim urządzeniu).

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
