# Dziennik pracy — GODZINA „W”

Uzupełniany na koniec każdego tygodnia semestru. Szablon wpisu na dole pliku.

---

## Tydzień 1 — start projektu

**Zrobione:**
- wybór tematu i koncepcji: escape room „szlak łącznika” przez 6 etapów
  powstania (mieszkanie → poczta → radiostacja → szpital → kanały → odprawa);
- research historyczny i spis faktów ze źródłami → `ZRODLA-HISTORYCZNE.md`;
- game design document (`GDD.md`) i plan 15 tygodni (`PLAN-SEMESTRALNY.md`);
- szkielet techniczny: silnik ekranów, stan gry z zegarem 63 min i autozapisem,
  dźwięk Web Audio, wszystkie 6 pokoi w wersji pierwszej;
- testy: 56 asercji spójności treści + test e2e przechodzący całą grę
  w Chromium.

**Decyzje:**
- czysty JS bez builda (uruchamianie z `file://` na dowolnym komputerze);
- treść oddzielona od silnika (`dane.js`), żeby cotygodniowe zmiany były
  bezpieczne i tanie;
- brak stanu porażki po upływie czasu („tryb pamięci”) — cel edukacyjny
  ponad rywalizacją.

**Problemy / wnioski:**
- test e2e musiał śledzić konkretny węzeł modala (gra potrafi otworzyć następny
  modal natychmiast po zamknięciu poprzedniego) — opisane w komentarzu w teście.

**Plan na kolejny tydzień:** przejście scenariuszy ręcznych z `TESTOWANIE.md`
na telefonie; pierwsza kalibracja trudności z 2–3 graczami.

---

## Szablon wpisu

```markdown
## Tydzień N — <temat tygodnia>

**Zrobione:**
- …

**Decyzje:**
- …

**Problemy / wnioski:**
- …

**Plan na kolejny tydzień:** …
```
