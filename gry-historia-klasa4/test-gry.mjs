import { chromium } from 'playwright';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const here = dirname(fileURLToPath(import.meta.url));
const url = 'file://' + join(here, 'index.html');

const browser = await chromium.launch({
  executablePath: '/opt/pw-browsers/chromium-1194/chrome-linux/chrome',
});
const page = await browser.newPage();
const bledy = [];
page.on('console', (m) => { if (m.type() === 'error') bledy.push('console.error: ' + m.text()); });
page.on('pageerror', (e) => bledy.push('pageerror: ' + e.message));

await page.goto(url);
await page.waitForTimeout(200);

// dane wczytane?
const daneOk = await page.evaluate(() => !!(window.GRA_DANE && window.GRA_DANE.HASLA.length && window.GRA_DANE.KATEGORIE.length));
console.log('Dane wczytane:', daneOk);

// ——— WISIELEC ———
await page.click('.kafel:nth-child(1)');
await page.waitForTimeout(150);
const wisWidoczny = await page.isVisible('#ekran-wisielec.aktywny');
const slowoDl = await page.evaluate(() => window.Wisielec.slowo.length);
// odgadnij całe słowo, klikając wszystkie potrzebne litery
await page.evaluate(() => {
  const litery = [...new Set(window.Wisielec.slowo.split(''))];
  document.querySelectorAll('#w-klawiatura .litera').forEach((b) => {
    if (litery.includes(b.textContent)) b.click();
  });
});
await page.waitForTimeout(100);
const wisWygrana = await page.evaluate(() => window.Wisielec.koniec && window.Wisielec.punkty > 0);
console.log('Wisielec: ekran OK =', wisWidoczny, '| słowo dł. =', slowoDl, '| wygrana zaliczona =', wisWygrana);

// ——— VA BANQUE ———
await page.click('#ekran-wisielec .btn-back'); // do menu
await page.click('.kafel:nth-child(2)');
await page.waitForTimeout(150);
const liczbaKwot = await page.evaluate(() => document.querySelectorAll('#v-plansza .kwota').length);
// zagraj jedno pytanie — kliknij pierwsze pole i pierwszą odpowiedź
await page.click('#v-plansza .kwota');
await page.waitForTimeout(100);
const pytWidoczne = await page.isVisible('#v-pytanie-widok:not(.ukryty)');
await page.click('#v-odpowiedzi .odp');
await page.waitForTimeout(100);
const vbPunkty = await page.evaluate(() => window.VaBanque.punkty);
const wrocWidoczny = await page.isVisible('#v-wroc:not(.ukryty)');
console.log('Va Banque: pól z kwotami =', liczbaKwot, '| pytanie pokazane =', pytWidoczne, '| przycisk Wróć =', wrocWidoczny, '| punkty =', vbPunkty);

// ——— ARCADE ———
await page.click('.ekran.aktywny .btn-back');
await page.click('.kafel:nth-child(3)');
await page.waitForTimeout(150);
await page.click('#a-start');
await page.waitForTimeout(300);
const arcadeDziala = await page.evaluate(() => window.Arcade.dziala && !!window.Arcade.pytanie);
const spadajace = await page.evaluate(() => window.Arcade.spadajace.length);
console.log('Arcade: gra działa =', arcadeDziala, '| bąbelki na planszy =', spadajace);

// symuluj upływ czasu, aby sprawdzić brak wyjątków w pętli
await page.waitForTimeout(500);
const arcadeNadalOk = await page.evaluate(() => window.Arcade.dziala);
console.log('Arcade: pętla animacji działa dalej =', arcadeNadalOk);

console.log('\n=== BŁĘDY JS ===');
console.log(bledy.length ? bledy.join('\n') : 'brak — wszystko czyste ✅');

await browser.close();
process.exit(bledy.length ? 1 : 0);
