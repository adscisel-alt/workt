// Zrzuty stylu ruchu (Playwright + SwiftShader): lot figurki, lądowanie z pyłem, przywołanie, bitwa z przyciemnieniem.
// Zegar animacji jest spowolniony (window.__panteonClock, tylko tryb deweloperski), bo programowy WebGL daje
// ~1 klatkę na sekundę. Użycie: node scripts/shot-motion.mjs <katalog> [high|low]
import { chromium } from 'playwright';
import { createServer } from 'vite';

const out = process.argv[2] ?? '.';
const quality = process.argv[3] ?? 'high';
const SLOW = 0.04; // 1 s rzeczywista = 0,04 s animacji
const server = await createServer({ server: { port: 4191, strictPort: true }, logLevel: 'error' });
await server.listen();
const browser = await chromium.launch({
  executablePath: process.env.CHROMIUM_PATH || undefined,
  args: ['--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--ignore-gpu-blocklist'],
});
const page = await browser.newPage({ viewport: { width: 1440, height: 900 } });
const errors = [];
page.on('pageerror', (e) => errors.push(e.message));
page.on('console', (m) => m.type() === 'error' && errors.push(m.text()));
const wait = (ms) => page.waitForTimeout(ms);
/** Czas animacji od wywołania (s) — czekamy, aż zegar sceny dojdzie do zadanej chwili. */
const waitAnim = async (t0, seconds) => {
  for (;;) {
    const now = await page.evaluate(async () => (await import('/src/ui3d/clock.ts')).animNow());
    if (now - t0 >= seconds) return;
    await wait(500);
  }
};
const shot = async (name) => {
  await page.screenshot({ path: `${out}/motion-${name}-${quality}.png` });
  console.log('zrzut:', name);
};

try {
  await page.goto('http://localhost:4191/');
  await page.evaluate((quality) => {
    localStorage.setItem('panteon-nilu:widok', '3d');
    localStorage.setItem('panteon-nilu:grafika3d', JSON.stringify({ quality, dof: true, showFps: true }));
  }, quality);
  await page.reload();
  await page.evaluate(async () => {
    const engine = await import('/src/engine/index.ts');
    const s = engine.createGame({ scenario: 'trzy-krainy', gods: ['amun', 'ra', 'isis'], seed: 5, firstPlayer: 0 });
    s.abilities.amunTokenUp = false;
    s.figures['p0-w2'].pos = '3,3';
    s.figures['p1-w2'].pos = '6,4';
    s.monuments.m1.owner = 0;
    window.__base = s;
    window.__panteonLoad(s);
  });
  await page.waitForSelector('canvas');
  await wait(quality === 'high' ? 30000 : 10000); // kompilacja shaderów

  // 1) lot: bóg gracza 0 o dwa pola dalej
  const plan = await page.evaluate(async () => {
    const hex = await import('/src/engine/hex.ts');
    const map = await import('/src/engine/map.ts');
    const s = window.__base;
    const from = s.figures['p0-god'].pos;
    const two = hex.neighborKeys(from).flatMap((n) => hex.neighborKeys(n));
    const to = two.find((h) => h !== from && !hex.neighborKeys(from).includes(h) && map.isEmptyLand(s, h));
    return { from, to };
  });
  const t0 = await page.evaluate(async ({ to, slow }) => {
    const { animNow } = await import('/src/ui3d/clock.ts');
    window.__panteonClock = { scale: slow };
    const t = animNow();
    const s = structuredClone(window.__base);
    s.figures['p0-god'].pos = to;
    window.__moved = s;
    window.__panteonSet(s); // podmiana stanu w działającej partii — jak po prawdziwym ruchu
    return t;
  }, { to: plan.to, slow: SLOW });
  console.log(`lot ${plan.from} → ${plan.to}`);
  await waitAnim(t0, 0.5);
  await shot('lot');
  await waitAnim(t0, 0.93);
  await shot('ladowanie');
  await waitAnim(t0, 1.6);

  // 2) przywołanie: wojownik gracza 0 obok boga
  const t1 = await page.evaluate(async () => {
    const hex = await import('/src/engine/hex.ts');
    const map = await import('/src/engine/map.ts');
    const { animNow } = await import('/src/ui3d/clock.ts');
    const s = structuredClone(window.__moved);
    const at = hex.neighborKeys(s.figures['p0-god'].pos).find((h) => map.isEmptyLand(s, h));
    s.figures['p0-w3'].pos = at;
    const t = animNow();
    window.__panteonSet(s);
    window.__summoned = s;
    return t;
  });
  await waitAnim(t1, 0.55);
  await shot('przywolanie');
  await waitAnim(t1, 1.0);
  await shot('przywolanie-koniec');

  // 3) bitwa: najazd i przyciemnienie reszty planszy (zegar normalny — przejścia UI)
  await page.evaluate(async () => {
    window.__panteonClock = undefined;
    const conflict = await import('/src/engine/conflict.ts');
    const game = await import('/src/engine/game.ts');
    const engine = await import('/src/engine/index.ts');
    const s = engine.createGame({ scenario: 'trzy-krainy', gods: ['amun', 'ra'], seed: 3, firstPlayer: 0 });
    s.abilities.amunTokenUp = false;
    s.figures['p0-god'].pos = '3,1';
    s.figures['p0-w2'].pos = '2,1';
    s.figures['p1-god'].pos = '4,2';
    s.pending = null;
    conflict.startConflict(s);
    game.runQueue(s);
    window.__panteonLoad(s);
  });
  await wait(quality === 'high' ? 25000 : 9000);
  await page.addStyleTag({ content: '.handoff { display: none !important; }' });
  await wait(1500);
  await shot('bitwa');
  console.log('statystyki:', await page.locator('[data-fps]').textContent().catch(() => ''));
  console.log('błędy strony:', errors.length ? errors.slice(0, 6) : 'brak');
  if (errors.length) process.exitCode = 1;
} finally {
  await browser.close();
  await server.close();
}
