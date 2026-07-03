from common import *

OLIVE = (174, 163, 135)
PLATE = (40, 46, 56)
PLTEXT = (150, 210, 225)

def build():
    p = new(6)

    # ---- TITLE: GAMEPLAY -> ROZGRYWKA ----
    p.clone_h((66, 104, 490, 180), 500, 610)
    p.text((72, 112), "ROZGRYWKA", style="sans_b", size=52, color=(247, 249, 250))

    # ---- OVERVIEW ribbon -> PRZEGLĄD ----
    p.cover((90, 262, 340, 312), OLIVE)
    p.text((104, 270), "PRZEGLĄD", style="sans_b", size=30, color=WHITE, spacing=1)

    # left OVERVIEW body
    p.erase((108, 332, 862, 902), PARCH)
    p.paragraphs((116, 338, 856, 900), [
        [rg("W grze Anunnaki: Dawn of the Gods każdy gracz reprezentuje jeden ze "
            "starożytnych domów Anunnakich, których władcy są postrzegani przez "
            "ziemską ludność jako bogowie. Każdy Dom opuszcza swoją umierającą "
            "planetę w poszukiwaniu nowej ojczyzny. Ziemią obiecaną jest Gaja, "
            "dom wspaniałej cywilizacji Atlantydy. Gracze walczą o kontrolę nad "
            "najbogatszymi terytoriami, rozwijają technologie i zawierają umowy "
            "handlowe. Każdy Dom rozpoczyna na swojej Planecie Macierzystej, ale "
            "konieczne będą podróże na inne planety i dalej, do żyznego serca "
            "Gai, aby stać się najpotężniejszą cywilizacją!")],
        [rg("Gra składa się z pewnej liczby tur graczy, rozpoczynając od "
            "pierwszego gracza i kontynuując zgodnie z ruchem wskazówek zegara, "
            "aż do wyzwolenia końca gry. W swojej turze przesuwasz Pionek akcji "
            "na Płytkę akcji, aby wykonać związaną z nią Akcję Główną. Droga, "
            "którą pokonujesz między akcjami, może przynieść ci Kryształy Many, "
            "które można wykorzystać do wykonania kolejnych akcji lub "
            "odblokowania potężnych Bogów. Następnie możesz wykonać akcje "
            "dodatkowe, a potem rozstrzygnąć bitwy i zebrane żetony Kultury.")],
        [rg("Gdy koniec gry zostanie wyzwolony, rozgrywka trwa, aż wszyscy "
            "gracze wykonają tę samą liczbę tur. Koniec gry można wyzwolić na 2 "
            "sposoby:")],
        [rg("• Gdy dowolny gracz umieści wszystkie swoje 14 Kostek przywołania "
            "na gwieździe akcji na swojej Planszy akcji, lub")],
        [rg("• Gdy dowolny gracz osiągnie ostatnie pole jednego z 3 Torów "
            "rozwoju.")],
        [rg("Na koniec gry przejdź do fazy punktacji końcowej, w której gracze "
            "sumują wszystkie Punkty Zwycięstwa (PZ) zdobyte podczas gry. Gracz "
            "z największą liczbą PZ wygrywa!")],
    ], size=21, para_gap=0.28, color=INK)

    # ---- EARNING VICTORY POINTS ribbon ----
    p.cover((88, 946, 558, 1008), OLIVE)
    p.text((100, 954), "ZDOBYWANIE PUNKTÓW ZWYCIĘSTWA", style="sans_b",
           size=25, color=WHITE, spacing=0.5)

    p.erase((108, 998, 862, 1498), PARCH)
    p.paragraphs((116, 1002, 856, 1496), [
        [rg("Istnieje kilka sposobów zdobywania PZ. Za każdy zdobyty PZ przesuń "
            "swój znacznik o 1 pole do przodu na torze PZ.")],
        [bi("W trakcie gry:")],
        [rg("• Wypełnienie Paktu handlowego")],
        [rg("• Wygranie bitwy")],
        [rg("• Aktywacja dochodu z Osad")],
        [rg("• Zdobycie płytki 2 PZ na Torze dominacji")],
        [rg("• Przywołanie niektórych Bogów")],
        [bi("Na koniec gry:")],
        [rg("• Jeśli znacznik gracza jest 1. lub 2. na Torze Wojny, Technologii "
            "lub Handlu")],
        [rg("• Tor dominacji")],
        [rg("• Pozostałe surowce")],
        [rg("• Niektórzy przywołani Bogowie")],
        [rg("• Każdy z 3 Torów rozwoju jest powiązany z płytką Celu. Pozycja "
            "gracza na Torze rozwoju działa jako mnożnik dla powiązanej płytki "
            "Celu.")],
        [bi("Wskazówka:"), rg(" Zdobędziesz wiele PZ z 3 Torów rozwoju; ważne, "
            "aby zwracać uwagę na te pary podczas gry.")],
    ], size=20, para_gap=0.12, color=INK)

    # example bottom-left
    p.cover((108, 1514, 868, 1616), GREEN)
    p.paragraphs((118, 1520, 860, 1612), [
        [bi("Przykład:"), it(" Pionek akcji Sereny (fioletowy) znajduje się na "
            "Akcji 7; chce ona przesunąć pionek na Akcję 10 (rysunek po lewej). "
            "Pionek przesuwa się na sąsiednią płytkę, więc kładzie ona Kostkę "
            "przywołania na tym polu (rysunek po prawej). Pole pokazuje 1 "
            "Kryształ Many, więc bierze 1 ze wspólnej puli.")],
    ], size=20, color=CAPINK, justify=False)

    # ---- RIGHT: GAMEPLAY ribbon ----
    p.cover((926, 336, 1112, 388), OLIVE)
    p.text((934, 344), "ROZGRYWKA", style="sans_b", size=28, color=WHITE, spacing=1)

    p.erase((866, 404, 1628, 512), PARCH)
    p.paragraphs((876, 408, 1620, 510), [
        [rg("Rozpoczynając od pierwszego gracza, gracze wykonują tury zgodnie z "
            "ruchem wskazówek zegara, aż do wyzwolenia końca gry. Gdy zajdzie "
            "jeden z dwóch warunków końca gry, rozgrywka trwa, aż wszyscy gracze "
            "wykonają tę samą liczbę tur. Można to śledzić za pomocą znacznika "
            "Pierwszego Gracza przydzielonego podczas przygotowania.")],
    ], size=21, color=INK)

    # ON YOUR TURN
    p.erase((866, 514, 1250, 544), PARCH)
    p.text((880, 516), "W SWOJEJ TURZE", style="sans_b", size=22, color=INK)

    p.erase((866, 548, 1628, 584), PARCH)
    p.paragraphs((876, 550, 1620, 582), [
        [rg("Każda twoja tura składa się z następujących 5 faz, wykonywanych w "
            "kolejności:")],
    ], size=21, color=INK)

    # phase list (keep board icon at left x881-1000)
    p.erase((1005, 594, 1628, 772), PARCH)
    p.paragraphs((1012, 598, 1620, 770), [
        [bd("1. Akcja Główna"), rg(" (obowiązkowa)")],
        [bd("2. Akcja Many"), rg(" (opcjonalna)")],
        [bd("3. Akcje Dodatkowe"), rg(" (opcjonalne)")],
        [bd("4. Rozstrzygnięcie Bitew"), rg(" (obowiązkowe, jeśli spełnione są "
            "określone warunki)")],
        [bd("5. Rozstrzygnięcie żetonów Kultury"), rg(" (obowiązkowe, jeśli "
            "spełnione są określone warunki)")],
    ], size=20, para_gap=0.55, color=INK)

    # ---- 1. PRIMARY ACTION plate ----
    p.cover((884, 804, 1158, 852), PLATE)
    p.text((898, 812), "1. AKCJA GŁÓWNA", style="sans_b", size=22, color=PLTEXT, spacing=0.5)

    # primary action body
    p.erase((866, 870, 1632, 1240), PARCH)
    p.paragraphs((876, 874, 1622, 1236), [
        [rg("Aby wykonać Akcję Główną, musisz przesunąć swój Pionek akcji na "
            "Płytkę akcji, a następnie wykonać przedstawioną akcję.")],
        [rg("W pierwszej turze możesz umieścić Pionek akcji na dowolnej "
            "niebieskiej Płytce akcji.")],
        [rg("Począwszy od drugiej tury, musisz przestrzegać tych zasad:")],
        [rg("Nie możesz pozostać na tej samej Płytce akcji. Oznacza to, że nie "
            "możesz wykonać tej samej Akcji Głównej w dwóch kolejnych turach.")],
        [rg("Jeśli przesuniesz Pionek akcji na sąsiednią Płytkę akcji "
            "(połączoną linią z poprzednią), a pole na tej ścieżce nie zawiera "
            "Kostki przywołania, musisz umieścić jedną ze swoich kostek (wziętą "
            "z Planszy akcji) na tym polu. Jeśli na polu, na którym umieściłeś "
            "kostkę, pokazana jest liczba Kryształów Many, bierzesz tę liczbę "
            "Kryształów Many ze wspólnej puli i umieszczasz je na Planszy akcji "
            "w przeznaczonym miejscu.")],
        [rg("Możesz przesunąć Pionek akcji na dowolną Płytkę akcji, ale są "
            "korzyści z umieszczania kostek, kiedy tylko to możliwe. Nie możesz "
            "umieścić kostki na polu, które już zawiera kostkę.")],
    ], size=21, para_gap=0.28, color=INK)

    out = "/home/user/workt/pl_rulebook/out-06.png"
    p.save(out)
    print("saved", out)

if __name__ == "__main__":
    build()
