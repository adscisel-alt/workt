# Fabryka 1892 – Rodzina Walczaków 🏭

Gra symulacyjna w duchu **The Sims 1** o życiu rodziny robotniczej w **Łodzi w 1892 roku**.
Gracz opiekuje się czteroosobową rodziną Walczaków (Józef – tkacz, Marianna – prządka,
dwunastoletni Antek i dziewięcioletnia Zosia), która właśnie wynajęła izbę w famule obok
fabryki bawełny. Przez 5 tygodni trzeba dbać o potrzeby Simów, zarabiać na czynsz i jedzenie
oraz podejmować decyzje, które odsłaniają **karty wiedzy** o XIX-wiecznym przemyśle:
praca dzieci i prawo z 1882 r., angielskie *Factory Acts*, kary fabryczne, rusyfikacja
szkoły i tajne nauczanie, maszyna parowa, choroby zawodowe, **bunt łódzki 1892**.

![Parcela: fabryka, szkoła, ulica, famuła, podwórze, sklep](docs/zrzut_parcela.png)
![Izba Walczaków o 7:00 – rodzina, piec, stół, łóżka](docs/zrzut_izba.png)

*(zrzuty z programowego renderowania bez karty graficznej – `tests/screenshot.gd`)*

Projekt składa się z trzech warstw narzędziowych, o które prosiłeś:

| Narzędzie | Rola w projekcie | Katalog |
|---|---|---|
| **Blender** | generowanie modeli low-poly (meble, maszyny, budynki, postacie) skryptem Pythona → pliki `.glb` | `blender/` |
| **Godot 4.6** | silnik gry: świat izometryczny, Simowie, potrzeby, praca, szkoła, ekonomia, UI, zdarzenia edukacyjne | `godot/` |
| **Antigravity** | agentowe IDE do dalszego rozwijania kodu – gotowe reguły i workflowy dla agenta | `.agent/`, `AGENTS.md` |

---

## Jak uruchomić grę

1. Pobierz **Godot 4.6** (wersja standardowa, bez .NET) z https://godotengine.org/download
   lub https://github.com/godotengine/godot/releases/tag/4.6-stable (plik `Godot_v4.6-stable_*`).
2. Uruchom Godot → **Import** → wskaż plik `gra-fabryka/godot/project.godot` → **Import & Edit**.
3. Przy pierwszym otwarciu edytor zaimportuje 31 modeli GLB (kilka sekund).
4. Naciśnij **F5** (Run Project).

Bez edytora (wiersz poleceń):

```bash
godot --path gra-fabryka/godot
```

Modele `.glb` są już w repozytorium (`godot/assets/models/`), więc **Blender nie jest wymagany
do grania** – tylko do zmiany wyglądu obiektów.

### Sterowanie

| Akcja | Klawisz / mysz |
|---|---|
| Wybór Sima | kliknięcie na postać lub portret w dolnym panelu |
| Zlecenie czynności | kliknięcie na przedmiot → menu czynności (jak w The Sims) |
| Rozmowa | mając wybranego Sima, kliknij innego Sima |
| Pauza / prędkość | **Spacja**, **1 / 2 / 3** |
| Obrót kamery co 45° | **Q / E** |
| Zoom | kółko myszy, **+ / −** |
| Przesuwanie | **WSAD**, strzałki, środkowy przycisk myszy |
| Ściany góra/dół | **H** |
| Tryb „Kup” | przycisk 🛒 Kup; **R** obraca mebel, **Esc** anuluje, kliknięcie mebla w izbie = sprzedaż |

### Zasady rozgrywki

- **Czas**: start w poniedziałek 4 kwietnia 1892, 6:30. Gra trwa 35 dni. Fabryka: 6:00–19:00
  (dzieci do 15:00) z przerwą 12:00–13:00, bez niedziel. Spóźnienie = kara 10 kop.
- **Potrzeby** (jak w The Sims): głód, energia, higiena, potrzeba fizjologiczna, zabawa,
  towarzystwo, komfort + **edukacja** (u dzieci) i **zdrowie** (spada przy głodzie, brudzie,
  braku snu i pracy w pyle bawełnianym; chory Sim nie pracuje).
- **Ekonomia**: ruble i kopiejki. Tkacz 8 kop./h, prządka 5 kop./h, dziecko 2 kop./h; wypłata
  w sobotę o 19:00. W poniedziałek rano czynsz 1 rb 50 kop. + 20 kop. składki szkolnej za
  każde dziecko w szkole. Gotowanie zużywa porcje zapasów kupowane w sklepie.
- **Autonomia**: gdy nic nie zlecisz, Simowie sami idą do pracy / szkoły, jedzą, myją się,
  śpią i robią zakupy. Zlecenia gracza trafiają do kolejki czynności.
- **Zdarzenia i decyzje** (pauzują grę): propozycja pracy dla Antka (legalna, 8 h) i dla Zosi
  (nielegalna – ryzyko inspektora), kary fabryczne, choroba, tajne nauczanie po polsku,
  bunt łódzki w maju 1892, eksmisja za niepłacony czynsz. Każda decyzja odsłania kartę wiedzy.
- **Szkoła**: podczas lekcji nauczyciel zadaje pytanie – odpowiada **gracz** (quiz z 14 pytań).
- **Koniec gry**: raport – pieniądze, zdrowie, edukacja dzieci, odkryte karty (16), wynik.

---

## Struktura projektu

```
gra-fabryka/
├── blender/
│   └── generate_assets.py     # skrypt bpy: 25 obiektów + 6 postaci → godot/assets/models/*.glb
├── godot/
│   ├── project.godot          # Godot 4.6, renderer GL Compatibility (działa też na słabszych laptopach)
│   ├── scenes/main.tscn       # scena startowa (świat budowany w kodzie)
│   ├── scripts/
│   │   ├── main.gd            # wejście, tryby Żyj/Kup, raycast, oświetlenie dzień/noc
│   │   ├── world.gd           # parcela 38×26 kafelków, ściany, podłogi, A* (AStarGrid2D)
│   │   ├── sim.gd             # Sim: potrzeby, zdrowie, kolejka, praca/szkoła, autonomia
│   │   ├── interactable.gd    # obiekt świata: footprint, obrót, kafelek użycia, czynności
│   │   ├── catalog.gd         # katalog obiektów, czynności, prac, cen
│   │   ├── game_state.gd      # autoload Game: czas, pieniądze, zapasy, zdarzenia, raport
│   │   ├── education.gd       # autoload Edu: karty wiedzy, quiz, słowniczek
│   │   ├── camera_rig.gd      # kamera ortogonalna 3/4 jak w The Sims
│   │   ├── model_loader.gd    # wczytywanie GLB z zapasowymi bryłami
│   │   └── ui/hud.gd          # HUD, menu czynności, okna zdarzeń / quizu / kart wiedzy
│   ├── data/wiedza.json       # treści edukacyjne (16 kart, 12 zdarzeń, 14 pytań, 18 haseł)
│   ├── assets/models/*.glb    # modele z Blendera
│   ├── tests/headless_sim.gd  # automatyczna symulacja 35 dni bez okna
│   └── tests/screenshot.gd    # zrzut ekranu z wirtualnego wyświetlacza
├── .agent/                    # reguły i workflowy dla Antigravity
└── AGENTS.md
```

### Pipeline Blender → Godot

```bash
# wariant A: Blender jako moduł Pythona (bez okna)
python -m venv .venv && . .venv/bin/activate
pip install bpy
python gra-fabryka/blender/generate_assets.py gra-fabryka/godot/assets/models

# wariant B: zainstalowany Blender
blender --background --python gra-fabryka/blender/generate_assets.py -- gra-fabryka/godot/assets/models
```

Skrypt składa każdy model z prostych bryl o płaskich kolorach (paleta `PAL` na górze pliku),
ustawia go na podłodze i eksportuje do GLB w układzie Y-up, z zastosowanymi transformacjami.
Godot wczytuje pliki automatycznie; w `catalog.gd` wystarczy wpisać nazwę modelu.
Aby dodać nowy obiekt: funkcja w `generate_assets.py` + wpis w `GENERATORS` + wpis w `Catalog.DEF`
(footprint, kafelek użycia, czynności) + ewentualnie pozycja w `World.OBJECTS`.

### Testy automatyczne

```bash
# symulacja 35 dni: raport dzienny, zdarzenia, quiz, wynik końcowy (wykrywa błędy skryptów)
godot --headless --path gra-fabryka/godot res://scenes/test_run.tscn --quit-after 3000

# zrzut ekranu bez monitora (Linux): [plik] [godzina] [zoom] [obrót 0-7] [x] [z]
xvfb-run -a -s "-screen 0 1366x800x24" godot --path gra-fabryka/godot --rendering-driver opengl3 \
  res://scenes/screenshot.tscn -- shot.png 10.5 24 1
```

---

## Czego potrzebuję od Ciebie, żeby grafika była jak najbliższa pierwowzorowi

Obecna wersja ma styl „low-poly z płaskimi kolorami” – czytelny, ale uproszczony. The Sims 1
to **prerenderowane sprite'y izometryczne** (rzut dimetryczny 2:1, cztery obroty, pastelowa
paleta, miękkie cienie, grube obrysy mebli), a The Sims 2–4 to **stylizowane 3D z lekko
karykaturalnymi proporcjami**. Żeby zbliżyć się do tego wyglądu, przydadzą mi się od Ciebie:

1. **Decyzja, który „pierwowzór” jest celem** – The Sims 1 (sprite'y 2D, kamera 4 kierunki)
   czy The Sims 2/3 (pełne 3D, swobodna kamera). Obecny silnik to 3D z kamerą ortogonalną
   co 45°, więc **oba warianty są osiągalne**: dla Sims 1 wyrenderuję w Blenderze sprite'y
   z gotowych modeli i przełączę Godot na `Sprite3D`/2D; dla Sims 2/3 dopracuję cieniowanie
   (toon-shader, obrysy) i modele.
2. **Referencje wizualne**: 10–20 zrzutów ekranu lub zdjęć, które pokazują pożądany klimat
   (ujęcia z gry, ale też zdjęcia łódzkich famuł, Księżego Młynu, hal Scheiblera/Poznańskiego,
   maszyn z Centralnego Muzeum Włókiennictwa). Wrzuć je do `gra-fabryka/referencje/`
   (katalog jest ignorowany przez eksport gry). **Uwaga**: nie mogę kopiować oryginalnych
   tekstur, modeli ani sprite'ów z The Sims – to własność EA; mogę odtworzyć *styl*
   (proporcje, paletę, kadrowanie, UI), nie zasoby.
3. **Paleta kolorów i czcionka**: jeśli masz ulubione kolory UI/mebli (np. próbki HEX) albo
   krój pisma z licencją do użycia (np. z Google Fonts), podaj je – wstawię do `PAL`
   w skrypcie Blendera i do stylów HUD.
4. **Tekstury** (opcjonalnie): zdjęcia cegły, desek, bruku, tkanin w rozdzielczości min. 1024 px,
   bezszwowe lub do zapętlenia; albo zgoda na użycie pakietów na licencji CC0
   (ambientCG, Poly Haven) – wtedy pobiorę je sam i ustawię w materiałach.
5. **Postacie**: czy mają być „klockowe” jak teraz, czy proporcjonalne z animacją szkieletową?
   W drugim przypadku potrzebuję zgody na użycie darmowych rigów/animacji (np. Mixamo wymaga
   konta Adobe – musiałbyś pobrać pliki FBX sam) lub czasu na własny rig w Blenderze.
6. **Zasięg świata**: jedna parcela (jak teraz: fabryka, szkoła, ulica, famuła, sklep, skwer)
   czy więcej lokacji (kościół, szynk, targ, kantor fabrykanta)? Każda lokacja to ok.
   5–10 nowych modeli.
7. **Dźwięk**: syrena fabryczna, stukot krosien, muzyka – potrzebuję plików na wolnej licencji
   (freesound.org CC0) lub zgody, żebym je wyszukał i dodał; sam ich nie generuję.
8. **Platforma docelowa**: Windows/Linux/macOS (eksport Godota) i/lub przeglądarka
   (eksport Web – mógłbym go dodać do GitHub Pages obok aplikacji protokołów). Od tego zależy
   limit szczegółowości modeli.
9. **Test na Twoim komputerze**: zrzuty ekranu z działającej gry na Twoim sprzęcie
   (rozdzielczość, czy czcionki z polskimi znakami renderują się poprawnie, FPS) – ja mogę
   testować tylko programowym renderowaniem bez GPU.

Gdy dostarczysz punkty 1–3, kolejny etap to: shader toon z obrysami w Godot, ulepszone modele
(zaokrąglenia, detale: nitki na krosnach, pościel, okna z firankami), prerenderowane sprite'y
(jeśli wybierzesz styl Sims 1) oraz animacje chodu/pracy.

---

## Źródła treści edukacyjnych (do weryfikacji przez nauczyciela)

Karty wiedzy opierają się na ogólnie dostępnej literaturze: ustawa rosyjska z 1 czerwca 1882 r.
o pracy małoletnich i inspekcji fabrycznej, ustawa z 1897 r. o 11,5-godzinnym dniu pracy,
brytyjskie Factory Act 1833 i Ten Hours Act 1847, dzieje Łodzi przemysłowej (Geyer 1839,
Scheibler – Księży Młyn, Poznański), bunt łódzki (maj 1892), rusyfikacja szkolnictwa po 1869 r.
i elementarz Konrada Prószyńskiego (1875), spis powszechny 1897 r. Stawki płac i ceny w grze są
**orientacyjne** i podane jako takie w karcie „Ile zarabiał robotnik?”. Teksty są w
`godot/data/wiedza.json` – łatwo je poprawić lub rozszerzyć bez dotykania kodu.
