/*
 * Bank pytań i haseł — Historia dla klasy IV
 * Treści oparte na podstawie programowej historii dla klasy IV szkoły podstawowej:
 *  - historia jako nauka (czas, źródła, praca historyka i archeologa),
 *  - legendy (Lech/Czech/Rus, Piast, Popiel, smok wawelski, Wanda),
 *  - najważniejsze postacie i wydarzenia z dziejów Polski,
 *  - symbole narodowe.
 *
 * Plik jest wczytywany zarówno przez wersję z Vite (import), jak i przez
 * samodzielny plik index.html (przez <script>), dlatego eksport jest podwójny.
 */

// ——————————————————————————————————————————————————————————
// 1) HASŁA DO GRY "WISIELEC" (słowo + podpowiedź)
// ——————————————————————————————————————————————————————————
const HASLA = [
  { slowo: 'MIESZKO',      wskazowka: 'Pierwszy władca Polski, przyjął chrzest w 966 r.' },
  { slowo: 'CHROBRY',      wskazowka: 'Przydomek Bolesława — pierwszego króla Polski.' },
  { slowo: 'GNIEZNO',      wskazowka: 'Pierwsza stolica Polski, tu zjazd w 1000 r.' },
  { slowo: 'ORZEL',        wskazowka: 'Biały ptak w godle Polski.' },
  { slowo: 'GRUNWALD',     wskazowka: 'Wielka bitwa z Krzyżakami w 1410 r.' },
  { slowo: 'JAGIELLO',     wskazowka: 'Król Władysław, zwycięzca spod Grunwaldu.' },
  { slowo: 'KOPERNIK',     wskazowka: '„Wstrzymał Słońce, ruszył Ziemię”.' },
  { slowo: 'JADWIGA',      wskazowka: 'Królowa Polski, odnowiła Akademię Krakowską.' },
  { slowo: 'SOBIESKI',     wskazowka: 'Król Jan III, obronił Wiedeń w 1683 r.' },
  { slowo: 'KOSCIUSZKO',   wskazowka: 'Naczelnik powstania w 1794 r., bohater dwóch narodów.' },
  { slowo: 'PILSUDSKI',    wskazowka: 'Marszałek, Polska odzyskała z nim niepodległość w 1918 r.' },
  { slowo: 'SKLODOWSKA',   wskazowka: 'Maria, dwukrotna noblistka, odkryła polon i rad.' },
  { slowo: 'HYMN',         wskazowka: 'Mazurek Dąbrowskiego to nasz narodowy…' },
  { slowo: 'FLAGA',        wskazowka: 'Biało-czerwony symbol narodowy.' },
  { slowo: 'ZRODLO',       wskazowka: 'Ślad przeszłości, który bada historyk.' },
  { slowo: 'KRONIKA',      wskazowka: 'Dawny zapis wydarzeń rok po roku.' },
  { slowo: 'ARCHEOLOG',    wskazowka: 'Naukowiec, który prowadzi wykopaliska.' },
  { slowo: 'PIAST',        wskazowka: 'Legendarny kołodziej, protoplasta dynastii.' },
  { slowo: 'POPIEL',       wskazowka: 'Legendarny książę zjedzony przez myszy.' },
  { slowo: 'SMOK',         wskazowka: 'Straszył mieszkańców u stóp Wawelu.' },
  { slowo: 'WANDA',        wskazowka: 'Legendarna księżniczka, „co nie chciała Niemca”.' },
  { slowo: 'WAWEL',        wskazowka: 'Wzgórze i zamek królów w Krakowie.' },
  { slowo: 'CHRZEST',      wskazowka: 'Wydarzenie z 966 r. — początek chrześcijaństwa w Polsce.' },
  { slowo: 'ZAMEK',        wskazowka: 'Warowna siedziba króla lub rycerza.' },
  { slowo: 'RYCERZ',       wskazowka: 'Zbrojny wojownik w zbroi, dawniej na koniu.' },
];

// ——————————————————————————————————————————————————————————
// 2) PYTANIA QUIZOWE (do gry zręcznościowej i teleturnieju)
//    Każde pytanie: treść, 3–4 odpowiedzi, indeks poprawnej.
//    Pogrupowane w kategorie i poziomy trudności (punkty).
// ——————————————————————————————————————————————————————————
const KATEGORIE = [
  {
    nazwa: 'Historia jako nauka',
    pytania: [
      { p: 100, q: 'Czym zajmuje się historia?', o: ['Badaniem przeszłości', 'Badaniem pogody', 'Liczeniem gwiazd'], k: 0 },
      { p: 200, q: 'Kto prowadzi wykopaliska, aby poznać przeszłość?', o: ['Piekarz', 'Archeolog', 'Kierowca'], k: 1 },
      { p: 300, q: 'Co to jest źródło historyczne?', o: ['Rzeka w górach', 'Ślad przeszłości', 'Rodzaj mapy pogody'], k: 1 },
      { p: 400, q: 'Ile lat trwa jeden wiek (stulecie)?', o: ['10 lat', '50 lat', '100 lat'], k: 2 },
      { p: 500, q: 'W którym wieku był rok 1410?', o: ['XIII wiek', 'XV wiek', 'XVII wiek'], k: 1 },
    ],
  },
  {
    nazwa: 'Legendy polskie',
    pytania: [
      { p: 100, q: 'Który brat z legendy założył państwo Polan?', o: ['Lech', 'Czech', 'Rus'], k: 0 },
      { p: 200, q: 'Jakie zwierzę zjadło złego księcia Popiela?', o: ['Wilki', 'Myszy', 'Kruki'], k: 1 },
      { p: 300, q: 'Kim był legendarny Piast?', o: ['Rycerzem', 'Kołodziejem', 'Kupcem'], k: 1 },
      { p: 400, q: 'Kto pokonał smoka wawelskiego, dając mu owcę z siarką?', o: ['Szewczyk Dratewka', 'Król Krak osobiście', 'Rycerz Zawisza'], k: 0 },
      { p: 500, q: 'Gniazdo jakiego ptaka ujrzał Lech, zakładając Gniezno?', o: ['Bociana', 'Białego orła', 'Sokoła'], k: 1 },
    ],
  },
  {
    nazwa: 'Władcy Polski',
    pytania: [
      { p: 100, q: 'Kto był pierwszym władcą Polski?', o: ['Mieszko I', 'Bolesław Chrobry', 'Kazimierz Wielki'], k: 0 },
      { p: 200, q: 'Kto był pierwszym koronowanym królem Polski?', o: ['Mieszko I', 'Bolesław Chrobry', 'Władysław Jagiełło'], k: 1 },
      { p: 300, q: 'O którym królu mówi się: „zastał Polskę drewnianą, a zostawił murowaną”?', o: ['Kazimierz Wielki', 'Jan III Sobieski', 'Bolesław Krzywousty'], k: 0 },
      { p: 400, q: 'Który król obronił Wiedeń w 1683 roku?', o: ['Władysław Jagiełło', 'Jan III Sobieski', 'Zygmunt Stary'], k: 1 },
      { p: 500, q: 'Która królowa przyczyniła się do odnowienia Akademii Krakowskiej?', o: ['Królowa Bona', 'Królowa Jadwiga', 'Królowa Wanda'], k: 1 },
    ],
  },
  {
    nazwa: 'Wielcy Polacy',
    pytania: [
      { p: 100, q: 'Kto „wstrzymał Słońce i ruszył Ziemię”?', o: ['Mikołaj Kopernik', 'Jan Matejko', 'Fryderyk Chopin'], k: 0 },
      { p: 200, q: 'Maria Skłodowska-Curie odkryła dwa pierwiastki. Jeden nazwała…', o: ['Polon', 'Żelazo', 'Złoto'], k: 0 },
      { p: 300, q: 'Kto był naczelnikiem powstania w 1794 roku?', o: ['Tadeusz Kościuszko', 'Józef Piłsudski', 'Romuald Traugutt'], k: 0 },
      { p: 400, q: 'Kto napisał słowa „Mazurka Dąbrowskiego” — polskiego hymnu?', o: ['Józef Wybicki', 'Adam Mickiewicz', 'Jan Kochanowski'], k: 0 },
      { p: 500, q: 'Który Polak został papieżem w 1978 roku?', o: ['Prymas Wyszyński', 'Karol Wojtyła (Jan Paweł II)', 'Ksiądz Twardowski'], k: 1 },
    ],
  },
  {
    nazwa: 'Daty i symbole',
    pytania: [
      { p: 100, q: 'Jakie kolory ma flaga Polski?', o: ['Biały i czerwony', 'Czerwony i zielony', 'Biały i niebieski'], k: 0 },
      { p: 200, q: 'W którym roku Mieszko I przyjął chrzest?', o: ['966', '1410', '1918'], k: 0 },
      { p: 300, q: 'W którym roku odbyła się bitwa pod Grunwaldem?', o: ['1000', '1410', '1683'], k: 1 },
      { p: 400, q: 'W którym roku Polska odzyskała niepodległość?', o: ['1795', '1918', '1945'], k: 1 },
      { p: 500, q: 'Co przedstawia godło Polski?', o: ['Białego orła w koronie', 'Czerwonego lwa', 'Złotego smoka'], k: 0 },
    ],
  },
];

// Spłaszczona lista wszystkich pytań (przydatna w grze zręcznościowej).
const WSZYSTKIE_PYTANIA = KATEGORIE.flatMap((kat) =>
  kat.pytania.map((it) => ({ ...it, kategoria: kat.nazwa }))
);

// Podwójny eksport: dla modułów (Vite) i dla zwykłego <script> (plik lokalny).
if (typeof module !== 'undefined' && module.exports) {
  module.exports = { HASLA, KATEGORIE, WSZYSTKIE_PYTANIA };
}
if (typeof window !== 'undefined') {
  window.GRA_DANE = { HASLA, KATEGORIE, WSZYSTKIE_PYTANIA };
}
