from common import *
from typeset import Page

BANNER_DARK = (46, 41, 31)
BANNER_CREAM = (236, 229, 214)

def build():
    p = Page(10)

    # ============ LEFT COLUMN ============

    # --- Heading: DEVELOP A TECHNOLOGY (keep icon + dashes, cover words) ---
    p.cover((344, 104, 688, 142), PANEL)
    p.text((356, 110), "ROZWIŃ TECHNOLOGIĘ", style="sans_b", size=22, color=TEAL)

    # --- DEV body ---
    p.cover((140, 146, 844, 436), PANEL)
    p.paragraphs((150, 150, 838, 434), [
        [rg("Wszystkie twoje płytki akcji (jest ich 10) rozpoczynają grę "
            "odsłonięte stroną podstawową (tą z małą liczbą w lewym górnym "
            "rogu).")],
        [rg("Za każdym razem, gdy rozwijasz Technologię (niezależnie od tego, "
            "jak uzyskasz ten efekt), możesz odwrócić na stronę rozwiniętą "
            "Płytkę akcji "), bd("sąsiadującą"), rg(" z twoim Pionkiem akcji "
            "(tj. połączoną linią twojej gwiazdy). Nie możesz rozwinąć akcji, "
            "na której aktualnie znajduje się twój Pionek akcji. Rozwinięcie "
            "Czerwonych Płytek akcji kosztuje dodatkowo 1 Drewno i 1 Metal. Gdy "
            "rozwijasz Niebieską płytkę, przesuwasz się o 1 pole na Torze "
            "Technologii, a gdy rozwijasz Czerwoną Płytkę akcji – o 2 pola.")],
        [bi("Gdy rozwijasz Płytkę akcji (dowolnego koloru), możesz natychmiast "
            "wykonać Akcję Główną pokazaną na rozwiniętej stronie płytki.")],
    ], size=20, para_gap=0.35, color=INK)

    # --- DEV example (Isobel) ---
    p.cover((146, 804, 820, 922), GREEN)
    p.paragraphs((156, 808, 812, 918), [
        [bi("Przykład:"), it(" Isobel (czerwony) chce rozwinąć technologię; "
            "może wybrać tylko płytki sąsiadujące z jej pionkiem akcji (nie "
            "płytkę 3 ani 4). Nie stać jej na rozwinięcie żadnej z 2 Czerwonych "
            "Płytek akcji, więc wybiera i odwraca płytkę 7, a następnie "
            "natychmiast wykonuje Akcję Główną pokazaną na jej rozwiniętej "
            "stronie, którą jest zyskanie 1 surowca za każde kontrolowane "
            "Sanktuarium.")],
    ], size=19, color=CAPINK, justify=False)

    # --- Heading: GAIN FOLLOWERS ---
    p.cover((350, 1006, 622, 1042), PANEL)
    p.text((356, 1010), "ZYSKAJ WYZNAWCÓW", style="sans_b", size=22, color=TEAL)

    # --- GAIN body ---
    p.cover((140, 1044, 834, 1240), PANEL)
    p.paragraphs((148, 1048, 828, 1238), [
        [rg("Rozpoczynasz grę z 3 Wyznawcami na swojej Planecie Macierzystej. "
            "W trakcie gry różne efekty będą skutkować zyskiwaniem kolejnych "
            "Wyznawców. Gdy zyskujesz Wyznawcę, weź go ze swojej rezerwy i "
            "umieść na wybranym Terytorium, które kontrolujesz i które zawiera "
            "jedną z twoich Osad (Osada nie może być oblężona). Gdy zyskujesz "
            "wielu Wyznawców w jednej akcji, możesz rozdzielić ich pomiędzy "
            "dowolne dozwolone Terytoria. Jeśli w twojej rezerwie nie ma już "
            "Wyznawców, możesz najpierw usunąć Wyznawcę z dowolnego "
            "Terytorium.")],
    ], size=20, color=INK)

    # --- GAIN example (Isobel) ---
    p.cover((144, 1508, 820, 1592), GREEN)
    p.paragraphs((154, 1512, 812, 1588), [
        [bi("Przykład:"), it(" Isobel (czerwony) zyskuje 3 nowych Wyznawców. Ma "
            "3 Osady, ale decyduje się umieścić 2 Wyznawców na Terytorium na "
            "Gai, a jednego na swojej Planecie Macierzystej.")],
    ], size=19, color=CAPINK, justify=False)

    # ============ RIGHT COLUMN ============

    # --- Heading: BUILD A SETTLEMENT ---
    p.cover((1128, 106, 1420, 144), PANEL)
    p.text((1136, 110), "ZBUDUJ OSADĘ", style="sans_b", size=22, color=TEAL)

    # --- BUILD body ---
    p.cover((905, 150, 1588, 436), PANEL)
    p.paragraphs((912, 154, 1582, 434), [
        [rg("Każde Terytorium może mieć co najwyżej jedną Osadę. Rozpoczynasz "
            "grę z Osadą zbudowaną na swoim Terytorium Stolicy. Głównym "
            "sposobem budowania Osad jest akcja Many, jednak możesz też budować "
            "Osady, korzystając z akcji dodatkowej z Paktu handlowego. Gdy "
            "budujesz Osadę, weź skrajnie lewą Osadę z obszaru Osad na swojej "
            "Planszy akcji i umieść ją na dowolnym kontrolowanym Terytorium, "
            "które nie zawiera jeszcze Osady żadnego gracza. W miarę budowania "
            "Osad odkrywasz kolejne nagrody, które zyskujesz, wykonując akcję "
            "„Dochód z Osad”. Raz zbudowana Osada nie może zostać zniszczona, "
            "ale Terytorium nadal może być kontrolowane przez innego gracza.")],
        [bd("Pamiętaj:"), rg(" Kontrolujesz Terytorium, jeśli nie zawiera ono "
            "jednostek innych graczy ORAZ zawiera dowolną liczbę twoich "
            "jednostek lub jedną z twoich Osad.")],
    ], size=20, para_gap=0.3, color=INK)

    # --- BUILD example (Danilo) ---
    p.cover((912, 720, 1598, 860), GREEN)
    p.paragraphs((922, 724, 1590, 856), [
        [bi("Przykład:"), it(" Danilo (niebieski) buduje nową Osadę i może "
            "umieścić ją na dowolnym z kontrolowanych przez siebie Terytoriów. "
            "Danilo bierze Osadę ze swojej Planszy akcji i umieszcza ją na "
            "Terytorium na swojej Planecie Macierzystej. Odkrył teraz nową "
            "nagrodę na swojej Planszy akcji. Gdyby w przyszłej turze przesunął "
            "się na Akcję 8 (Dochód z Osad), mógłby odebrać zarówno 2 "
            "Wyznawców, jak i 2 PZ.")],
    ], size=19, color=CAPINK, justify=False)

    # --- Banner: 3. ADDITIONAL ACTIONS ---
    p.cover((896, 946, 1214, 986), BANNER_DARK)
    p.text((908, 951), "3. AKCJE DODATKOWE", style="sans_b", size=20,
           color=BANNER_CREAM)

    # --- ADDITIONAL ACTIONS body ---
    p.cover((876, 994, 1592, 1112), BG)
    p.paragraphs((880, 998, 1588, 1110), [
        [rg("Po zakończeniu Akcji Głównej i opcjonalnej akcji Many możesz "
            "wykonać jedną lub więcej Akcji Dodatkowych, "),
         bi("ale wszystkie muszą być różnych typów"), rg(". Akcje te są "
            "pokazane w prawym dolnym rogu twojej Planszy akcji. Niektóre "
            "specjalne premie mogą dać ci dodatkowe Akcje Dodatkowe.")],
    ], size=20, color=INK)

    # --- Summon subheading + body (keep eye icon at x882-1040) ---
    p.cover((1046, 1128, 1594, 1200), BG)   # subheading + lines beside icon
    p.cover((876, 1200, 1592, 1420), BG)    # full-width body below icon
    p.paragraphs((1052, 1130, 1592, 1182), [
        [bi("1. Przywołaj Pomniejszego Boga lub Głównego Boga")],
    ], size=21, color=INK, justify=False)
    p.paragraphs((880, 1202, 1588, 1418), [
        [rg("Jeśli umieściłeś kostki na swojej Planszy akcji w taki sposób, że "
            "otaczają one żeton przywołania Pomniejszego lub Głównego Boga, "
            "usuń otoczony żeton przywołania i połóż go obok swojej Planszy "
            "akcji. W swojej turze, jako Akcję Dodatkową, możesz przywołać "
            "Pomniejszego Boga lub swojego Głównego Boga. Aby to zrobić, umieść "
            "żeton przywołania w polu przywołania Boga, którego chcesz "
            "przywołać, zastępując odpowiadającą mu figurkę (zobacz poniżej).")],
        [rg("Gdy przywołujesz "), bi("Pomniejszego Boga"), rg(", możesz wybrać, "
            "którego z twoich 4 Bogów przywołać. Każdego można przywołać tylko "
            "raz w trakcie gry. Gdy to zrobisz, przesuniesz się na jednym z "
            "Torów rozwoju (lub dwa razy na Torze dominacji), jak pokazano na "
            "dole karty Boga. Każdy Bóg ma zdolność jednego z następujących "
            "typów:")],
    ], size=20, para_gap=0.3, color=INK)

    # --- Bullet items (keep bullet dots + icons at x900-970) ---
    p.cover((970, 1444, 1590, 1484), BG)
    p.paragraphs((980, 1450, 1586, 1482), [
        [rg("Natychmiastowa, jednorazowa premia")],
    ], size=20, color=INK, justify=False, valign="center")

    p.cover((970, 1500, 1590, 1550), BG)
    p.paragraphs((980, 1506, 1586, 1548), [
        [rg("Zdolność działająca do końca gry")],
    ], size=20, color=INK, justify=False, valign="center")

    p.cover((970, 1574, 1590, 1602), BG)
    p.paragraphs((980, 1576, 1586, 1602), [
        [rg("Kryterium zdobywania PZ na koniec gry")],
    ], size=20, color=INK, justify=False, valign="center")

    out = "/home/user/workt/pl_rulebook/out-10.png"
    p.save(out)
    print("saved", out)

if __name__ == "__main__":
    build()
