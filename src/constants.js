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

// 4-stopniowy termin pilności wykonania naprawy
export const STOPNIE_PILNOSCI = [
  { value: 0, label: '—', opis: 'Nie określono / brak zaleceń' },
  { value: 1, label: '1', opis: 'Roboty awaryjne — natychmiastowe wykonanie.' },
  { value: 2, label: '2', opis: 'Wykonanie w okresie 3 miesięcy od daty kontroli.' },
  { value: 3, label: '3', opis: 'Wykonanie w przeciągu roku (do następnego przeglądu).' },
  { value: 4, label: '4', opis: 'Wykonanie w latach następnych — ująć w planie rzeczowo-finansowym.' },
];

// Typowe sekcje (obszary kontroli) — punkt wyjścia, użytkownik może dodawać własne
export const SZABLONY_SEKCJI = [
  'Elewacje i teren zewnętrzny',
  'Dach i obróbki blacharskie',
  'Klatki schodowe i korytarze',
  'Hala garażowa — konstrukcja (ściany, słupy, stropy)',
  'Posadzka hali garażowej',
  'Wjazd / zjazd do hali garażowej',
  'Odwodnienie liniowe',
  'Instalacje podstropowe w garażu',
  'Pomieszczenia techniczne',
  'Inne elementy',
];

// Domyślny, pusty stan dokumentu
export function pustyDokument() {
  return {
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
  return { id: uid(), text, pilnosc: 0, status: 'Nie wykonano' };
}

export function nowaSekcja(title = '') {
  return {
    id: uid(),
    title,
    ogolnaOcena: 'Dobry',
    ustalenia: [],
    zdjecia: [],
  };
}

export function noweUstalenie(text = '') {
  return { id: uid(), text, pilnosc: 0, zdjecia: [] };
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
