# Game Design Document — GODZINA „W”

## 1. Wizja

Gra przeglądarkowa typu **escape room**, w której gracz — łączniczka/łącznik
AK — przenosi meldunek przez Warszawę w czasie powstania (VIII–X 1944).
Cel edukacyjny: gracz **rozwiązuje zagadki oparte na prawdziwych realiach**
(szyfry, Morse, topografia kanałów) i mimochodem uczy się faktów, które gra
utrwala w „notatniku historycznym”.

**Filary projektu:**
1. *Autentyczność* — każda zagadka wyrasta z prawdziwego elementu powstania.
2. *Szacunek* — opowiadamy o odwadze, łączności i pamięci; bez brutalności,
   bez trywializowania tragedii (patrz §7).
3. *Krótka pełna sesja* — całość do przejścia w jednej lekcji (30–45 min
   sprawnej gry przy limicie 63 min).

## 2. Gracz docelowy

Uczniowie od ~12 lat, nauczyciele historii, rodziny. Bez wymagań sprzętowych:
dowolna przeglądarka, także telefon. Gra jednoosobowa (dobrze działa też
sterowana wspólnie na rzutniku).

## 3. Główna pętla rozgrywki

```
wejdź do pokoju → czytaj narrację → badaj hotspoty (przedmioty/wskazówki/notatki)
→ rozwiąż zagadkę pokoju → notatka „Czy wiesz, że…” → następny pokój
```

Napięcie buduje **zegar 63 minut** (1 minuta = 1 dzień powstania). Czas to
zasób: podpowiedzi (−2 min), błędne odpowiedzi (−30 s) i złe skręty w kanałach
(−2 min) go zużywają. **Porażka nie istnieje** — po wyczerpaniu czasu gra
przechodzi w „tryb pamięci” i pozwala dokończyć misję (wynik oznaczony jako
„po czasie”). Decyzja projektowa: frustracja nie może zablokować celu
edukacyjnego.

## 4. Struktura etapów

| # | Pokój | Data w grze | Zagadka (typ) | Czego uczy |
|---|---|---|---|---|
| 1 | Konspiracyjne mieszkanie | 31 VII | zamek szyfrowy `01081700` (kod) | data i godzina Godziny „W”, konspiracja |
| 2 | Harcerska Poczta Polowa | 6 VIII | szyfr GA-DE-RY-PO-LU-KI (kod) | Zawiszacy, poczta polowa, szyfry harcerskie |
| 3 | Radiostacja „Błyskawica” | 12 VIII | depesza Morse’a `WOLNOSC` (morse) | rola radiostacji, alfabet Morse’a |
| 4 | Szpital polowy | 28 VIII | dedukcja: sale 7-3-5 (kod) | służba sanitarna, warunki na Starówce |
| 5 | Kanały | 1 IX | labirynt `P-L-L-P-P` (kanaly) | ewakuacja Starówki, trasa Krasińskich→Warecka |
| 6 | Odprawa | 2 X | quiz 5 pytań (quiz) | synteza: dowódcy, daty, symbole, Gęsiówka |

**Projekt między-pokojowy:** plan kanałów jest podzielony na 3 fragmenty
znajdowane w pokojach 2–4, a latarka (pokój 1) i klucz do włazu (nagroda
w pokoju 4) są wymagane w pokoju 5. To nagradza dokładne badanie pokoi
i spina etapy w jedną misję.

## 5. Systemy

- **Hotspoty** — 4–5 klikalnych miejsc w pokoju; typy zawartości: przedmiot,
  wskazówka do zagadki, notatka historyczna (czysta ciekawostka).
- **Ekwipunek** — przedmioty fabularne; niektóre odblokowują etapy.
- **Notatnik historyczny** — wszystkie zdobyte notatki; zostaje dostępny na
  ekranie końcowym (gra jako „ściąga” po lekcji).
- **Podpowiedzi** — do 3 na zagadkę, stopniowane (naprowadzenie → zawężenie →
  rozwiązanie), każda kosztuje 2 minuty. Uczciwe wobec gracza i odporne na
  utknięcie.
- **Osiągnięcia (6)** — nagradzają styl gry: bez podpowiedzi, bezbłędne kanały,
  zbadanie wszystkiego, bezbłędny quiz, zapas czasu, ukończenie.
- **Dźwięk** — Web Audio API: klik, błąd, fanfara, autentyczne sygnały Morse’a
  (kropka 90 ms, kreska 3×). Wyłączalny; zagadka Morse’a ma zapis wizualny,
  więc dźwięk nie jest wymagany (dostępność).
- **Autozapis** — po każdej akcji; wznowienie z ekranu startowego.

## 6. Interfejs i styl

Motyw „nocna Warszawa”: grafit, cegła/rdza (czerwień opaski), mosiężne złoto,
sepia papieru na notatkach. Typografia szeryfowa (klimat dokumentów epoki),
kody i zegar czcionką monospace. Ikonografia emoji zamiast grafik —
świadomy wybór na semestr: zero zasobów binarnych, łatwe zmiany; w planach
rozszerzeń możliwa podmiana na ilustracje.

## 7. Wrażliwość tematu

Gra dotyczy prawdziwej tragedii. Zasady treści:
- gracz jest **łącznikiem** — nosi meldunki i leki, nie walczy;
- przemoc jest tłem historycznym (wspominana w notatkach), nigdy mechaniką;
- liczby ofiar podajemy w notatkach rzetelnie, bez epatowania;
- ton zakończenia: pamięć i wdzięczność („Cześć ich pamięci”), nie „wygrana”.

## 8. Poziom trudności — kalibracja

Docelowo pierwsza rozgrywka bez podpowiedzi: 35–50 min. Wskaźniki do
sprawdzenia w testach z graczami (tydzień 11 planu): odsetek użycia
podpowiedzi na zagadkę (>60% = zagadka za trudna), liczba błędnych prób
na zamkach, czas w kanałach.
