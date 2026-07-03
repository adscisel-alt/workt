import json
from common import *
from typeset import Page

OCR = "/tmp/claude-0/-home-user-workt/760b14e1-1e2f-517a-8c89-c5f20f1f4524/scratchpad/ocr12.json"
PARCH = (237, 237, 236)      # open page background (parchment/grey)
BANNER = (46, 42, 36)        # dark culture-token banner interior

def new12():
    p = Page(12)
    p._lines = [{"box": tuple(l["box"]), "text": l["text"]}
                for l in json.load(open(OCR))]
    return p

def build():
    p = new12()

    # =================== LEFT COLUMN ===================

    # ---- top-left heading (teal); cover old English heading straddling
    #      grey (above ~y126) and white panel interior (below ~y135) ----
    p.cover((150, 92, 832, 126), PARCH)
    p.cover((190, 126, 800, 136), PANEL)
    p.section_heading(492, 116, "UKŁAD PŁYTEK STAROŻYTNEJ CYWILIZACJI",
                      TEAL, 17, spacing=1.0)

    # ---- white callout: left descriptor text ----
    p.cover((140, 150, 290, 309), PANEL)
    p.paragraphs((144, 158, 288, 307), [
        [rg("Każda płytka Starożytnej Cywilizacji ma następujący układ:")],
    ], size=18, color=INK, justify=False)

    # ---- diagram labels (italic, keep tile + arrows) ----
    p.cover((293, 168, 418, 282), PANEL)
    p.paragraphs((293, 178, 415, 254), [[it("Siła (od 3 do 5)")]],
                 size=18, color=INK, justify=False, align="center", valign="center")

    p.cover((692, 170, 850, 244), PANEL)
    p.paragraphs((690, 180, 851, 242), [[it("Efekt płytki (jeśli jest)")]],
                 size=18, color=INK, justify=False, align="center", valign="center")

    p.cover((692, 256, 853, 307), PANEL)
    p.paragraphs((688, 260, 853, 306), [[it("Nagrody w razie zwycięstwa")]],
                 size=17, color=INK, justify=False, align="center", valign="center")

    # ---- "Battle between two players" heading ----
    p.cover((110, 344, 478, 380), PARCH)
    p.paragraphs((114, 348, 478, 378), [[bi("Bitwa między dwoma graczami")]],
                 size=22, color=INK, justify=False)

    # ---- intro prose (3 paragraphs) ----
    p.erase((108, 382, 860, 642), PARCH, pady=9)
    p.cover((108, 506, 182, 539), PARCH)   # OCR missed left word of tip line 2
    p.paragraphs((116, 386, 853, 638), [
        [rg("Jeśli masz dowolną liczbę jednostek na Terytorium wspólnym z innym "
            "graczem, musisz stoczyć z nim bitwę. Jeśli wszedłeś na Terytorium "
            "zawierające jednostki innego gracza, jesteś uważany za "),
         bd("atakującego"), rg(", a drugi gracz jest "), bd("obrońcą"),
         rg(". Aby przystąpić do bitwy z innym graczem, musisz móc zagrać jedną "
            "Zaawansowaną kartę broni (czerwoną) z ręki.")],
        [bi("Wskazówka:"), it(" Jeśli nie masz Zaawansowanej karty broni w chwili "
            "wejścia na Terytorium zawierające jednostki innego gracza, wciąż "
            "możesz ją zdobyć z jakiegoś źródła (akcja Many, wypełnienie Paktu "
            "handlowego, przywołanie Boga) przed przystąpieniem do bitwy.")],
        [rg("Jeśli nie możesz zagrać karty broni (tzn. jesteś "), bd("atakującym"),
         rg(" i nie masz żadnej Zaawansowanej karty broni, którą mógłbyś zagrać, "
            "płacąc jej koszt), automatycznie przegrywasz bitwę.")],
    ], size=20, para_gap=0.3, color=INK)

    # ---- numbered list 1-7 ----
    p.erase((108, 645, 860, 1140), PARCH, pady=9)
    p.paragraphs((139, 648, 855, 1136), [
        [rg("1. Każdy gracz zagrywa dokładnie 1 kartę broni z ręki. "),
         bd("Atakujący"), rg(" musi zagrać jedną ze swoich Zaawansowanych "
            "(czerwonych) kart broni. "), bd("Obrońca"), rg(" musi zagrać jedną "
            "ze swoich kart broni, Podstawową lub Zaawansowaną. Karty kładzie "
            "się zakryte.")],
        [rg("2. Jednocześnie odkryjcie obie karty broni, a każdy gracz płaci "
            "wszelkie koszty pokazane w lewym górnym rogu zagranej karty.")],
        [rg("3. Obaj gracze stosują wszelkie efekty pokazane na zagranej karcie "
            "broni, jeśli takie są. Szczegóły na stronie 14.")],
        [rg("4. Gracze obliczają swoją siłę bitewną, sumując siłę obecnych "
            "jednostek oraz wartość pokazaną na zagranej karcie broni.")],
        [rg("5. Wygrywa gracz o najwyższej sile bitewnej. W razie remisu wygrywa "), bd("atakujący"), rg(".")],
        [rg("6. "), bd("Zwycięski gracz"), rg(" bierze nagrody pokazane na dole "
            "zagranej karty broni. Obejmują one PZ oraz pewną liczbę pól na Torze "
            "Wojny. "), bd("Przegrywający gracz"), rg(" cofa wszystkie swoje "
            "jednostki biorące udział w bitwie na swoje Terytorium Stolicy. Może "
            "też zdobyć nagrody z niektórych kart broni, a jeśli zagrał "
            "Zaawansowaną kartę broni, otrzymuje 1 Metal jako rekompensatę.")],
        [rg("7. Wszystkie zagrane Zaawansowane karty broni wracają na wyznaczone "
            "miejsce nad Planszą akcji odpowiednich graczy. Wszystkie zagrane "
            "Podstawowe karty broni wracają do ręki gracza.")],
    ], size=20, para_gap=0.28, color=INK)

    # ---- example: Danilo (green) ----
    p.cover((108, 1414, 861, 1620), GREEN)
    p.paragraphs((120, 1420, 850, 1606), [
        [bi("Przykład:"), it(" Danilo (niebieski) wprowadza 2 Wyznawców na "
            "Terytorium kontrolowane przez Serenę (fioletowy). Potajemnie zagrywa "
            "kartę broni „Dagger”, która ma wartość siły 1, co daje mu łączną "
            "siłę o wartości 3. Serena nie ma na ręce żadnych zaawansowanych kart "
            "broni, więc może wybrać jedynie spośród swoich 2 Podstawowych kart "
            "broni: „Long Shield” kosztowałaby ją 2 surowce do wyboru, a "
            "„Slingshot” byłaby darmowa i dałaby jej premię, gdyby przegrała "
            "bitwę. Nie chce wydawać surowców, więc zagrywa Podstawową kartę "
            "broni „Slingshot”. Danilo wygrywa bitwę. Serena cofa swojego "
            "Wyznawcę do Stolicy, a ponieważ zagrała „Slingshot”, kradnie od "
            "Danila 1 wybrany surowiec.")],
    ], size=19, color=CAPINK, justify=False)

    # =================== RIGHT COLUMN ===================

    # ---- ATLANTIS heading ----
    p.cover((1150, 113, 1560, 145), PARCH)
    p.section_heading(1243, 127, "ATLANTYDA", TEAL, 23)

    # ---- ATLANTIS body (2 paragraphs) ----
    p.erase((884, 150, 1612, 560), PANEL, pady=9)
    p.paragraphs((890, 154, 1600, 558), [
        [rg("Terytoria (jedno przy 1-2 graczach lub dwa przy 3-4 graczach) w "
            "centrum planszy Gai przedstawiają mityczne miasto Atlantydę. Na "
            "Atlantydę można wejść tylko z sąsiedniego Terytorium, przekraczając "
            "przerywaną linię; do wejścia na Atlantydę ani jej opuszczenia "),
         bd("nie można"), rg(" użyć akcji Portalu. Ludem Atlantydy władają "
            "potężni władcy, więc trudniej jest ich pokonać.")],
        [rg("Żetony Boga Atlantydy umieszczone na każdym Terytorium Atlantydy "
            "podczas przygotowania przedstawiają jednostkę Głównego Boga i "
            "pokazują +3: ta wartość siły jest dodawana do siły bitewnej obecnej "
            "płytki Starożytnej Cywilizacji. Żetony te liczą się jako Główni "
            "Bogowie, na co wskazuje ich kształt, dlatego twoja karta broni "
            "„Ballista” jest przeciwko nim skuteczna (zobacz „Efekty kart broni” "
            "na stronie 14). Jak zwykle, gdy podbijasz Atlantydę, bierzesz "
            "nagrody pokazane na twojej karcie broni i płytce Starożytnej "
            "Cywilizacji. Gdy po raz pierwszy podbijasz Atlantydę, bierzesz 3 "
            "karty Artefaktów z przygotowania i wybierasz 1, którą zachowujesz "
            "obok swojej Planszy akcji. Jeśli grasz w grze 3/4-osobowej i "
            "podbijasz drugie Terytorium, bierzesz pozostałe 2 karty Artefaktów, "
            "wybierasz 1, a pozostałą kartę usuwa się z gry. Karty Artefaktów "
            "mają różnorodne i potężne efekty, które objaśniono w Dodatku na "
            "stronie 16.")],
    ], size=20, para_gap=0.28, color=INK)

    # ---- example: Simone (green) ----
    p.cover((898, 884, 1601, 1061), GREEN)
    p.paragraphs((910, 890, 1594, 1056), [
        [bi("Przykład:"), it(" Simone (żółty) wszedł na Atlantydę; jego 2 "
            "Pomniejszych Bogów i 1 Wyznawca dają mu łączną siłę 5, a on zapłacił "
            "1 Metal, by zagrać kartę broni „Double Axe” i zwiększyć swoją łączną "
            "siłę do 8. Nawet z +3 siła Starożytnej Cywilizacji wynosi tylko 6, "
            "więc Simone wygrywa bitwę. Zdobywa 2 pola na Torze Wojny, 3 PZ (z "
            "karty) oraz 1 Złoto albo 1 Drewno (z płytki). Ponieważ Danilo "
            "(niebieski) już podbił drugie Terytorium Atlantydy, Simone wybierze "
            "1 z 2 pozostałych kart Artefaktów, a drugą usunie z gry.")],
    ], size=19, color=CAPINK, justify=False)

    # ---- phase-5 banner ----
    p.cover((884, 1146, 1295, 1181), BANNER)
    p.paragraphs((900, 1148, 1288, 1180), [
        [("5. ROZPATRZ ŻETONY KULTURY", "sans_b")],
    ], size=26, color=(255, 255, 255), justify=False, valign="center")

    # ---- phase-5 body ----
    p.erase((876, 1196, 1612, 1398), PARCH, pady=9)
    p.paragraphs((884, 1200, 1600, 1396), [
        [rg("Jeśli jakiś żeton Kultury jest teraz całkowicie otoczony "
            "jednostkami umieszczonymi na każdym z 3 sąsiednich Terytoriów, "
            "zostaje rozpatrzony. Każdy gracz, który ma co najmniej 1 jednostkę "
            "na dowolnym z 3 sąsiednich Terytoriów, może wziąć nagrody pokazane "
            "na żetonie Kultury. Nagród tych nie można zachować na później – "
            "bierze się je teraz albo przepadają. Liczba kontrolowanych "
            "Terytoriów ani liczba posiadanych jednostek nie ma znaczenia; "
            "nagrodę można wziąć tylko raz. Jeśli więcej niż 1 gracz ma wziąć "
            "płytkę Paktu handlowego jako premię za rozpatrzenie żetonu Kultury, "
            "bierzcie je w kolejności tur, zaczynając od aktywnego gracza. Po "
            "rozpatrzeniu usuń żeton Kultury z gry.")],
    ], size=20, color=INK)

    # ---- example: Danilo lower-right (green) ----
    p.cover((1276, 1400, 1609, 1611), GREEN)
    p.paragraphs((1286, 1406, 1603, 1606), [
        [bi("Przykład:"), it(" Danilo (niebieski) wykonuje Czerwoną akcję Ruchu. "
            "Po jego akcji żeton Kultury jest całkowicie otoczony jednostkami "
            "umieszczonymi na każdym z 3 sąsiednich Terytoriów. Żeton Kultury "
            "zostaje rozpatrzony: Danilo i Serena (fioletowy) zyskują po 2 Złoto. "
            "Następnie żeton Kultury usuwa się z gry.")],
    ], size=18, color=CAPINK, justify=False)

    out = "/home/user/workt/pl_rulebook/out-12.png"
    p.save(out)
    print("saved", out)

if __name__ == "__main__":
    build()
