# Zdjęcia zabytków (opcjonalne)

Gra domyślnie **pobiera prawdziwe zdjęcia na żywo z Wikimedia Commons**, gdy
masz połączenie z internetem. Bez internetu (albo gdy pobieranie się nie uda)
używa rysunku wektorowego.

Jeśli chcesz mieć **własne** zdjęcia lub grać w pełni offline, wrzuć tu pliki
o dokładnie takich nazwach — gra użyje ich w pierwszej kolejności:

- `parthenon.jpg` — Partenon
- `erechtheion.jpg` — Erechtejon (Ganek Kariatyd)
- `sounion.jpg` — Świątynia Posejdona na Sunion

Zalecana orientacja pozioma, proporcje ~4:3, np. 1600×1200.

Możesz je pobrać automatycznie (na swoim komputerze, poza tym środowiskiem):

```bash
node scripts/pobierz-zdjecia.mjs
```
