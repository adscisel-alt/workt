---
description: Dodaj nową jednostkę do gry (dane, grafika zastępcza, opcjonalnie model Blendera i wpis Kodeksu).
---

1. Zapytaj (lub ustal z polecenia): nazwa, koszt, HP, atak, zasięg, szybkość, epoka, typ (piechota/strzelec/kawaleria/cywil), budynek szkolący, krótki opis historyczny.
2. Dodaj wpis do `godot/data/jednostki.json` (klucz bez polskich znaków) i dopisz klucz do pola `szkoli` właściwego budynku w `budynki.json`.
3. W `godot/scripts/procedural_art.gd` dodaj gałąź `match u.kind` z prostą sylwetką (kolor tułowia + broń), aby jednostka działała bez sprite'a.
4. Jeśli jednostka ma bonus przeciw typowi (np. włócznik vs kawaleria), użyj pola `bonus_vs`.
5. Opcjonalnie dodaj wpis do `kodeks_pl.json` (60–120 słów, z datą/przykładem) i 1–2 pytania do `quiz_pl.json`.
6. Opcjonalnie dodaj funkcję `build_<nazwa>` w `blender/build_placeholders.py` (na bazie `humanoid`) i zarejestruj w `BUILDERS`, potem workflow `/render-sprites`.
7. Uruchom workflow `/testy`.
