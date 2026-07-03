from common import *

FILL = (239, 239, 239)  # local parchment page area (matches sampled bg 238-240)

def build():
    p = new(15)

    # =====================================================================
    # PHARAOS  (left column, top)
    # =====================================================================
    p.cover((248, 110, 640, 148), FILL)
    p.section_heading(443, 128, "MOCE BOGÓW: PHARAOS", TEAL, 25,
                      dash=False, spacing=1.0)

    # flavour (italic, right of round emblem; emblem right edge ~314)
    p.cover((320, 176, 858, 336), FILL)
    p.paragraphs((322, 182, 854, 334), [
        [it("„Kwitnące pola ich rodzimej planety ciągną się aż po horyzont "
            "i są nawadniane przez wielką świętą rzekę. Dzięki tym polom i "
            "zaawansowanym technikom rolniczym Dom Pharaos zawsze cieszył się "
            "obfitością żywności, która pozwoliła mu szybko powiększać "
            "populację. Dom Pharaos strzeże tajemnego rytuału, który pozwala "
            "im wzmacniać moc świętej gwiazdy. Przewodzi im Ra lśniący.”")],
    ], size=18, color=INK, justify=False, align="center")

    # gods list (Pharaos)
    p.cover((112, 366, 858, 1196), FILL)
    p.paragraphs((114, 372, 852, 1194), [
        [bd("Ra Moc Podstawowa:"), rg(" Gdy przesuwasz Pionek akcji nad polem "
            "zawierającym Kostkę przywołania, możesz przesunąć tę kostkę na "
            "dowolne puste pole. Jeśli pole, na które przesuwasz kostkę, "
            "zawiera Kryształy Many, zyskujesz pokazane Kryształy Many jak "
            "zwykle. Jeśli umieszczenie kostki przywołuje Boga, możesz "
            "przywołać tego Boga w fazie „3. Akcje Dodatkowe” swojej tury "
            "jak zwykle.")],
        [bd("Ra Moc Ulepszona:"), rg(" Za każdym razem, gdy umieszczasz Kostkę "
            "przywołania i zyskujesz dowolną liczbę Kryształów Many, zyskujesz "
            "też 1 surowiec wedle wyboru. Otrzymujesz tylko 1 surowiec, jeśli "
            "umieszczasz kostkę na polu, które produkuje 2 Kryształy Many.")],
        [bd("Anubis:"), rg(" Za każdym razem, gdy Pomniejszy lub Główny Bóg "
            "wchodzi na Terytorium, co prowadzi do bitwy, dodaj 1 Wyznawcę na "
            "to Terytorium przed rozstrzygnięciem bitwy. Ta moc działa na "
            "Terytorium, a nie na Boga, więc dodajesz tylko 1 Wyznawcę "
            "niezależnie od tego, ilu Bogów jest na Terytorium, ale możesz "
            "dodać Wyznawców na wielu Terytoriach w tej samej turze. Jeśli nie "
            "masz Wyznawców w zapasie, możesz najpierw usunąć jednego z "
            "dowolnego Terytorium, a następnie dodać go na Terytorium, gdzie "
            "toczy się bitwa.")],
        [bd("Bastet:"), rg(" Natychmiast po przywołaniu Bastet możesz odrzucić "
            "jeden Kryształ Many, aby wypełnić dowolną płytkę Paktu handlowego "
            "leżącą przed tobą bez płacenia innych kosztów pokazanych na "
            "płytce. Wymóg kontrolowania Terytorium na konkretnej planecie "
            "również jest ignorowany. Otrzymujesz nagrody jak zwykle. Nie "
            "liczy się to do twoich Akcji Dodatkowych w tej turze.")],
        [bd("Horus:"), rg(" W punktacji końcowej zyskujesz 2 PZ za każde "
            "kontrolowane Terytorium, które produkuje Drewno.")],
        [bd("Isis:"), rg(" Każda twoja Osada jest traktowana jako mająca siłę 1 "
            "zarówno w bitwie, jak i przy pozyskiwaniu. Osada nie jest "
            "jednostką, więc sama nie może wywołać bitwy z jednostkami innego "
            "Domu. Doda 1 siły do dowolnej bitwy lub pozyskiwania, o ile "
            "obecne są też twoje jednostki.")],
        [bd("Osiris:"), rg(" Na potrzeby pozyskiwania jesteś traktowany jako "
            "mający +1 siły na każdym kontrolowanym Terytorium.")],
        [bd("Sekhmet:"), rg(" Nie można zredukować kosztu poniżej 0.")],
        [bd("Seth:"), rg(" W punktacji końcowej zyskujesz 3 PZ za każde 2 "
            "kontrolowane Terytoria (zaokrąglając w dół), które mają wszystkie "
            "pola surowców zakryte żetonami wyczerpania. Terytoria na "
            "Atlantydzie się do tego nie liczą.")],
    ], size=19, para_gap=0.28, color=INK)

    # =====================================================================
    # NORRENIS  (left column, lower)
    # =====================================================================
    p.cover((248, 1214, 648, 1252), FILL)
    p.section_heading(447, 1232, "MOCE BOGÓW: NORRENIS", TEAL, 25,
                      dash=False, spacing=1.0)

    # flavour (italic, right of round emblem; emblem right edge ~314)
    p.cover((322, 1260, 858, 1478), FILL)
    p.paragraphs((324, 1266, 854, 1476), [
        [it("„Góry, które górują nad morzami ich Planety, mają zapierające "
            "dech piękno. Kryją one bogate żyły metalu, co w połączeniu z "
            "brakiem równin skłoniło Dom Norrenis do rozwinięcia tradycji "
            "wojowników. Norrenis to koczownicze społeczeństwo, które "
            "nieustannie przemieszcza się na Drakkarach – ogromnych, szybkich "
            "okrętach ze smokiem na dziobie. Atakują, plądrują i płyną dalej "
            "w inne miejsce. Przewodzi im Odin potężny.”")],
    ], size=18, color=INK, justify=False, align="center")

    # Odin Basic Power intro + first bullet (left column bottom)
    p.cover((112, 1496, 858, 1626), FILL)
    p.paragraphs((114, 1500, 852, 1624), [
        [bd("Odin Moc Podstawowa:"), rg(" Twoje Osady są traktowane jako "
            "jednostki na potrzeby ruchu, portalu i efektów bitwy (początkowo "
            "z siłą 0). Gdy się poruszają lub korzystają z portalu, mogą "
            "przenieść 2 jednostki (ale nie inne Osady) z jednego Terytorium "
            "na drugie.")],
        [rg("• Możesz przemieszczać swoje Osady poza Stolicę. Jeśli twoja "
            "Stolica kiedykolwiek będzie pusta, tracisz kontrolę nad tym "
            "Terytorium, ale jednostki wroga nadal nie mogą na nie wejść.")],
    ], size=19, para_gap=0.22, color=INK)

    # =====================================================================
    # NORRENIS bullets continued (right column, top)
    # =====================================================================
    p.cover((898, 108, 1620, 400), FILL)
    p.paragraphs((900, 112, 1615, 398), [
        [rg("• Możesz przemieszczać swoje Osady na Terytoria zawierające jedną "
            "lub więcej innych Osad, należących do dowolnego gracza.")],
        [rg("• Nie możesz budować Osad na Terytorium zawierającym inne Osady, "
            "jak zwykle.")],
        [rg("• Twoje Osady są traktowane jako jednostki, więc jeśli "
            "przesuniesz Osadę na Terytorium zawierające tylko Osadę innego "
            "gracza, przejmiesz kontrolę nad tym Terytorium, a jego Osada "
            "zostanie oblężona.")],
        [rg("• Jeśli przegrasz bitwę na Terytorium, gdzie obecne są twoje "
            "Osady, muszą one zostać przeniesione do twojej Stolicy wraz z "
            "pozostałymi jednostkami.")],
        [rg("• Twoje Osady nie mogą być oblężone; jeśli jednostki wroga są "
            "obecne na tym samym Terytorium co twoja Osada, bitwa jest "
            "rozstrzygana jak zwykle.")],
    ], size=19, para_gap=0.24, color=INK)

    # Odin Upgraded Power + Norrenis gods (right column, upper-middle)
    p.cover((876, 402, 1620, 986), FILL)
    p.paragraphs((876, 406, 1615, 984), [
        [bd("Odin Moc Ulepszona:"), rg(" Każda twoja Osada liczy się jako "
            "mająca 2 siły zarówno w bitwach, jak i przy pozyskiwaniu.")],
        [bd("Aegir:"), rg(" W punktacji końcowej zyskujesz 2 PZ za każde "
            "kontrolowane Terytorium, które produkuje Złoto.")],
        [bd("Freya:"), rg(" Natychmiast po przywołaniu Freya możesz usunąć 1 ze "
            "swoich Wyznawców z dowolnego Terytorium i zwrócić go do zapasu. "
            "Jeśli to zrobisz, możesz zyskać dowolne 4 surowce wedle wyboru.")],
        [bd("Freyr:"), rg(" Natychmiast po przywołaniu Freyr policz Terytoria, "
            "które kontrolujesz poza swoją Planetą Macierzystą. Za każdą parę "
            "takich Terytoriów zyskujesz 1 PZ i 1 Kryształ Many.")],
        [bd("Frigg:"), rg(" Możesz umieścić Wyznawcę na każdym Terytorium, gdzie "
            "masz łącznie co najmniej 3 jednostki i/lub Osady. Jeśli nie masz "
            "Wyznawców w zapasie, możesz najpierw usunąć jednego z dowolnego "
            "Terytorium.")],
        [bd("Heimdallr:"), rg(" Ta moc łączy się z ulepszoną mocą Odina, tj. gdy "
            "jesteś obrońcą, twoje Osady mają siłę 5 (2 od Odina i 3 od "
            "Heimdallra).")],
        [bd("Loki:"), rg(" Za każdym razem, gdy zagrywasz karty broni w bitwie, "
            "możesz zagrać 2 karty broni. Po odkryciu wszystkich kart broni "
            "lub płytek Starożytnej Cywilizacji musisz wybrać 1 z 2 kart broni "
            "do użycia. Karta, której nie wybrałeś, wraca do twojej ręki. "
            "Rozpatrz wybraną kartę jak zwykle.")],
        [bd("Thor:"), rg(" Może to obejmować wszystkie jednostki i twoje Osady, "
            "jeśli masz ulepszoną moc Odina.")],
    ], size=19, para_gap=0.24, color=INK)

    # =====================================================================
    # BABYLON  (right column, middle/bottom)
    # =====================================================================
    p.cover((1052, 996, 1440, 1032), FILL)
    p.section_heading(1246, 1013, "MOCE BOGÓW: BABYLON", TEAL, 25,
                      dash=False, spacing=1.0)

    # flavour (italic, right of round emblem; emblem right edge ~1080)
    p.cover((1088, 1046, 1620, 1216), FILL)
    p.paragraphs((1090, 1050, 1615, 1214), [
        [it("„Opowieść głosi, że blask złotego pałacu było widać z odległości "
            "wielu mil. Potęga Domu Babylon opiera się na złocie, które "
            "znajduje się na ich planecie. To wielkie bogactwo pozwoliło im "
            "osiągnąć wysoki rozwój technologiczny i pozwala ich osadom "
            "pozyskiwać surowce z niespotykaną dotąd wydajnością. Ich "
            "społeczeństwo jest silnie matriarchalne, a przewodzi mu Ishtar "
            "burzliwa.”")],
    ], size=18, color=INK, justify=False, align="center")

    # gods list (Babylon)
    p.cover((876, 1242, 1620, 1622), FILL)
    p.paragraphs((876, 1246, 1615, 1620), [
        [bd("Ishtar Moc Podstawowa:"), rg(" Za każdym razem, gdy pozyskujesz "
            "surowce, twoje Osady liczą się jako mające 2 siły. Możesz wykonać "
            "akcję Zbiorów nawet samą Osadą.")],
        [bd("Ishtar Moc Ulepszona:"), rg(" Za każdym razem, gdy pozyskujesz "
            "surowce na Terytorium "), bd("(z wyjątkiem twojego Terytorium "
            "Stolicy)"), rg(" z co najmniej 1 niezakrytą ikoną surowca, możesz "
            "zignorować limit surowców i zebrać tyle danego surowca, ile masz "
            "siły na tym Terytorium. Musisz jednak nadal umieścić 1 żeton "
            "wyczerpania na każdym Terytorium, z którego pozyskujesz, jak "
            "zwykle.")],
        [bd("Anu:"), rg(" Natychmiast po przywołaniu Anu możesz teleportować do "
            "3 jednostek zaczynając z tego samego Terytorium. Ta akcja Portalu "
            "NIE może być użyta do teleportacji jednostek na Atlantydę, jak "
            "zwykle.")],
        [bd("Assur:"), rg(" Zyskujesz 1 dodatkowej siły zarówno w bitwach, jak "
            "i przy pozyskiwaniu.")],
        [bd("Enki:"), rg(" W punktacji końcowej zyskujesz 4 PZ za każde "
            "kontrolowane Terytorium Atlantydy.")],
        [bd("Enlil:"), rg(" Za każdym razem, gdy wykonujesz akcję Portalu, "
            "możesz teleportować 1 dodatkową jednostkę. Liczy się to tylko dla "
            "akcji Portalu, nie dla Ruchów, choć akcja Portalu może wynikać z "
            "dowolnego efektu gry.")],
    ], size=19, para_gap=0.26, color=INK)

    out = "/home/user/workt/pl_rulebook/out-15.png"
    p.save(out)
    print("saved", out)

if __name__ == "__main__":
    build()
