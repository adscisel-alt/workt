# Kroniki Epok

Edukacyjna strategia czasu rzeczywistego w klimacie **Age of Empires II**: rozwijasz osadę od Epoki Ciemnej do Epoki
Imperiów, zbierasz drewno, żywność, złoto i kamień, budujesz, szkolisz wojsko i odpierasz najazdy. Dodatkowo
**piątym surowcem jest wiedza**: zdobywasz ją czytając Kodeks (encyklopedię średniowiecza), zdając „Egzamin epoki”
przy awansie i prowadząc dysputy na Uniwersytecie. Treści są po polsku i dotyczą historii powszechnej oraz Polski
(V–XV w.).

Stos narzędzi:

| Narzędzie | Rola w projekcie | Katalog |
|---|---|---|
| **Godot 4.3+** (GDScript) | silnik gry, logika, interfejs, dane edukacyjne | `godot/` |
| **Blender 4.2+ / 5.0** (Python `bpy`) | modele 3D i render do sprite'ów w rzucie 2:1 jak w AoE2 | `blender/` |
| **Antigravity** (IDE agentowe Google) | praca z kodem: reguły i gotowe workflowy dla agenta | `AGENTS.md`, `.agent/` |

Gra **działa bez żadnej grafiki**: gdy brak arkuszy sprite'ów, encje rysują się proceduralnie (wektorowo).
Gdy w `godot/assets/sprites/` pojawi się arkusz `<rodzaj>_<animacja>.png` + `.json`, encja używa go automatycznie.

## Szybki start

```bash
# 1. Gra (edytor Godot 4.3 lub nowszy)
godot --path godot                      # uruchom grę
godot --path godot --editor             # otwórz w edytorze

# 2. Testy bez okna
godot --headless --path godot res://tests/run_tests.tscn   # testy jednostkowe (geometria, dane, świat)
godot --headless --path godot res://tests/sim_test.tscn    # symulacja rozgrywki w przyspieszonym czasie

# 3. Sprite'y z Blendera (modele zastępcze -> arkusze PNG + JSON)
cd blender && ./render_all.sh           # wymaga `blender` w PATH; albo: PY_BPY=python ./render_all.sh (pip install bpy)
```

Sterowanie: LPM zaznacza (ramka, Shift dodaje), PPM wydaje rozkaz, WASD/krawędź ekranu przesuwa kamerę,
kółko zbliża, **K** Kodeks, **F1** pomoc, **P** pauza, **H** centrum osady, **.** bezczynny osadnik, Esc anuluje.

## Jak działa warstwa edukacyjna

* **Kodeks** (`godot/data/kodeks_pl.json`): 18 wpisów o grodach, chatach, młynach, trójpolówce, górnictwie, lennie,
  łuku i kuszy, rycerstwie, zamkach, lokacjach miast, romanizmie, uniwersytetach, gotyku, czarnej śmierci, druku i prochu.
  Wpisy odblokowują się wraz z epoką albo po zbudowaniu powiązanego budynku. Pierwsze przeczytanie = +1 wiedzy.
* **Egzamin epoki**: awans wymaga surowców, dwóch budynków z bieżącej epoki i progu wiedzy (2 / 6 / 11). Po kliknięciu
  „Awans” gracz odpowiada na 3 pytania z puli danej epoki (`quiz_pl.json`, 24 pytania); każda poprawna odpowiedź to
  +1 wiedzy i -15% czasu badania; błędna wyświetla wyjaśnienie.
* **Uniwersytet**: „dysputa uczona” (3 losowe pytania) co 90 s.
* **Wydarzenia historyczne** (`wydarzenia_pl.json`): co kilka minut decyzja z kontekstem (kupcy, kwarantanna jak w
  Dubrowniku 1377, przywilej lokacyjny, turniej) i konsekwencjami w grze.
* **Cywilizacje** (`cywilizacje.json`): Polacy, Frankowie, Wikingowie, Bizantyjczycy — każda z krótką historią i bonusem.
* Na końcu gry podsumowanie: przeczytane wpisy, skuteczność w quizie, zdobyta wiedza.

Treści są pisane tak, aby dało się je zweryfikować w podręczniku szkolnym; daty i nazwy warto jeszcze raz przejrzeć
przed użyciem w klasie (patrz „Czego potrzebuję od Ciebie”).

## Architektura (Godot)

```
godot/
  project.godot            autoloady: Data, GameState, SpriteLib
  scenes/main.tscn         jedyna scena; reszta budowana w kodzie
  scripts/
    main.gd                kamera, zaznaczanie, rozkazy, stawianie budynków
    world.gd               mapa 48x48, zajętość, AStarGrid2D, tworzenie encji, teren
    iso.gd                 matematyka rzutu 2:1 (kafelek 64x32), 8 kierunków
    entity.gd              bazowa encja: HP, zaznaczenie, obsługa arkuszy sprite'ów
    unit.gd / villager.gd  ruch, walka / zbieranie, odnoszenie, budowa
    building.gd            budowa, kolejka szkolenia, skład, pole uprawne, obrona zamku
    resource_node.gd       drzewa, jagody, złoto, kamień
    enemy_ai.gd            fale najeźdźców
    game_state.gd          surowce, ludność, epoki, wiedza, statystyki
    data.gd                wczytywanie JSON z data/
    hud.gd, quiz_panel.gd, kodeks_panel.gd, ui_theme.gd   interfejs
    events.gd              wydarzenia historyczne
    procedural_art.gd      grafika zastępcza
    sprite_lib.gd          wyszukiwanie arkuszy; shaders/player_color.gdshader = kolor gracza
  data/*.json              jednostki, budynki, epoki, cywilizacje, quiz, kodeks, wydarzenia
  tests/                   run_tests (jednostkowe), sim_test (symulacja), screenshot (zrzut pod Xvfb)
  assets/sprites/          arkusze z Blendera (patrz niżej)
```

## Potok graficzny „jak w AoE2” (Blender → Godot)

Age of Empires II nie używa 3D w czasie rzeczywistym: wszystkie jednostki i budynki to **wstępnie wyrenderowane
sprite'y** z modeli 3D, w rzucie dimetrycznym 2:1 (kafelek 64×32 px), ze światłem z lewego górnego rogu, w palecie
256 kolorów, z osobnym „kolorem gracza” i cieniem. Ten projekt odtwarza dokładnie ten proces:

1. `blender/build_placeholders.py` buduje proste modele (osadnik, milicja, dom, centrum, koszary, młyn, obozy, pole,
   drzewo, jagody, złoto, kamień) i zapisuje `blender/models/*.blend`. **Docelowe modele podmieniasz w tym samym
   formacie** (kolekcja `Model`, właściwości sceny `sprite_anims`, `frame_px`, `anchor`, `directions`, materiał
   `PlayerColor` na elementach w kolorze gracza).
2. `blender/render_sprites.py` ustawia kamerę ortograficzną (rotacja X 60°, Z 45° → rzut 2:1), słońce z lewej-góry,
   „shadow catcher” pod modelem i renderuje każdą animację w 8 kierunkach (budynki: 1), po czym
3. `blender/pack_sheets.py` składa klatki w arkusz (wiersze = kierunki, kolumny = klatki) i zapisuje `.json`
   z rozmiarem klatki, liczbą klatek, FPS, punktem zaczepienia (stopy / środek podstawy) i flagą koloru gracza.
4. Opcjonalnie `blender/palette_aoe.py` kwantyzuje arkusze do palety 256 kolorów i trzech poziomów przezroczystości
   (0 / cień 50 % / pełna), jak w oryginale; `--outline` dodaje 1-px obrys.
5. Godot (`sprite_lib.gd`) sam wykrywa arkusz; shader `player_color.gdshader` zamienia magentę na kolor drużyny.

Konwencja kierunków: 0 = S (w dół ekranu), potem zgodnie z ruchem wskazówek zegara (SW, W, NW, N, NE, E, SE).
Arkusz z 5 kierunkami (S…N) też działa: wschodnie kierunki powstają przez odbicie, jak w AoE2.

Skala: 1 jednostka Blendera = 1 kafelek; osadnik ma ~1,1 jednostki wzrostu (ok. 40 px na ekranie, jak w AoE2
w 800×600). `--scale 2` renderuje wersję „HD” (kafelek 128×64).

## Czego potrzebuję od Ciebie, aby grafika wyglądała jak pierwowzór

Potok techniczny jest gotowy i przetestowany (modele zastępcze renderują się do poprawnych arkuszy). Żeby wynik
**wyglądał jak Age of Empires II**, potrzebne są rzeczy, których nie da się zrobić bez Twoich decyzji lub zasobów:

1. **Decyzja prawna o źródle grafiki.** Oryginalne sprite'y, palety, dźwięki i nazwy należą do Microsoftu
   i nie mogą trafić do tego repozytorium ani do gry, którą udostępnisz uczniom. Do wyboru:
   * (a) **własne modele** w tym potoku: wygląd „jak AoE2” (rzut, światło, paleta, proporcje), ale autorskie,
   * (b) **otwarte zasoby**: modele 3D z gry *0 A.D.* (licencja CC BY-SA 3.0, wymaga podania autorów i tej samej
     licencji), zestawy z OpenGameArt / Kenney (CC0), modele z Sketchfab na licencji CC BY,
   * (c) licencja od Microsoftu — w praktyce niedostępna dla projektu edukacyjnego.
   Polecam (a) z uzupełnieniem (b) dla przyrody i terenu.
2. **Zrzuty referencyjne** z Twojej własnej kopii AoE2 (kilka ujęć: osadnik, dom, centrum, las, teren w zbliżeniu)
   wyłącznie do porównania kierunku światła, proporcji i nasycenia barw. Nie trafią do repozytorium.
3. **Lista zakresu**: które cywilizacje (zestawy architektury: zachodnioeuropejska, wschodnia, śródziemnomorska…),
   które jednostki i budynki w pierwszej kolejności. Obecna lista: 5 jednostek, 12 budynków, 4 złoża.
4. **Rozdzielczość docelowa**: wierna (kafelek 64×32, osadnik ~40 px) czy „DE/HD” (2×). Wpływa na liczbę detali
   w modelach i rozmiar repozytorium (przy 2× zalecam Git LFS dla `assets/sprites/`).
5. **Stanowisko do renderu**: komputer z Blenderem 4.2+ (GPU przyspiesza Cycles kilkukrotnie; CPU wystarczy, pełny
   zestaw zastępczy renderuje się w kilka minut). Godot 4.3+ do gry. Antigravity do pracy z kodem (konto Google).
6. **Osoba lub budżet na modele 3D** albo zgoda na szybką ścieżkę: tekstury generowane (np. w Blenderze z
   proceduralnych materiałów) + ręczne poprawki. Realistyczny nakład na „ładne” modele zastępcze w stylu AoE2:
   ok. 1–2 h na jednostkę z animacją chodu/pracy, 0,5–1 h na budynek.
7. **Dźwięk i muzyka** (poza zakresem grafiki, ale potrzebne do klimatu): decyzja o źródle (własne / CC0).
8. **Weryfikacja treści edukacyjnych**: poziom (klasa 5–6 SP? liceum?), czy quiz ma być powiązany z konkretnymi
   wymaganiami podstawy programowej, oraz korekta merytoryczna wpisów Kodeksu przez nauczyciela historii.

Gdy dostarczysz punkty 1–4, wystarczy podmienić pliki `blender/models/*.blend` i uruchomić `render_all.sh`;
reszta (import, kolor gracza, animacje, kierunki) zadziała bez zmian w kodzie gry.

## Antigravity

Katalog `.agent/` zawiera reguły projektu (`rules/projekt.md`) i workflowy wywoływane poleceniami `/testy`,
`/render-sprites`, `/zrzut`, `/nowa-jednostka`. `AGENTS.md` opisuje konwencje dla dowolnego agenta kodującego.

## Plan rozwoju

* mury i bramy, machiny oblężnicze, drugi typ AI (ekonomiczne),
* minimapa, grupy sterujące (Ctrl+1…9), dźwięki,
* tryb „lekcja”: nauczyciel wybiera pulę pytań i wpisów Kodeksu z pliku,
* eksport HTML5 (Godot Web) i publikacja na GitHub Pages obok pozostałych gier historycznych.
