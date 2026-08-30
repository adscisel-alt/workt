/* ==========================================================================
   test-e2e.mjs — test przejścia całej gry w prawdziwej przeglądarce.
   Uruchomienie (wymaga `npm install` w katalogu głównym repozytorium,
   gdzie zainstalowany jest Playwright):

     node powstanie-escape-room/testy/test-e2e.mjs

   Test NIE zna odpowiedzi na sztywno — czyta je z danych gry (window.GRA),
   więc pozostaje aktualny, gdy w kolejnych tygodniach semestru dochodzą
   nowe pokoje i zagadki. Sprawdza: start, wszystkie typy zagadek,
   ekwipunek, ekran końcowy i osiągnięcia.
   ========================================================================== */

import { fileURLToPath, pathToFileURL } from 'node:url';
import { dirname, join } from 'node:path';
import { mkdirSync } from 'node:fs';
import { createRequire } from 'node:module';

const katalog = dirname(fileURLToPath(import.meta.url));
const korzen = join(katalog, '..');

// Playwright jest zainstalowany w katalogu głównym repozytorium.
const require = createRequire(join(korzen, '..', 'package.json'));
const { chromium } = require('playwright');

const zrzuty = process.env.ZRZUTY_DIR || join(katalog, 'zrzuty');
mkdirSync(zrzuty, { recursive: true });

function log(t) { console.log(`  ${t}`); }
function blad(t) { console.error(`✘ ${t}`); process.exitCode = 1; }

// W środowiskach z gotowym Chromium (np. CI) można wskazać przeglądarkę
// zmienną CHROMIUM_PATH; bez niej Playwright użyje własnej instalacji.
const przegladarka = await chromium.launch(
  process.env.CHROMIUM_PATH ? { executablePath: process.env.CHROMIUM_PATH } : {}
);
const strona = await przegladarka.newPage({ viewport: { width: 900, height: 1000 } });
strona.on('pageerror', (e) => blad(`Błąd JS na stronie: ${e.message}`));

await strona.goto(pathToFileURL(join(korzen, 'index.html')).href);

/* ---------- ekran startowy i intro ---------- */

await strona.waitForSelector('.ekran-start');
log('✔ ekran startowy wyrenderowany');
await strona.screenshot({ path: join(zrzuty, '1-start.png') });

await strona.click('button:has-text("Nowa gra")');
await strona.waitForSelector('.ekran-intro');
await strona.click('button:has-text("Rozpocznij misję")');
await strona.waitForSelector('.ekran-pokoj');
log('✔ intro przejechane, misja rozpoczęta, zegar działa');

/* ---------- pomocnicze ---------- */

async function zamknijModal(tekstPrzycisku) {
  // śledzimy KONKRETNY węzeł modala — po zamknięciu gra może od razu
  // otworzyć następny (np. „Zagadka rozwiązana” po ostatnim pytaniu quizu)
  const uchwyt = await strona.waitForSelector('.modal-tlo');
  const selektor = tekstPrzycisku
    ? `.modal-przyciski button:has-text("${tekstPrzycisku}")`
    : '.modal-przyciski button';
  await strona.click(selektor);
  await uchwyt.waitForElementState('hidden');
}

async function stanPokoju() {
  return strona.evaluate(() => {
    const GRA = globalThis.GRA;
    const d = GRA.stan.dane;
    const pokoj = GRA.DANE.pokoje[d.pokoj];
    const z = pokoj.zagadka;
    return {
      indeks: d.pokoj,
      ostatni: d.pokoj === GRA.DANE.pokoje.length - 1,
      id: pokoj.id,
      typ: z.typ,
      odpowiedz: z.odpowiedzi ? z.odpowiedzi[0] : null,
      sciezka: z.sciezka || null,
      liczbaHotspotow: (pokoj.hotspoty || []).length,
      pytania: z.typ === 'quiz'
        ? z.pytania.map((q) => q.odp[q.poprawna])
        : null,
    };
  });
}

/* ---------- pętla przez wszystkie pokoje ---------- */

// dużo zapasu: pokoje × (hotspoty + kroki zagadki)
for (let bezpiecznik = 0; bezpiecznik < 50; bezpiecznik++) {
  const p = await stanPokoju();

  // 1) zbadaj wszystkie hotspoty (przedmioty są potrzebne np. w kanałach)
  for (let i = 0; i < p.liczbaHotspotow; i++) {
    await strona.click(`.hotspot >> nth=${i}`);
    await strona.waitForSelector('.modal');
    await zamknijModal('Dalej');
  }
  if (p.liczbaHotspotow) log(`✔ pokój „${p.id}”: zbadano ${p.liczbaHotspotow} miejsc`);

  // 2) rozwiąż zagadkę właściwym sposobem
  if (p.typ === 'kod' || p.typ === 'morse') {
    await strona.fill('.pole-odpowiedzi', p.odpowiedz);
    await strona.click('button:has-text("Sprawdź")');
    await strona.waitForSelector('.modal');
    await zamknijModal('Dalej');
  } else if (p.typ === 'kanaly') {
    for (const kierunek of p.sciezka) {
      await strona.click(kierunek === 'L'
        ? 'button:has-text("W LEWO")'
        : 'button:has-text("W PRAWO")');
    }
    await strona.waitForSelector('.modal');
    await zamknijModal('Dalej');
  } else if (p.typ === 'quiz') {
    for (const poprawna of p.pytania) {
      await strona.click(`.quiz-odp:has-text("${poprawna}")`);
      await strona.waitForSelector('.modal');
      await zamknijModal();
    }
    // po ostatnim pytaniu otwiera się modal „Zagadka rozwiązana”
    await strona.waitForSelector('.modal');
    await zamknijModal('Dalej');
  }
  log(`✔ pokój „${p.id}”: zagadka (${p.typ}) rozwiązana`);

  if (p.id === 'mieszkanie') {
    await strona.waitForTimeout(500); // poczekaj na koniec animacji pojawiania
    await strona.screenshot({ path: join(zrzuty, '2-pokoj.png') });
  }

  // 3) przejdź dalej albo zakończ misję
  if (p.ostatni) {
    await strona.click('button:has-text("Zakończ misję")');
    break;
  }
  await strona.click('button:has-text("Idź dalej")');
  await strona.waitForSelector('.panel-zagadki');
}

/* ---------- ekran końcowy ---------- */

await strona.waitForSelector('.ekran-koniec');
await strona.waitForTimeout(500);
await strona.screenshot({ path: join(zrzuty, '3-koniec.png'), fullPage: true });

const wynik = await strona.evaluate(() => {
  const d = globalThis.GRA.stan.dane;
  return {
    zakonczono: d.zakonczono,
    osiagniecia: d.osiagniecia,
    notatki: d.notatki.length,
    ekwipunek: d.ekwipunek.length,
    quizPoprawne: d.quizPoprawne,
  };
});

if (!wynik.zakonczono) blad('gra nie została oznaczona jako ukończona');
if (!wynik.osiagniecia.includes('ukonczenie')) blad('brak osiągnięcia „63 dni pamięci”');
if (!wynik.osiagniecia.includes('kronikarz')) blad('brak osiągnięcia „Kronikarz” mimo zbadania wszystkiego');
if (!wynik.osiagniecia.includes('kanalarz')) blad('brak osiągnięcia „Kanalarz” mimo bezbłędnych kanałów');
if (!wynik.osiagniecia.includes('quiz-perfekt')) blad('brak osiągnięcia „Historyk” mimo bezbłędnego quizu');
if (wynik.notatki < 6) blad(`za mało notatek historycznych: ${wynik.notatki}`);
if (wynik.ekwipunek < 5) blad(`za mało przedmiotów w ekwipunku: ${wynik.ekwipunek}`);

log(`✔ ekran końcowy: osiągnięcia = [${wynik.osiagniecia.join(', ')}], ` +
  `notatki = ${wynik.notatki}, ekwipunek = ${wynik.ekwipunek}`);

await przegladarka.close();

if (process.exitCode) {
  console.error('\nTest e2e ZAKOŃCZONY BŁĘDAMI.');
} else {
  console.log('\nTest e2e zaliczony: całą grę da się przejść od startu do końca. 🎖️');
}
