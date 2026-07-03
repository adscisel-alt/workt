from common import *
from typeset import Page
import csv, os, subprocess

BLUE = (58, 106, 170)      # market "developed" note (blue on page)
BANTX = (238, 236, 227)    # mana banner light text

ORIG = "/root/.claude/uploads/760b14e1-1e2f-517a-8c89-c5f20f1f4524/pages/p-09.png"

def load_lines():
    """Reliable OCR lines in REF (1735) space, from a 1735px downscale.
    The full-res OCR that new(9) runs is flaky on this page (returns partial
    results), so we OCR a 1735-wide copy where pixel == ref coord."""
    tsv = "/tmp/ocr9s.tsv"
    if not os.path.exists(tsv) or os.path.getsize(tsv) < 100:
        from PIL import Image
        im = Image.open(ORIG).convert("RGB").resize((1735, 1735))
        im.save("/tmp/p9small.png")
        subprocess.run(["tesseract", "/tmp/p9small.png", "/tmp/ocr9s",
                        "--psm", "3", "tsv"], check=True,
                       stderr=subprocess.DEVNULL)
    rows = list(csv.DictReader(open(tsv), delimiter="\t"))
    groups = {}
    for w in rows:
        if w.get("level") != "5":
            continue
        t = (w["text"] or "").strip()
        try:
            c = float(w["conf"])
        except (TypeError, ValueError):
            c = -1
        if not t or c < 35:
            continue
        k = (w["block_num"], w["par_num"], w["line_num"])
        x0 = int(w["left"]); y0 = int(w["top"])
        x1 = x0 + int(w["width"]); y1 = y0 + int(w["height"])
        g = groups.setdefault(k, [1e9, 1e9, -1e9, -1e9, []])
        g[0] = min(g[0], x0); g[1] = min(g[1], y0)
        g[2] = max(g[2], x1); g[3] = max(g[3], y1); g[4].append(t)
    return [{"box": (g[0], g[1], g[2], g[3]), "text": " ".join(g[4])}
            for g in groups.values()]

def build():
    p = Page(9)
    p._lines = load_lines()

    # ================= LEFT COLUMN =================

    # --- A) Danilo green example (below world map) ---
    p.cover((108, 390, 844, 476), GREEN)
    p.paragraphs((120, 396, 836, 472), [
        [bi("Przykład:"), it(" Danilo (niebieski) wykonuje akcję Stworzenia i "
            "kontroluje 2 Sanktuaria. Ponieważ rozwinął tę Płytkę akcji, może "
            "wziąć dowolny typ surowca, ale oba muszą być takie same.")],
    ], size=19, color=CAPINK, justify=False)

    # --- B) 8 - SETTLEMENT INCOME ACTION (open bg) ---
    p.erase((240, 474, 728, 612), BG)
    p.cover((256, 478, 700, 502), BG)
    p.text((258, 480), "8 – AKCJA DOCHODU Z OSAD", style="sans_b", size=18, color=TEAL)
    p.paragraphs((258, 510, 718, 590), [
        [rg("Zbierz wszystkie odkryte nagrody (Wyznawców lub PZ) pokazane w "
            "obszarze Osad na twojej Planszy akcji. Będzie ona rosła w miarę "
            "budowania kolejnych Osad.")],
    ], size=19, color=INK)
    p.paragraphs((258, 590, 620, 612), [
        [rg("Zbierz dodatkowego Wyznawcę.")],
    ], size=19, color=PURPLE)

    # --- C) NEW FOLLOWERS (white panel) ---
    p.erase((136, 632, 824, 722), PANEL)
    p.cover((360, 634, 616, 660), PANEL)
    p.section_heading(486, 646, "NOWI WYZNAWCY", TEAL, 21)
    p.paragraphs((150, 668, 814, 718), [
        [rg("Za każdym razem, gdy zyskujesz nowego Wyznawcę z dowolnego źródła, "
            "musisz umieścić go na kontrolowanym przez siebie Terytorium "
            "zawierającym jedną z twoich Osad (Osada nie może być oblężona).")],
    ], size=19, color=INK)
    p.cover((814, 700, 834, 717), PANEL)   # stray English period at panel right

    # --- D) 9 - DOMINATION ACTION (open bg) ---
    p.erase((240, 768, 732, 892), BG)
    p.cover((256, 772, 620, 796), BG)
    p.text((258, 774), "9 – AKCJA DOMINACJI", style="sans_b", size=19, color=TEAL)
    p.paragraphs((258, 806, 726, 888), [
        [rg("Przesuń się o pewną liczbę pól (+1) po Torze dominacji zgodnie z "
            "płytką Celu po lewej stronie toru. Więcej szczegółów o płytkach "
            "Celu na stronie 13.")],
    ], size=19, color=INK)

    # --- E) DOMINATION TRACK (white panel) ---
    p.erase((132, 916, 826, 1346), PANEL)
    p.cover((350, 920, 620, 950), PANEL)
    p.section_heading(485, 935, "TOR DOMINACJI", TEAL, 21)
    p.paragraphs((148, 958, 816, 1342), [
        [rg("Niektóre efekty bonusowe (na Paktach handlowych, żetonach Kultury i "
            "kartach Bogów) pokazują symbol pozwalający przesunąć się o wskazaną "
            "liczbę pól po Torze dominacji. Jednak głównym sposobem posuwania "
            "się po Torze dominacji jest wykonanie głównej akcji Dominacji. "
            "Wtedy przesuwasz się o liczbę kroków zależną od płytki Celu "
            "umieszczonej po lewej stronie toru: robisz jeden krok za każde "
            "spełnienie wymagania.")],
        [rg("Gdy posuwasz się po Torze dominacji (w dowolny sposób), jeśli "
            "wejdziesz na pole lub miniesz pole zawierające żeton 2 PZ, "
            "zyskujesz 2 PZ, przesuwając swój znacznik o 2 pola na torze PZ. "
            "Usuń żeton z gry. "), bd("Tor dominacji zawiera też niebieską "
            "błyskawicę; nie możesz wejść na końcowe pola 3 Torów rozwoju (a "
            "tym samym wywołać końca gry), o ile nie przekroczyłeś tego progu "
            "na Torze dominacji."), rg(" Gdy dotrzesz do końcowego pola Toru "
            "dominacji, dalsze ruchy nie dają korzyści. Na koniec gry zyskujesz "
            "lub tracisz PZ zgodnie z tym, co pokazano pod twoją końcową "
            "pozycją na Torze dominacji.")],
    ], size=20, para_gap=0.35, color=INK)

    # --- F) Serena green example ---
    p.cover((108, 1482, 844, 1592), GREEN)
    p.paragraphs((118, 1486, 836, 1588), [
        [bi("Przykład:"), it(" Serena (fioletowy) wykonuje akcję Dominacji. "
            "Sprawdza płytkę Celu umieszczoną obok toru — pokazuje ona 3 "
            "jednostki. Serena ma w grze 5 Wyznawców i 1 Pomniejszego Boga (6 "
            "jednostek) na wszystkich planszach, więc przesuwa się o 2 pola do "
            "przodu. Mija żeton 2 PZ, więc usuwa go z gry i przesuwa swój "
            "znacznik punktacji o 2 pola.")],
    ], size=18, color=CAPINK, justify=False)

    # ================= RIGHT COLUMN =================

    # --- G) 10 - MARKET ACTION (open bg) ---
    p.erase((1018, 110, 1482, 250), BG)
    p.cover((1020, 114, 1300, 140), BG)
    p.text((1022, 116), "10 – AKCJA RYNKU", style="sans_b", size=19, color=TEAL)
    p.paragraphs((1022, 150, 1478, 200), [
        [rg("Możesz wymienić dowolny 1 surowiec na dowolne 2 inne surowce. "
            "Wszystkie 3 surowce muszą być różnych typów.")],
    ], size=19, color=INK)
    p.paragraphs((1022, 200, 1478, 248), [
        [it("Zamiast tego weź dowolne 2 różne surowce wedle wyboru. Wykonanie "
            "tej akcji nic nie kosztuje.")],
    ], size=19, color=BLUE, justify=False)

    # --- H) Simone green example (narrow right strip) ---
    p.cover((1428, 268, 1606, 542), GREEN)
    p.paragraphs((1434, 272, 1600, 538), [
        [bi("Przykład:"), it(" Simone (żółty) wykonuje akcję Rynku, wydaje 1 "
            "Metal i w zamian bierze 1 Złoto i 1 Drewno. Gdyby rozwinął tę "
            "akcję, nie musiałby wydawać Metalu.")],
    ], size=17, color=CAPINK, justify=False)

    # --- I) 2. MANA ACTION dark banner ---
    p.cover((921, 596, 1112, 620), (50, 45, 36))
    p.text((934, 599), "AKCJA MANY", style="sans_b", size=15, color=BANTX)

    # --- J) Mana intro (open bg) ---
    p.erase((876, 644, 1602, 702), BG)
    p.paragraphs((880, 648, 1598, 700), [
        [rg("Po ukończeniu Akcji Głównej możesz wykonać dokładnie 1 akcję Many "
            "spośród poniższych opcji. Te akcje pokazano po prawej stronie "
            "twojej Planszy akcji:")],
    ], size=19, color=INK)

    # --- K) Mana bullets (open bg) : erase text only, keep icons at x<1032 ---
    p.erase((1032, 700, 1606, 1242), BG)
    bullets = [
        (708, [[rg("• Wydaj 3 Kryształy Many, aby aktywować Czerwoną Płytkę akcji, "
                   "wykonując normalną akcję. Ta akcja nie może zostać użyta do "
                   "aktywowania Płytki akcji, na której stoi Pionek akcji.")]]),
        (808, [[rg("• Wydaj 2 Kryształy Many, aby aktywować Niebieską Płytkę akcji, "
                   "wykonując normalną akcję. Ta akcja nie może zostać użyta do "
                   "aktywowania Płytki akcji, na której stoi Pionek akcji.")]]),
        (912, [[rg("• Wydaj 1 Kryształ Many i 2 Metal, aby dodać 2 Zaawansowane "
                   "karty broni do ręki. Więcej szczegółów w panelu „Karty broni” "
                   "poniżej.")]]),
        (1006, [[rg("• Wydaj 1 Kryształ Many i 2 Złoto, aby Rozwinąć Technologię "
                    "(Płytkę akcji). Więcej szczegółów w panelu „Rozwiń "
                    "Technologię” na stronie 10.")]]),
        (1082, [[rg("• Wydaj 1 Kryształ Many i 2 Drewno, aby Zbudować Osadę (każde "
                    "Terytorium może mieć najwyżej jedną Osadę). Więcej "
                    "szczegółów w panelu „Zbuduj Osadę” na stronie 10.")]]),
        (1192, [[rg("• Wydaj 1 Kryształ Many i 2 Żywność, aby Zyskać 3 Wyznawców. "
                    "Więcej szczegółów w panelu „Zyskaj Wyznawców” na "
                    "stronie 10.")]]),
    ]
    for by, blk in bullets:
        p.paragraphs((1036, by, 1602, by + 78), blk, size=19, color=INK, justify=False)
    p.cover((1015, 1183, 1040, 1238), BG)   # stray slivers beside bullet 6 text

    # --- L) WEAPON CARDS (white panel) ---
    p.erase((904, 1310, 1602, 1596), PANEL)
    p.cover((1170, 1282, 1420, 1308), PANEL)
    p.section_heading(1372, 1294, "KARTY BRONI", TEAL, 20)
    p.paragraphs((910, 1312, 1596, 1592), [
        [rg("Są dwa typy Kart broni – Podstawowe (niebieski nagłówek) i "
            "Zaawansowane (czerwony nagłówek). Grę rozpoczynasz z 2 "
            "Podstawowymi kartami w ręce. Zaawansowane karty broni możesz zyskać "
            "na kilka sposobów w trakcie gry, głównie używając akcji Many, ale "
            "też dzięki bonusom na Paktach handlowych lub żetonach Kultury. Gdy "
            "zyskujesz Kartę broni, wybierasz dowolną kartę spośród tych nad "
            "twoją Planszą akcji (nie ujawniając wyboru innym graczom) i "
            "dodajesz ją do ręki. Trzymaj rękę w tajemnicy przed innymi "
            "graczami.")],
        [rg("Podstawowych kart broni nie można użyć, jeśli jesteś "), bd("atakującym"),
         rg(" – do ataku musisz mieć kartę Zaawansowaną. Po użyciu Podstawowa "
            "karta broni wraca nad twoją Planszę akcji. Użyte Zaawansowane karty "
            "broni również wracają nad twoją Planszę akcji.")],
        [rg("Użycie kart broni objaśniono w sekcji Rozstrzyganie bitew na "
            "stronie 11.")],
    ], size=19, para_gap=0.3, color=INK)

    out = "/home/user/workt/pl_rulebook/out-09.png"
    p.save(out)
    print("saved", out)

if __name__ == "__main__":
    build()
