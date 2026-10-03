// Zrzuty sceny 3D (Playwright + SwiftShader). Użycie: node scripts/shot3d.mjs <katalog> [scenariusz] [jakość]
import { chromium } from 'playwright';
import { createServer } from 'vite';

const out = process.argv[2] ?? '.';
const scene = process.argv[3] ?? 'midgame';
const quality = process.argv[4] ?? 'high';
const wait = Number(process.argv[5] ?? (quality === 'high' ? 25000 : 9000));
const server = await createServer({ server: { port: 4190, strictPort: true }, logLevel: 'error' });
await server.listen();
const browser = await chromium.launch({
  executablePath: process.env.CHROMIUM_PATH || undefined,
  args: ['--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--ignore-gpu-blocklist'],
});
const page = await browser.newPage({ viewport: { width: 1440, height: 900 } });
const errors = [];
page.on('pageerror', (e) => errors.push(e.message));
page.on('console', (m) => m.type() === 'error' && errors.push(m.text()));
try {
  await page.goto('http://localhost:4190/');
  await page.evaluate(({ quality }) => {
    localStorage.setItem('panteon-nilu:widok', '3d');
    localStorage.setItem('panteon-nilu:grafika3d', JSON.stringify({ quality, showFps: true }));
  }, { quality });
  await page.reload();
  await page.evaluate(async (scene) => {
    const engine = await import('/src/engine/index.ts');
    const s = engine.createGame({ scenario: 'trzy-krainy', gods: ['amun', 'ra', 'isis'], seed: 5, firstPlayer: 0 });
    s.abilities.amunTokenUp = false;
    const add = (id, owner, guardian, pos) => (s.figures[id] = { id, owner, kind: 'guardian', guardian, pos });
    s.figures['p0-w2'].pos = '3,3';
    s.figures['p1-w2'].pos = '6,4';
    add('androsphinx-1', 0, 'androsphinx', '0,3');
    add('giantScorpion-1', 1, 'giantScorpion', '5,5');
    s.figures['giantScorpion-1'].aim = ['6,5', '5,6'];
    s.abilities.radiant = ['p1-god'];
    s.abilities.underworld = ['-1,6'];
    s.map = { ...s.map, camels: ['4,2|4,3', '4,2|5,2'] };
    s.monuments.m1.owner = 0;
    if (scene === 'summon') {
      window.__s = engine.applyMove(s, { type: 'chooseAction', player: 0, action: 'summon' });
    } else window.__s = s;
    window.__panteonLoad(window.__s);
  }, scene);
  await page.waitForSelector('canvas');
  await page.waitForTimeout(wait);
  await page.screenshot({ path: `${out}/3d-${scene}-${quality}.png` });
  const fps = await page.locator('[data-fps]').textContent().catch(() => '');
  console.log('FPS/statystyki:', fps);
  console.log('błędy:', errors.length ? errors.slice(0, 8) : 'brak');
} finally {
  await browser.close();
  await server.close();
}
