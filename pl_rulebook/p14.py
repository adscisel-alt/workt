from common import *
from typeset import Page

TEALD = (30, 74, 96)          # dark teal headings
GLOSS = (236, 236, 236)       # middle/right glossary open bg (grey)
LEFTG = (235, 235, 235)       # left lower rows bg
WEFF  = (241, 241, 240)       # weapon-effects bg
SKYW  = (247, 249, 250)       # title white
INTROW = (243, 245, 246)      # intro white

def build():
    p = Page(14)   # do NOT call ocr_lines (tesseract unstable under contention)

    # ============================================================
    # TITLE:  APPENDIX -> DODATEK   (white on misty sky header)
    # ============================================================
    p.cover((110, 104, 420, 172), (61, 103, 101))
    p.text((112, 110), "DODATEK", style="sans_b", size=52, color=SKYW, spacing=1)

    # intro under title
    p.cover((112, 184, 600, 240), (64, 101, 97))
    p.paragraphs((116, 188, 600, 236), [
        [bd("Na kolejnych stronach znajdziesz objaśnienia ikon oraz "
            "wyjaśnienia dotyczące niektórych kart.")],
    ], size=21, color=INTROW, justify=False)

    # ============================================================
    # LEFT: COSTS AND REWARDS panel (white interior)
    # ============================================================
    p.cover((206, 306, 512, 340), PANEL)
    p.section_heading(360, 322, "KOSZTY I NAGRODY", TEALD, 22)

    # icon labels (icons stay; cover text right of icon, redraw Polish)
    def lbl(x, y, txt, w=120, size=21):
        p.cover((x - 3, y - 6, x + w, y + 26), PANEL)
        p.text((x, y), txt, style="serif", size=size, color=INK)

    lbl(214, 372, "1 Złoto")                 # 1 Gold
    lbl(388, 372, "1 Drewno", w=140)         # 1 Wood
    lbl(214, 430, "1 Metal")                 # 1 Metal
    lbl(388, 430, "1 Żywność", w=150)        # 1 Food
    # Any 1 resource of your choice (two lines)
    p.cover((210, 488, 585, 540), PANEL)
    p.text((214, 490), "Dowolny 1 surowiec do wyboru", style="serif", size=20, color=INK)
    p.text((214, 514), "(Drewno/Żywność/Złoto/Metal)", style="serif", size=20, color=INK)
    # 1 Mana Crystal
    p.cover((273, 564, 500, 602), PANEL)
    p.text((278, 572), "1 Kryształ Many", style="serif", size=21, color=INK)

    # "These icons..." paragraph inside white box
    p.cover((138, 632, 582, 742), PANEL)
    p.paragraphs((143, 634, 578, 742), [
        [rg("Te ikony mogą oznaczać zarówno koszty, jak i nagrody. Koszty i "
            "nagrody są zawsze pokazane osobno w różnych rzędach, zgodnie z "
            "konkretnym układem danego komponentu.")],
    ], size=20, color=INK, justify=False)

    # eye "=1" row
    p.cover((270, 792, 606, 874), LEFTG)
    p.paragraphs((276, 792, 604, 874), [
        [rg("Każdy Bóg przeciwnika ma siłę 1, niezależnie od tego, czy jest "
            "Pomniejszym, Głównym, czy Bogiem Atlantydy.")],
    ], size=20, color=INK, justify=False, valign="center")

    # weapon-X row
    p.cover((218, 918, 606, 1022), LEFTG)
    p.paragraphs((224, 918, 604, 1022), [
        [rg("Zastosuj przed każdym innym efektem. Efekt karty broni gracza lub "
            "Starożytnej Cywilizacji jest ignorowany podczas tej bitwy. Siła i "
            "nagrody są nadal liczone.")],
    ], size=20, color=INK, justify=False, valign="center")

    # ============================================================
    # MIDDLE glossary column  (icons stay at left; text -> Polish)
    # ============================================================
    MX0, MX1 = 700, 1116          # reflow box
    def mid(y0, y1, txt, size=22, grad=False):
        if grad:
            p.clone_h((688, y0, 1120, y1), 1078, 1120)
        else:
            p.cover((688, y0, 1120, y1), GLOSS)
        p.paragraphs((MX0, y0, MX1, y1), [[rg(txt)]], size=size,
                     color=INK, justify=False, valign="center")

    mid(320, 384, "Przesuń znacznik na Torze dominacji.", grad=True)
    mid(398, 460, "Przesuń znacznik na Torze Technologii.")
    mid(476, 536, "Przesuń znacznik na Torze Handlu.")
    mid(552, 612, "Przesuń znacznik na Torze Wojny.")
    mid(628, 712, "Zbuduj Osadę zgodnie ze zwykłymi zasadami (tzn. na "
                  "kontrolowanym Terytorium, które nie zawiera Osady).")
    mid(712, 768, "Zyskaj X Punktów Zwycięstwa.")
    mid(784, 848, "Wykonaj akcję Portalu (teleportacja na dowolne Terytorium "
                  "z wyjątkiem Atlantydy).")
    mid(850, 946, "Zbierz wszystkie odkryte nagrody (Wyznawcy i PZ) pokazane w "
                  "obszarze Osad na twojej Planszy akcji. Rośnie to wraz z "
                  "budową kolejnych Osad.")
    mid(964, 1036, "Przesuń się o liczbę pól na Torze dominacji zgodnie z "
                   "płytką Celu umieszczoną po lewej stronie toru.")

    # ============================================================
    # RIGHT glossary column
    # ============================================================
    RX0, RX1 = 1210, 1624
    def rgt(y0, y1, txt, size=22, grad=False):
        if grad:
            p.clone_h((1204, y0, 1628, y1), 1630, 1672)
        else:
            p.cover((1204, y0, 1628, y1), GLOSS)
        p.paragraphs((RX0, y0, RX1, y1), [[rg(txt)]], size=size,
                     color=INK, justify=False, valign="center")

    rgt(332, 392, "Wykonaj akcję na niebieskiej Płytce akcji (ale nie na tej, "
                  "na której stoi twój Pionek akcji).", grad=True)
    rgt(408, 468, "Wykonaj akcję na czerwonej Płytce akcji (ale nie na tej, "
                  "na której stoi twój Pionek akcji).")
    rgt(484, 580, "Przesuń jedną ze swoich Kostek przywołania z dowolnego pola "
                  "na dowolne inne pole. Otrzymujesz Kryształy Many pokazane na "
                  "polu, na które przesuwasz kostkę.")
    rgt(588, 646, "Weź dowolną Zaawansowaną kartę broni znad twojej Planszy "
                  "akcji i dodaj ją do ręki.")
    rgt(668, 746, "Rozwiń Technologię zgodnie ze zwykłymi zasadami (jeśli "
                  "rozwijasz czerwoną płytkę, zapłać dodatkowy koszt 1 Drewna "
                  "i 1 Metalu).")
    rgt(768, 820, "Wykonaj akcję Ruchu.")
    rgt(842, 898, "Weź płytkę Paktu handlowego z wyświetlenia (natychmiast je "
                  "uzupełnij).")
    rgt(920, 998, "Zyskaj Wyznawcę, którego umieszczasz na kontrolowanym "
                  "Terytorium zawierającym jedną z twoich Osad (Osada nie może "
                  "być oblężona).")

    # ============================================================
    # BOTTOM-LEFT: WEAPON CARDS EFFECTS
    # ============================================================
    p.cover((113, 1090, 560, 1128), WEFF)
    p.text((117, 1094), "EFEKTY KART BRONI", style="sans_b", size=28,
           color=TEALD, spacing=1)

    p.cover((114, 1138, 868, 1600), WEFF)
    p.paragraphs((118, 1142, 862, 1598), [
        [bi("Proca:"), rg(" Jeśli przeciwnik nie ma surowców, nic nie "
            "otrzymujesz.")],
        [bi("Hełm Wikinga:"), rg(" Po odsłonięciu wszystkich kart broni "
            "przeciwnik musi odrzucić swoją zagraną kartę broni, zwracając ją "
            "do ręki (Broń podstawowa) lub na wyznaczone miejsce nad Planszą "
            "akcji. Karta, którą przeciwnik musi odrzucić, i tak musi zostać "
            "opłacona. Może on następnie zagrać nową kartę broni zgodnie ze "
            "zwykłymi zasadami. Efekt ten jest ignorowany w bitwie ze "
            "Starożytną Cywilizacją. Jeśli przeciwnik nie może zagrać nowej "
            "karty, natychmiast wygrywasz bitwę.")],
        [bi("Łuk kompozytowy:"), rg(" Po odsłonięciu tej karty broni możesz "
            "dodać drugą kartę broni z ręki. Nadal musisz zagrać Zaawansowaną "
            "kartę broni — nie możesz w ten sposób zagrać podstawowej karty "
            "broni. Płacisz koszt tej drugiej karty jak zwykle. Efekty pokazane "
            "na drugiej karcie są stosowane. Dodaj siłę obu zagranych kart do "
            "swojej siły bitewnej. Jeśli wygrasz, bierzesz nagrody obu "
            "zagranych kart.")],
        [bi("Rydwan bojowy:"), rg(" Po odsłonięciu wszystkich kart broni "
            "możesz zapłacić dowolną ilość Metalu, aby zwiększyć swoją siłę o 1 "
            "za każdy wydany w ten sposób Metal.")],
        [bi("Długa włócznia:"), rg(" Gdy przeciwnik oblicza swoją siłę "
            "bitewną, nie może liczyć wartości swojej najsilniejszej jednostki. "
            "Brak efektu przeciwko płytkom Starożytnej Cywilizacji.")],
    ], size=21, para_gap=0.4, color=INK, justify=False)

    # ============================================================
    # BOTTOM-RIGHT: WEAPON CARD LAYOUT (white box)
    # ============================================================
    p.cover((1092, 1088, 1408, 1122), PANEL)
    p.section_heading(1250, 1105, "UKŁAD KARTY BRONI", TEALD, 22)

    p.cover((908, 1138, 1285, 1172), PANEL)
    p.text((912, 1143), "Każda karta broni ma następujący układ:",
           style="serif", size=21, color=INK)

    # callout labels (bold-italic serif). Left labels right-aligned toward arrow.
    # Card cost
    p.cover((938, 1232, 1058, 1258), PANEL)
    p.paragraphs((938, 1233, 1052, 1256), [[bi("Koszt karty")]],
                 size=20, color=INK, justify=False, align="right")
    # Strength
    p.cover((1440, 1266, 1600, 1294), PANEL)
    p.text((1444, 1270), "Siła", style="serif_bi", size=20, color=INK)
    # Card effect
    p.cover((1443, 1438, 1600, 1466), PANEL)
    p.text((1447, 1442), "Efekt karty", style="serif_bi", size=20, color=INK)
    # Progress on the War track in case of win  (left, 3 lines, centered)
    p.cover((896, 1498, 1080, 1584), PANEL)
    p.paragraphs((898, 1504, 1078, 1582), [
        [bi("Postęp na Torze")], [bi("Wojny w razie")], [bi("wygranej")],
    ], size=18, color=INK, justify=False, align="center", para_gap=0.0)
    # Victory Points in case of win  (right, 2 lines)
    p.cover((1438, 1503, 1612, 1560), PANEL)
    p.paragraphs((1444, 1508, 1610, 1558), [
        [bi("Punkty Zwycięstwa")], [bi("w razie wygranej")],
    ], size=18, color=INK, justify=False, align="left", para_gap=0.0)

    # card interior effect text
    p.cover((1172, 1448, 1338, 1494), (81, 87, 93))
    p.paragraphs((1172, 1450, 1338, 1492), [
        [rg("Ignoruj najsilniejszą")], [rg("jednostkę przeciwnika.")],
    ], size=17, color=(225, 228, 230), justify=False, align="center", para_gap=0.0)

    out = "/home/user/workt/pl_rulebook/out-14.png"
    p.save(out)
    print("saved", out)

if __name__ == "__main__":
    build()
