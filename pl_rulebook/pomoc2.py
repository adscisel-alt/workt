# -*- coding: utf-8 -*-
"""Ściąga: Karty broni (atak/obrona) + legenda symboli.
Treść z instrukcji (str. 9, 11-14, przykłady). HTML -> PDF (Chromium)."""
import html

def esc(s): return html.escape(s).replace("\n", "<br>")

# ---- WEAPON CARDS ---------------------------------------------------------
# type: "def" (Podstawowa/niebieska) / "atk" (Zaawansowana/czerwona)
LAYOUT = [
    ("Lewy górny róg", "Koszt karty — ile Metalu musisz zapłacić, aby ją zagrać."),
    ("Prawa strona", "Siła — wartość dodawana do siły bitewnej twoich jednostek."),
    ("Środek", "Efekt karty — specjalna zdolność (jeśli karta ją ma)."),
    ("Lewy dolny róg", "Postęp na Torze Wojny w razie wygranej bitwy."),
    ("Prawy dolny róg", "Punkty Zwycięstwa (PZ) w razie wygranej bitwy."),
]

CARDS = [
    ("Proca", "Slingshot", "def",
     "Jeśli przegrasz bitwę, kradniesz 1 dowolny surowiec od zwycięzcy. "
     "Jeśli przeciwnik nie ma żadnych surowców, nic nie otrzymujesz."),
    ("Długa włócznia", "Long Spear", "atk",
     "Gdy przeciwnik oblicza swoją siłę bitewną, nie może liczyć wartości "
     "swojej najsilniejszej jednostki. Brak efektu przeciwko płytkom "
     "Starożytnej Cywilizacji."),
    ("Hełm Wikinga", "Viking Helmet", "atk",
     "Po odsłonięciu wszystkich kart broni przeciwnik musi odrzucić swoją "
     "zagraną kartę broni, zwracając ją do ręki (karta Podstawowa) lub na "
     "wyznaczone miejsce nad Planszą akcji. Kartę, którą przeciwnik musi "
     "odrzucić, i tak trzeba opłacić. Może on następnie zagrać nową kartę "
     "broni zgodnie ze zwykłymi zasadami. Efekt ten jest ignorowany w bitwie "
     "ze Starożytną Cywilizacją. Jeśli przeciwnik nie może zagrać nowej "
     "karty, natychmiast wygrywasz bitwę."),
    ("Łuk kompozytowy", "Composite Bow", "atk",
     "Po odsłonięciu tej karty możesz dodać drugą kartę broni z ręki. Nadal "
     "musisz zagrać Zaawansowaną kartę broni — nie możesz w ten sposób zagrać "
     "karty Podstawowej. Płacisz koszt tej drugiej karty jak zwykle. Efekty "
     "z drugiej karty również są stosowane. Dodaj siłę obu zagranych kart do "
     "swojej siły bitewnej. Jeśli wygrasz, bierzesz nagrody z obu kart."),
    ("Rydwan bojowy", "War Cart", "atk",
     "Po odsłonięciu wszystkich kart broni możesz zapłacić dowolną ilość "
     "Metalu, aby zwiększyć swoją siłę o 1 za każdy wydany w ten sposób Metal."),
    ("Balista", "Ballista", "atk",
     "Każdy Bóg przeciwnika ma siłę 1 — niezależnie od tego, czy to Pomniejszy "
     "Bóg, Główny Bóg, czy Bóg Atlantydy. Dzięki temu karta jest bardzo "
     "skuteczna przy zdobywaniu Atlantydy (gdzie żetony Bogów dodają +3 do "
     "siły Starożytnej Cywilizacji)."),
]

NOTE_CARDS = ("Pozostałe karty broni (np. Długa Tarcza, Krótki Łuk, Sztylet, "
    "Podwójny Topór) nie mają tekstu efektu — liczy się tylko ich Siła oraz "
    "nagrody, które odczytasz bezpośrednio z liczb i ikon na karcie (patrz "
    "„Układ karty broni” powyżej).")

# ---- SYMBOLS --------------------------------------------------------------
SYM = [
    ("Surowce i zasoby", [
        ("Złoto", "Jeden z 4 surowców (żółta sztabka/moneta)."),
        ("Drewno", "Jeden z 4 surowców (zielone drzewo)."),
        ("Metal", "Jeden z 4 surowców (niebieskie kowadło)."),
        ("Żywność", "Jeden z 4 surowców (czerwony kłos)."),
        ("„?” w kółku", "Dowolny 1 surowiec do wyboru (Drewno / Żywność / "
         "Złoto / Metal). Z liczbą — tyle surowców, dowolna kombinacja."),
        ("Zielony kryształ", "Kryształ Many — waluta do akcji Many; na koniec "
         "gry 1 PZ za każde 5 surowców i Kryształów Many razem."),
    ]),
    ("Tory i pola punktacji", [
        ("Miecze", "Tor Wojny — przesuwasz się po nim za wygrane bitwy."),
        ("Zębatka", "Tor Technologii — przesuwasz się rozwijając płytki akcji."),
        ("Symbol handlu (uścisk dłoni / wagi)", "Tor Handlu — przesuwasz się "
         "za Pakty handlowe i akcje handlu."),
        ("Flaga z „7”", "Tor dominacji — przesuwasz się o liczbę pól wskazaną "
         "przez płytkę Celu po lewej stronie toru."),
        ("Błyskawica na torze", "Próg na Torze dominacji / Torach rozwoju: "
         "nie możesz wejść na końcowe pola (i wywołać końca gry), zanim nie "
         "przekroczysz tego progu na Torze dominacji."),
        ("Żeton „2” (2 PZ)", "Mijając/wchodząc na to pole Toru dominacji "
         "zyskujesz 2 PZ i zdejmujesz żeton."),
        ("„MAX 5”", "Płytka Celu ma maksymalną wartość mnożnika 5."),
    ]),
    ("Ikony wyników akcji (na planszy i płytkach)", [
        ("Spirala / wir", "Wykonaj akcję Portalu (teleport na dowolne "
         "Terytorium, z wyjątkiem Atlantydy)."),
        ("Sandał / stopa", "Wykonaj akcję Ruchu."),
        ("Świątynia", "Zbuduj Osadę (na kontrolowanym Terytorium bez Osady)."),
        ("Świątynia z „!”", "Dochód z Osad — zbierz wszystkie odkryte nagrody "
         "(Wyznawcy i PZ) z obszaru Osad na Planszy akcji."),
        ("Tarcza z „X”", "Zyskaj X Punktów Zwycięstwa."),
        ("Kilof/motyka z surowcami", "Akcja Zbiorów — pozyskaj surowce z "
         "kontrolowanych Terytoriów."),
        ("Sanktuarium (oko w trójkącie)", "Terytorium z Sanktuarium; ważne dla "
         "akcji Stworzenia i punktacji."),
        ("Niebieski heks z symbolem akcji", "Wykonaj akcję z niebieskiej "
         "Płytki akcji (ale nie tej, na której stoi twój Pionek akcji)."),
        ("Czerwony heks z symbolem akcji", "Wykonaj akcję z czerwonej Płytki "
         "akcji (ale nie tej z Pionkiem akcji)."),
        ("Kostka + strzałka", "Przesuń jedną Kostkę przywołania na dowolne "
         "puste pole; zyskujesz Kryształy Many z pola docelowego."),
        ("Uścisk dłoni", "Weź płytkę Paktu handlowego z wyświetlenia "
         "(natychmiast je uzupełnij)."),
        ("Miecz/broń nad Planszą akcji", "Weź dowolną Zaawansowaną kartę broni "
         "znad Planszy akcji i dodaj ją do ręki."),
        ("Sylwetka Wyznawcy", "Zyskaj Wyznawcę — umieść go na kontrolowanym "
         "Terytorium z twoją Osadą (Osada nie może być oblężona)."),
    ]),
    ("Ikony bitewne", [
        ("Oko „= 1”", "Każdy Bóg przeciwnika ma siłę 1 (efekt karty Balista)."),
        ("Przekreślona broń (X)", "Zastosuj przed każdym innym efektem: efekt "
         "karty broni przeciwnika LUB Starożytnej Cywilizacji jest ignorowany "
         "w tej bitwie. Siła i nagrody są nadal liczone."),
    ]),
    ("Typy zdolności Bogów (na kartach Bogów)", [
        ("Błyskawica (⚡)", "Zdolność natychmiastowa — jednorazowa premia w "
         "chwili przywołania Boga."),
        ("Nieskończoność (∞)", "Zdolność stała — działa przez całą grę."),
        ("Strzałka w kółku (▶)", "Kryterium punktacji — dodatkowe PZ na koniec "
         "gry."),
    ]),
    ("Terytoria i Planety", [
        ("Złoty okrąg wokół surowca", "Terytorium Stolicy — surowiec nigdy się "
         "nie wyczerpuje; jednostki wroga nie mogą tu wejść."),
        ("Żeton wyczerpania (czarny)", "Zakrywa pole surowca po Zbiorach; "
         "pokazuje typ surowca; nigdy nie jest zdejmowany."),
        ("Ikona Domu (lewy górny róg płytki)", "Płytka/plansza należy do "
         "konkretnego Domu (Pharaos / Norrenis / Babylon / Ellenys)."),
        ("Liczba 1–3 przy surowcu", "Ile jednostek danego surowca produkuje "
         "Terytorium."),
    ]),
]

def card_html(pl, en, t, text):
    is_atk = t == "atk"
    col = "#a83535" if is_atk else "#2d6da8"
    kind = "ZAAWANSOWANA · ATAK" if is_atk else "PODSTAWOWA · OBRONA"
    return f"""
    <div class="wcard" style="border-color:{col}">
      <div class="wchead" style="background:{col}">
        <span class="wname">{esc(pl)} <span class="en">({esc(en)})</span></span>
        <span class="wkind">{kind}</span>
      </div>
      <div class="wbody">{esc(text)}</div>
    </div>"""

def sym_group(title, rows):
    items = "".join(
        f'<tr><td class="sname">{esc(n)}</td><td>{esc(d)}</td></tr>'
        for n, d in rows)
    return f"""<div class="symgroup"><h3>{esc(title)}</h3>
      <table class="symtab">{items}</table></div>"""

WCARDS = "".join(card_html(*c) for c in CARDS)
LAYOUT_ROWS = "".join(
    f'<tr><td class="sname">{esc(a)}</td><td>{esc(b)}</td></tr>' for a, b in LAYOUT)
SYMS = "".join(sym_group(t, r) for t, r in SYM)

DOC = f"""<!doctype html><html lang="pl"><head><meta charset="utf-8"><style>
@page {{ size:A4; margin:12mm 12mm 14mm; }}
* {{ box-sizing:border-box; }}
body {{ font-family:"Liberation Serif",Georgia,serif; color:#232323; margin:0;
  font-size:10.5pt; line-height:1.36; }}
h1 {{ font-family:"Liberation Sans",Arial,sans-serif; font-size:21pt; margin:0;
  text-align:center; letter-spacing:.5px; }}
.sub {{ text-align:center; color:#555; font-size:11pt; margin:2mm 0 5mm; }}
.secbar {{ font-family:"Liberation Sans",Arial,sans-serif; font-size:14pt;
  font-weight:bold; letter-spacing:1px; color:#fff; background:#37474f;
  padding:2.5mm 5mm; border-radius:3px; margin:4mm 0 3mm; break-after:avoid; }}
.intro {{ background:#f2f2f2; border-left:4px solid #37474f; padding:2.5mm 4mm;
  margin-bottom:3.5mm; font-size:9.7pt; }}
.intro b {{ color:#1c1c1c; }}
h3 {{ font-family:"Liberation Sans",Arial,sans-serif; font-size:11pt; margin:0 0 1.5mm;
  color:#2b3a42; border-bottom:2px solid #cfd8dc; padding-bottom:1mm; break-after:avoid; }}
.layout {{ margin-bottom:4mm; }}
table.symtab {{ width:100%; border-collapse:collapse; margin-bottom:4mm; }}
table.symtab td {{ padding:1.6mm 3mm; border-bottom:1px solid #ececec;
  vertical-align:top; text-align:left; }}
td.sname {{ width:33%; font-weight:bold; color:#2b3a42;
  font-family:"Liberation Sans",Arial,sans-serif; font-size:9.6pt; }}
.symgroup {{ break-inside:avoid; }}
.wcard {{ border:2px solid; border-radius:5px; overflow:hidden; margin-bottom:3mm;
  break-inside:avoid; }}
.wchead {{ display:flex; justify-content:space-between; align-items:center;
  color:#fff; padding:2mm 4mm; }}
.wname {{ font-family:"Liberation Sans",Arial,sans-serif; font-weight:bold; font-size:12.5pt; }}
.wname .en {{ font-weight:normal; font-size:9.5pt; opacity:.85; }}
.wkind {{ font-family:"Liberation Sans",Arial,sans-serif; font-size:7.5pt;
  letter-spacing:1px; }}
.wbody {{ padding:2.5mm 4mm; text-align:justify; hyphens:auto; }}
.note {{ font-style:italic; color:#555; background:#fafafa; border:1px solid #eee;
  padding:2.5mm 4mm; border-radius:4px; font-size:9.6pt; }}
</style></head><body>
<h1>ANUNNAKI: DAWN OF THE GODS</h1>
<div class="sub">Ściąga: karty broni i symbole (wersja polska)</div>

<div class="secbar">KARTY BRONI — ATAK i OBRONA</div>
<div class="intro">
Są <b>2 typy kart broni</b>. <b>Podstawowe</b> (niebieski nagłówek) to karty
<b>obronne</b> — możesz ich użyć tylko jako <b>obrońca</b>; grę zaczynasz z 2 w ręce
i po użyciu wracają do ręki. <b>Zaawansowane</b> (czerwony nagłówek) to karty
<b>ataku</b> — aby zaatakować, musisz mieć i zagrać Zaawansowaną; zdobywasz je w
trakcie gry (akcja Many, premie z Paktów handlowych i żetonów Kultury), a po
użyciu wracają nad Planszę akcji.
</div>
<h3>Układ karty broni — co oznacza która pozycja</h3>
<table class="symtab layout">{LAYOUT_ROWS}</table>
<h3>Efekty kart broni</h3>
{WCARDS}
<div class="note">{esc(NOTE_CARDS)}</div>

<div class="secbar">LEGENDA SYMBOLI (planszy i kart)</div>
<div class="intro">Poniżej znaczenie symboli spotykanych na planszach i płytkach.
Kształt ikony podano pomocniczo — dokładny wygląd sprawdzisz na komponentach.
Pełną, ilustrowaną legendę masz też na stronie 14 („DODATEK”) przetłumaczonej
instrukcji.</div>
{SYMS}
</body></html>"""

HTML_PATH = "/home/user/workt/pl_rulebook/pomoc_karty_symbole.html"
with open(HTML_PATH, "w") as f:
    f.write(DOC)
print("wrote", HTML_PATH)
