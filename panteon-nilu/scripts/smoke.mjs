// Dymny test UI w prawdziwej przeglądarce (serwer deweloperski Vite):
// nowa gra → akcja Ruch → tura; potem bitwa wczytana przez __panteonLoad → tajny wybór kart.
// Użycie: node scripts/smoke.mjs [katalog_na_zrzuty]   (CHROMIUM_PATH — opcjonalna ścieżka do Chromium)
import { chromium } from 'playwright';
import { createServer } from 'vite';

const out = process.argv[2] ?? '.';
const server = await createServer({ server: { port: 4179, strictPort: true }, logLevel: 'error' });
await server.listen();
const browser = await chromium.launch({ executablePath: process.env.CHROMIUM_PATH || undefined });
const page = await browser.newPage({ viewport: { width: 1400, height: 950 } });
const errors = [];
page.on('pageerror', (e) => errors.push(e.message));
const fail = (msg) => {
  throw new Error(msg);
};
try {
  await page.goto('http://localhost:4179/');
  await page.fill('input', '7');
  await page.click('[data-start]');
  await page.screenshot({ path: `${out}/01-start.png` });

  await page.click('[data-action="move"]');
  await page.locator('.figure-selectable').first().click();
  const dots = await page.locator('[data-target-dot]').count();
  if (!dots) fail('brak podświetlonych pól ruchu');
  await page.screenshot({ path: `${out}/02-move-targets.png` });
  await page.locator('[data-target-dot]').first().click();
  if (await page.locator('[data-end-move]').count()) await page.click('[data-end-move]');
  await page.click('[data-action="followers"]');
  await page.screenshot({ path: `${out}/03-after-turn.png` });

  // Bitwa: obaj bogowie w regionie Delty, konflikt rozpoczęty.
  await page.evaluate(async () => {
    const engine = await import('/src/engine/index.ts');
    const conflict = await import('/src/engine/conflict.ts');
    const game = await import('/src/engine/game.ts');
    const s = engine.createGame({ scenario: 'trzy-krainy', gods: ['amun', 'ra'], seed: 3, firstPlayer: 0 });
    s.figures['p0-god'].pos = '3,1';
    s.figures['p0-w2'].pos = '2,1';
    s.figures['p1-god'].pos = '4,2';
    s.players[0].followers = 4;
    s.players[1].followers = 2;
    s.pending = null;
    conflict.startConflict(s);
    game.runQueue(s);
    window.__panteonLoad(s);
  });
  // Amun najpierw decyduje jawnie, czy zagra dwie karty
  await page.getByText('Jedna karta').click();
  await page.waitForSelector('[data-reveal]');
  await page.screenshot({ path: `${out}/04-handoff.png` });
  if (await page.locator('[data-card]').count()) fail('karty widoczne przed odsłonięciem');
  await page.click('[data-reveal]');
  await page.screenshot({ path: `${out}/05-card-picker.png` });
  await page.click('[data-card="chariots"]');
  await page.waitForSelector('[data-reveal]');
  const visible = await page.locator('body').innerText();
  if (/Rydwany/.test(visible.replace(/Zagrane wcześniej.*$/m, ''))) fail('wybór gracza 1 widoczny dla gracza 2');
  await page.click('[data-reveal]');
  await page.click('[data-card="build"]');
  await page.screenshot({ path: `${out}/06-after-battle.png` });
  console.log('pola ruchu:', dots, '| błędy strony:', errors.length ? errors : 'brak');
  if (errors.length) process.exitCode = 1;
} finally {
  await browser.close();
  await server.close();
}
