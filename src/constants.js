// Stałe domenowe protokołu okresowej kontroli stanu technicznego budynku
// (Prawo budowlane, art. 62 ust. 1)

// 5-stopniowa klasyfikacja stanu technicznego elementu
export const STANY_TECHNICZNE = [
  { value: 'Dobry', zuzycie: '0-15', opis: 'Element dobrze utrzymany, konserwowany, bez zużycia i uszkodzeń.' },
  { value: 'Zadowalający', zuzycie: '16-30', opis: 'Element utrzymany należycie. Celowy remont bieżący (drobne naprawy, konserwacja).' },
  { value: 'Dostateczny', zuzycie: '31-50', opis: 'Niewielkie uszkodzenia i ubytki nie zagrażające bezpieczeństwu. Celowy częściowy remont kapitalny.' },
  { value: 'Zły', zuzycie: '51-73', opis: 'Znaczne uszkodzenia i ubytki. Wymagany kompleksowy remont kapitalny.' },
  { value: 'Awaryjny', zuzycie: '>73', opis: 'Uszkodzenia wpływają na bezpieczeństwo konstrukcji/użytkowania. Wymagane natychmiastowe działania.' },
];

// Stopnie pilności (jako tekst). 'brak' nie trafia do Rozdziału III,
// 'dobry z uwagą' oraz 1–4 trafiają do zestawienia zaleceń.
export const STOPNIE_PILNOSCI = [
  { value: '0', label: 'brak', opis: 'Nie określono / bez zaleceń (nie trafia do Rozdziału III).' },
  { value: '1', label: '1', opis: 'Roboty awaryjne — natychmiastowe wykonanie.' },
  { value: '2', label: '2', opis: 'Wykonanie w okresie 3 miesięcy od daty kontroli.' },
  { value: '3', label: '3', opis: 'Wykonanie w przeciągu roku (do następnego przeglądu).' },
  { value: '4', label: '4', opis: 'Wykonanie w latach następnych — ująć w planie rzeczowo-finansowym.' },
  { value: 'U', label: 'dobry z uwagą', opis: 'Stan dobry z uwagą — ujęte w zaleceniach (do obserwacji).' },
];

// Które wartości trafiają do Rozdziału III (zestawienie zaleceń)
export function wchodziDoZalecen(v) {
  return ['1', '2', '3', '4', 'U'].includes(String(v));
}
// Etykieta stopnia pilności do wyświetlenia w tabelach
export function etykietaPilnosci(v) {
  const s = STOPNIE_PILNOSCI.find((x) => x.value === String(v));
  return s ? s.label : 'brak';
}

// Osoby wykonujące przegląd — lista do szybkiego wyboru (można też wpisać ręcznie).
export const OSOBY_PRZEGLAD = [
  {
    imie: 'Andrzej Machnikowski',
    specjalnosc: 'Instalacje sanitarne',
    uprawnienia: 'BP-4224/70/85, Mazowiecka Okręgowa Izba Inżynierów Budownictwa',
  },
  {
    imie: 'Zbigniew Łukaszewski',
    specjalnosc: 'Konstrukcyjno-budowlana',
    uprawnienia: '7342/Cie-43/93, Mazowiecka Okręgowa Izba Inżynierów Budownictwa',
  },
  {
    imie: 'Zdzisław Kiryłów',
    specjalnosc: 'Architektoniczna i konstrukcyjno-inżynieryjna',
    uprawnienia: '697/KW/73, Małopolska Izba Inżynierów Budownictwa',
  },
];

// Domyślny zestaw sekcji (obszarów kontroli) wstawiany do nowego protokołu.
// Nazwy można edytować, a każdą sekcję usunąć.
export const DOMYSLNE_SEKCJE = [
  'Zewnętrzne elementy budynku',
  'Wewnętrzne elementy budynku – części wspólne podziemne i garaż',
  'Wewnętrzne elementy budynku – części wspólne nadziemne',
  'Dach i jego elementy',
  'Pomieszczenia techniczne wraz z instalacjami i urządzeniami służącymi ochronie środowiska',
  'Teren zewnętrzny',
];

// Podpowiedzi w polu dodawania sekcji = ten sam zestaw co domyślny.
export const SZABLONY_SEKCJI = DOMYSLNE_SEKCJE;

// Gotowe elementy (podpowiedzi ustaleń) dla każdej standardowej sekcji.
// Klucz = kanoniczna nazwa sekcji (z DOMYSLNE_SEKCJE).
export const PODPOWIEDZI_SEKCJI = {
  'Zewnętrzne elementy budynku': [
    'Ściany zewnętrzne, gzymsy, tynki i okładziny, elewacja',
    'Balkony / loggie / tarasy / wykusze',
    'Okna i drzwi zewnętrzne',
    'Obróbki blacharskie',
    'Lokale usługowe – nośniki reklamowe na elewacji i zewnętrzne elementy usług',
    'Inne elementy',
  ],
  'Wewnętrzne elementy budynku – części wspólne podziemne i garaż': [
    'Ściany, słupy, belki i stropy kondygnacji podziemnej hali garażowej',
    'Posadzka hali garażowej',
    'Wjazd do hali garażowej',
    'Odwodnienie liniowe hali garażowej i wjazdu do garażu',
    'Instalacje podstropowe prowadzone w hali garażowej',
    'Inne elementy hali garażowej',
  ],
  'Wewnętrzne elementy budynku – części wspólne nadziemne': [
    'Ściany nośne i działowe, stropy, belki, sufity, tynki, okładziny i powłoki malarskie ścian korytarzy i klatek schodowych',
    'Posadzka',
    'Schody komunikacyjne, barierki i pochwyty',
    'Inne elementy',
  ],
  'Dach i jego elementy': [
    'Konstrukcja dachu',
    'Pokrycie dachu',
    'Obróbki blacharskie',
    'Wyłazy, drabiny',
    'Instalacja odgromowa',
    'Kanały wentylacyjne na dachu',
    'Kominy ponad dachem',
    'Odwodnienie dachu i daszków',
    'Inne elementy dachu',
  ],
  'Pomieszczenia techniczne wraz z instalacjami i urządzeniami służącymi ochronie środowiska': [
    'Śmietnik',
    'Szachty instalacyjne',
    'Hydranty',
    'Pomieszczenie węzła cieplnego',
    'Pomieszczenie przyłącza wody',
    'Pomieszczenie rozdzielni nn',
    'Pomieszczenie elektryczne',
    'Pomieszczenie separatora substancji ropopochodnych',
    'Pomieszczenie kotłowni gazowej',
    'Instalacja wody',
    'Instalacja centralnego ogrzewania',
    'Instalacja kanalizacji sanitarnej',
    'Instalacja kanalizacji deszczowej',
    'Instalacje teletechniki',
    'Inne pomieszczenia',
  ],
  'Teren zewnętrzny': [
    'Chodniki, drogi dojazdowe, parkingi',
    'Ogrodzenie obiektu',
    'Teren zielony',
    'Plac zabaw',
    'Elementy małej architektury',
    'Oświetlenie uliczne',
    'Inne elementy zagospodarowania terenu',
  ],
};

// Domyślny, pusty stan dokumentu
export function pustyDokument() {
  return {
    id: uid(),
    nazwa: '',
    meta: {
      protokolNr: '',
      dataKontroli: '',
      dataNastepnej: '',
      rodzajKontroli: 'OKRESOWA PÓŁROCZNA (DWA RAZY W ROKU)',
      branza: 'OGÓLNOBUDOWLANA',
      podstawa: 'Ustawa Prawo budowlane z dnia 7 lipca 1994 r., art. 62 ust. 1 i 3 pkt 1.',
      adres: '',
      nrEwidencyjny: '',
      nazwaObiektu: '',
      wlasciciel: '',
      zarzadca: '',
      inspektorzy: [
        { imie: '', specjalnosc: '', uprawnienia: '' },
      ],
      liczbaKondygnacjiNad: '',
      liczbaKondygnacjiPod: '',
      pozwolenieUzytkowanie: '',
      powierzchniaZabudowy: '',
      kubatura: '',
      // Podstawowe dane obiektu (zaznaczane)
      rodzajKonstrukcji: [],      // np. ['murowana', 'żelbetowa']
      wyposazenie: [],            // np. ['instalacja kanalizacji', ...]
      wyposazenieDodatkowe: [],   // własne pozycje dopisane przez użytkownika
      poprzedniaKontrola: '',     // opis/data poprzedniej kontroli (Rozdział I)
    },
    rozdzialI: [],                // wykonanie zaleceń z poprzedniej kontroli
    sekcje: [],
    podsumowanie: '',
  };
}

// Rodzaje konstrukcji (do zaznaczenia)
export const RODZAJE_KONSTRUKCJI = [
  'stalowa', 'murowana', 'drewniana', 'żelbetowa', 'mieszana', 'inna',
];

// Wyposażenie budynku (do zaznaczenia)
export const WYPOSAZENIE = [
  'instalacja kanalizacji', 'instalacja wentylacji', 'instalacja gazowa',
  'instalacja wody ciepłej i zimnej', 'instalacje elektryczne', 'instalacje ogrzewania',
  'instalacje i urządzenia ochrony środowiska', 'instalacja fotowoltaiczna',
  'instalacja teletechniczna', 'instalacja przeciwpowodziowa', 'dźwig osobowy / winda',
  'węzeł cieplny', 'kanalizacja deszczowa', 'inne',
];

// Status wykonania zalecenia z poprzedniej kontroli
export const STATUSY_WYKONANIA = [
  'Wykonano', 'Nie wykonano', 'Częściowo wykonano', 'Poddano obserwacji', 'Nie dotyczy',
];

export function noweZalecenieI(text = '') {
  return { id: uid(), text, pilnosc: '0', status: 'Nie wykonano' };
}

export function nowaSekcja(title = '', klucz = '') {
  return {
    id: uid(),
    title,
    klucz,            // kanoniczna nazwa (do dopasowania podpowiedzi mimo zmiany tytułu)
    ogolnaOcena: 'Dobry',
    ustalenia: [],
    zdjecia: [],
  };
}

export function noweUstalenie(text = '', element = '') {
  return { id: uid(), element, text, pilnosc: '0', zdjecia: [] };
}

export function noweZdjecie(opis = '') {
  return { id: uid(), opis };
}

// Prosty generator identyfikatorów (bez zależności od Date/Math.random w SSR)
let _seq = 0;
export function uid() {
  _seq += 1;
  const t = (typeof performance !== 'undefined' && performance.now)
    ? Math.floor(performance.now() * 1000)
    : _seq;
  return `id_${t}_${_seq}`;
}
