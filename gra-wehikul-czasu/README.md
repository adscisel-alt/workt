# ⏳🚀 Wehikuł czasu — podróż przez dzieje Polski

Edukacyjna gra planszowa **3D** dla klasy IV szkoły podstawowej. Uczniowie w drużynach
podróżują wehikułami czasu przez sześć krain‑epok — od legend, przez Mieszka I, Kazimierza
Wielkiego, Jadwigę i Jagiełłę oraz bitwę pod Grunwaldem, aż po wieżę Mikołaja Kopernika.

Gra działa w przeglądarce, **bez internetu** i bez instalowania czegokolwiek. Wystarczy jeden
komputer podłączony do rzutnika lub tablicy interaktywnej.

---

## ▶️ Jak uruchomić (najprościej)

1. Pobierz cały folder `gra-wehikul-czasu` na szkolny komputer.
2. Kliknij dwukrotnie plik **`index.html`** — gra otworzy się w przeglądarce (Chrome, Edge,
   Firefox).
3. Wybierzcie liczbę drużyn (2–4), ewentualnie zmieńcie ich nazwy i kliknijcie **„Startujemy!”**.

> Wskazówka: najlepiej wyświetlić grę na rzutniku/tablicy, a uczniowie odpowiadają ustnie
> całą drużyną. Osoba przy komputerze rzuca kostką i zaznacza odpowiedzi.

Jeśli chcecie mieć grę „w chmurze” (link do otwarcia na dowolnym urządzeniu), zobacz sekcję
[Hosting](#-hosting-opcjonalnie) niżej.

---

## 🎯 Cel gry

Dotrzeć wehikułem do **mety** (teraźniejszości), zbierając po drodze **3 żetony czasu** 🏅.
Nie wygrywa ten, kto tylko szybko biega po planszy — bez trzech żetonów wehikuł nie może
wylądować i **cofa się o 3 pola**. Trzeba więc odpowiadać na trudniejsze pytania!

## 🕹️ Zasady w skrócie

Drużyny grają po kolei. W swojej turze drużyna **rzuca kostką** 🎲 i przesuwa wehikuł.
Po zatrzymaniu się na polu losuje kartę:

| Pole | Karta | Co się dzieje |
|:----:|-------|---------------|
| **?** | Karta pytania | Pytanie o postać lub wydarzenie z historii Polski. **Dobra odpowiedź = dodatkowy ruch o 2 pola.** |
| **!** | Karta wydarzenia | Element losowy i fabularny (np. *„Bierzesz udział w chrzcie Polski — 2 pola do przodu”*). Uczy chronologii. |
| **★** | Karta wyzwania | Zadanie dla całej drużyny (kalambury, rozsypanka, dokończ legendę). Ocenia nauczyciel. Udane = 2 pola do przodu. |
| **◆** | Pole żetonu czasu | Trudniejsze pytanie. Dobra odpowiedź daje **żeton czasu** 🏅 (potrzeba 3, aby wygrać). |

Sterowanie sceną 3D: **przeciągnij** myszą lub palcem, aby obrócić planszę; **kółko myszy /
uszczypnięcie** przybliża i oddala. Przycisk **?** w rogu przypomina zasady, **↻** zaczyna od nowa.

---

## 🧭 Krainy‑epoki (co powtarzamy)

1. **Kraina Legend** 🐉 — Lech, Piast Kołodziej, Popiel, smok wawelski, godło z orłem.
2. **Państwo Mieszka i Chrobrego** ⛪ — chrzest Polski 966, Dobrawa, Gniezno, św. Wojciech,
   koronacja Bolesława Chrobrego.
3. **Zamek Kazimierza Wielkiego** 🏰 — „zastał Polskę drewnianą…”, Akademia Krakowska 1364,
   Kraków, ostatni Piast.
4. **Dwór Jadwigi i Jagiełły** 👑 — królowa Jadwiga, unia z Litwą, Władysław Jagiełło,
   Jagiellonowie.
5. **Pola Grunwaldu** ⚔️ — bitwa 1410, Krzyżacy, Zawisza Czarny.
6. **Wieża Kopernika** 🔭 — „Wstrzymał Słońce, ruszył Ziemię”, Toruń, teoria heliocentryczna.

---

## ✍️ Dodawanie własnych pytań

Cała treść gry jest w jednym pliku: **`pytania.js`**. Można go otworzyć w zwykłym Notatniku.
Aby dodać pytanie, dopisz kolejny wpis do właściwej krainy:

```js
{ q: 'Twoje pytanie?', opcje: ['odpowiedź A', 'B', 'C', 'D'], poprawna: 0, wskazowka: 'krótkie wyjaśnienie' }
```

- `poprawna` to numer właściwej odpowiedzi liczony **od zera** (0 = pierwsza z listy).
- Gra **sama miesza kolejność odpowiedzi**, więc poprawna nie zawsze będzie „pod A”.
- Wskazówka pokazuje się po odpowiedzi — to dodatkowa nauka.

Podobnie można dopisywać **wydarzenia** (`WYDARZENIA`) i **wyzwania** (`WYZWANIA`).
To świetne zadanie dla samych uczniów — układanie pytań utrwala wiedzę!

---

## 🧩 Zalety dydaktyczne

- Powtórzenie materiału **bez stresu**, w formie zabawy.
- **Praca zespołowa** i zdrowa rywalizacja.
- Chronologia „mimochodem” dzięki kartom wydarzeń.
- Grę mogą **współtworzyć uczniowie** (pytania, wyzwania).

---

## 📁 Zawartość folderu

| Plik | Do czego służy |
|------|----------------|
| `index.html` | Uruchamia grę (ten plik otwieramy). |
| `styles.css` | Wygląd interfejsu. |
| `pytania.js` | **Baza pytań, wydarzeń i wyzwań** — tu dopisujecie własne. |
| `gra.js` | Logika gry i scena 3D. |
| `vendor/three.min.js` | Silnik grafiki 3D (działa lokalnie, bez internetu). |
| `test-e2e.mjs` | Test techniczny dla programistów (nie jest potrzebny do grania). |

---

## ☁️ Hosting (opcjonalnie)

Grę można też wrzucić na dowolny darmowy hosting stron statycznych (GitHub Pages, Netlify),
kopiując zawartość folderu `gra-wehikul-czasu`. Nie wymaga serwera ani bazy danych —
to zwykłe pliki HTML/CSS/JS.

Miłej podróży w czasie! ⏳
