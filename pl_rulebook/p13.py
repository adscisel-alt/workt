import json
from common import *

BG13 = (239, 239, 239)   # left open column background
SAGE = (213, 221, 214)   # right example panel background
TEALB = (30, 74, 96)     # banner / heading navy-teal

def build():
    p = Page(13)
    # inject cached OCR lines (tesseract OOMs on the full-res image at render time)
    p._lines = [{"box": tuple(l["box"]), "text": l["text"]}
                for l in json.load(open("/home/user/workt/pl_rulebook/ocr13.json"))]

    # ---------------- BANNER: END OF THE GAME -> KONIEC GRY ----------------
    p.clone_h((116, 118, 505, 172), 45, 74)
    p.text((126, 130), "KONIEC GRY", style="sans_b", size=27, color=TEALB)

    # ---------------- LEFT COLUMN BODY ----------------
    p.erase((108, 190, 866, 884), BG13)
    p.paragraphs((118, 196, 858, 882), [
        [rg("Koniec gry zostaje wywołany, gdy:")],
        [rg("• Dowolny gracz umieści swoją ostatnią kostkę na gwieździe akcji "
            "na swojej Planszy akcji, lub")],
        [rg("• Osiągnie ostatnie pole na jednym z 3 Torów rozwoju.")],
        [rg("Gra toczy się dalej, aż każdy gracz rozegra tę samą liczbę tur, "
            "tzn. gra kończy się na końcu tury gracza po prawej stronie gracza "
            "ze znacznikiem Pierwszego Gracza.")],
        [bi("Ważne:"), it(" Od momentu wywołania końca gry żaden gracz nie może "
            "przemieszczać swoich jednostek na Terytoria Atlantydy ani z nich.")],
        [rg("Gdy ostatni gracz zakończy swoją turę, przejdź do końcowego "
            "punktowania. Każdy gracz zdobywa Punkty Zwycięstwa w następujący "
            "sposób:")],
        [rg("1. Oceń pozycję znaczników każdego gracza na każdym z 3 Torów "
            "rozwoju: Wojny, Handlu i Technologii:")],
        [rg("a. Gracz, który jest "), bd("najdalej na każdym torze"),
         rg(", zdobywa 4 PZ, a drugi w kolejności gracz zdobywa 2 PZ. W "
            "przypadku remisu o pierwsze miejsce remisujący gracze dzielą "
            "wszystkie dostępne PZ (4 + 2) zaokrąglone w dół; pozostali gracze "
            "nie otrzymują nic. W przypadku remisu o drugie miejsce remisujący "
            "gracze dzielą 2 PZ, zaokrąglone w dół.")],
        [rg("b. Z każdym Torem rozwoju powiązana jest "), bd("płytka Celu"),
         rg(". Zdobywasz PZ na podstawie kryterium Celu (wartość płytki Celu) "
            "pomnożonego przez końcową pozycję twojego znacznika na torze "
            "(mnożnik). W ten sposób wszyscy gracze zdobywają punkty ze "
            "wszystkich 3 Torów rozwoju.")],
        [rg("2. PZ pokazane pod końcową pozycją twojego "),
         bd("znacznika na Torze dominacji"), rg(".")],
        [rg("3. Wszelkie kryteria punktowania końca gry na "),
         bd("kartach Bogów"), rg(", które przywołałeś.")],
        [rg("4. Zsumuj wszystkie swoje "), bd("Surowce i Kryształy Many"),
         rg(": zdobywasz 1 PZ za każde 5, które posiadasz.")],
        [rg("Wygrywa gracz z największą liczbą punktów! W przypadku remisu "
            "wygrywa gracz siedzący najbliżej po lewej stronie pierwszego "
            "gracza.")],
    ], size=20, para_gap=0.18, color=INK)

    # ---------------- GOAL TILES PANEL ----------------
    p.cover((398, 902, 592, 940), PANEL)
    p.section_heading(494, 919, "PŁYTKI CELÓW", TEAL, 20, dash=False)

    # intro
    p.erase((140, 946, 752, 984), PANEL)
    p.paragraphs((148, 950, 862, 998), [
        [rg("Wszystkie 4 płytki Celów mają maksymalną wartość 5 i punktuje się "
            "je następująco:")],
    ], size=18, color=INK, justify=False)

    # tile labels (icons stay; text only, to the right of icons)
    def tile(zone, box, title, desc):
        p.erase(zone, PANEL)
        p.paragraphs(box, [[bi(title)], [rg(desc)]],
                     size=18, para_gap=0.12, color=INK, justify=False)

    tile((285, 995, 480, 1100), (292, 1000, 480, 1100),
         "Płytka Celu „Sanktuaria”", "Liczba kontrolowanych Sanktuariów")
    tile((652, 995, 872, 1100), (660, 1000, 872, 1100),
         "Płytka Celu „Osady”", "Liczba Osad w grze")
    tile((285, 1158, 485, 1292), (292, 1162, 482, 1292),
         "Płytka Celu „Terytoria”",
         "Liczba kontrolowanych Terytoriów, podzielona przez 2 (w dół)")
    tile((652, 1158, 872, 1292), (660, 1162, 872, 1292),
         "Płytka Celu „Jednostki”",
         "Liczba jednostek (Wyznawców i Bogów) w grze, podzielona przez 3 (w dół)")

    # ---------------- RIGHT EXAMPLE ----------------
    p.cover((880, 1184, 1612, 1366), SAGE)
    p.paragraphs((892, 1188, 1608, 1362), [
        [bi("Przykład:"), it(" Simone (żółty gracz) jest najdalej na torach "
            "Handlu i Technologii i dzięki temu zdobywa 4+4 PZ; jest drugi na "
            "torze Wojny i zdobywa 2 PZ.")],
        [it("Kontroluje 3 Sanktuaria i dzięki temu zdobywa 3x2 PZ za płytkę "
            "Celu „Sanktuaria” na torze Wojny; ma 3 Osady w grze i dzięki temu "
            "zdobywa 3x5 PZ za płytkę Celu „Osady” na torze Technologii; ma 8 "
            "jednostek i dzięki temu zdobywa 2x4 PZ za płytkę Celu „Jednostki” "
            "na torze Handlu.")],
        [it("Zdobywa 3 PZ za Tor dominacji. Kontroluje 2 Terytoria wytwarzające "
            "Drewno i dzięki temu zdobywa 2x2 PZ za Horusa. Ma 4 Surowce i 3 "
            "Kryształy Many i dzięki temu zdobywa 1 PZ.")],
    ], size=19, para_gap=0.2, color=CAPINK, justify=False)

    out = "/home/user/workt/pl_rulebook/out-13.png"
    p.save(out)
    print("saved", out)

if __name__ == "__main__":
    build()
