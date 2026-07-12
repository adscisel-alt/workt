import { chromium } from 'playwright';
import { fileURLToPath } from 'url';
import path from 'path';

const dir = path.dirname(fileURLToPath(import.meta.url));
const url = 'file://' + path.join(dir, 'index.html');

const browser = await chromium.launch({ executablePath: '/opt/pw-browsers/chromium', args: ['--no-sandbox'] });
const page = await browser.newPage({ viewport: { width: 1100, height: 720 } });

const errors = [];
page.on('pageerror', (e) => errors.push('PAGEERROR: ' + e.message));
page.on('console', (m) => { if (m.type() === 'error') errors.push('CONSOLE: ' + m.text()); });

await page.goto(url);
await page.waitForTimeout(1500);

// wybór 2 drużyn i start
await page.click('#wybor-liczby .chip[data-n="2"]');
await page.click('#btn-start');
await page.waitForTimeout(800);

console.log('HUD widoczny:', await page.isVisible('#hud'));
console.log('Przycisk kostki:', await page.isVisible('#btn-kostka'));

const counts = { pytania: 0, wydarzenia: 0, wyzwania: 0, zetony: 0 };

async function obsluzKarte() {
  const nag = (await page.textContent('.karta-naglowek').catch(() => '')) || '';
  if (nag.includes('żetonu')) { counts.zetony++; }
  if (nag.includes('pytania') || nag.includes('żetonu')) {
    counts.pytania++;
    // wybierz poprawną odpowiedź (klik dowolnej opcji ujawnia .dobra — klikamy właściwą)
    await page.click('.opcja[data-i="0"]');
    // po kliknięciu .dobra jest oznaczona; jeśli trafiliśmy źle, i tak przechodzimy dalej
    await page.waitForTimeout(150);
    await page.click('.karta-przyciski .btn-dalej');
  } else if (nag.includes('wydarzenia')) {
    counts.wydarzenia++;
    await page.click('.karta-przyciski .btn-dalej');
  } else if (nag.includes('wyzwania')) {
    counts.wyzwania++;
    await page.click('.karta-przyciski .btn-ok');
  }
  await page.waitForSelector('#zaslona.pokaz', { state: 'hidden', timeout: 8000 }).catch(() => {});
}

let ruchy = 0;
for (let t = 0; t < 26; t++) {
  if (await page.isVisible('#ekran-koniec.pokaz')) break;
  // czekaj aż tura będzie gotowa (kostka klikalna) lub pojawi się karta
  await page.waitForFunction(
    () => document.querySelector('#btn-kostka:not([disabled])') || document.querySelector('#zaslona.pokaz') || document.querySelector('#ekran-koniec.pokaz'),
    null, { timeout: 8000 }
  ).catch(() => {});
  if (await page.isVisible('#zaslona.pokaz')) { await obsluzKarte(); continue; }
  if (await page.isVisible('#ekran-koniec.pokaz')) break;
  if (!(await page.locator('#btn-kostka:not([disabled])').count())) { await page.waitForTimeout(400); continue; }
  await page.click('#btn-kostka');
  ruchy++;
  // pętla obsługi tej tury: karty pojawiają się jedna po drugiej, aż kostka znów aktywna
  for (let g = 0; g < 40; g++) {
    if (await page.isVisible('#ekran-koniec.pokaz')) break;
    if (await page.isVisible('#zaslona.pokaz')) { await obsluzKarte(); continue; }
    if (await page.locator('#btn-kostka:not([disabled])').count()) break;
    await page.waitForTimeout(250);
  }
}
const kartyPytan = counts.pytania, kartyWyd = counts.wydarzenia, kartyWyz = counts.wyzwania;

// odczytaj żetony z HUD
const hud = await page.textContent('#druzyny-hud').catch(() => '');
console.log('Tury rozegrane:', ruchy);
console.log('Karty — pytania:', kartyPytan, 'wydarzenia:', kartyWyd, 'wyzwania:', kartyWyz);
console.log('HUD:', hud.replace(/\s+/g, ' ').trim());
console.log('Ekran końca widoczny:', await page.isVisible('#ekran-koniec.pokaz'));

await page.screenshot({ path: path.join(dir, 'podglad.png') });
console.log('BŁĘDY (' + errors.length + '):');
errors.slice(0, 20).forEach((e) => console.log('  ' + e));

await browser.close();
process.exit(errors.length ? 1 : 0);
