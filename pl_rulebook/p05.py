from typeset import Page

TEAL = (38, 108, 132)
INK = (33, 29, 25)
BG = (234, 234, 234)

def bd(t): return (t, "serif_b")
def it(t): return (t, "serif_i")
def bi(t): return (t, "serif_bi")
def rg(t): return (t, "serif")

MX = 1088          # marker left
BX0 = 1150         # body left
BX1 = 1652         # body right
CX0 = 1074         # cover left
CX1 = 1656         # cover right
SIZE = 20

def build():
    p = Page(5)

    # one big cover of the whole right text column (all prose, no artwork here);
    # the page-number badge (bottom-right) and item 12's last line handled below.
    p.cover((1078, 100, 1656, 1571), BG)

    def item(marker, is_num, top, bot, paras, cx1=CX1, bx1=BX1, size=SIZE):
        # draw marker
        if is_num:
            # cover the original English number box (sits at x~1035-1076,
            # left of the big cover) without touching the sphere (x<=1030)
            p.cover((1029, top - 13, 1080, top + 34), BG)
            # small boxed number, like the original
            w = 30 if len(marker) > 1 else 22
            x0, y0 = MX - 4, top - 2
            x1, y1 = MX - 4 + w, top + 26
            p.d.rectangle([p.px(x0), p.px(y0), p.px(x1), p.px(y1)],
                          outline=INK, width=max(1, int(1.4 * p.s)))
            p.text((MX, top + 1), marker, style="serif_b", size=size, color=INK)
        else:
            p.text((MX, top + 1), marker + ".", style="serif_i", size=size, color=INK)
        # body
        p.paragraphs((BX0, top, bx1, bot), paras, size=size,
                     para_gap=0.28, color=INK)

    # ---------------- LETTERED STEPS j..s ----------------
    item("j", False, 108, 152, [
        [rg("Umieść "), bd("1 Wyznawcę"), rg(" na Terytorium sąsiadującym ze "
            "Stolicą, na którym widnieje ikona Sanktuarium, na twojej planszy "
            "Planety Macierzystej.")],
    ])

    item("k", False, 164, 208, [
        [rg("Umieść swoich "), bd("9 pozostałych Wyznawców"), rg(" w swoim "
            "zapasie, obok planszy Akcji.")],
    ])

    item("l", False, 216, 278, [
        [rg("Umieść swoje "), bd("4 pozostałe Osady"), rg(" na obszarze Osad "
            "(wydzielonym miejscu w górnej części twojej planszy Akcji), od "
            "prawej do lewej.")],
    ])

    item("m", False, 287, 314, [
        [rg("Umieść swój "), bd("Pionek akcji"), rg(" obok swojej gwiazdy akcji.")],
    ])

    item("n", False, 324, 351, [
        [rg("Weź "), bd("2 Podstawowe karty broni"), rg(" (niebieskie) do ręki.")],
    ])

    item("o", False, 361, 404, [
        [rg("Umieść "), bd("7 Zaawansowanych kart broni"), rg(" (czerwone) nad "
            "swoją planszą Akcji, zakryte.")],
    ])

    item("p", False, 413, 505, [
        [rg("Umieść po 1 ze swoich "), bd("znaczników gracza"), rg(" na początku "
            "każdego z 3 Torów rozwoju (Wojny, Technologii, Handlu), na polu „0” "
            "toru PZ oraz na polu „-8” Toru dominacji.")],
    ])

    item("q", False, 512, 558, [
        [rg("Umieść wszystkie swoje "), bd("Kostki przywołania"), rg(" w "
            "wydzielonym miejscu na twojej planszy Akcji (prawy górny róg).")],
    ])

    item("r", False, 578, 646, [
        [rg("Umieść swoje "), bd("4 znaczniki surowców"), rg(" na polu „1” "
            "odpowiedniego toru surowca (każdy gracz zaczyna z 1 surowcem "
            "każdego typu), ikoną surowca do góry.")],
    ])

    item("s", False, 654, 698, [
        [rg("Weź "), bd("2 Kryształy Many"), rg(" ze wspólnego zapasu i umieść je "
            "w wydzielonym miejscu na twojej planszy Akcji.")],
    ])

    # ---------------- NUMBERED STEPS 5..12 ----------------
    item("5", True, 714, 762, [
        [rg("Wylosuj pierwszego gracza i daj mu "), bd("znacznik Pierwszego "
            "Gracza"), rg(". Nie zmienia się on w trakcie gry.")],
    ])

    item("6", True, 774, 914, [
        [rg("Pierwszy gracz tasuje wszystkie swoje "), bd("Płytki akcji"),
         rg(" i umieszcza je losowo na polach swojej planszy Akcji. Upewnij się, "
            "że wszystkie płytki są odkryte swoją podstawową stroną (z małym "
            "numerem w lewym górnym rogu).")],
        [rg("Wszyscy pozostali gracze kopiują teraz ten sam układ Płytek akcji "
            "na swoich własnych planszach Akcji.")],
    ])

    item("7", True, 927, 1064, [
        [rg("Potasuj zakryte wszystkie "), bd("płytki Starożytnej Cywilizacji"),
         rg(". Rozdaj po jednej zakrytej płytce na wszystkie pola pokazujące "
            "odpowiednią ikonę, tzn. jedną na górne centralne Terytorium każdej "
            "planszy Planety Macierzystej i po jednej na każde z centralnych "
            "Terytoriów Gai. Umieść po jednym "), bd("żetonie Bogów Atlantydy"),
         rg(" na każdej płytce Starożytnej Cywilizacji na centralnych "
            "Terytoriach Gai. Nieużyte płytki i żetony odłóż do pudełka.")],
    ])

    item("8", True, 1074, 1154, [
        [rg("Potasuj zakryte wszystkie "), bd("żetony Kultury"), rg(". Umieść po "
            "jednym zakrytym żetonie na każdym oznaczonym skrzyżowaniu między "
            "Terytoriami (heksami). Odwróć awersem do góry każdy żeton "
            "sąsiadujący z jednostką. Nieużyte żetony odłóż do pudełka.")],
    ])

    item("9", True, 1180, 1262, [
        [rg("Potasuj wszystkie "), bd("karty Artefaktów"), rg(". Wybierz losowo 3 "
            "i umieść je obok planszy Gai jako zakrytą talię. Nieużyte karty "
            "odłóż do pudełka. Umieść "), bd("3 żetony Pandory"), rg(", "),
         bd("żeton Przeznaczeń"), rg(" oraz "), bd("płytkę Zaświatów"),
         rg(" obok talii Artefaktów.")],
    ])

    item("10", True, 1274, 1456, [
        [rg("Utwórz stos "), bd("Paktów handlowych"), rg(": potasuj razem 12 "
            "neutralnych płytek oraz 6 płytek pokazujących ikonę Domu każdego z "
            "Domów biorących udział w grze. Usuń wszystkie płytki z ikoną Domu "
            "Domów, które nie biorą udziału w grze ("), it("zasada pierwszej gry"),
         it(": użyj wszystkich Paktów handlowych, niezależnie od ikon Domów"),
         rg("). Stos będzie liczył 24/30/36 płytek w grze 2/3/4-osobowej. Umieść "
            "stos zakryty obok planszy rozwoju. Odkryj 6 wierzchnich płytek "
            "Paktów handlowych i umieść je na przeznaczonych dla nich polach "
            "planszy rozwoju.")],
    ])

    item("11", True, 1472, 1518, [
        [rg("Umieść "), bd("4 żetony 2 PZ"), rg(" na każdym z oznaczonych pól "
            "Toru dominacji.")],
    ])

    # item 12 — protect the page-number badge (x~1600+, y~1578+)
    p.cover((1029, 1512, CX1, 1573), BG)
    p.cover((CX0, 1573, 1560, 1605), BG)
    w = 30
    p.d.rectangle([p.px(MX - 4), p.px(1524), p.px(MX - 4 + w), p.px(1552)],
                  outline=INK, width=max(1, int(1.4 * p.s)))
    p.text((MX, 1527), "12", style="serif_b", size=SIZE, color=INK)
    p.paragraphs((BX0, 1526, BX1, 1602), [
        [rg("Potasuj zakryte "), bd("4 płytki Celów"), rg(" i umieść losowo 3 "
            "płytki odkryte na polach po prawej stronie Torów rozwoju oraz 1 "
            "płytkę odkrytą po lewej stronie Toru dominacji.")],
    ], size=SIZE, para_gap=0.28, color=INK)

    out = "/home/user/workt/pl_rulebook/out-05.png"
    p.save(out)
    print("saved", out)

if __name__ == "__main__":
    build()
