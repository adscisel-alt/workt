from common import *


def build():
    p = new(4)

    # ---------------- TITLE: SETUP -> PRZYGOTOWANIE ----------------
    # white bold over sky; paste a clean contiguous sky patch over SETUP, redraw
    p.clone_rect((108, 110), (332, 110, 540, 178))
    p.text((78, 118), "PRZYGOTOWANIE", style="sans_b", size=52, color=(247, 249, 250))

    # ---------------- LEFT COLUMN: numbered steps -----------------
    # cover boxes start at x130 to preserve the boxed step-number tags (1-4)

    # 1
    p.cover((130, 272, 788, 324))
    p.paragraphs((137, 273, 786, 323), [
        [rg("Umieść "), bd("planszę Gai"), rg(" na środku stołu, stroną "
            "odpowiadającą liczbie graczy do góry (rozpoznasz ją po liczbach na "
            "górze).")],
    ], size=21, color=INK)

    # 2
    p.cover((130, 333, 788, 366))
    p.paragraphs((137, 335, 786, 365), [
        [rg("Umieść "), bd("planszę Rozwoju"), rg(" z jednej strony planszy Gai.")],
    ], size=21, color=INK)

    # 3
    p.cover((130, 371, 788, 425))
    p.paragraphs((137, 372, 786, 424), [
        [rg("Umieść "), bd("Kryształy Many"), rg(" oraz "), bd("żetony "
            "wyczerpania"), rg(" obok planszy, tworząc wspólną pulę.")],
    ], size=21, color=INK)

    # 4
    p.cover((130, 429, 788, 459))
    p.paragraphs((137, 430, 786, 458), [
        [rg("Każdy gracz wykonuje następujące kroki:")],
    ], size=21, color=INK)

    # a
    p.cover((132, 463, 788, 497))
    p.paragraphs((140, 464, 786, 496), [
        [rg("a.  Weź 1 "), bd("planszę Akcji"), rg(" i 1 "), bd("pomoc gracza"),
         rg(", a następnie połóż je przed sobą.")],
    ], size=21, color=INK)

    # b
    p.cover((132, 500, 788, 549))
    p.paragraphs((140, 501, 786, 548), [
        [rg("b.  Umieść swój "), bd("żeton przywołania Głównego Boga"), rg(" w "
            "pięciokątnym polu gwiazdy akcji.")],
    ], size=21, color=INK)

    # c
    p.cover((132, 555, 788, 604))
    p.paragraphs((140, 556, 786, 603), [
        [rg("c.  Umieść swoje "), bd("5 żetonów przywołania Pomniejszych Bogów"),
         rg(" na 5 trójkątnych polach wokół gwiazdy akcji.")],
    ], size=21, color=INK)

    # d
    p.cover((132, 609, 788, 636))
    p.paragraphs((140, 610, 786, 635), [
        [rg("d.  Wybierz Dom Anunnakich i weź wszystkie pasujące komponenty.")],
    ], size=21, color=INK)

    # e
    p.cover((132, 637, 792, 702))
    p.paragraphs((140, 638, 786, 685), [
        [rg("e.  Umieść swoją "), bd("planszę Planety"), rg(", powiązaną z "
            "wybranym Domem (patrz ikona na górze), obok planszy Akcji — jest ona "
            "nazywana twoją Planetą Macierzystą.")],
    ], size=21, color=INK)

    # ---------------- RIGHT COLUMN: f, Tip, g, h, i ----------------
    # uniform grey page background -> one flowed block
    p.cover((968, 1293, 1642, 1628))
    p.paragraphs((1010, 1298, 1605, 1626), [
        [rg("f.  Umieść swoją "), bd("kartę Głównego Boga"), rg(" obok planszy "
            "Akcji i umieść "), bd("figurkę Głównego Boga"), rg(" w wyznaczonym "
            "pięciokątnym polu na planszy Akcji.")],
        [bi("Wskazówka:"), it(" Rozpoczynasz grę ze stałą mocą swojego Głównego "
            "Boga (górny panel). Po przywołaniu Głównego Boga zyskujesz również "
            "ulepszoną moc (dolny panel). Zwróć uwagę na obie te moce — będą one "
            "wpływać na twoje decyzje i strategie.")],
        [rg("g.  Weź losowo "), bd("5"), rg(" swoich "), bd("kart Pomniejszych "
            "Bogów"), rg(", wybierz 1 do odrzucenia i włóż ją z powrotem do "
            "pudełka ("), it("zasada pierwszej gry"), rg(": weź losowo "),
         bd("4 karty Pomniejszych Bogów"), rg("). Umieść wybrane 4 karty w "
            "wyznaczonych polach nad swoją planszą Akcji.")],
        [rg("h.  Umieść "), bd("4 figurki Pomniejszych Bogów"), rg(" na "
            "wyznaczonych polach swojej planszy Akcji.")],
        [rg("i.  Umieść "), bd("1 Osadę"), rg(" i "), bd("2 Wyznawców"), rg(" na "
            "swoim Terytorium Stolicy (dolnym Terytorium na planszy twojej "
            "Planety Macierzystej).")],
    ], size=20, para_gap=0.42, color=INK)

    out = "/home/user/workt/pl_rulebook/out-04.png"
    p.save(out)
    print("saved", out)


if __name__ == "__main__":
    build()
