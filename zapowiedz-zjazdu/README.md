# Zapowiedź: Jubileuszowy 10. Zjazd Przyjaciół (26–30 maja 2027)

Skrypty, z których powstał film zapowiadający zjazd w Grand Marina Resort
(jezioro Dzierżno Małe, Górny Śląsk). Gotowy film, `zapowiedz_zjazd_2027.mp4`,
nie jest trzymany w repozytorium (za duży). Można go odtworzyć tymi skryptami.

- Film: 1920×1080, 30 kl./s, 1:52, ok. 8 Mb/s (116 MB), dźwięk AAC −14 LUFS (poziom głośności zalecany dla Facebooka).
  Lżejsza wersja 720p (35 MB) do wysyłania przez WhatsApp/Messenger.
- Muzyka: oryginalna kompozycja (`music.py`), bez praw autorskich osób trzecich,
  więc Facebook nie powinien jej wyciszyć ani zablokować.
  Sample instrumentów: FluidR3_GM (licencja MIT), a uderzenia, narastania i talerze są syntezowane.
- Czcionki: Cinzel, Montserrat, Great Vibes (Google Fonts, licencja OFL).

## Odtworzenie filmu

```
src/      v1.mp4 … v5.mp4 (filmy z WhatsAppa) oraz 1.jpg … 5.jpg (zdjęcia)
fonts/    ZjCinzelBold/Black, ZjMontLight/Semi/XBold (statyczne wersje czcionek), GreatVibes
```

```sh
./fetch_samples.sh                       # sample orkiestrowe do samples/
python3 music.py samples music_v2.wav    # podkład muzyczny (96 BPM, takt = 2,5 s)
python3 build.py shots                   # ujęcia: stabilizacja, płynne spowolnienie, 1080p, kolory
python3 build.py ass                     # animowane napisy (titles.ass)
python3 build.py final                   # montaż, przejścia, błyski, mastering -> out/
```

Oś czasu (`TL` w `build.py`) jest zgrana z muzyką: każde cięcie wypada na początku taktu,
a mocne uderzenia (15 s, 75 s, 95 s, 105 s) mają białe błyski obrazu.

## Wersja 2 (oryginalne nagrania i zdjęcia)

`build2.py` i `music2.py` składają nowszą wersję, ok. 1:59:
- otwiera ją plansza „JUBILEUSZ / 10. / ZJAZD PRZYJACIÓŁ”, a potem idzie wstęp z drona
  (nagranie ekranu z Facebooka, bez napisu „Plenerowe śluby…”, oczyszczone do 25 kl./s),
- ujęcia nagrane telefonem są w oryginale (720p), a zdjęcia mają do 4000 px,
- są w niej kolaże pokoi i atrakcji oraz kwadratowe nagranie sali bankietowej na rozmytym tle,
- podkład ma 47 taktów i jest zgrany z nowym układem.

```sh
python3 music2.py samples music2.wav
python3 build2.py shots && python3 build2.py ass && python3 build2.py final
```

Pliki źródłowe: `src2/` (zdjęcia, klatka z drona), `orig/` (drone25.mp4, a1–a3.mp4, b1_sala.mp4).

## Fragmenty z Facebooka

Środowisko, w którym powstał film, nie miało dostępu do facebook.com, więc tych ujęć jeszcze
w filmie nie ma. Po pobraniu plików (zapisz filmy na telefonie i prześlij je jak filmy z WhatsAppa)
trzeba będzie dodać:

1. wstęp: 0:00–0:20 z `fb.watch/v/1dXV4mNk5`,
2. zakończenie: od 1:18 do końca tego samego filmu,
3. dwa pionowe filmy (`share/r/1H5XFRpjvm`, `share/v/1c9DAwxNVo`) obok siebie, lekko skrócone,
4. fragment 0:54–1:11 z `share/v/1EpQzQbTWM`.
