# 🚀 Akademia Odkrywców — gra edukacyjna

Rozbudowana gra edukacyjna w przeglądarce dla uczniów szkoły podstawowej (klasy 4–8).
**Jeden plik `index.html` — bez instalacji, bez internetu, bez zależności.**
Wystarczy otworzyć podwójnym kliknięciem w dowolnej przeglądarce.

## Co jest w grze

| Element | Opis |
|---|---|
| 🗺️ **5 wysp wiedzy** | Matematyka, język polski, przyroda, angielski, historia |
| 📶 **3 poziomy na przedmiot** | odblokowywane po zdobyciu gwiazdki na poprzednim |
| ⚡ **Sprint matematyczny** | 60 sekund na rekord — zadania generowane losowo, trudność rośnie |
| ⚖️ **Prawda czy fałsz** | szybkie decyzje z licznikiem czasu |
| 🧠 **Memory słówek** | dopasowywanie par angielski ↔ polski |
| ⭐ **Wyzwanie dnia** | ten sam zestaw dla całej klasy (losowany z daty), podwójne XP |
| 🔁 **Powtórki** | pytania, w których popełniono błąd, wracają do skutku (spaced repetition) |
| 🏅 **12 osiągnięć** | od „Pierwszego kroku" po „Mistrza Wiedzy" |
| 📊 **Panel postępów** | skuteczność wg przedmiotu + eksport wyników do CSV dla nauczyciela |
| ✨ **XP, monety, serie, gwiazdki** | pełna pętla motywacyjna; monety wydaje się na podpowiedzi 50/50 |

Postęp zapisuje się automatycznie w przeglądarce (localStorage).

## Jak napisać grę edukacyjną „10/10" — zasady użyte w tym kodzie

Dobra gra edukacyjna to nie „quiz z fajerwerkami". O jej wartości decyduje
kilka zasad z dydaktyki i projektowania gier — wszystkie są zaimplementowane
w `index.html` i opisane w komentarzach:

1. **Natychmiastowa informacja zwrotna z wyjaśnieniem.** Każde pytanie ma pole
   `w:` (wyjaśnienie) — uczeń zawsze dowiaduje się *dlaczego* odpowiedź jest
   poprawna, nie tylko *czy* jest poprawna. Bez tego gra sprawdza wiedzę,
   ale jej nie buduje.
2. **Błąd jest częścią nauki, nie karą.** Błędne pytania trafiają do kolejki
   🔁 Powtórek i wracają, aż zostaną opanowane (powtarzanie rozłożone w czasie
   — najlepiej udokumentowana technika trwałego zapamiętywania). Ekran porażki
   zachęca, zamiast zawstydzać.
3. **Strefa najbliższego rozwoju.** Poziomy odblokowują się dopiero po
   opanowaniu poprzednich, a generator zadań matematycznych i sprint podnoszą
   trudność wraz z wynikiem — gra jest zawsze „trochę za trudna", nigdy nudna
   ani frustrująca.
4. **Testowanie przez przypominanie (retrieval practice).** Odpowiedzi są
   tasowane przy każdym wyświetleniu, a zadania z matematyki losowane — nie da
   się zapamiętać „że dobra jest odpowiedź B".
5. **Pętla motywacyjna z wielu źródeł.** Krótkoterminowa (dźwięk + animacja
   za odpowiedź), średnia (gwiazdki, serie 🔥, rekordy), długoterminowa
   (XP, poziomy odkrywcy, osiągnięcia, wyzwanie dnia). Monety wprowadzają
   prostą ekonomię: podpowiedź 50/50 kosztuje, więc trzeba decydować.
6. **Różnorodność mechanik.** Quiz, gra na czas, memory, prawda/fałsz —
   różne mechaniki ćwiczą różne procesy poznawcze (przypominanie,
   automatyzację, kojarzenie par) i zapobiegają monotonii.
7. **Widoczny postęp — także dla nauczyciela.** Panel 📊 pokazuje skuteczność
   według przedmiotu i pozwala pobrać CSV; wyzwanie dnia losowane z daty daje
   całej klasie ten sam zestaw, więc można porównywać wyniki.
8. **Niski próg wejścia.** Zero instalacji, duże przyciski, obsługa dotyku,
   działa offline — gra musi działać na szkolnym komputerze i na telefonie.

## Jak rozbudować grę o własne treści

Pytania trzymane są w prostych tablicach w `index.html`:

```js
const BANK = {
  polski: [ /* poziom 1 */ [ {p:'pytanie', o:['a','b','c','d'], ok:0, w:'wyjaśnienie'}, … ], … ],
  …
};
```

- **Nowe pytanie:** dodaj obiekt `{p, o, ok, w}` do wybranego poziomu
  (`ok` to indeks poprawnej odpowiedzi w tablicy `o`; `w` — wyjaśnienie, zawsze je pisz!).
- **Nowy przedmiot:** dodaj wpis w `PRZEDMIOTY` i tablicę poziomów w `BANK`.
- **Prawda/fałsz:** tablica `PRAWDA_FALSZ` (`{p, ok:true/false, w}`).
- **Słówka memory:** tablica `PARY_MEMORY` (`['angielskie','polskie']`).
- **Zadania z matematyki** generuje funkcja `zadanieMatematyczne(poziom)` —
  tam można dodać nowe typy działań.

## Uruchomienie

Otwórz `gra-edukacyjna/index.html` w przeglądarce — to wszystko.
Można też hostować na GitHub Pages / Netlify jak zwykłą stronę statyczną.
