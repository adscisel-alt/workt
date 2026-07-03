from common import *
from typeset import Page

FILL = (238, 238, 238)
MIST = (210, 213, 203)   # misty landscape under bottom of columns
DARK = (41, 34, 26)
CREAM = (247, 246, 240)

IH = 30  # icon height (ref)
# tight teal-disc boxes (auto-detected) so no adjacent text is captured
ICON_SRC = {
    1: (1488, 195, 1532, 235),   # infinity - permanent
    2: (1344, 224, 1388, 270),   # mana action (spiky disc)
    3: (1390, 254, 1435, 296),   # additional action (check)
    4: (1293, 330, 1336, 373),   # end of game (play)
}

def vgrad(p, box, ctop, cbot):
    """Fill box (ref) with a vertical linear gradient from ctop to cbot."""
    x0, y0, x1, y1 = [p.px(v) for v in box]
    h = max(1, y1 - y0)
    for i in range(h):
        t = i / max(1, h - 1)
        c = tuple(int(round(ctop[k] + (cbot[k] - ctop[k]) * t)) for k in range(3))
        p.d.line([(x0, y0 + i), (x1, y0 + i)], fill=c, width=1)

def build():
    p = Page(16)   # NOTE: no OCR (tesseract unreliable here); use explicit covers

    # capture the 4 bullet type-icons BEFORE any cover erases them
    icon_imgs = {}
    for k, (sx0, sy0, sx1, sy1) in ICON_SRC.items():
        ic = p.img.crop((p.px(sx0), p.px(sy0), p.px(sx1), p.px(sy1)))
        hpx = p.px(IH)
        wpx = max(1, int(ic.width * hpx / ic.height))
        icon_imgs[k] = ic.resize((wpx, hpx))

    # =================== LEFT COLUMN ===================
    # --- god-list continuation (Marduk / Ninhursag / Ninlil) ---
    p.cover((60, 92, 842, 300), FILL)
    p.paragraphs((72, 96, 812, 242), [
        [bi("Marduk:"), rg(" Jeśli nie masz Wyznawców w swojej rezerwie, możesz "
            "najpierw usunąć ich z dowolnego Terytorium.")],
        [bi("Ninhursag:"), rg(" W punktacji końcowej zdobywasz 2 PZ za każde "
            "kontrolowane Terytorium, które produkuje Metal.")],
        [bi("Ninlil:"), rg(" Natychmiast po przywołaniu Ninlil policz liczbę "
            "Sanktuariów, które kontrolujesz, a które NIE znajdują się na twojej "
            "Planecie Macierzystej. Za każde takie Sanktuarium zdobywasz 1 PZ i "
            "zyskujesz 1 Metal.")],
    ], size=19, para_gap=0.35, color=INK)

    # --- GOD POWERS: ELLENYS heading (centered, teal, no dashes) ---
    p.cover((150, 336, 662, 382), FILL)
    p.section_heading(400, 359, "MOCE BOGÓW: ELLENYS", TEAL, 26, dash=False, spacing=1.5)

    # --- flavour italic text (right of the round emblem) ---
    p.cover((246, 382, 842, 576), FILL)
    p.paragraphs((252, 386, 812, 556), [
        [it("„Dom Ellenys pochodzi z surowej, górzystej planety pokrytej bujnymi, "
            "zielonymi lasami, które dają wielką obfitość drewna. To bogate źródło "
            "materiałów budowlanych pomogło Ellenys stać się odkrywcami i "
            "podróżnikami zakładającymi wiele kolonii. Uwielbiają wymianę "
            "kulturową z innymi cywilizacjami, ale gdy trzeba, potrafią narzucić "
            "swoją dominację. Siła ich piechoty jest legendarna, a przewodzi im "
            "Zeus mądry.”")],
    ], size=19, color=INK, justify=False, align="center")

    # --- god descriptions ---
    p.cover((60, 572, 842, 1092), FILL)
    p.paragraphs((72, 578, 812, 1070), [
        [bi("Zeus – Moc Podstawowa:"), rg(" Gdy żeton Kultury jest rozpatrywany, "
            "możesz wziąć nagrodę pokazaną na żetonie, pod warunkiem że masz co "
            "najmniej jedną jednostkę na planecie, na której umieszczono ten "
            "żeton. Nie musisz sąsiadować z rozpatrywanym żetonem Kultury.")],
        [bi("Zeus – Moc Ulepszona:"), rg(" Wszystkie nagrody uzyskane z żetonów "
            "Kultury są podwojone.")],
        [bi("Ares:"), rg(" W punktacji końcowej zdobywasz 2 PZ za każdą pokonaną "
            "płytkę Starożytnej Cywilizacji. Pamiętaj, aby trzymać je przed sobą "
            "podczas gry.")],
        [bi("Athena:"), rg(" Natychmiast po przywołaniu Atheny zyskujesz 1 "
            "surowiec typu produkowanego na każdym Terytorium, na którym masz "
            "Osadę. Zyskujesz surowiec niezależnie od żetonów wyczerpania "
            "umieszczonych na tych Terytoriach. Tego efektu nie uważa się za "
            "akcję pozyskiwania.")],
        [bi("Demeter:"), rg(" W punktacji końcowej zdobywasz 2 PZ za każde "
            "kontrolowane Terytorium, które produkuje Żywność.")],
        [bi("Hades:"), rg(" W punktacji końcowej zdobywasz 2 PZ za każdych 3 "
            "Wyznawców w swojej rezerwie, zaokrąglając w dół.")],
        [bi("Hera:"), rg(" Gdy zyskujesz co najmniej 1 Wyznawcę, zyskujesz też 1 "
            "dodatkowego Wyznawcę.")],
        [bi("Hermes:"), rg(" Liczy się to tylko dla akcji Ruchu, nie dla Portali, "
            "choć akcja Ruchu może być wynikiem dowolnego efektu gry.")],
        [bi("Poseidon:"), rg(" Ten Bóg liczy się jako zapewniający 1 dodatkowe "
            "Sanktuarium dla wszystkich efektów gry.")],
    ], size=19, para_gap=0.32, color=INK)

    # =================== RIGHT COLUMN ===================
    # --- ARTIFACT CARDS heading ---
    p.cover((836, 80, 1170, 126), FILL)
    p.text((845, 86), "KARTY ARTEFAKTÓW", style="sans_b", size=30, color=TEAL, spacing=1)

    # --- intro + 4 bullets (icons re-pasted, scaled, as leading markers) ---
    p.cover((836, 126, 1614, 358), FILL)
    p.paragraphs((848, 130, 1602, 152), [
        [rg("Artefakty występują w 4 rodzajach:")],
    ], size=18, color=INK, justify=False)

    def bullet(top, icon_id, blocks, box_bottom):
        p.img.paste(icon_imgs[icon_id], (p.px(852), p.px(top - 3)))
        p.paragraphs((892, top, 1602, box_bottom), blocks, size=18,
                     color=INK, justify=False, para_gap=0.0)

    bullet(160, 1, [[rg("Artefakty o efekcie stałym, od chwili ich zagrania.")]], 184)
    bullet(192, 2, [[rg("Artefakty, których możesz użyć w swojej turze jako akcję Many.")]], 216)
    bullet(224, 3, [[rg("Artefakty, których możesz użyć w swojej turze jako Akcję "
                        "Dodatkową. Pamiętaj, że w każdej turze możesz wykonać tylko "
                        "1 akcję Many, ale dowolną liczbę "), bd("różnych"),
                     rg(" Akcji Dodatkowych.")]], 292)
    bullet(300, 4, [[rg("Artefakty o efekcie na końcu gry. Rozpatruje się je po tym, "
                        "jak wszyscy gracze zakończą swoje ostatnie tury, ale przed "
                        "punktacją końcową.")]], 340)

    # --- artifact descriptions ---
    # parchment zone (my text lives here) + graded tail (erase original Tablet lines
    # which sit on the parchment->misty gradient down to ~y1150)
    p.cover((836, 352, 1614, 1006), FILL)
    vgrad(p, (836, 1004, 1630, 1156), (231, 232, 226), (200, 206, 192))
    p.paragraphs((842, 356, 1604, 1002), [
        [bd("Cornucopia:"), rg(" W swojej turze, jako Akcję Dodatkową, możesz "
            "usunąć tę kartę z gry, aby albo: wziąć dowolne 4 surowce tego samego "
            "typu, ALBO wydać 4 surowce dowolnego 1 typu, by zyskać 8 PZ.")],
        [bd("Duplicity Mirror:"), rg(" Ten Artefakt ma efekt jednorazowy, "
            "rozgrywany jako akcja Many. Odrzuć kartę, aby w tej turze wykonać 2 "
            "różne akcje Many zamiast 1. W tej turze płacisz też o 1 Kryształ Many "
            "mniej za wykonanie każdej akcji Many.")],
        [bd("Map for the Afterworld:"), rg(" Natychmiast po wybraniu tej karty "
            "umieść płytkę Zaświatów obok swojej Planety Macierzystej. Płytka ta "
            "jest Terytorium, do którego dostęp masz tylko ty. Zawiera Sanktuarium "
            "i produkuje dowolny typ surowca za każdym razem, gdy z niej "
            "pozyskujesz. Jeśli pozyskujesz więcej niż 1 surowiec, możesz wybrać "
            "dowolną kombinację surowców. Płytkę Zaświatów uważa się za "
            "sąsiadującą ze wszystkimi kontrolowanymi przez ciebie Terytoriami, "
            "więc można ją osiągnąć zarówno Ruchem o 1, jak i Portalem.")],
        [bd("Pandora's Box:"), rg(" Natychmiast po wybraniu tej karty weź 3 żetony "
            "Pandory. Raz na fazę Akcji Dodatkowych w swojej turze możesz odrzucić "
            "żeton, aby wywołać jego efekt. Odrzucenie żetonu jest Akcją "
            "Dodatkową, więc możesz odrzucić tylko jeden na turę. Każdy żeton "
            "pokazuje przedmiot; zyskujesz pokazany przedmiot, a wszyscy pozostali "
            "gracze muszą stracić po jednym, jeśli go posiadają. Przedmioty to "
            "Kryształ Many, Wyznawca oraz karta Zaawansowanej broni. Zyskiwanie "
            "lub tracenie tych przedmiotów przeprowadza się normalnie, jak opisano "
            "powyżej. Po odrzuceniu trzeciego żetonu odrzuć Pandora's Box.")],
        [bd("Scarab Amulet:"), rg(" Jeśli nie przekroczyłeś linii błyskawicy na "
            "Torze dominacji, nie możesz użyć tego, aby wejść na pole x5 na Torze "
            "rozwoju.")],
        [bd("Tablet of Destinies:"), rg(" Natychmiast po wybraniu tej karty weź "
            "żeton Przeznaczeń. Potajemnie wybierz 1 z 3 Torów rozwoju i połóż "
            "płytkę Przeznaczeń przed sobą, zakrytą, tak aby narożnik u góry "
            "wskazywał wybrany tor. W punktacji końcowej zdobędziesz dodatkowe "
            "0/1/2/4/7 PZ w zależności od poziomu mnożnika osiągniętego przez "
            "gracza, którego znacznik jest najdalej na tym torze.")],
    ], size=18, para_gap=0.3, color=INK)

    # =================== CREDITS (dark box) ===================
    p.cover((88, 1266, 300, 1308), DARK)   # heading
    p.text((96, 1270), "TWÓRCY", style="sans_b", size=26, color=CREAM, spacing=1)

    # left roles column
    p.cover((90, 1312, 566, 1446), DARK)
    p.paragraphs((96, 1315, 566, 1442), [
        [bd("Projekt gry:"), rg(" Danilo Sabia, Simone Luciani")],
        [bd("Ilustracje:"), rg(" Jara Zambrano, Paolo Vicenzi")],
        [bd("Projekt graficzny:"), rg(" Arianna Santini, Jara Zambrano")],
        [bd("Rzeźbiarz miniatur 3D:"), rg(" Hector Moran")],
    ], size=16, para_gap=0.42, leading=1.35, color=CREAM, justify=False)

    # right roles column
    p.cover((558, 1290, 1090, 1450), DARK)
    p.paragraphs((574, 1296, 1036, 1446), [
        [bd("Menedżer KS:"), rg(" Davide Malvestuto")],
        [bd("Fabuła:"), rg(" Stefania Niccolini")],
        [bd("Konsultant kulturowy:"), rg(" Jason Perez")],
        [bd("Korekta zasad:"), rg(" David Digby, Stefania Niccolini")],
        [bd("Redakcja:"), rg(" Giuliano Acquati")],
    ], size=16, para_gap=0.42, leading=1.35, color=CREAM, justify=False)

    # special thanks (translate framing, keep every name)
    p.cover((90, 1452, 1090, 1600), DARK)
    p.paragraphs((96, 1456, 1082, 1596), [
        [rg("Specjalne podziękowania dla Luca Ercolini, Davide Malvestuto, Thomas "
            "Capra, Mauro Annino, Michele Imberti, Chiara Grassi, Alessandro "
            "Dipace, Francesco Piatti, Mauro Marinetti, Barbara Parutto, Ian "
            "Zhabjaku, Massimo Maggi, Marco Galeotta, Simone Colombo, Alex "
            "Morelli, Alex Donati, Daniele Radavero, Alberto Grillo, Flavio Oivalf "
            "De Leonardis, Fulvio Pisani, Daniele D'Angelosante, Francesco "
            "Bavastro, Lorenzo Gentile, Vincenzo Ragusa, Valerio Colucci, Luke "
            "Rensink, Adrian Smith, Sarah Green, Conor Devine, Simone Fini i Paul "
            "Grogan za cenne rady.")],
    ], size=16, leading=1.32, color=CREAM, justify=False)

    out = "/home/user/workt/pl_rulebook/out-16.png"
    p.save(out)
    print("saved", out)

if __name__ == "__main__":
    build()
