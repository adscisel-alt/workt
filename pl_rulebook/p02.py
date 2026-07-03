import numpy as np
from typeset import Page

PLAQUE = (53, 48, 37)       # dark caption-plaque fill
PTXT   = (247, 245, 238)    # white plaque text
BG     = (237, 237, 237)    # light page background
NOTE   = (44, 42, 38)       # grey/dark italic sub-note text
WHITE  = (249, 249, 249)
SHAD   = (28, 60, 66)       # title shadow (dark teal)

def bi(t): return (t, "serif_bi")
def it(t): return (t, "serif_i")


def build():
    p = Page(2)

    # -------- TITLE: COMPONENTS -> ELEMENTY GRY --------
    # cover with a smooth vertical-gradient fill sampled per-row from a clean
    # sky column just right of the title (avoids clone_h vertical banding)
    def sky_gradient_fill(box, src_x0, src_x1):
        x0, y0, x1, y1 = [p.px(v) for v in box]
        sx0, sx1 = p.px(src_x0), p.px(src_x1)
        arr = np.asarray(p.img)
        for py in range(y0, y1):
            col = np.median(arr[py, sx0:sx1].reshape(-1, 3), 0).astype(int)
            p.d.line([(x0, py), (x1, py)], fill=tuple(int(v) for v in col))
    sky_gradient_fill((88, 96, 566, 182), 590, 660)
    # subtle shadow then white heading
    p.text((99, 103), "ELEMENTY GRY", style="sans_b", size=64, color=SHAD, spacing=1.0)
    p.text((96, 100), "ELEMENTY GRY", style="sans_b", size=64, color=WHITE, spacing=1.0)

    # -------- COMPONENT CAPTION PLAQUES --------
    plaques = [
        ((1362, 468, 1513, 511), "4 płytki Celów"),
        ((291, 693, 442, 736),   "1 plansza Gai"),
        ((831, 690, 1080, 733),  "1 plansza Rozwoju"),
        ((1353, 685, 1519, 729), "4 żetony 2 PZ"),
        ((1293, 958, 1581, 1002),"36 płytek Paktów handlowych"),
        ((144, 1029, 463, 1072), "12 płytek Starożytnej Cywilizacji"),
        ((547, 1030, 796, 1074), "1 znacznik Pierwszego Gracza"),
        ((955, 1098, 1162, 1141),"1 płytka Zaświatów"),
        ((154, 1255, 442, 1299), "2 żetony Bogów Atlantydy"),
        ((570, 1255, 780, 1299), "20 żetonów Kultury"),
        ((1335, 1272, 1549, 1315),"20 Kryształów Many"),
        ((195, 1476, 405, 1521), "64 żetony wyczerpania"),
        ((577, 1504, 780, 1548), "1 żeton Przeznaczeń"),
        ((963, 1506, 1159, 1549),"6 kart Artefaktów"),
        ((1333, 1501, 1542, 1545),"3 żetony Pandory"),
    ]
    for (x0, y0, x1, y1), txt in plaques:
        p.cover((x0, y0, x1, y1), PLAQUE)
        p.paragraphs((x0 + 7, y0 - 1, x1 - 7, y1 + 1), [[bi(txt)]],
                     size=26, color=PTXT, justify=False, align="center",
                     valign="center", para_gap=0.0)

    # -------- GREY ITALIC SUB-NOTES --------
    # A: under Gaia board (centred cx~366)
    p.cover((236, 746, 492, 814), BG)
    p.paragraphs((196, 748, 536, 820),
                 [[it("(jedna strona dla 1-2 graczy,")],
                  [it("druga dla 3-4 graczy)")]],
                 size=20, color=NOTE, justify=False, align="center",
                 valign="top", para_gap=0.1)

    # B: under Commercial Pact tiles (centred cx~1257); keep clear of
    # the Afterworld plaque which begins at y~1098
    p.cover((900, 1003, 1612, 1096), BG)
    p.paragraphs((905, 1005, 1610, 1095),
                 [[it("12 neutralnych i 6 dla każdego Domu")],
                  [it("(rozpoznawalne po ikonie Domu")],
                  [it("w lewym górnym rogu)")]],
                 size=19, color=NOTE, justify=False, align="center",
                 valign="top", para_gap=0.08)
    # mop up tall ascenders of the original 3rd line that dip below the cover,
    # to the RIGHT of the Afterworld plaque (plaque ends x~1162)
    p.cover((1178, 1088, 1585, 1120), BG)

    # C: under Exhaust tokens (centred cx~304)
    p.cover((150, 1521, 458, 1595), BG)
    p.paragraphs((120, 1523, 490, 1598),
                 [[it("(16 na każdy typ surowca:")],
                  [it("Złoto, Metal, Drewno i Żywność)")]],
                 size=20, color=NOTE, justify=False, align="center",
                 valign="top", para_gap=0.1)

    out = "/home/user/workt/pl_rulebook/out-02.png"
    p.save(out)
    print("saved", out)


if __name__ == "__main__":
    build()
