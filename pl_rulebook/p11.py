from common import *

OPEN = (237, 237, 237)
TOP = (238, 238, 238)
PLATE1 = (44, 44, 44)     # "2. Fulfill" plate
PLATE4 = (42, 37, 30)     # "4. Resolve Battles" plate

def build():
    p = Page(11)

    # ============ LEFT COLUMN ============
    p.cover((108, 106, 860, 316), TOP)
    p.paragraphs((116, 112, 850, 314), [
        [rg("Gdy przywołasz swojego "), bd("Głównego Boga"), rg(", odblokowujesz "
            "ulepszoną moc (w dolnym panelu) na swojej karcie Głównego Boga, "
            "przesuwasz się o 1 krok w górę na każdym z 3 Torów rozwoju i "
            "przesuwasz się dwukrotnie na Torze dominacji.")],
        [rg("Gdy przywołujesz Pomniejszych Bogów lub Głównego Boga, musisz "
            "zastąpić jednego ze swoich Wyznawców na planszy planety figurką "
            "przedstawiającą wybranego Boga. Zastąpiony Wyznawca wraca do "
            "twojego zapasu. Pomniejszy Bóg liczy się jako mający siłę 2 przy "
            "pozyskiwaniu surowców i w bitwie. Twój Główny Bóg ma siłę 3. Twój "
            "Główny Bóg i Pomniejsi Bogowie poruszają się i kontrolują tak jak "
            "każda inna jednostka.")],
    ], size=20, para_gap=0.3, color=INK)

    p.cover((108, 650, 854, 772), GREEN)
    p.paragraphs((118, 655, 846, 768), [
        [bi("Przykład:"), it(" Simone (żółty) właśnie umieścił trzecią Kostkę "
            "przywołania wokół żetonu przywołania Pomniejszego Boga. Zdejmuje "
            "Wyznawcę z tej planety z powrotem do swojego zapasu, umieszcza "
            "jednostkę Pomniejszego Boga na tym Terytorium i przesuwa żeton "
            "przywołania na pole na swojej Planszy akcji poniżej karty "
            "Pomniejszego Boga, do której ma teraz dostęp.")],
    ], size=18, color=CAPINK, justify=False)

    p.cover((296, 824, 726, 858), PLATE1)
    p.text((304, 828), "2. Wypełnij Pakt handlowy", style="serif_bi", size=22,
           color=(240, 240, 240))

    p.cover((108, 858, 860, 1006), OPEN)
    p.paragraphs((116, 862, 850, 1004), [
        [rg("Możesz wypełnić 1 płytkę Paktu handlowego, którą masz w swoim "
            "zapasie. Aby wypełnić Pakt handlowy, wydaj wymagane surowce "
            "pokazane na górze płytki. Jeśli płytka Paktu handlowego nie "
            "pokazuje ikony Domu, zyskujesz wszystkie pokazane nagrody. Jeśli "
            "płytka pokazuje ikonę Domu, zobacz instrukcje „Handel z konkretnym "
            "Domem” poniżej. Po wypełnieniu odwróć płytkę Paktu handlowego "
            "zakrytą stroną do góry i trzymaj ją obok swojej Planszy akcji.")],
    ], size=20, color=INK)

    p.cover((112, 1032, 856, 1298), PANEL)
    p.section_heading(485, 1056, "HANDEL Z KONKRETNYM DOMEM", TEAL, 19)
    p.paragraphs((150, 1076, 820, 1100), [
        [it("(zasada pierwszej gry: pomiń tę sekcję)")],
    ], size=18, color=INK, justify=False, align="center")
    p.paragraphs((120, 1118, 850, 1294), [
        [rg("Niektóre Pakty handlowe mają ikonę Domu. Musisz kontrolować co "
            "najmniej 1 Terytorium na planecie tego Domu, aby otrzymać pełną "
            "nagrodę. Jeśli ikona Domu pasuje do twojego Domu, musisz zamiast "
            "tego kontrolować co najmniej 1 Terytorium na Gai. Jeśli nie "
            "kontrolujesz co najmniej 1 Terytorium na planecie pasującej do "
            "ikony Domu, nie zyskujesz obu nagród z płytki i musisz wybrać: albo "
            "nagrodę Bonusową na środku płytki, albo PZ i przesunięcia na Torze "
            "handlu na dole płytki.")],
    ], size=20, color=INK)

    # example Serena (green) -- pact tile image at x110-350, y1322-1518
    p.cover((352, 1320, 858, 1520), GREEN)
    p.cover((108, 1516, 858, 1620), GREEN)
    p.paragraphs((358, 1326, 852, 1614), [
        [bi("Przykład:"), it(" Serena (fioletowy) chce wypełnić ten Pakt "
            "handlowy; właśnie użyła akcji Portalu, by przemieścić Wyznawcę na "
            "planetę Norrenis. Wydaje 1 Żywność, 2 Drewno i 1 dowolny surowiec "
            "(jak pokazano w linii kosztu, w górnej części płytki). Ponieważ "
            "kontroluje Terytorium na planecie Norrenis, otrzymuje wszystkie "
            "pokazane nagrody: 1 surowiec, 1 kartę broni Zaawansowanej "
            "(środkowa linia), 4 PZ i 2 przesunięcia na Torze handlu (dolna "
            "linia). Gdyby nie przemieściła Wyznawcy, otrzymałaby tylko jedną "
            "linię nagród: albo środkową linię (1 surowiec i karta broni), albo "
            "dolną linię (4 PZ i 2 przesunięcia na Torze handlu).")],
    ], size=17, color=CAPINK, justify=False)

    # ============ RIGHT COLUMN ============
    p.cover((878, 120, 1182, 168), PLATE4)
    p.text((892, 126), "4. ROZSTRZYGANIE BITEW", style="sans_b", size=22,
           color=(238, 238, 238))

    p.cover((876, 180, 1622, 302), OPEN)
    p.paragraphs((884, 184, 1614, 300), [
        [rg("Za każdym razem, gdy dowolna liczba jednostek różnych graczy lub "
            "jednostki gracza i płytka Starożytnej Cywilizacji zajmują to samo "
            "Terytorium, w tej fazie tury aktywnego gracza zostanie "
            "rozstrzygnięta bitwa. Jeśli w tej fazie trzeba rozstrzygnąć więcej "
            "niż 1 bitwę, aktywny gracz wybiera kolejność ich rozstrzygania. "
            "Każda bitwa musi zostać w pełni rozstrzygnięta, zanim rozpocznie "
            "się kolejna.")],
    ], size=20, color=INK)

    p.cover((876, 320, 1622, 356), OPEN)
    p.text((884, 324), "Bitwa przeciwko Starożytnej Cywilizacji",
           style="serif_bi", size=22, color=INK)

    p.cover((876, 358, 1622, 462), OPEN)
    p.paragraphs((884, 362, 1614, 460), [
        [rg("Każda płytka Starożytnej Cywilizacji ma siłę od 3 do 5, jak "
            "pokazano na płytce. Jeśli masz dowolną liczbę jednostek dzielących "
            "Terytorium z płytką Starożytnej Cywilizacji, musisz z nią stoczyć "
            "bitwę. Aby przystąpić do bitwy, musisz zagrać kartę broni "
            "Zaawansowanej (czerwoną) ze swojej ręki.")],
    ], size=20, color=INK)

    p.cover((898, 466, 1600, 546), OPEN)
    p.paragraphs((906, 470, 1584, 544), [
        [bi("Wskazówka:"), it(" Jeśli nie masz karty broni Zaawansowanej w "
            "chwili wejścia na Terytorium zawierające płytkę Starożytnej "
            "Cywilizacji, wciąż możesz ją zdobyć z jakiegoś źródła (akcja Many, "
            "Wypełnij Pakt handlowy, Przywołaj Boga), zanim przystąpisz do "
            "bitwy.")],
    ], size=19, color=INK, justify=False)

    p.cover((876, 550, 1622, 616), OPEN)
    p.paragraphs((884, 552, 1614, 614), [
        [rg("Jeśli nie możesz zagrać karty broni, automatycznie przegrywasz "
            "bitwę.")],
        [rg("Aby rozstrzygnąć bitwę, wykonaj następujące kroki:")],
    ], size=20, para_gap=0.2, color=INK)

    p.cover((876, 618, 1624, 1146), OPEN)
    p.paragraphs((884, 622, 1614, 1144), [
        [rg("1. Zagraj dokładnie 1 kartę broni Zaawansowanej ze swojej ręki.")],
        [rg("2. Zapłać koszt w Metalu pokazany na karcie.")],
        [rg("3. Odwróć płytkę Starożytnej Cywilizacji awersem do góry.")],
        [rg("4. Zastosuj wszelkie specjalne efekty z karty broni i płytki "
            "Starożytnej Cywilizacji. Listę efektów znajdziesz na stronie 14.")],
        [rg("5. Oblicz swoją siłę bitewną, sumując siłę swoich jednostek "
            "biorących udział w bitwie oraz wartość pokazaną na zagranej karcie "
            "broni. "), bi("Przypomnienie:"), it(" Wyznawca ma siłę 1, "
            "Pomniejszy Bóg ma siłę 2, a Główny Bóg ma siłę 3.")],
        [rg("6. Porównaj swoją siłę bitewną z wartością pokazaną na płytce "
            "Starożytnej Cywilizacji. Jeśli twoja siła bitewna jest równa lub "
            "wyższa od wartości na płytce, wygrywasz bitwę; jeśli nie, "
            "przegrywasz.")],
        [rg("7. "), bd("Jeśli wygrałeś bitwę,"), rg(" weź nagrody pokazane na "
            "płytce Starożytnej Cywilizacji oraz nagrody na dole zagranej karty "
            "broni. Obejmie to PZ oraz kilka przesunięć na Torze wojny. Usuń "
            "płytkę Starożytnej Cywilizacji z gry. "), bd("Jeśli przegrałeś "
            "bitwę,"), rg(" musisz cofnąć wszystkie jednostki biorące udział w "
            "bitwie na swoje Terytorium Stolicy. Płytka Starożytnej Cywilizacji "
            "pozostaje na Terytorium, awersem do góry. Otrzymujesz "),
         bd("1 Metal"), rg(" jako rekompensatę.")],
        [rg("8. Odłóż zagraną kartę broni na przeznaczone pole nad swoją "
            "Planszą akcji.")],
    ], size=20, para_gap=0.2, color=INK)

    p.cover((884, 1406, 1622, 1620), GREEN)
    p.paragraphs((892, 1410, 1614, 1616), [
        [bi("Przykład:"), it(" Isobel (czerwony) przesunęła Pomniejszego Boga "
            "(siła 2) na to Terytorium, na którym znajduje się płytka "
            "Starożytnej Cywilizacji. Zagrywa kartę broni „Krótki Łuk” (która "
            "ma siłę 3), co daje jej łączną siłę 5. Odwraca płytkę Starożytnej "
            "Cywilizacji, która ujawnia siłę 5. Wygrywa bitwę (w przypadku "
            "remisu wygrywa atakujący) i bierze wszystkie pokazane nagrody: 1 "
            "przesunięcie na Torze wojny, 3 PZ (z karty broni), 2 Metal i 1 "
            "Żywność (z płytki Starożytnej Cywilizacji). Zyska też 1 Kryształ "
            "Many z sąsiedniego żetonu Kultury, ponieważ jest on teraz "
            "otoczony, po czym usuwa żeton z Planety (zobacz faza „5. "
            "Rozstrzyganie żetonów Kultury” na stronie 12).")],
    ], size=18, color=CAPINK, justify=False)

    out = "/home/user/workt/pl_rulebook/out-11.png"
    p.save(out)
    print("saved", out)

if __name__ == "__main__":
    build()
