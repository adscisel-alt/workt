# -*- coding: utf-8 -*-
"""Generuje drukowalną ściągę (PDF) z kartami pomocy dla każdego boga.
Teksty mocy pochodzą z sekcji „Moce Bogów" instrukcji (strony 15–16),
przetłumaczonej na polski. Renderowanie HTML -> PDF przez Chromium."""
import html, subprocess, os

# type badges: i=natychmiastowa, o=stała, e=punktacja końcowa
HOUSES = [
    {
        "name": "PHARAOS",
        "color": "#b5892b", "color2": "#8a6413", "tint": "#faf3e0",
        "flavor": "„Kwitnące pola ich rodzimej planety ciągną się aż po horyzont "
        "i są nawadniane przez wielką świętą rzekę. Dzięki tym polom i "
        "zaawansowanym technikom rolniczym Dom Pharaos zawsze cieszył się "
        "obfitością żywności, która pozwoliła mu szybko powiększać populację. "
        "Dom Pharaos strzeże tajemnego rytuału, który pozwala im wzmacniać moc "
        "świętej gwiazdy. Przewodzi im Ra lśniący.”",
        "major": {
            "name": "RA", "sub": "Główny Bóg",
            "basic": "Gdy przesuwasz Pionek akcji nad polem zawierającym Kostkę "
            "przywołania, możesz przesunąć tę kostkę na dowolne puste pole. "
            "Jeśli pole, na które przesuwasz kostkę, zawiera Kryształy Many, "
            "zyskujesz pokazane Kryształy Many jak zwykle. Jeśli umieszczenie "
            "kostki przywołuje Boga, możesz przywołać tego Boga w fazie "
            "„3. Akcje Dodatkowe” swojej tury jak zwykle.",
            "upgraded": "Za każdym razem, gdy umieszczasz Kostkę przywołania i "
            "zyskujesz dowolną liczbę Kryształów Many, zyskujesz też 1 surowiec "
            "wedle wyboru. Otrzymujesz tylko 1 surowiec, jeśli umieszczasz "
            "kostkę na polu, które produkuje 2 Kryształy Many.",
        },
        "minors": [
            ("Anubis", "o", "Za każdym razem, gdy Pomniejszy lub Główny Bóg "
             "wchodzi na Terytorium, co prowadzi do bitwy, dodaj 1 Wyznawcę na "
             "to Terytorium przed rozstrzygnięciem bitwy. Ta moc działa na "
             "Terytorium, a nie na Boga, więc dodajesz tylko 1 Wyznawcę "
             "niezależnie od tego, ilu Bogów jest na Terytorium, ale możesz "
             "dodać Wyznawców na wielu Terytoriach w tej samej turze. Jeśli nie "
             "masz Wyznawców w zapasie, możesz najpierw usunąć jednego z "
             "dowolnego Terytorium, a potem dodać go tam, gdzie toczy się bitwa."),
            ("Bastet", "i", "Natychmiast po przywołaniu Bastet możesz odrzucić "
             "jeden Kryształ Many, aby wypełnić dowolną płytkę Paktu handlowego "
             "leżącą przed tobą bez płacenia innych kosztów pokazanych na "
             "płytce. Wymóg kontrolowania Terytorium na konkretnej planecie "
             "również jest ignorowany. Otrzymujesz nagrody jak zwykle. Nie "
             "liczy się to do twoich Akcji Dodatkowych w tej turze."),
            ("Horus", "e", "W punktacji końcowej zyskujesz 2 PZ za każde "
             "kontrolowane Terytorium, które produkuje Drewno."),
            ("Isis", "o", "Każda twoja Osada jest traktowana jako mająca siłę 1 "
             "zarówno w bitwie, jak i przy pozyskiwaniu. Osada nie jest "
             "jednostką, więc sama nie może wywołać bitwy z jednostkami innego "
             "Domu. Doda 1 siły do dowolnej bitwy lub pozyskiwania, o ile "
             "obecne są też twoje jednostki."),
            ("Osiris", "o", "Na potrzeby pozyskiwania jesteś traktowany jako "
             "mający +1 siły na każdym kontrolowanym Terytorium."),
            ("Sekhmet", "o", "Nie można zredukować kosztu poniżej 0. "
             "(Główny efekt Sekhmet pokazany jest ikonami na karcie – to "
             "doprecyzowanie z instrukcji.)"),
            ("Seth", "e", "W punktacji końcowej zyskujesz 3 PZ za każde 2 "
             "kontrolowane Terytoria (zaokrąglając w dół), które mają wszystkie "
             "pola surowców zakryte żetonami wyczerpania. Terytoria na "
             "Atlantydzie się do tego nie liczą."),
        ],
    },
    {
        "name": "NORRENIS",
        "color": "#5a6b7d", "color2": "#3c4a58", "tint": "#eef1f4",
        "flavor": "„Góry, które górują nad morzami ich Planety, mają zapierające "
        "dech piękno. Kryją one bogate żyły metalu, co w połączeniu z brakiem "
        "równin skłoniło Dom Norrenis do rozwinięcia tradycji wojowników. "
        "Norrenis to koczownicze społeczeństwo, które nieustannie przemieszcza "
        "się na Drakkarach – ogromnych, szybkich okrętach ze smokiem na "
        "dziobie. Atakują, plądrują i płyną dalej w inne miejsce. Przewodzi im "
        "Odin potężny.”",
        "major": {
            "name": "ODIN", "sub": "Główny Bóg",
            "basic": "Twoje Osady są traktowane jako jednostki na potrzeby "
            "ruchu, portalu i efektów bitwy (początkowo z siłą 0). Gdy się "
            "poruszają lub korzystają z portalu, mogą przenieść 2 jednostki "
            "(ale nie inne Osady) z jednego Terytorium na drugie.\n"
            "• Możesz przemieszczać swoje Osady poza Stolicę. Jeśli twoja "
            "Stolica kiedykolwiek będzie pusta, tracisz kontrolę nad tym "
            "Terytorium, ale jednostki wroga nadal nie mogą na nie wejść.\n"
            "• Możesz przemieszczać Osady na Terytoria zawierające jedną lub "
            "więcej innych Osad, należących do dowolnego gracza.\n"
            "• Nie możesz budować Osad na Terytorium zawierającym inne Osady, "
            "jak zwykle.\n"
            "• Osady są traktowane jak jednostki, więc jeśli przesuniesz Osadę "
            "na Terytorium zawierające tylko Osadę innego gracza, przejmiesz "
            "kontrolę, a jego Osada zostanie oblężona.\n"
            "• Jeśli przegrasz bitwę na Terytorium, gdzie są twoje Osady, muszą "
            "one zostać przeniesione do twojej Stolicy wraz z innymi "
            "jednostkami.\n"
            "• Twoje Osady nie mogą być oblężone; jeśli jednostki wroga są na "
            "tym samym Terytorium co twoja Osada, bitwa jest rozstrzygana jak "
            "zwykle.",
            "upgraded": "Każda twoja Osada liczy się jako mająca 2 siły zarówno "
            "w bitwach, jak i przy pozyskiwaniu.",
        },
        "minors": [
            ("Aegir", "e", "W punktacji końcowej zyskujesz 2 PZ za każde "
             "kontrolowane Terytorium, które produkuje Złoto."),
            ("Freya", "i", "Natychmiast po przywołaniu Frei możesz usunąć 1 ze "
             "swoich Wyznawców z dowolnego Terytorium i zwrócić go do zapasu. "
             "Jeśli to zrobisz, możesz zyskać dowolne 4 surowce wedle wyboru."),
            ("Freyr", "i", "Natychmiast po przywołaniu Freyra policz Terytoria, "
             "które kontrolujesz poza swoją Planetą Macierzystą. Za każdą parę "
             "takich Terytoriów zyskujesz 1 PZ i 1 Kryształ Many."),
            ("Frigg", "i", "Możesz umieścić Wyznawcę na każdym Terytorium, gdzie "
             "masz łącznie co najmniej 3 jednostki i/lub Osady. Jeśli nie masz "
             "Wyznawców w zapasie, możesz najpierw usunąć jednego z dowolnego "
             "Terytorium."),
            ("Heimdallr", "o", "Ta moc łączy się z ulepszoną mocą Odina, tj. gdy "
             "jesteś obrońcą, twoje Osady mają siłę 5 (2 od Odina i 3 od "
             "Heimdallra)."),
            ("Loki", "o", "Za każdym razem, gdy zagrywasz karty broni w bitwie, "
             "możesz zagrać 2 karty broni. Po odkryciu wszystkich kart broni "
             "lub płytek Starożytnej Cywilizacji musisz wybrać 1 z 2 kart broni "
             "do użycia. Karta, której nie wybrałeś, wraca do twojej ręki. "
             "Rozpatrz wybraną kartę jak zwykle."),
            ("Thor", "o", "Może to obejmować wszystkie jednostki i twoje Osady, "
             "jeśli masz ulepszoną moc Odina. (Główny efekt Thora pokazany jest "
             "ikonami na karcie – to doprecyzowanie z instrukcji.)"),
        ],
    },
    {
        "name": "BABYLON",
        "color": "#6e4a94", "color2": "#4e3169", "tint": "#f4eefa",
        "flavor": "„Opowieść głosi, że blask złotego pałacu było widać z "
        "odległości wielu mil. Potęga Domu Babylon opiera się na złocie, które "
        "znajduje się na ich planecie. To wielkie bogactwo pozwoliło im "
        "osiągnąć wysoki rozwój technologiczny i pozwala ich osadom pozyskiwać "
        "surowce z niespotykaną dotąd wydajnością. Ich społeczeństwo jest "
        "silnie matriarchalne, a przewodzi mu Ishtar burzliwa.”",
        "major": {
            "name": "ISHTAR", "sub": "Główny Bóg",
            "basic": "Za każdym razem, gdy pozyskujesz surowce, twoje Osady "
            "liczą się jako mające 2 siły. Możesz wykonać akcję Zbiorów nawet "
            "samą Osadą.",
            "upgraded": "Za każdym razem, gdy pozyskujesz surowce na Terytorium "
            "(z wyjątkiem twojego Terytorium Stolicy) z co najmniej 1 "
            "niezakrytą ikoną surowca, możesz zignorować limit surowców i "
            "zebrać tyle danego surowca, ile masz siły na tym Terytorium. "
            "Musisz jednak nadal umieścić 1 żeton wyczerpania na każdym "
            "Terytorium, z którego pozyskujesz, jak zwykle.",
        },
        "minors": [
            ("Anu", "i", "Natychmiast po przywołaniu Anu możesz teleportować do "
             "3 jednostek zaczynając z tego samego Terytorium. Ta akcja Portalu "
             "NIE może być użyta do teleportacji jednostek na Atlantydę, jak "
             "zwykle."),
            ("Assur", "o", "Zyskujesz 1 dodatkowej siły zarówno w bitwach, jak "
             "i przy pozyskiwaniu."),
            ("Enki", "e", "W punktacji końcowej zyskujesz 4 PZ za każde "
             "kontrolowane Terytorium Atlantydy."),
            ("Enlil", "o", "Za każdym razem, gdy wykonujesz akcję Portalu, "
             "możesz teleportować 1 dodatkową jednostkę. Liczy się to tylko dla "
             "akcji Portalu, nie dla Ruchów, choć akcja Portalu może wynikać z "
             "dowolnego efektu gry."),
            ("Marduk", "o", "Jeśli nie masz Wyznawców w swojej rezerwie, możesz "
             "najpierw usunąć ich z dowolnego Terytorium. (Główny efekt Marduka "
             "pokazany jest ikonami na karcie – to doprecyzowanie z instrukcji.)"),
            ("Ninhursag", "e", "W punktacji końcowej zdobywasz 2 PZ za każde "
             "kontrolowane Terytorium, które produkuje Metal."),
            ("Ninlil", "i", "Natychmiast po przywołaniu Ninlil policz liczbę "
             "Sanktuariów, które kontrolujesz, a które NIE znajdują się na "
             "twojej Planecie Macierzystej. Za każde takie Sanktuarium "
             "zdobywasz 1 PZ i zyskujesz 1 Metal."),
        ],
    },
    {
        "name": "ELLENYS",
        "color": "#a83535", "color2": "#7c2222", "tint": "#faecec",
        "flavor": "„Dom Ellenys pochodzi z surowej, górzystej planety pokrytej "
        "bujnymi, zielonymi lasami, które dają wielką obfitość drewna. To "
        "bogate źródło materiałów budowlanych pomogło Ellenys stać się "
        "odkrywcami i podróżnikami zakładającymi wiele kolonii. Uwielbiają "
        "wymianę kulturową z innymi cywilizacjami, ale gdy trzeba, potrafią "
        "narzucić swoją dominację. Siła ich piechoty jest legendarna, a "
        "przewodzi im Zeus mądry.”",
        "major": {
            "name": "ZEUS", "sub": "Główny Bóg",
            "basic": "Gdy żeton Kultury jest rozpatrywany, możesz wziąć nagrodę "
            "pokazaną na żetonie, pod warunkiem że masz co najmniej jedną "
            "jednostkę na planecie, na której umieszczono ten żeton. Nie musisz "
            "sąsiadować z rozpatrywanym żetonem Kultury.",
            "upgraded": "Wszystkie nagrody uzyskane z żetonów Kultury są "
            "podwojone.",
        },
        "minors": [
            ("Ares", "e", "W punktacji końcowej zdobywasz 2 PZ za każdą pokonaną "
             "płytkę Starożytnej Cywilizacji. Pamiętaj, aby trzymać je przed "
             "sobą podczas gry."),
            ("Athena", "i", "Natychmiast po przywołaniu Ateny zyskujesz 1 "
             "surowiec typu produkowanego na każdym Terytorium, na którym masz "
             "Osadę. Zyskujesz surowiec niezależnie od żetonów wyczerpania "
             "umieszczonych na tych Terytoriach. Tego efektu nie uważa się za "
             "akcję pozyskiwania."),
            ("Demeter", "e", "W punktacji końcowej zdobywasz 2 PZ za każde "
             "kontrolowane Terytorium, które produkuje Żywność."),
            ("Hades", "e", "W punktacji końcowej zdobywasz 2 PZ za każdych 3 "
             "Wyznawców w swojej rezerwie, zaokrąglając w dół."),
            ("Hera", "o", "Gdy zyskasz co najmniej 1 Wyznawcę, zyskujesz też 1 "
             "dodatkowego Wyznawcę."),
            ("Hermes", "o", "Liczy się to tylko dla akcji Ruchu, nie dla "
             "Portali, choć akcja Ruchu może być wynikiem dowolnego efektu gry. "
             "(Główny efekt Hermesa pokazany jest ikonami na karcie – to "
             "doprecyzowanie z instrukcji.)"),
            ("Poseidon", "o", "Ten Bóg liczy się jako zapewniający 1 dodatkowe "
             "Sanktuarium dla wszystkich efektów gry."),
        ],
    },
]

TYPE = {
    "i": ("NATYCHMIASTOWA", "Jednorazowa premia przy przywołaniu", "#c9761f"),
    "o": ("STAŁA", "Działa przez całą grę", "#2d6da8"),
    "e": ("PUNKTACJA KOŃCOWA", "Punkty na koniec gry", "#3f8a4a"),
}

def esc(s): return html.escape(s).replace("\n", "<br>")

def minor_card(name, t, text):
    label, desc, col = TYPE[t]
    return f"""
    <div class="card minor">
      <div class="cardhead">
        <span class="gname">{esc(name)}</span>
        <span class="badge" style="background:{col}">{label}</span>
      </div>
      <div class="typedesc">{esc(desc)}</div>
      <div class="cardbody">{esc(text)}</div>
    </div>"""

def major_card(m, color):
    return f"""
    <div class="card major" style="border-color:{color}">
      <div class="cardhead major" style="background:{color}">
        <span class="gname">{esc(m['name'])}</span>
        <span class="majsub">{esc(m['sub'])}</span>
      </div>
      <div class="powerlabel">MOC PODSTAWOWA</div>
      <div class="cardbody">{esc(m['basic'])}</div>
      <div class="powerlabel up">MOC ULEPSZONA <span class="uphint">(po przywołaniu Głównego Boga)</span></div>
      <div class="cardbody">{esc(m['upgraded'])}</div>
    </div>"""

def house_section(h):
    minors = "".join(minor_card(*mn) for mn in h["minors"])
    return f"""
  <section class="house" style="--hc:{h['color']}; --hc2:{h['color2']}; --tint:{h['tint']}">
    <div class="housebar">
      <h2>DOM {esc(h['name'])}</h2>
    </div>
    <p class="flavor">{esc(h['flavor'])}</p>
    {major_card(h['major'], h['color'])}
    <div class="minorgrid">{minors}</div>
  </section>"""

BODY = "".join(house_section(h) for h in HOUSES)

DOC = f"""<!doctype html><html lang="pl"><head><meta charset="utf-8">
<style>
@page {{ size: A4; margin: 12mm 12mm 14mm 12mm; }}
* {{ box-sizing: border-box; }}
body {{ font-family: "Liberation Serif", Georgia, serif; color:#232323;
       margin:0; font-size:10.5pt; line-height:1.34; }}
.title {{ text-align:center; margin:0 0 4mm; }}
.title h1 {{ font-family:"Liberation Sans",Arial,sans-serif; font-size:23pt;
       letter-spacing:1px; margin:0; color:#1c1c1c; }}
.title .sub {{ font-size:11pt; color:#555; margin-top:2mm; }}
.legend {{ display:flex; gap:14px; justify-content:center; flex-wrap:wrap;
       margin:4mm 0 2mm; font-size:8.5pt; }}
.legend span {{ display:inline-flex; align-items:center; gap:5px; }}
.dot {{ width:11px; height:11px; border-radius:50%; display:inline-block; }}
.house {{ margin-top:5mm; }}
.house:first-of-type {{ margin-top:0; }}
.housebar {{ background:var(--hc); color:#fff; padding:3mm 5mm; border-radius:3px;
       margin-bottom:3mm; break-after:avoid; }}
.flavor, .card.major {{ break-after:avoid; }}
.housebar h2 {{ font-family:"Liberation Sans",Arial,sans-serif; font-size:16pt;
       margin:0; letter-spacing:2px; }}
.flavor {{ font-style:italic; color:#4a4a4a; background:var(--tint);
       border-left:4px solid var(--hc); padding:2.5mm 4mm; margin:0 0 3.5mm;
       font-size:9.5pt; line-height:1.35; }}
.card {{ border:1.5px solid #d8d8d8; border-radius:5px; overflow:hidden;
       break-inside:avoid; background:#fff; margin-bottom:3mm; }}
.card.major {{ border-width:2px; }}
.cardhead {{ display:flex; align-items:center; justify-content:space-between;
       padding:2mm 3.5mm; background:#f0f0f0; border-bottom:1px solid #e2e2e2; }}
.cardhead.major {{ color:#fff; border-bottom:none; }}
.gname {{ font-family:"Liberation Sans",Arial,sans-serif; font-weight:bold;
       font-size:13pt; letter-spacing:.5px; }}
.majsub {{ font-family:"Liberation Sans",Arial,sans-serif; font-size:8.5pt;
       text-transform:uppercase; letter-spacing:1.5px; opacity:.9; }}
.badge {{ color:#fff; font-family:"Liberation Sans",Arial,sans-serif;
       font-size:7pt; font-weight:bold; letter-spacing:.6px; padding:2px 7px;
       border-radius:10px; white-space:nowrap; }}
.typedesc {{ font-size:7.5pt; color:#777; padding:1mm 3.5mm 0;
       font-family:"Liberation Sans",Arial,sans-serif; }}
.cardbody {{ padding:2mm 3.5mm 2.5mm; text-align:justify; hyphens:auto; }}
.powerlabel {{ font-family:"Liberation Sans",Arial,sans-serif; font-size:8pt;
       font-weight:bold; letter-spacing:1px; color:var(--hc2,#555);
       padding:2mm 3.5mm 0; }}
.powerlabel.up {{ border-top:1px dashed #ddd; margin-top:1mm; padding-top:2mm; }}
.uphint {{ font-weight:normal; color:#999; letter-spacing:0; font-size:7.5pt; }}
.minorgrid {{ display:grid; grid-template-columns:1fr 1fr; gap:3mm; }}
</style></head><body>
<div class="title">
  <h1>ANUNNAKI: DAWN OF THE GODS</h1>
  <div class="sub">Ściąga dla graczy — Moce Bogów (wersja polska)</div>
  <div class="legend">
    <span><span class="dot" style="background:#c9761f"></span> NATYCHMIASTOWA — jednorazowo przy przywołaniu</span>
    <span><span class="dot" style="background:#2d6da8"></span> STAŁA — przez całą grę</span>
    <span><span class="dot" style="background:#3f8a4a"></span> PUNKTACJA KOŃCOWA — punkty na koniec gry</span>
  </div>
</div>
{BODY}
</body></html>"""

HTML_PATH = "/home/user/workt/pl_rulebook/pomoc_bogowie.html"
PDF_PATH = "/home/user/workt/pl_rulebook/Anunnaki_sciaga_bogowie_PL.pdf"
with open(HTML_PATH, "w") as f:
    f.write(DOC)
print("wrote", HTML_PATH)
