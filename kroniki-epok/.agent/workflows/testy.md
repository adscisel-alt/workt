---
description: Uruchom wszystkie testy gry (jednostkowe i symulację) i podsumuj wynik.
---

1. Uruchom `godot --headless --path godot res://tests/run_tests.tscn` i zapisz liczbę błędów z linii `== wynik: N błędów ==`.
2. Uruchom `godot --headless --path godot res://tests/sim_test.tscn` i zapisz wynik z linii `== wynik symulacji: N błędów ==`.
3. Jeśli któryś test ma błąd, pokaż linie `FAIL` oraz `SCRIPT ERROR`, zaproponuj poprawkę i po jej wprowadzeniu powtórz kroki 1–2.
4. Na koniec podaj krótkie podsumowanie: liczba testów OK / FAIL w obu zestawach.
