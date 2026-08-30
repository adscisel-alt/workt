/* ==========================================================================
   test-danych.mjs — testy spójności treści gry (bez przeglądarki, czysty Node).
   Uruchomienie:  node testy/test-danych.mjs
   Testy pilnują, żeby rozwijając treść co tydzień, nie zepsuć gry:
   każda zagadka musi mieć rozwiązanie, klucze szyfrów muszą się zgadzać itd.
   ========================================================================== */

import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';

// dane.js to zwykły skrypt przypisujący do globalThis.GRA — import wykonuje go.
const katalog = dirname(fileURLToPath(import.meta.url));
await import(join(katalog, '..', 'js', 'dane.js'));

const GRA = globalThis.GRA;
let bledy = 0;
let zaliczone = 0;

function test(nazwa, warunek) {
  if (warunek) {
    zaliczone += 1;
    console.log(`  ✔ ${nazwa}`);
  } else {
    bledy += 1;
    console.error(`  ✘ ${nazwa}`);
  }
}

console.log('— Narzędzia tekstowe —');
test('normalizuj: usuwa polskie znaki i interpunkcję',
  GRA.normalizuj('Błyskawica!') === 'BLYSKAWICA');
test('normalizuj: zachowuje cyfry',
  GRA.normalizuj('01 08 17:00') === '01081700');
test('gaderypoluki: szyfruje BŁYSKAWICA → BŁRSIGWKCG',
  GRA.gaderypoluki('BŁYSKAWICA') === 'BŁRSIGWKCG');
test('gaderypoluki: jest symetryczny (deszyfruje własny szyfrogram)',
  GRA.gaderypoluki(GRA.gaderypoluki('POWSTANIE')) === 'POWSTANIE');
test('morseZapis: WOLNOSC ma poprawny zapis',
  GRA.morseZapis('WOLNOSC') === '.-- / --- / .-.. / -. / --- / ... / -.-.');

console.log('— Struktura pokoi —');
const pokoje = GRA.DANE.pokoje;
test('jest co najmniej 6 pokoi (etapów)', pokoje.length >= 6);
test('identyfikatory pokoi są unikalne',
  new Set(pokoje.map((p) => p.id)).size === pokoje.length);
test('etapy numerowane kolejno od 1',
  pokoje.every((p, i) => p.etap === i + 1));
test('każdy pokój ma tytuł, datę, miejsce i opis',
  pokoje.every((p) => p.tytul && p.data && p.miejsce && p.opis));
test('każdy pokój ma zagadkę znanego typu',
  pokoje.every((p) => ['kod', 'morse', 'kanaly', 'quiz'].includes(p.zagadka?.typ)));

console.log('— Hotspoty —');
for (const p of pokoje) {
  const hotspoty = p.hotspoty || [];
  test(`pokój „${p.id}”: identyfikatory hotspotów unikalne`,
    new Set(hotspoty.map((h) => h.id)).size === hotspoty.length);
  test(`pokój „${p.id}”: hotspoty mają nazwę, ikonę i tekst`,
    hotspoty.every((h) => h.nazwa && h.ikona && h.tekst));
}
const przedmioty = pokoje.flatMap((p) => [
  ...(p.hotspoty || []).filter((h) => h.przedmiot).map((h) => h.przedmiot),
  ...(p.zagadka?.przedmiotZaNagrode ? [p.zagadka.przedmiotZaNagrode] : []),
]);
test('identyfikatory przedmiotów są unikalne',
  new Set(przedmioty.map((x) => x.id)).size === przedmioty.length);

console.log('— Zagadki kodowe —');
for (const p of pokoje) {
  const z = p.zagadka;
  if (z.typ !== 'kod' && z.typ !== 'morse') continue;
  test(`„${p.id}”: ma pytanie, odpowiedzi i tekst sukcesu`,
    !!(z.pytanie && z.odpowiedzi?.length && z.sukces));
  test(`„${p.id}”: odpowiedzi po normalizacji są niepuste`,
    z.odpowiedzi.every((o) => GRA.normalizuj(o).length > 0));
  test(`„${p.id}”: ma co najmniej 2 podpowiedzi`,
    (z.podpowiedzi || []).length >= 2);
  test(`„${p.id}”: ma notatkę historyczną`,
    !!(z.nota?.tytul && z.nota?.tekst));
}

console.log('— Spójność fabularna zagadek —');
const poczta = pokoje.find((p) => p.id === 'poczta');
test('szyfrogram z poczty faktycznie deszyfruje się do odpowiedzi',
  GRA.normalizuj(GRA.gaderypoluki('BŁRSIGWKCG')) ===
    GRA.normalizuj(poczta.zagadka.odpowiedzi[0]));
const radiostacja = pokoje.find((p) => p.id === 'radiostacja');
test('słowo nadawane Morse’em jest jednocześnie odpowiedzią',
  GRA.normalizuj(radiostacja.zagadka.slowo) ===
    GRA.normalizuj(radiostacja.zagadka.odpowiedzi[0]));
test('każda litera słowa Morse’a istnieje w tabeli',
  GRA.normalizuj(radiostacja.zagadka.slowo).split('')
    .every((l) => GRA.MORSE[l]));

// Zagadka logiczna w szpitalu: sprawdź, że wskazówki dają dokładnie
// jedno rozwiązanie i że jest nim zapisany kod.
console.log('— Zagadka logiczna (szpital) —');
const szpital = pokoje.find((p) => p.id === 'szpital');
{
  const sale = [3, 5, 7];
  const rozwiazania = [];
  for (const a of sale) for (const b of sale) for (const c of sale) {
    if (new Set([a, b, c]).size !== 3) continue;   // każdy w innej sali
    if (c === 3 || c === 7) continue;              // Czesiek nie w 3 ani 7
    if (!(b < a)) continue;                        // Bronka niżej niż Antek
    rozwiazania.push(`${a}${b}${c}`);
  }
  test('wskazówki dają dokładnie jedno rozwiązanie', rozwiazania.length === 1);
  test('rozwiązanie zgadza się z kodem szafki',
    rozwiazania[0] === szpital.zagadka.odpowiedzi[0]);
}

console.log('— Kanały —');
const kanaly = pokoje.find((p) => p.id === 'kanaly');
{
  const z = kanaly.zagadka;
  test('ścieżka zawiera tylko kierunki L/P',
    z.sciezka.every((k) => k === 'L' || k === 'P'));
  test('liczba skrzyżowań odpowiada długości ścieżki',
    z.skrzyzowania.length === z.sciezka.length);
  // trasa z fragmentów planu: 1 P, 2 L, 3 L, 4 P, 5 P
  test('ścieżka zgadza się z fragmentami planu z pokoi 2–4',
    z.sciezka.join('') === 'PLLPP');
  test('pokój kanałów wymaga latarki i klucza',
    kanaly.wymagane.includes('latarka') && kanaly.wymagane.includes('klucz-wlaz'));
  // przedmioty wymagane muszą być zdobywalne we wcześniejszych pokojach
  const indeksKanalow = pokoje.indexOf(kanaly);
  const dostepneWczesniej = new Set(
    pokoje.slice(0, indeksKanalow).flatMap((p) => [
      ...(p.hotspoty || []).filter((h) => h.przedmiot).map((h) => h.przedmiot.id),
      ...(p.zagadka?.przedmiotZaNagrode ? [p.zagadka.przedmiotZaNagrode.id] : []),
    ]));
  test('wymagane przedmioty są zdobywalne przed kanałami',
    kanaly.wymagane.every((id) => dostepneWczesniej.has(id)));
}

console.log('— Quiz (odprawa) —');
const odprawa = pokoje.find((p) => p.id === 'odprawa');
{
  const z = odprawa.zagadka;
  test('quiz ma co najmniej 5 pytań', z.pytania.length >= 5);
  test('każde pytanie ma 4 odpowiedzi i poprawny indeks',
    z.pytania.every((q) => q.odp.length === 4 &&
      q.poprawna >= 0 && q.poprawna < q.odp.length));
  test('każde pytanie ma wyjaśnienie',
    z.pytania.every((q) => q.wyjasnienie && q.wyjasnienie.length > 10));
  test('odpowiedzi w pytaniach nie powtarzają się',
    z.pytania.every((q) => new Set(q.odp).size === q.odp.length));
}

console.log('— Osiągnięcia i parametry gry —');
test('osiągnięcia mają unikalne identyfikatory',
  new Set(GRA.DANE.osiagniecia.map((o) => o.id)).size ===
    GRA.DANE.osiagniecia.length);
test('czas gry to 63 minuty (symbolika 63 dni)',
  GRA.DANE.czasGrySekundy === 63 * 60);
test('kary czasowe są dodatnie',
  Object.values(GRA.DANE.kary).every((k) => k > 0));

console.log(`\nWynik: ${zaliczone} zaliczonych, ${bledy} błędów.`);
process.exit(bledy ? 1 : 0);
