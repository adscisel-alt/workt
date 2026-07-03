from common import *

def build():
    p = new(8)

    # ============ LEFT: CONTROL ============
    p.erase((64, 110, 830, 300), PANEL)
    p.section_heading(445, 125, "KONTROLA", TEAL, 23)
    p.paragraphs((72, 152, 824, 298), [
        [rg("Terytorium jest "), bd("kontrolowane"), rg(" przez gracza, jeśli "
            "ma on co najmniej 1 jednostkę na tym Terytorium. Terytorium "
            "zawierające jednostki więcej niż jednego gracza (lub jednostki "
            "gracza i płytkę Starożytnej Cywilizacji) jest "), bd("sporne"),
         rg(" – nie jest uważane za kontrolowane przez żadnego gracza, a bitwa "
            "zostanie rozstrzygnięta w turze aktywnego gracza. Terytorium może "
            "być też kontrolowane przez samotną Osadę. Jeśli obecne są tam "
            "jednostki innego gracza wraz z Osadą, jest ona "), bd("oblężona"),
         rg(", a kontrolę ma gracz, którego jednostki są obecne.")],
    ], size=20, color=INK)

    # example Danilo (green)
    p.cover((108, 644, 842, 750), GREEN)
    p.paragraphs((118, 648, 834, 746), [
        [bi("Przykład:"), it(" Danilo (niebieski) wykonuje rozwiniętą Czerwoną "
            "akcję Ruchu i ma 5 ruchów: decyduje się przesunąć jednego Wyznawcę "
            "o 2 pola na swojej Planecie Macierzystej, by zdobyć żeton Kultury, "
            "oraz przemieszcza Głównego Boga, Pomniejszego Boga i jednego "
            "Wyznawcę do Atlantydy, każde za 1 ruch. Bitwa zostanie "
            "rozstrzygnięta w fazie 4 jego tury.")],
    ], size=19, color=CAPINK, justify=False)

    # 4 - COMMERCE ACTION
    p.erase((244, 768, 724, 958), BG)
    p.cover((246, 770, 720, 800), BG)
    p.text((248, 772), "4 – AKCJA HANDLU", style="sans_b", size=22, color=TEAL)
    p.paragraphs((248, 806, 716, 954), [
        [rg("Weź 1 ("), it("2"), rg(") płytkę Paktu handlowego spośród 6 "
            "odkrytych płytek na Planszy rozwoju i połóż ją obok swojej Planszy "
            "akcji. Za każdym razem, gdy bierzesz płytkę Paktu handlowego, "
            "natychmiast odkryj nową płytkę, aby uzupełnić wyświetlane. Możesz "
            "wypełnić Pakt handlowy jako Akcję Dodatkową (zobacz „Akcje "
            "Dodatkowe” na stronie 10).")],
    ], size=20, color=INK)

    # example Serena (green)
    p.cover((108, 1292, 852, 1362), GREEN)
    p.paragraphs((118, 1296, 844, 1358), [
        [bi("Przykład:"), it(" Serena (fioletowy) wykonuje podstawową akcję "
            "Paktu handlowego; wybiera płytkę w lewym dolnym rogu, ponieważ ma "
            "surowce, by wypełnić ją w fazie 3 swojej tury.")],
    ], size=19, color=CAPINK, justify=False)

    # 5 - BLUE HARVEST ACTION
    p.erase((244, 1366, 724, 1462), BG)
    p.text((248, 1372), "5 – NIEBIESKA AKCJA ZBIORÓW", style="sans_b", size=21, color=TEAL)
    p.paragraphs((248, 1406, 704, 1458), [
        [rg("Wybierz 1 ("), it("2"), rg(") Terytoria, które kontrolujesz, i "
            "pozyskaj odpowiednie surowce.")],
    ], size=20, color=INK)

    # 6 - RED HARVEST ACTION
    p.erase((244, 1500, 724, 1594), BG)
    p.text((248, 1506), "6 – CZERWONA AKCJA ZBIORÓW", style="sans_b", size=21, color=TEAL)
    p.paragraphs((248, 1540, 694, 1592), [
        [rg("Tak jak płytka Niebieskich Zbiorów, ale możesz wybrać 2 ("), it("3"),
         rg(") Terytoria, które kontrolujesz.")],
    ], size=20, color=INK)

    # ============ RIGHT: HARVESTING ============
    p.erase((906, 110, 1598, 774), PANEL)
    p.section_heading(1250, 124, "POZYSKIWANIE", TEAL, 23)
    p.paragraphs((910, 156, 1592, 452), [
        [rg("Każde Terytorium ma 1-3 ikony przedstawiające jeden z 4 surowców. "
            "Liczba surowców, które możesz pozyskać, jest ograniczona zarówno "
            "przez obecne jednostki, jak i niewyczerpane pola surowców na "
            "wybranych Terytoriach. Możesz pozyskać do wartości siły obecnych "
            "jednostek LUB do liczby niewyczerpanych pól surowców – zależnie od "
            "tego, co jest mniejsze. Przesuń znaczniki surowców na odpowiednim "
            "torze zgodnie z pozyskanymi surowcami.")],
        [rg("Niezależnie od liczby pozyskanych surowców, musisz umieścić "
            "dokładnie 1 pasujący żeton wyczerpania na jednym z pól surowców w "
            "każdym Terytorium, z którego pozyskiwałeś. Są żetony wyczerpania "
            "dla wszystkich czterech typów surowców; musisz używać żetonów "
            "pasującego typu, abyś nadal widział, jaki surowiec wytwarza "
            "Terytorium (dla niektórych warunków gry). Raz umieszczone żetony "
            "wyczerpania nigdy nie są usuwane.")],
    ], size=20, para_gap=0.3, color=INK)

    p.text((910, 462), "Specjalne Terytoria do pozyskiwania", style="serif_bi", size=22, color=INK)
    p.paragraphs((910, 494, 1592, 772), [
        [rg("• Twoje Terytorium Stolicy nigdy nie jest wyczerpane.")],
        [rg("• Nie możesz pozyskiwać na Terytorium bez niewyczerpanych ikon "
            "surowców (np. Atlantyda, która nie ma ikon surowców, lub "
            "całkowicie wyczerpane Terytorium).")],
        [rg("• W grze 2-osobowej niektóre Terytoria Gai mają 2 różne typy "
            "surowców. Jeśli pozyskujesz z takiego Terytorium z siłą 2 i nie "
            "umieszczono żetonu wyczerpania, zyskujesz po 1 z każdego "
            "pokazanego surowca. Możesz umieścić żeton wyczerpania na dowolnym "
            "z pól surowca. Jeśli masz tylko siłę 1 i nie umieszczono żetonu, "
            "wybierasz, który typ surowca zyskać, i kładziesz żeton na "
            "pasującym polu. Jeśli żeton wyczerpania już jest, możesz zyskać "
            "tylko surowiec NIE zakryty żetonem. Umieść kolejny żeton "
            "wyczerpania na pozostałym polu.")],
    ], size=20, para_gap=0.18, color=INK)

    # right harvest example Simone (green)
    p.cover((878, 1148, 1616, 1312), GREEN)
    p.paragraphs((888, 1152, 1608, 1306), [
        [bi("Przykład:"), it(" Simone (żółty) wykonuje Czerwoną akcję Zbiorów i "
            "może pozyskać z 2 Terytoriów. Nie może pozyskiwać z dwóch "
            "Terytoriów na północ od swojego Terytorium Stolicy, bo jedno ma "
            "wszystkie pola surowców zakryte żetonami wyczerpania, a drugie nie "
            "zawiera jednostek. Zbiera 2 żywność z górnego-lewego Terytorium "
            "swojej Planety Macierzystej (bo ma tam siłę 2) i 3 metal z Gai (bo "
            "ma siłę 3, a są tam trzy pola surowców). Kładzie po 1 żetonie "
            "wyczerpania na obu tych Terytoriach.")],
    ], size=19, color=CAPINK, justify=False)

    # 7 - CREATION ACTION
    p.erase((876, 1330, 1600, 1424), BG)
    p.text((880, 1336), "7 – AKCJA STWORZENIA", style="sans_b", size=22, color=TEAL)
    p.paragraphs((880, 1370, 1592, 1422), [
        [rg("Za każde Sanktuarium (na wszystkich kontrolowanych Terytoriach) "
            "weź 1 surowiec typu wskazanego na twojej płytce akcji stworzenia "
            "(to ten sam surowiec, co w twoim Terytorium Stolicy).")],
    ], size=20, color=INK)

    # purple note
    p.cover((1286, 1444, 1502, 1572), BG)
    p.paragraphs((1290, 1450, 1498, 1568), [
        [it("Możesz wziąć dowolny typ surowca, ale wszystkie surowce wzięte tą "
            "akcją muszą być takie same.")],
    ], size=18, color=PURPLE, justify=False, align="center")

    out = "/home/user/workt/pl_rulebook/out-08.png"
    p.save(out)
    print("saved", out)

if __name__ == "__main__":
    build()
