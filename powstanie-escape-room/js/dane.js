/* ==========================================================================
   GODZINA „W” — escape room o Powstaniu Warszawskim
   dane.js — cała treść gry: pokoje, zagadki, notatki historyczne, quiz.
   Plik nie zawiera logiki — dzięki temu treść można rozwijać co tydzień
   (kolejne pokoje/zagadki) bez dotykania silnika gry.
   ========================================================================== */

globalThis.GRA = globalThis.GRA || {};

/* ---------- Narzędzia tekstowe (używane też przez testy w Node) ---------- */

// Normalizacja odpowiedzi gracza: wielkie litery, bez polskich znaków,
// bez spacji i interpunkcji. Dzięki temu „Błyskawica!” === „BLYSKAWICA”.
GRA.normalizuj = function (tekst) {
  const mapa = {
    ą: 'a', ć: 'c', ę: 'e', ł: 'l', ń: 'n', ó: 'o', ś: 's', ź: 'z', ż: 'z',
    Ą: 'A', Ć: 'C', Ę: 'E', Ł: 'L', Ń: 'N', Ó: 'O', Ś: 'S', Ź: 'Z', Ż: 'Z',
  };
  return String(tekst || '')
    .split('')
    .map((z) => mapa[z] || z)
    .join('')
    .toUpperCase()
    .replace(/[^A-Z0-9]/g, '');
};

// Autentyczny harcerski szyfr GA-DE-RY-PO-LU-KI: litery w parach zamieniają
// się miejscami (A↔G, D↔E, R↔Y, P↔O, L↔U, K↔I), reszta bez zmian.
// Funkcja jest symetryczna — szyfruje i deszyfruje.
GRA.gaderypoluki = function (tekst) {
  const pary = ['GA', 'DE', 'RY', 'PO', 'LU', 'KI'];
  const mapa = {};
  for (const [a, b] of pary) {
    mapa[a] = b; mapa[b] = a;
    mapa[a.toLowerCase()] = b.toLowerCase();
    mapa[b.toLowerCase()] = a.toLowerCase();
  }
  return String(tekst || '').split('').map((z) => mapa[z] || z).join('');
};

/* ---------- Alfabet Morse'a ---------- */

GRA.MORSE = {
  A: '.-', B: '-...', C: '-.-.', D: '-..', E: '.', F: '..-.', G: '--.',
  H: '....', I: '..', J: '.---', K: '-.-', L: '.-..', M: '--', N: '-.',
  O: '---', P: '.--.', Q: '--.-', R: '.-.', S: '...', T: '-', U: '..-',
  V: '...-', W: '.--', X: '-..-', Y: '-.--', Z: '--..',
  0: '-----', 1: '.----', 2: '..---', 3: '...--', 4: '....-',
  5: '.....', 6: '-....', 7: '--...', 8: '---..', 9: '----.',
};

// Zamienia słowo (bez polskich znaków) na zapis Morse'a, litery
// rozdzielone " / " — taki zapis pokazujemy graczowi.
GRA.morseZapis = function (slowo) {
  return GRA.normalizuj(slowo)
    .split('')
    .map((z) => GRA.MORSE[z] || '?')
    .join(' / ');
};

/* ==========================================================================
   TREŚĆ GRY
   ========================================================================== */

GRA.DANE = {

  tytul: 'GODZINA „W”',
  podtytul: 'Escape room o Powstaniu Warszawskim',

  // Czas gry: 63 minuty — symbolicznie jedna minuta za każdy dzień powstania.
  czasGrySekundy: 63 * 60,

  kary: {
    podpowiedz: 120,      // każda podpowiedź kosztuje 2 minuty
    blednaOdpowiedz: 30,  // błędny kod kosztuje 30 sekund
    blednyKanal: 120,     // zły skręt w kanałach kosztuje 2 minuty
  },

  intro: [
    'Warszawa, 31 lipca 1944 roku. Jesteś łączniczką/łącznikiem Armii Krajowej.',
    'Za kilkanaście godzin wybije Godzina „W” — początek Powstania Warszawskiego. ' +
    'Twoim zadaniem jest przenieść przez walczące miasto meldunek dowództwa: ' +
    'z konspiracyjnego mieszkania, przez pocztę polową i radiostację, aż do ' +
    'Śródmieścia — kanałami, jeśli będzie trzeba.',
    'Masz 63 minuty — po jednej za każdy dzień, który powstanie miało trwać. ' +
    'Rozglądaj się uważnie: każdy przedmiot może być wskazówką, ' +
    'a każda wskazówka — prawdziwą historią.',
  ],

  /* ------------------------------------------------------------------
     POKOJE (etapy gry)
     ------------------------------------------------------------------ */
  pokoje: [

    /* ============ POKÓJ 1: KONSPIRACYJNE MIESZKANIE ============ */
    {
      id: 'mieszkanie',
      etap: 1,
      tytul: 'Konspiracyjne mieszkanie',
      data: '31 lipca 1944, wieczór',
      miejsce: 'Śródmieście, kamienica przy ul. Filtrowej',
      opis:
        'Ciasny pokój z zaciemnionymi oknami. Na stole stygnie herbata — ' +
        'gospodarze wyszli w pośpiechu. Gdzieś tutaj ukryto rozkaz alarmowy ' +
        'i walizkę kurierską z meldunkiem, który masz dostarczyć. ' +
        'Walizka ma zamek szyfrowy.',
      hotspoty: [
        {
          id: 'radio',
          nazwa: 'Radioodbiornik',
          ikona: '📻',
          tekst:
            'Spod trzasków zagłuszarki przebija audycja z Londynu. Za posiadanie ' +
            'radia w okupowanej Warszawie groziła śmierć — mimo to nasłuch ' +
            'prowadzono w setkach mieszkań.',
        },
        {
          id: 'obraz',
          nazwa: 'Obraz na ścianie',
          ikona: '🖼️',
          tekst:
            'Za obrazem — schowek! W kopercie rozkaz alarmowy: „ALARM — do rąk ' +
            'własnych. […] Dnia 1 sierpnia o godzinie 17.00 rozpocznie się ' +
            'akcja «Burza» w Warszawie. Godzina «W» — 17.00”. To klucz do zamka.',
          notatkaTytul: 'Rozkaz alarmowy',
        },
        {
          id: 'kalendarz',
          nazwa: 'Kalendarz na biurku',
          ikona: '📅',
          tekst:
            'Kartka z datą „1 sierpnia” zakreślona ołówkiem. Obok ktoś zapisał ' +
            'drobnym pismem: „dzień-miesiąc-godzina-minuty”. Wygląda na ' +
            'podpowiedź do formatu szyfru walizki.',
        },
        {
          id: 'szafa',
          nazwa: 'Szafa',
          ikona: '🚪',
          tekst:
            'Między ubraniami leży starannie złożona biało-czerwona opaska — ' +
            'jedyny „mundur” większości powstańców. Zakładasz ją na ramię.',
          przedmiot: {
            id: 'opaska',
            nazwa: 'Biało-czerwona opaska',
            ikona: '🎗️',
            opis: 'Opaska z literami WP — znak rozpoznawczy powstańców.',
          },
        },
        {
          id: 'komoda',
          nazwa: 'Komoda',
          ikona: '🗄️',
          tekst:
            'W szufladzie znajdujesz latarkę z dynamem. Przyda się tam, gdzie ' +
            'nie dociera światło dnia.',
          przedmiot: {
            id: 'latarka',
            nazwa: 'Latarka',
            ikona: '🔦',
            opis: 'Latarka „na dynamo”. Niezbędna w ciemnych kanałach.',
          },
        },
      ],
      zagadka: {
        typ: 'kod',
        naglowek: 'Walizka kurierska z zamkiem szyfrowym',
        pytanie:
          'Zamek ma osiem cyfr. Wskazówka z kalendarza: dzień-miesiąc-godzina-' +
          'minuty (DDMMGGMM). Kiedy dokładnie wybija Godzina „W”?',
        placeholder: 'DDMMGGMM, np. 25121200',
        odpowiedzi: ['01081700'],
        podpowiedzi: [
          'Rozkaz zza obrazu podaje dokładną datę i godzinę wybuchu powstania.',
          'Powstanie wybuchło 1 sierpnia o godzinie 17.00.',
          'Wpisz: 01081700.',
        ],
        sukces:
          'Zamek ustępuje. W walizce: meldunek opatrzony pieczęcią „AK” oraz ' +
          'adres punktu Harcerskiej Poczty Polowej przy ul. Wilczej.',
        nota: {
          tytul: 'Godzina „W”',
          tekst:
            'Rozkaz o wybuchu powstania wydał dowódca Armii Krajowej ' +
            'gen. Tadeusz Komorowski „Bór”, a w Warszawie wykonaniem kierował ' +
            'płk Antoni Chruściel „Monter”. 1 sierpnia 1944 r. o 17.00 do walki ' +
            'stanęło ok. 40–50 tys. żołnierzy AK — ale broń palną miał na ' +
            'początku zaledwie co dziesiąty z nich.',
        },
      },
    },

    /* ============ POKÓJ 2: HARCERSKA POCZTA POLOWA ============ */
    {
      id: 'poczta',
      etap: 2,
      tytul: 'Punkt Harcerskiej Poczty Polowej',
      data: '6 sierpnia 1944',
      miejsce: 'Śródmieście, ul. Wilcza',
      opis:
        'Piwnica kamienicy zamieniona w sortownię. Wszędzie listy — na stołach, ' +
        'w chlebakach, w skrzynkach po amunicji. Kilkunastoletni Zawiszacy ' +
        'w za dużych hełmach segregują pocztę. Zawiadowca punktu przygląda ' +
        'się Twojej opasce: „Meldunek? Dobrze. Ale najpierw odszyfruj, dokąd ' +
        'masz go zanieść — tak jak my szyfrujemy wszystko”.',
      hotspoty: [
        {
          id: 'skrzynka',
          nazwa: 'Skrzynka pocztowa',
          ikona: '📮',
          tekst:
            'Skrzynka z napisem „Poczta Polowa”. Harcerska Poczta Polowa ruszyła ' +
            'w pierwszych dniach sierpnia — najmłodsi listonosze, Zawiszacy ' +
            'z Szarych Szeregów, mieli po 12–14 lat.',
        },
        {
          id: 'tablica',
          nazwa: 'Tablica z szyframi',
          ikona: '🔡',
          tekst:
            'Kreda na tablicy: „GA-DE-RY-PO-LU-KI”. Litery w parach zamieniają ' +
            'się miejscami: A↔G, D↔E, R↔Y, P↔O, L↔U, K↔I. Pozostałe litery ' +
            'zostają bez zmian. To harcerski szyfr używany naprawdę!',
          notatkaTytul: 'Klucz szyfru GA-DE-RY-PO-LU-KI',
        },
        {
          id: 'listy',
          nazwa: 'Stos listów',
          ikona: '✉️',
          tekst:
            'Listy najwyżej na 25 słów, ostemplowane i przejrzane przez cenzurę ' +
            'polową — żeby nie zdradzić pozycji oddziałów, gdyby wpadły w ręce ' +
            'wroga. Przez 63 dni poczta doręczyła ich ok. 116 tysięcy — ' +
            'często pod ostrzałem.',
        },
        {
          id: 'plecak',
          nazwa: 'Plecak łącznika',
          ikona: '🎒',
          tekst:
            'W bocznej kieszeni — postrzępiony fragment planu kanałów! ' +
            'Ktoś zanotował: „Od włazu przy pl. Krasińskich: 1. w PRAWO, ' +
            '2. w LEWO…”. Dalsza część urwana.',
          przedmiot: {
            id: 'plan1',
            nazwa: 'Plan kanałów (część 1/3)',
            ikona: '🗺️',
            opis: 'Trasa od włazu: skrzyżowanie 1 — PRAWO, skrzyżowanie 2 — LEWO.',
          },
        },
      ],
      zagadka: {
        typ: 'kod',
        naglowek: 'Zaszyfrowany adres meldunku',
        pytanie:
          'Zawiadowca podaje Ci pasek papieru: „BŁRSIGWKCG”. To nazwa miejsca, ' +
          'do którego niesiesz meldunek, zaszyfrowana szyfrem z tablicy. ' +
          'Jak brzmi po odszyfrowaniu?',
        placeholder: 'Odszyfrowana nazwa…',
        odpowiedzi: ['BLYSKAWICA'],
        podpowiedzi: [
          'Zamieniaj litery w parach: A↔G, D↔E, R↔Y, P↔O, L↔U, K↔I. Litery spoza par przepisz bez zmian.',
          'B→B, Ł→Ł, R→Y, S→S, I→K, G→A… Widzisz już początek: BŁYSK…',
          'Odpowiedź to BŁYSKAWICA — powstańcza radiostacja.',
        ],
        sukces:
          '„Błyskawica! Radiostacja w gmachu PKO. Biegnij, zanim zacznie się ' +
          'ostrzał” — zawiadowca stempluje Twój meldunek i wskazuje wyjście.',
        nota: {
          tytul: 'Harcerska Poczta Polowa',
          tekst:
            'Zawiszacy — najmłodsza gałąź Szarych Szeregów — w czasie powstania ' +
            'doręczyli około 116 tys. przesyłek. List mógł mieć najwyżej 25 słów ' +
            'i przechodził przez cenzurę polową. 2 października, w ostatnich ' +
            'godzinach powstania, poczta wciąż działała. Pomnik Małego ' +
            'Powstańca przy murach Starego Miasta upamiętnia dziś także ich.',
        },
      },
    },

    /* ============ POKÓJ 3: RADIOSTACJA „BŁYSKAWICA” ============ */
    {
      id: 'radiostacja',
      etap: 3,
      tytul: 'Radiostacja „Błyskawica”',
      data: '12 sierpnia 1944',
      miejsce: 'Śródmieście, gmach PKO przy ul. Jasnej',
      opis:
        'W piwnicy gmachu PKO pachnie rozgrzanymi lampami radiowymi. ' +
        'Radiotelegrafista nie odrywa ręki od klucza. „Meldunek przyjmę, ' +
        'ale najpierw pomóż: odbierz depeszę, którą właśnie nadają. ' +
        'Nasze hasło dnia. Słuchawki na uszy!”',
      hotspoty: [
        {
          id: 'tabela-morse',
          nazwa: 'Tabela alfabetu Morse’a',
          ikona: '📜',
          tekst:
            'Pożółkła karta z pełnym alfabetem Morse’a wisi nad stołem ' +
            'radiotelegrafisty. Przyda się do odebrania depeszy — zajrzyj do ' +
            'niej w trakcie zagadki (przycisk „Tabela Morse’a”).',
          notatkaTytul: 'Alfabet Morse’a',
        },
        {
          id: 'dziennik',
          nazwa: 'Dziennik audycji',
          ikona: '📓',
          tekst:
            'Pierwszy wpis: 8 sierpnia 1944, godz. 9.45 — początek pierwszej ' +
            'audycji. „Halo, tu mówi Błyskawica!” Program nadawano kilka razy ' +
            'dziennie, po polsku i po angielsku, na falach 32,8 m i 52,1 m.',
        },
        {
          id: 'skrzynia',
          nazwa: 'Skrzynia z częściami',
          ikona: '📦',
          tekst:
            'Między lampami i cewkami — kolejny strzęp planu kanałów! Napis: ' +
            '„3. w LEWO”. Ktoś dzieli tę mapę na części… celowo?',
          przedmiot: {
            id: 'plan2',
            nazwa: 'Plan kanałów (część 2/3)',
            ikona: '🗺️',
            opis: 'Trasa: skrzyżowanie 3 — LEWO.',
          },
        },
        {
          id: 'nadajnik',
          nazwa: 'Nadajnik',
          ikona: '📡',
          tekst:
            'Radiostację „Błyskawica” zbudował przed powstaniem inż. Antoni ' +
            'Zębik ps. „Biegły”. Ukrytą w częściach przewieziono do Warszawy ' +
            'i uruchomiono w gmachu PKO. Był to jedyny w okupowanej Europie ' +
            'powstańczy nadajnik działający jawnie w walczącym mieście.',
        },
      ],
      zagadka: {
        typ: 'morse',
        naglowek: 'Depesza do odebrania',
        pytanie:
          'Radiotelegrafista nadaje siedem liter. Odsłuchaj sygnał (możesz ' +
          'wielokrotnie) albo odczytaj zapis kropek i kresek, a potem wpisz ' +
          'hasło dnia (bez polskich znaków):',
        slowo: 'WOLNOSC',
        placeholder: 'Hasło dnia…',
        odpowiedzi: ['WOLNOSC'],
        podpowiedzi: [
          'Rozdzielaj litery po znaku „/”. Pierwsza litera to .-- czyli W.',
          '.-- W, --- O, .-.. L, -. N, --- O… zostały dwie litery.',
          'Hasło dnia brzmi: WOLNOŚĆ (wpisz WOLNOSC).',
        ],
        sukces:
          '„WOLNOŚĆ. Zgadza się” — radiotelegrafista uśmiecha się po raz ' +
          'pierwszy. „Meldunek nadany do Londynu. A ty ruszaj na Starówkę — ' +
          'szpital polowy czeka na leki z twojej walizki”.',
        nota: {
          tytul: 'Radiostacja „Błyskawica”',
          tekst:
            'Nadawała od 8 sierpnia do 4 października 1944 r. — dłużej niż ' +
            'trwały walki. Audycje po polsku i angielsku informowały świat ' +
            'o walczącej Warszawie; współtworzyli je m.in. Jan Nowak-Jeziorański ' +
            'i poeta Zbigniew Jasiński. Ostatnia audycja zakończyła się ' +
            'zniszczeniem nadajnika, by nie wpadł w ręce Niemców.',
        },
      },
    },

    /* ============ POKÓJ 4: SZPITAL POLOWY ============ */
    {
      id: 'szpital',
      etap: 4,
      tytul: 'Szpital polowy',
      data: '28 sierpnia 1944',
      miejsce: 'Stare Miasto, piwnice przy ul. Długiej',
      opis:
        'Niskie sklepienia, kopcące karbidówki, rzędy prycz. Sanitariuszka ' +
        'w poplamionym fartuchu łapie Cię za rękaw: „Leki z Śródmieścia? ' +
        'Nareszcie! Szafka z opatrunkami jest zamknięta na szyfr — to numery ' +
        'sal trzech rannych łączników: Antka, Bronki i Cześka, w tej ' +
        'kolejności. Karty gdzieś tu leżą — znajdź je, ja muszę wracać na salę”.',
      hotspoty: [
        {
          id: 'karta',
          nazwa: 'Karta przyjęć',
          ikona: '📋',
          tekst:
            'Karta przyjęć, częściowo zalana wodą. Czytelne zdanie: ' +
            '„Czesiek NIE leży ani w sali 3, ani w sali 7”. ' +
            'Ranni zajmują sale 3, 5 i 7 — każdy inną.',
          notatkaTytul: 'Wskazówka: karta przyjęć',
        },
        {
          id: 'tablica-dyzurow',
          nazwa: 'Tablica dyżurów',
          ikona: '🩺',
          tekst:
            'Przy grafiku dyżurów dopisek pielęgniarki: „Bronka leży w sali ' +
            'o NIŻSZYM numerze niż Antek”.',
          notatkaTytul: 'Wskazówka: tablica dyżurów',
        },
        {
          id: 'apteczka',
          nazwa: 'Pusta apteczka',
          ikona: '⛑️',
          tekst:
            'Prawie pusta. W powstańczych szpitalach brakowało wszystkiego: ' +
            'bandaży, środków znieczulających, światła do operacji. Rannych ' +
            'operowano przy latarkach i świecach, a sanitariuszki — często ' +
            'nastoletnie — wynosiły ich spod ognia na własnych plecach.',
        },
        {
          id: 'nosze',
          nazwa: 'Nosze pod ścianą',
          ikona: '🛏️',
          tekst:
            'Pod noszami ostatni fragment planu kanałów: „4. w PRAWO, ' +
            '5. w PRAWO — dalej prosto do włazu przy Wareckiej”. ' +
            'Masz komplet mapy!',
          przedmiot: {
            id: 'plan3',
            nazwa: 'Plan kanałów (część 3/3)',
            ikona: '🗺️',
            opis: 'Trasa: skrzyżowanie 4 — PRAWO, skrzyżowanie 5 — PRAWO.',
          },
        },
      ],
      zagadka: {
        typ: 'kod',
        naglowek: 'Szafka z opatrunkami',
        pytanie:
          'Szyfr to trzy cyfry: numery sal Antka, Bronki i Cześka — w tej ' +
          'kolejności. Sale to 3, 5 i 7, każdy ranny leży w innej. ' +
          'Poszukaj wskazówek na karcie przyjęć i tablicy dyżurów.',
        placeholder: 'Trzy cyfry…',
        odpowiedzi: ['735'],
        podpowiedzi: [
          'Skoro Czesiek nie leży w sali 3 ani 7 — została mu tylko jedna sala.',
          'Czesiek leży w sali 5. Bronka ma niższy numer niż Antek — czyli Bronka 3, Antek 7.',
          'Kolejność: Antek 7, Bronka 3, Czesiek 5. Wpisz 735.',
        ],
        sukces:
          'Szafka otwarta — przekazujesz leki. Sanitariuszka wciska Ci do ręki ' +
          'ciężki klucz: „Do włazu przy placu Krasińskich. Starówka pada, ' +
          'jedyna droga do Śródmieścia prowadzi kanałami. Idź. I nie zapal ' +
          'światła, dopóki nie zejdziesz”.',
        przedmiotZaNagrode: {
          id: 'klucz-wlaz',
          nazwa: 'Klucz do włazu',
          ikona: '🗝️',
          opis: 'Otwiera właz kanału przy placu Krasińskich.',
        },
        nota: {
          tytul: 'Szpitale polowe i sanitariuszki',
          tekst:
            'W powstańczej Warszawie działało ponad sto szpitali polowych — ' +
            'w piwnicach, szkołach i mieszkaniach. Służba sanitarna, w ogromnej ' +
            'większości kobiety, pracowała pod bombami i bez podstawowych ' +
            'środków. Wiele sanitariuszek i rannych zginęło w egzekucjach po ' +
            'zajęciu szpitali, m.in. na Woli i Starym Mieście.',
        },
      },
    },

    /* ============ POKÓJ 5: KANAŁY ============ */
    {
      id: 'kanaly',
      etap: 5,
      tytul: 'Kanały',
      data: '1 września 1944, noc',
      miejsce: 'Trasa: pl. Krasińskich → ul. Warecka',
      opis:
        'Klucz zgrzyta, właz unosi się i bucha smrodem. Schodzisz po klamrach ' +
        'w ciemność — kanał ma miejscami metr wysokości, idziesz zgięta/zgięty ' +
        'wpół, po kolana w ścieku. Nad głową, przez uliczne studzienki, słychać ' +
        'niemieckie patrole. Światło gaś przy włazach, nie mów ani słowa. ' +
        'Na pięciu skrzyżowaniach musisz wybrać kierunek — dobrze, że masz ' +
        'wszystkie trzy części planu.',
      wymagane: ['latarka', 'klucz-wlaz'],
      zagadka: {
        typ: 'kanaly',
        naglowek: 'Przejście kanałami do Śródmieścia',
        sciezka: ['P', 'L', 'L', 'P', 'P'],
        skrzyzowania: [
          'Skrzyżowanie 1. Kanał rozwidla się. W lewym korytarzu słychać szum ' +
            'spuszczanej wody — Niemcy potrafili zatapiać kanały.',
          'Skrzyżowanie 2. Przez studzienkę nad głową sączy się światło ' +
            'reflektora. Przeczekujesz, aż zgaśnie. Którędy dalej?',
          'Skrzyżowanie 3. Na ścianie strzałka namalowana fosforyzującą farbą ' +
            '— ale czy to znak przewodnika, czy niemiecka pułapka?',
          'Skrzyżowanie 4. Woda sięga pasa. Z jednego z korytarzy dobiega ' +
            'cichy szept — inni uciekinierzy? Nie wolno wołać.',
          'Skrzyżowanie 5. Ostatnie rozwidlenie. Gdzieś niedaleko powinien ' +
            'być właz przy Wareckiej. Ostatnia decyzja.',
        ],
        zlySkret:
          'Ślepy korytarz — zwał gruzu po wysadzonym stropie. Zawracasz, ' +
          'tracąc cenne minuty.',
        sukces:
          'Klamry, krąg światła, czyjeś ręce wyciągają Cię na powierzchnię. ' +
          'Właz przy Wareckiej! Po godzinach w ciemności Śródmieście wygląda ' +
          'jak inny świat: szyby w oknach, a na stole w bramie — pomidory.',
        nota: {
          tytul: 'Kanałami ze Starówki',
          tekst:
            'Na przełomie sierpnia i września 1944 r. kanałami ewakuowano ze ' +
            'Starego Miasta do Śródmieścia ok. 5 tys. osób, w tym rannych. ' +
            'Trasa z pl. Krasińskich do ul. Wareckiej liczyła ok. 1700 metrów, ' +
            'a jej pokonanie zajmowało nawet kilka godzin — w ciszy, ciemności ' +
            'i po kolana w ściekach. Kanałami przenoszono też rozkazy, pocztę ' +
            'i broń między odciętymi dzielnicami.',
        },
      },
    },

    /* ============ POKÓJ 6: EPILOG — ODPRAWA ============ */
    {
      id: 'odprawa',
      etap: 6,
      tytul: 'Kwatera dowództwa — odprawa',
      data: '2 października 1944',
      miejsce: 'Śródmieście Południowe',
      opis:
        'Meldunek doręczony. Oficer dyżurny czyta go długo, po czym patrzy na ' +
        'Ciebie: „Zanim dostaniesz przydział, sprawdzę, czy rozumiesz, o co ' +
        'walczyliśmy i co zapamiętasz. Odpowiedz na pięć pytań — od tego ' +
        'zależy, komu będziemy mogli powierzać meldunki po wojnie: pamięć ' +
        'też jest meldunkiem”.',
      zagadka: {
        typ: 'quiz',
        naglowek: 'Odprawa: pięć pytań',
        pytania: [
          {
            p: 'Ile dni trwało Powstanie Warszawskie?',
            odp: ['63 dni', '30 dni', '45 dni', '100 dni'],
            poprawna: 0,
            wyjasnienie:
              'Od 1 sierpnia do 2 października 1944 r. — 63 dni walki. ' +
              'Planowano, że potrwa kilka dni.',
          },
          {
            p: 'Kto jako dowódca Armii Krajowej wydał rozkaz rozpoczęcia powstania?',
            odp: [
              'gen. Tadeusz Komorowski „Bór”',
              'gen. Władysław Anders',
              'marsz. Edward Rydz-Śmigły',
              'gen. Stanisław Maczek',
            ],
            poprawna: 0,
            wyjasnienie:
              'Decyzję podjął gen. Tadeusz Komorowski „Bór”; walkami w mieście ' +
              'dowodził płk (potem gen.) Antoni Chruściel „Monter”.',
          },
          {
            p: 'Kiedy podpisano układ o zaprzestaniu działań wojennych w Warszawie?',
            odp: [
              '2 października 1944',
              '1 sierpnia 1944',
              '11 listopada 1944',
              '8 maja 1945',
            ],
            poprawna: 0,
            wyjasnienie:
              'Akt kapitulacji podpisano w Ożarowie Mazowieckim w nocy ' +
              'z 2 na 3 października 1944 r. Powstańcy wyszli do niewoli ' +
              'z prawami kombatantów.',
          },
          {
            p: 'Który batalion 5 sierpnia 1944 r. wyzwolił obóz „Gęsiówka”, uwalniając ok. 350 żydowskich więźniów?',
            odp: ['„Zośka”', '„Parasol”', '„Kiliński”', '„Miotła”'],
            poprawna: 0,
            wyjasnienie:
              'Harcerski batalion „Zośka”, wsparty zdobycznym czołgiem ' +
              '„Pantera”, zdobył obóz przy ul. Gęsiej. Wielu uwolnionych ' +
              'przyłączyło się do powstania.',
          },
          {
            p: 'Co przedstawia znak Polski Walczącej?',
            odp: [
              'Kotwicę utworzoną z liter P i W',
              'Orła w koronie',
              'Skrzyżowane szable',
              'Warszawską Syrenkę',
            ],
            poprawna: 0,
            wyjasnienie:
              '„Kotwica” — P jak Polska (i „powstanie”), W jak Walcząca. ' +
              'Malowana na murach od 1942 r., stała się symbolem oporu; ' +
              'dziś jest chroniona prawem.',
          },
        ],
        sukces:
          'Oficer chowa meldunek do teczki. „Zapamiętane. To teraz najważniejszy ' +
          'przydział, jaki mogę ci dać: opowiadaj o tym dalej”.',
        nota: {
          tytul: 'Po kapitulacji',
          tekst:
            'W powstaniu poległo ok. 16–18 tys. powstańców i ok. 150–180 tys. ' +
            'cywilów. Około pół miliona warszawiaków wypędzono z miasta przez ' +
            'obóz Dulag 121 w Pruszkowie, a Warszawę Niemcy planowo burzyli ' +
            'do stycznia 1945 r. Pamięć o 63 dniach przechowuje dziś m.in. ' +
            'Muzeum Powstania Warszawskiego, a 1 sierpnia o 17.00 miasto ' +
            'zatrzymuje się na dźwięk syren.',
        },
      },
    },
  ],

  /* ------------------------------------------------------------------
     ZAKOŃCZENIE
     ------------------------------------------------------------------ */
  zakonczenie: {
    tytul: 'Meldunek doręczony',
    tekst:
      'Przeszłaś/przeszedłeś szlak powstańczego łącznika: od Godziny „W”, ' +
      'przez pocztę polową i „Błyskawicę”, po kanały Starówki. Powstanie ' +
      'Warszawskie trwało 63 dni. Ta gra to tylko jego cień — jeśli chcesz ' +
      'poznać prawdziwe historie, zajrzyj do zakładki „Notatnik” albo do ' +
      'Muzeum Powstania Warszawskiego.',
    poCzasie:
      'Czas minął, zanim dotarłaś/dotarłeś do celu — tak jak wielu prawdziwym ' +
      'łącznikom. Gra pozwoliła Ci dokończyć misję w trybie pamięci: historia ' +
      'nie zna zapisu i wczytania, ale nauka — tak. Spróbuj jeszcze raz!',
  },

  /* ------------------------------------------------------------------
     OSIĄGNIĘCIA
     ------------------------------------------------------------------ */
  osiagniecia: [
    {
      id: 'ukonczenie',
      nazwa: '63 dni pamięci',
      ikona: '🎖️',
      opis: 'Ukończ grę.',
    },
    {
      id: 'bez-podpowiedzi',
      nazwa: 'Łącznik doskonały',
      ikona: '🥇',
      opis: 'Ukończ grę bez użycia ani jednej podpowiedzi.',
    },
    {
      id: 'kanalarz',
      nazwa: 'Kanalarz',
      ikona: '🕳️',
      opis: 'Przejdź kanały bez jednego błędnego skrętu.',
    },
    {
      id: 'kronikarz',
      nazwa: 'Kronikarz',
      ikona: '📖',
      opis: 'Zbadaj wszystkie miejsca we wszystkich pokojach.',
    },
    {
      id: 'przed-czasem',
      nazwa: 'Szybszy niż kurier',
      ikona: '⏱️',
      opis: 'Ukończ grę, mając na zegarze ponad 30 minut.',
    },
    {
      id: 'quiz-perfekt',
      nazwa: 'Historyk',
      ikona: '🎓',
      opis: 'Odpowiedz bezbłędnie na wszystkie pytania odprawy.',
    },
  ],
};
