from typeset import Page

TEAL = (38, 108, 132)
INK = (33, 29, 25)
PARCH = (238, 238, 237)
GREEN = (219, 223, 203)
CAPINK = (66, 55, 38)

def bd(t): return (t, "serif_b")
def it(t): return (t, "serif_i")
def bi(t): return (t, "serif_bi")
def rg(t): return (t, "serif")

def build():
    p = Page(7)
    p.ocr_lines()

    def L(erase, head, hy, body, paras, size=22, hsize=25, gap=0.45):
        p.erase(erase, PARCH)
        if head:
            p.section_heading(487, hy, head, TEAL, hsize)
        p.paragraphs(body, paras, size=size, para_gap=gap, color=INK)

    # ---------------- LEFT COLUMN (x ~140-840) ----------------
    L((128, 98, 852, 234), "PLANETY", 116, (140, 138, 840, 232), [
        [rg("Gra toczy się na osobnych planszach przedstawiających różne "
            "planety. Każdy "), bd("Dom"), rg(" ma "), bd("Planetę Macierzystą"),
         rg("; gdy dany Dom nie bierze udziału w grze, jego Planetę Macierzystą "
            "się usuwa. Jest też plansza przedstawiająca Gaję, która zawsze jest "
            "w grze. Każdy Dom rozpoczyna na swojej Planecie Macierzystej i w "
            "trakcie gry może przemieszczać się na inne planety.")],
    ])

    L((128, 266, 852, 522), "TERYTORIA", 282, (140, 306, 840, 520), [
        [rg("Każda planeta jest podzielona na heksy zwane "), bd("Terytoriami"),
         rg(". Każde Terytorium wytwarza jeden z 4 Surowców: Żywność, Drewno, "
            "Metal lub Złoto. Każde Terytorium ma ograniczoną produkcję (od 1 do "
            "3), wskazaną liczbą ikon surowca. Niektóre Terytoria mają też ikonę "
            "Sanktuarium (zobacz „Akcja Stworzenia” na stronie 8).")],
        [rg("Każda Planeta Macierzysta ma specjalne Terytorium zwane "),
         bd("Stolicą"), rg(". Jednostki innych graczy nie mogą wejść do twojej "
            "Stolicy, a surowiec w Stolicy nigdy się nie wyczerpuje – wskazuje "
            "to złoty okrąg wokół surowca Stolicy.")],
        [rg("Centralne Terytoria Gai przedstawiają zaginiony kontynent "
            "Atlantydy. Terytoria te nie mają ikon surowców, ale mają 2 "
            "Sanktuaria.")],
    ], gap=0.3)

    L((128, 554, 852, 888), "SUROWCE", 572, (140, 594, 840, 884), [
        [rg("Gra zawiera 4 surowce: Żywność, Drewno, Metal i Złoto. Gdy "
            "zyskujesz surowiec, przesuń odpowiedni znacznik surowca w górę toru "
            "surowca. Ikona surowca z liczbą oznacza wielokrotność tego surowca. "
            "Pozycja znacznika wskazuje ilość posiadanego surowca. Jeśli musisz "
            "pokazać więcej niż 9 danego surowca, odwróć znacznik na drugą "
            "stronę „10” i ustaw go na odpowiednim polu toru.")],
        [rg("Gdy musisz wydać surowce na dowolny koszt, przesuń znacznik w dół "
            "o wymaganą liczbę pól. Nie możesz wydać surowców, których nie "
            "posiadasz, a jeśli nie możesz zapłacić kosztu, nie możesz wykonać "
            "danej akcji lub efektu.")],
        [rg("Ikona „?” oznacza dowolny wybrany surowiec. Jeśli towarzyszy jej "
            "liczba, zyskujesz lub wydajesz tę liczbę surowców w dowolnej "
            "kombinacji wybranych surowców.")],
    ], gap=0.3)

    L((128, 928, 852, 1214), "ELEMENTY: JEDNOSTKI I OSADY", 945,
      (140, 963, 840, 1210), [
        [rg("Elementy, które gracz może wprowadzić do gry, to jednostki lub "
            "Osady (zobacz strona 10). W grze są 3 rodzaje jednostek:")],
        [bi("Wyznawcy:"), rg(" mają wartość siły 1 i przedstawiają lud, który "
            "czci twój Dom oraz walczy i pracuje dla niego.")],
        [bi("Pomniejsi Bogowie:"), rg(" mają wartość siły 2, a każdy z nich "
            "daje ci specjalny efekt, gdy go przywołasz. Przedstawiają członków "
            "twojego Domu.")],
        [bi("Główny Bóg:"), rg(" ma wartość siły 3 i zwiększa unikalną moc "
            "twojego Domu. To twój awatar, przywódca twojego Domu.")],
        [bd("Siła jednostki jest wykorzystywana podczas pozyskiwania surowców "
            "oraz podczas rozstrzygania bitew."), rg(" Wszystkie jednostki "
            "używają tych samych zasad ruchu.")],
    ], hsize=21, gap=0.25)

    L((128, 1250, 852, 1606), "ZASADY RUCHU", 1268, (140, 1305, 840, 1604), [
        [rg("Za każdym razem, gdy masz punkty ruchu, możesz rozdzielić ten ruch "
            "dowolnie pomiędzy dowolną liczbę swoich jednostek. Możesz "
            "zignorować dowolną liczbę punktów ruchu, jeśli chcesz.")],
        [bd("Specjalne zasady ruchu:")],
        [rg("• Do Atlantydy można dotrzeć tylko przekraczając przerywane linie "
            "na planszy Gai. Nie można przekraczać linii ciągłych przy "
            "wchodzeniu na Terytoria Atlantydy.")],
        [rg("• Nigdy nie możesz wejść na Terytorium Stolicy innego gracza.")],
        [rg("• Jeśli twoja jednostka wchodzi na Terytorium zajęte przez płytkę "
            "Starożytnej Cywilizacji lub jednostki innego gracza, musi się "
            "zatrzymać, a bitwa zostaje rozstrzygnięta w fazie 4 twojej tury "
            "(zobacz „Rozstrzyganie bitew” na stronie 11).")],
        [rg("Na koniec ruchu, jeśli jednostka znajduje się na Terytorium "
            "sąsiadującym z zakrytym żetonem Kultury, odwróć ten żeton awersem "
            "do góry.")],
    ], gap=0.22)

    # ---------------- RIGHT COLUMN (x ~880-1600) ----------------
    p.erase((868, 96, 1602, 282), PARCH)
    p.section_heading(1242, 114, "KOSTKI PRZYWOŁANIA", TEAL, 23)
    p.paragraphs((880, 134, 1590, 280), [
        [rg("Umieszczanie Kostek przywołania na planszy jest bardzo ważne. Nie "
            "tylko dają ci Kryształy Many (które same są potrzebne do "
            "wykonywania akcji Many), ale gdy otoczysz żeton przywołania "
            "(Pomniejszego lub Głównego), zyskujesz też zdolność przywołania "
            "Boga. Bogowie dają ci specjalne moce i silniejszą jednostkę na "
            "planszy. (Więcej w „Przywołaj Pomniejszego lub Głównego Boga” na "
            "stronie 10.)")],
    ], size=22, color=INK)

    p.erase((868, 312, 1602, 392), PARCH)
    p.paragraphs((880, 316, 1590, 390), [
        [rg("Akcje Główne opisano poniżej. Każda płytka ma stronę podstawową i "
            "stronę rozwiniętą (zobacz „Rozwiń Technologię” na stronie 10). "
            "Wszelkie różnice na akcji rozwiniętej pokazano na "), it("fioletowo"),
         rg(".")],
    ], size=22, color=INK)

    # 1 PORTAL
    p.erase((1002, 400, 1498, 564), PARCH)
    p.cover((1002, 402, 1320, 430), PARCH)
    p.text((1008, 404), "1 – AKCJA PORTALU", style="sans_b", size=23, color=TEAL)
    p.paragraphs((1008, 434, 1495, 562), [
        [rg("Możesz teleportować 1 ("), it("2"), rg(") jednostkę na dowolne "
            "Terytorium, z wyjątkiem Terytorium Atlantydy lub Stolicy innego "
            "gracza. Nie możesz teleportować jednostek z Terytorium Atlantydy.")],
        [rg("Portale zwykle służą do przemieszczania jednostek na inną planetę, "
            "ale możesz ich też użyć do ruchu na tej samej planecie.")],
    ], size=22, para_gap=0.3, color=INK)

    p.cover((888, 850, 1616, 938), GREEN)
    p.paragraphs((898, 856, 1590, 932), [
        [bi("Przykład:"), it(" Simone (żółty) wykonuje podstawową akcję Portalu "
            "i przemieszcza 1 Wyznawcę ze swojego Terytorium Stolicy na "
            "3-metalowe Terytorium na Gai. To pierwsza jednostka umieszczona "
            "obok zakrytego żetonu Kultury, więc odwraca go awersem do góry.")],
    ], size=21, color=CAPINK, justify=False)

    # 2 BLUE MOVE
    p.erase((1002, 962, 1500, 1082), PARCH)
    p.cover((1002, 964, 1320, 994), PARCH)
    p.text((1008, 966), "2 – NIEBIESKA AKCJA RUCHU", style="sans_b", size=22, color=TEAL)
    p.paragraphs((1008, 1004, 1495, 1080), [
        [rg("Możesz przemieścić jednostki do 2 ("), it("4"), rg(") razy na "
            "sąsiednie Terytoria. Możesz rozdzielić ten ruch pomiędzy wiele "
            "jednostek w dowolnej kombinacji, w tym przemieszczając jedną "
            "jednostkę wielokrotnie.")],
    ], size=22, color=INK)

    p.cover((806, 1392, 1616, 1474), GREEN)
    p.paragraphs((894, 1398, 1602, 1470), [
        [bi("Przykład:"), it(" Isobel (czerwony) wykonuje Niebieską akcję Ruchu "
            "i decyduje się przemieścić 2 Wyznawców na Terytorium zawierające "
            "płytkę Starożytnej Cywilizacji. Bitwa zostanie rozstrzygnięta w "
            "fazie 4 jej tury.")],
    ], size=21, color=CAPINK, justify=False)

    # 3 RED MOVE
    p.erase((1002, 1518, 1500, 1600), PARCH)
    p.cover((1002, 1520, 1330, 1548), PARCH)
    p.text((1008, 1522), "3 – CZERWONA AKCJA RUCHU", style="sans_b", size=22, color=TEAL)
    p.paragraphs((1008, 1552, 1495, 1600), [
        [rg("Tak jak płytka Niebieskiego Ruchu, ale otrzymujesz 3 ("), it("5"),
         rg(") ruchy do wykorzystania wedle uznania.")],
    ], size=22, color=INK)

    out = "/home/user/workt/pl_rulebook/out-07.png"
    p.save(out)
    print("saved", out)

if __name__ == "__main__":
    build()
