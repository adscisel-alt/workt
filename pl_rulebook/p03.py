from common import *

TEALD = (30, 74, 96)     # banner text navy-teal
PLAQUE_TXT = (247, 244, 236)  # off-white plaque caption text
NOTE = (60, 54, 47)      # grey italic sub-notes

def build():
    p = Page(3)

    # ---------------- TOP TEAL BANNER ----------------
    # "FOR EACH OF THE 4 HOUSES" -> "DLA KAŻDEGO Z 4 DOMÓW"
    # teal text on light bluish parchment; keep side dashes untouched
    p.cover((672, 112, 1062, 151))          # auto-sample light bg
    banner = "DLA KAŻDEGO Z 4 DOMÓW"
    bsz = 24
    while p.line_width(banner, "sans_b", bsz) > 360 and bsz > 10:
        bsz -= 1
    p.text((866, 131), banner, style="sans_b", size=bsz, color=TEALD, anchor="mm")

    # ---------------- DARK CAPTION PLAQUES ----------------
    def plaque(box, s, maxsize=25, pad=12, col=(51, 45, 37)):
        x0, y0, x1, y1 = box
        p.cover((x0 + 1, y0 + 1, x1 - 1, y1 - 1), col)
        bw = (x1 - x0) - 2 * pad
        bh = (y1 - y0)
        sz = maxsize
        while sz > 8:
            if p.line_width(s, "serif_bi", sz) <= bw and sz <= bh * 0.62:
                break
            sz -= 1
        p.text(((x0 + x1) / 2, (y0 + y1) / 2), s,
               style="serif_bi", size=sz, color=PLAQUE_TXT, anchor="mm")

    plaque((294, 573, 472, 618), "1 plansza Akcji")
    plaque((770, 606, 948, 652), "1 plansza Planety")
    plaque((1098, 297, 1276, 342), "1 Pionek akcji")
    plaque((1329, 297, 1575, 342), "14 Kostek przywołania")
    plaque((1153, 538, 1331, 583), "10 Płytek akcji")
    plaque((1135, 662, 1475, 708), "1 żeton przywołania Głównego Boga")
    plaque((208, 867, 387, 912), "5 Osad")
    plaque((500, 867, 841, 913), "5 żetonów przywołania Pomniejszych Bogów")
    plaque((926, 867, 1142, 913), "5 znaczników gracza")
    plaque((1269, 866, 1504, 912), "4 znaczniki surowców")
    plaque((231, 1201, 448, 1246), "1 karta Głównego Boga")
    plaque((634, 1200, 851, 1246), "7 kart Pomniejszych Bogów")
    plaque((1057, 1202, 1250, 1248), "9 kart broni")
    plaque((1395, 1202, 1540, 1248), "1 pomoc gracza")
    plaque((271, 1543, 424, 1588), "1 Główny Bóg")
    plaque((707, 1543, 875, 1588), "4 Pomniejsi Bogowie")
    plaque((1164, 1542, 1332, 1588), "12 Wyznawców")

    # ---------------- GREY ITALIC SUB-NOTES (on white bg) ----------------
    # "(6 Blue and 4 Red)" (right of Action tiles plaque)
    p.cover((1340, 536, 1600, 584))
    p.paragraphs((1345, 538, 1602, 582), [[it("(6 niebieskich i 4 czerwone)")]],
                 size=20, color=NOTE, justify=False, valign="center")

    # "(Gold, Metal, Wood, Food)" centered under Resource markers plaque
    p.cover((1248, 916, 1562, 958))
    p.paragraphs((1250, 918, 1560, 957), [[it("(Złoto, Metal, Drewno, Żywność)")]],
                 size=20, color=NOTE, justify=False, align="center", valign="center")

    # "(2 Basic and 7 Advanced)" centered under Weapon cards plaque
    p.cover((983, 1252, 1327, 1295))
    p.paragraphs((983, 1254, 1327, 1294), [[it("(2 Podstawowe i 7 Zaawansowanych)")]],
                 size=20, color=NOTE, justify=False, align="center", valign="center")

    # ---------------- "17 Units:" italic label ----------------
    p.cover((153, 1382, 292, 1417))
    p.text((156, 1400), "17 jednostek:", style="serif_bi", size=25,
           color=INK, anchor="lm")

    out = "/home/user/workt/pl_rulebook/out-03.png"
    p.save(out)
    print("saved", out)

if __name__ == "__main__":
    build()
