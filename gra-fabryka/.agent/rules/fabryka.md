---
trigger: always_on
---
# Reguły projektu „Fabryka 1892”
- Czytaj `AGENTS.md` w katalogu `gra-fabryka/` przed zmianami.
- GDScript w stylu Godot 4.6 z typowaniem statycznym (`var x: Type`, `-> ReturnType`); unikaj `:=` tam,
  gdzie typ nie wynika jednoznacznie z wyrażenia (Godot zgłasza błąd „Cannot infer the type”).
- Teksty UI i karty wiedzy po polsku, z poprawnymi znakami diakrytycznymi.
- Każda nowa czynność Sima musi mieć: `id`, `label`, `need`, `rate`, `duration` (0 = do pełna) i działać
  w autonomii (`Sim._autonomy`) albo być świadomie zarezerwowana dla gracza (`family_meal`, `teach`).
- Po zmianach uruchom workflow `/test-symulacji`; commit dopiero, gdy raport nie zawiera `SCRIPT ERROR`.
