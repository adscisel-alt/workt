/*
  Wehikuł czasu — podróż przez dzieje Polski
  ------------------------------------------
  Baza treści dla gry (klasa IV, podstawa programowa: postacie i wydarzenia
  od legend po Mikołaja Kopernika).

  Wszystko jest tu zebrane w jednym pliku, żeby nauczyciel mógł łatwo
  dopisać własne pytania — wystarczy dodać kolejny obiekt do odpowiedniej listy.

  Format pytania:
    { q: 'treść pytania', opcje: ['A','B','C','D'], poprawna: 0, wskazowka: '...' }
    ( poprawna = numer właściwej odpowiedzi, licząc od 0 )
*/

// ------------------------------------------------------------------
//  KRAINY (epoki) — kolory i opis, po których podróżuje wehikuł
// ------------------------------------------------------------------
const REGIONY = [
  { id: 'legendy',   nazwa: 'Kraina Legend',                 kolor: 0x2f9e44, hex: '#2f9e44', ikona: '🐉', opis: 'Lech, Piast i smok wawelski' },
  { id: 'mieszko',   nazwa: 'Państwo Mieszka i Chrobrego',   kolor: 0x1971c2, hex: '#1971c2', ikona: '⛪', opis: 'Chrzest Polski i pierwszy król' },
  { id: 'kazimierz', nazwa: 'Zamek Kazimierza Wielkiego',    kolor: 0xb0803a, hex: '#b0803a', ikona: '🏰', opis: 'Polska murowana i Akademia' },
  { id: 'jadwiga',   nazwa: 'Dwór Jadwigi i Jagiełły',       kolor: 0x9c36b5, hex: '#9c36b5', ikona: '👑', opis: 'Unia Polski i Litwy' },
  { id: 'grunwald',  nazwa: 'Pola Grunwaldu',                kolor: 0xc92a2a, hex: '#c92a2a', ikona: '⚔️', opis: 'Wielka bitwa 1410 roku' },
  { id: 'kopernik',  nazwa: 'Wieża Kopernika',               kolor: 0x3b5bdb, hex: '#3b5bdb', ikona: '🔭', opis: 'Wstrzymał Słońce, ruszył Ziemię' },
];

// ------------------------------------------------------------------
//  KARTY PYTAŃ — pogrupowane według krain (zwykłe pola „?")
// ------------------------------------------------------------------
const PYTANIA = {
  legendy: [
    { q: 'Który biedny kołodziej z legendy dał początek rodowi polskich władców?', opcje: ['Piast', 'Popiel', 'Krak', 'Lech'], poprawna: 0, wskazowka: 'Od jego imienia pochodzi nazwa dynastii — Piastowie.' },
    { q: 'Gdzie według legendy mieszkał smok pokonany przez szewczyka Skubę (Dratewkę)?', opcje: ['Pod Wawelem w Krakowie', 'W Gnieźnie', 'Na Śnieżce', 'W Warszawie'], poprawna: 0, wskazowka: 'Jego jama była w skale nad Wisłą, w Krakowie.' },
    { q: 'Trzej bracia z legendy założyli państwa. Jak mieli na imię?', opcje: ['Lech, Czech i Rus', 'Piast, Popiel i Krak', 'Wars, Sawa i Lech', 'Mieszko, Bolesław i Kazimierz'], poprawna: 0, wskazowka: 'Lech został u nas, Czech i Rus poszli dalej.' },
    { q: 'Jakiego ptaka gniazdo zobaczył Lech i dlatego założył tam gród Gniezno?', opcje: ['Białego orła', 'Czarnego kruka', 'Bociana', 'Sokoła'], poprawna: 0, wskazowka: 'Ten sam ptak jest dziś w godle Polski.' },
    { q: 'Zły książę z legendy, którego według podania zjadły myszy, to...', opcje: ['Popiel', 'Piast', 'Lech', 'Krak'], poprawna: 0, wskazowka: 'Uciekał przed myszami do wieży w Kruszwicy.' },
    { q: 'Obrazkowe 🦅 — co przedstawia godło (herb) Polski?', opcje: ['Białego orła w koronie', 'Złotego lwa', 'Czarnego niedźwiedzia', 'Srebrną rybę'], poprawna: 0, wskazowka: 'Biały, z rozpostartymi skrzydłami, na czerwonym tle.' },
  ],
  mieszko: [
    { q: 'W którym roku odbył się chrzest Polski?', opcje: ['966', '1000', '1025', '1410'], poprawna: 0, wskazowka: 'To jedna z najważniejszych dat w historii Polski.' },
    { q: 'Który władca przyjął chrzest i uznawany jest za pierwszego historycznego władcę Polski?', opcje: ['Mieszko I', 'Bolesław Chrobry', 'Kazimierz Wielki', 'Władysław Jagiełło'], poprawna: 0, wskazowka: 'To ojciec Bolesława Chrobrego.' },
    { q: 'Jak nazywała się czeska księżniczka, żona Mieszka I?', opcje: ['Dobrawa (Dąbrówka)', 'Jadwiga', 'Wanda', 'Rycheza'], poprawna: 0, wskazowka: 'To ona namówiła Mieszka do przyjęcia chrztu.' },
    { q: 'Kto był pierwszym koronowanym królem Polski (koronacja w 1025 r.)?', opcje: ['Bolesław Chrobry', 'Mieszko I', 'Kazimierz Wielki', 'Zawisza Czarny'], poprawna: 0, wskazowka: 'Syn Mieszka I, „Chrobry" znaczy „dzielny".' },
    { q: 'Biskup i męczennik, którego relikwie spoczęły w Gnieźnie, to święty...', opcje: ['Wojciech', 'Stanisław', 'Florian', 'Jerzy'], poprawna: 0, wskazowka: 'Zginął podczas misji wśród pogańskich Prusów.' },
    { q: 'Przyjęcie chrztu w 966 r. sprawiło, że Polska stała się państwem...', opcje: ['chrześcijańskim', 'pogańskim', 'wyspiarskim', 'cesarskim'], poprawna: 0, wskazowka: 'Weszła do grona państw wyznających jedną wiarę z resztą Europy.' },
  ],
  kazimierz: [
    { q: 'Które powiedzenie najlepiej opisuje Kazimierza Wielkiego?', opcje: ['„Zastał Polskę drewnianą, a zostawił murowaną"', '„Wstrzymał Słońce, ruszył Ziemię"', '„Przybyłem, zobaczyłem, zwyciężyłem"', '„Nie rzucim ziemi"'], poprawna: 0, wskazowka: 'Budował z cegły i kamienia zamki oraz miasta.' },
    { q: 'Jaką słynną uczelnię ufundował Kazimierz Wielki w 1364 r.?', opcje: ['Akademię Krakowską', 'Akademię Gdańską', 'Szkołę Rycerską', 'Akademię Wileńską'], poprawna: 0, wskazowka: 'Dziś nosi nazwę Uniwersytet Jagielloński.' },
    { q: 'Z jakiej dynastii pochodził Kazimierz Wielki — jej ostatni król?', opcje: ['Piastów', 'Jagiellonów', 'Wazów', 'Sasów'], poprawna: 0, wskazowka: 'Ta sama dynastia co Mieszko I i Bolesław Chrobry.' },
    { q: 'W którym mieście, na wzgórzu Wawel, stał zamek Kazimierza Wielkiego?', opcje: ['W Krakowie', 'W Gnieźnie', 'W Toruniu', 'W Warszawie'], poprawna: 0, wskazowka: 'To była wtedy stolica Polski.' },
    { q: 'Za co jeszcze zasłynął król Kazimierz Wielki?', opcje: ['Budował zamki i murowane miasta', 'Odkrył Amerykę', 'Wynalazł druk', 'Namalował Damę z gronostajem'], poprawna: 0, wskazowka: 'Dlatego mówi się, że zostawił Polskę „murowaną".' },
  ],
  jadwiga: [
    { q: 'Kto odnowił i wyposażył Akademię Krakowską, zapisując jej swój majątek?', opcje: ['Królowa Jadwiga', 'Królowa Bona', 'Dobrawa', 'Wanda'], poprawna: 0, wskazowka: 'Ta sama królowa, która połączyła Polskę z Litwą.' },
    { q: 'Z jakim krajem Polska zawarła unię dzięki małżeństwu królowej Jadwigi?', opcje: ['Z Litwą', 'Z Czechami', 'Z Węgrami', 'Z Rusią'], poprawna: 0, wskazowka: 'Powstało wielkie państwo dwóch narodów.' },
    { q: 'Jak nazywał się litewski książę, mąż Jadwigi, który został królem Polski?', opcje: ['Władysław Jagiełło', 'Bolesław Chrobry', 'Kazimierz Wielki', 'Mieszko I'], poprawna: 0, wskazowka: 'Dowodził wojskami pod Grunwaldem.' },
    { q: 'Dynastia zapoczątkowana przez Władysława Jagiełłę to...', opcje: ['Jagiellonowie', 'Piastowie', 'Wazowie', 'Sasi'], poprawna: 0, wskazowka: 'Nazwa pochodzi od imienia Jagiełło.' },
    { q: 'Jadwiga, choć była kobietą, została w Krakowie koronowana jako...', opcje: ['król Polski', 'księżna', 'cesarzowa', 'namiestnik'], poprawna: 0, wskazowka: 'Tytuł brzmiał „król", a nie „królowa".' },
  ],
  grunwald: [
    { q: 'W którym roku odbyła się bitwa pod Grunwaldem?', opcje: ['1410', '966', '1364', '1543'], poprawna: 0, wskazowka: 'Wielkie zwycięstwo na początku XV wieku.' },
    { q: 'Z kim Polska i Litwa walczyły pod Grunwaldem?', opcje: ['Z Krzyżakami', 'Z Tatarami', 'Ze Szwedami', 'Z Turkami'], poprawna: 0, wskazowka: 'To był zakon rycerski w białych płaszczach z czarnym krzyżem.' },
    { q: 'Słynny rycerz, wzór honoru i odwagi, uczestnik bitwy pod Grunwaldem, to...', opcje: ['Zawisza Czarny', 'Wit Stwosz', 'Jan Długosz', 'Wars'], poprawna: 0, wskazowka: 'Do dziś mówimy: „polegać jak na Zawiszy".' },
    { q: 'Kto dowodził połączonymi wojskami polsko-litewskimi pod Grunwaldem?', opcje: ['Władysław Jagiełło', 'Kazimierz Wielki', 'Mieszko I', 'Bolesław Chrobry'], poprawna: 0, wskazowka: 'To mąż królowej Jadwigi.' },
    { q: 'Czym zakończyła się bitwa pod Grunwaldem?', opcje: ['Zwycięstwem Polski i Litwy', 'Zwycięstwem Krzyżaków', 'Rozejmem bez walki', 'Ucieczką króla'], poprawna: 0, wskazowka: 'Zakon krzyżacki poniósł wielką klęskę.' },
  ],
  kopernik: [
    { q: 'Czym najbardziej zasłynął Mikołaj Kopernik?', opcje: ['Udowodnił, że Ziemia krąży wokół Słońca', 'Namalował Mona Lisę', 'Zbudował pierwszy samolot', 'Odkrył Amerykę'], poprawna: 0, wskazowka: 'Wcześniej ludzie sądzili, że to Słońce krąży wokół Ziemi.' },
    { q: 'Dokończ powiedzenie o Koperniku: „Wstrzymał Słońce, ..."', opcje: ['„...ruszył Ziemię"', '„...zgasił gwiazdy"', '„...zbudował most"', '„...pokonał smoka"'], poprawna: 0, wskazowka: 'Chodzi o to, że to Ziemia się porusza.' },
    { q: 'W którym mieście urodził się Mikołaj Kopernik?', opcje: ['W Toruniu', 'W Krakowie', 'W Gnieźnie', 'W Warszawie'], poprawna: 0, wskazowka: 'Miasto nad Wisłą, słynne też z pierników.' },
    { q: 'Co według Kopernika znajduje się w środku Układu Słonecznego?', opcje: ['Słońce', 'Ziemia', 'Księżyc', 'Mars'], poprawna: 0, wskazowka: 'Dlatego mówimy o teorii „słonecznej" (heliocentrycznej).' },
    { q: 'Kim jeszcze, poza astronomem, był Mikołaj Kopernik?', opcje: ['Lekarzem i matematykiem', 'Żeglarzem', 'Malarzem', 'Kowalem'], poprawna: 0, wskazowka: 'Był człowiekiem o wielu talentach.' },
  ],
};

// ------------------------------------------------------------------
//  KARTY TRUDNE — tylko na specjalnych polach z ŻETONEM EPOKI
//  Poprawna odpowiedź daje żeton czasu (potrzeba 3, aby dotrzeć do mety).
// ------------------------------------------------------------------
const PYTANIA_TRUDNE = {
  legendy: [
    { q: 'ŻETON CZASU 🟢  Jak miała na imię córka Kraka, która wg legendy dała nazwę rzece Wiśle?', opcje: ['Wanda', 'Dobrawa', 'Jadwiga', 'Sawa'], poprawna: 0, wskazowka: '„Wanda, co nie chciała Niemca".' },
  ],
  mieszko: [
    { q: 'ŻETON CZASU 🔵  Z jakiego plemienia wywodził się Mieszko I?', opcje: ['Polan', 'Wiślan', 'Mazowszan', 'Ślężan'], poprawna: 0, wskazowka: 'Od nich pochodzi nazwa „Polska".' },
  ],
  kazimierz: [
    { q: 'ŻETON CZASU 🟠  W którym roku Kazimierz Wielki założył Akademię Krakowską?', opcje: ['1364', '966', '1410', '1525'], poprawna: 0, wskazowka: 'W XIV wieku, prawie 400 lat po chrzcie Polski.' },
  ],
  jadwiga: [
    { q: 'ŻETON CZASU 🟣  Jak nazywała się dynastia panująca w Polsce po Jadwidze i Jagielle?', opcje: ['Jagiellonowie', 'Piastowie', 'Wazowie', 'Habsburgowie'], poprawna: 0, wskazowka: 'Od imienia męża Jadwigi.' },
  ],
  grunwald: [
    { q: 'ŻETON CZASU 🔴  Jak nazywał się wielki mistrz krzyżacki, który poległ pod Grunwaldem?', opcje: ['Ulrich von Jungingen', 'Zawisza Czarny', 'Jan Długosz', 'Otton III'], poprawna: 0, wskazowka: 'Był dowódcą zakonu krzyżackiego.' },
  ],
  kopernik: [
    { q: 'ŻETON CZASU 🔷  Jak nazywało się najsłynniejsze dzieło Mikołaja Kopernika?', opcje: ['„O obrotach sfer niebieskich"', '„Bogurodzica"', '„Kronika polska"', '„Ogniem i mieczem"'], poprawna: 0, wskazowka: 'Opisał w nim, jak planety krążą wokół Słońca.' },
  ],
};

// ------------------------------------------------------------------
//  KARTY WYDARZEŃ — element losowy i fabularny (uczy chronologii)
//  ruch: liczba pól ( + do przodu, - do tyłu ), lub 'czekaj' = tracisz kolejkę
// ------------------------------------------------------------------
const WYDARZENIA = [
  { t: 'Bierzesz udział w chrzcie Polski w 966 roku — to wielkie święto! Przesuń się o 2 pola do przodu.', ruch: 2 },
  { t: 'Zgubiłeś się w puszczy w drodze na zjazd gnieźnieński — czekasz jedną kolejkę.', ruch: 'czekaj' },
  { t: 'Legenda o Lechu wskazuje drogę — biały orzeł prowadzi Twój wehikuł 1 pole do przodu.', ruch: 1 },
  { t: 'Smok wawelski zagrodził drogę! Musisz go ominąć — cofnij się o 2 pola.', ruch: -2 },
  { t: 'Zostajesz pasowany na rycerza na dworze Jagiełły — z dumą ruszasz o 3 pola naprzód.', ruch: 3 },
  { t: 'Koń poniósł w drodze pod Grunwald — wróć o 1 pole.', ruch: -1 },
  { t: 'Kazimierz Wielki buduje nowy, murowany most — szybko przekraczasz rzekę: 2 pola do przodu.', ruch: 2 },
  { t: 'Zaczytałeś się w księgach Akademii Krakowskiej i straciłeś rachubę czasu — tracisz kolejkę.', ruch: 'czekaj' },
  { t: 'Mikołaj Kopernik pożycza Ci swój teleskop — widzisz już metę! Idź 2 pola do przodu.', ruch: 2 },
  { t: 'Awaria wehikułu czasu! Stoisz jedną kolejkę na naprawę silnika.', ruch: 'czekaj' },
  { t: 'Poselstwo od królowej Jadwigi przyspiesza Twoją podróż — 1 pole do przodu.', ruch: 1 },
  { t: 'Burza nad Bałtykiem znosi wehikuł z kursu — cofasz się o 1 pole.', ruch: -1 },
];

// ------------------------------------------------------------------
//  KARTY WYZWAŃ — zadania dla całej drużyny (ocenia nauczyciel)
//  Udane wyzwanie = dodatkowy ruch o 2 pola do przodu.
// ------------------------------------------------------------------
const WYZWANIA = [
  'Pokażcie kalamburem (bez słów) bitwę pod Grunwaldem.',
  'Ułóżcie z rozsypanki i podajcie na głos datę chrztu Polski:  9 · 6 · 6.',
  'Dokończcie legendę jednym zdaniem: „Szewczyk Skuba nakarmił smoka barankiem, w którym była…".',
  'Wymieńcie chórem trzy zamki lub miasta zbudowane za czasów Kazimierza Wielkiego.',
  'Narysujcie palcem w powietrzu godło Polski i powiedzcie, jaki to ptak.',
  'Zaśpiewajcie lub wyrecytujcie pierwszy wers hymnu Polski.',
  'Odegrajcie krótką scenkę: „Mieszko I przyjmuje chrzest". Każdy gra inną postać.',
  'Ustawcie się w kolejności chronologicznej trzy daty: 966, 1410, 1543.',
  'Pokażcie gestami, jak Mikołaj Kopernik obserwuje gwiazdy przez lunetę.',
  'Wymieńcie trzech władców Polski z tej gry w kolejności, w jakiej panowali.',
];

// Udostępniamy dane globalnie (gra.js wczytuje je jako zwykły skrypt).
window.TRESCI = { REGIONY, PYTANIA, PYTANIA_TRUDNE, WYDARZENIA, WYZWANIA };
