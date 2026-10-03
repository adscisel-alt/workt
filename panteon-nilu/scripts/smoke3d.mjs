// Test dymny warstwy 3D w Chromium (SwiftShader): raycasting na kanwie, ruch figurki, najazd na bitwę,
// ustawienia jakości, zrzuty ekranu. Użycie: node scripts/smoke3d.mjs [katalog_na_zrzuty]
import { chromium } from 'playwright';
import { createServer } from 'vite';

const out = process.argv[2] ?? '.';
const server = await createServer({ server: { port: 4195, strictPort: true }, logLevel: 'error' });
await server.listen();
const browser = await chromium.launch({
  executablePath: process.env.CHROMIUM_PATH || undefined,
  args: ['--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--ignore-gpu-blocklist'],
});
const page = await browser.newPage({ viewport: { width: 1440, height: 900 } });
const errors = [];
page.on('pageerror', (e) => errors.push(e.message));
page.on('console', (m) => m.type() === 'error' && errors.push(m.text()));
const fail = (msg) => {
  throw new Error(msg);
};
/** Ekranowe współrzędne punktu świata (przez kamerę sceny). */
const project = (x, y, z) =>
  page.evaluate(async ([x, y, z]) => {
    const THREE = await import('/node_modules/.vite/deps/three.js');
    const { camera, gl } = window.__three;
    const v = new THREE.Vector3(x, y, z).project(camera);
    const r = gl.domElement.getBoundingClientRect();
    return { x: r.left + ((v.x + 1) / 2) * r.width, y: r.top + ((1 - v.y) / 2) * r.height };
  }, [x, y, z]);
/** Czeka, aż kamera przestanie się ruszać (wygładzanie CameraControls przy rzadkich klatkach). */
async function waitCameraStill() {
  let prev = '';
  for (let i = 0; i < 40; i++) {
    const now = await page.evaluate(() => window.__three.camera.matrixWorld.elements.map((v) => v.toFixed(3)).join(','));
    if (now === prev) return;
    prev = now;
    await page.waitForTimeout(700);
  }
}
const worldOfHex = (h) =>
  page.evaluate(async (h) => {
    const c = await import('/src/ui3d/coords.ts');
    return c.hexAnchor(window.__panteonState.map, h);
  }, h);

try {
  await page.goto('http://localhost:4195/');
  await page.evaluate(() => localStorage.setItem('panteon-nilu:grafika3d', JSON.stringify({ quality: 'low', showFps: true })));
  await page.reload();
  await page.fill('[data-seed]', '3');
  await page.click('[data-start]');
  await page.waitForFunction(() => window.__three, null, { timeout: 60000 });
  await page.waitForTimeout(4000);
  if (!(await page.locator('[data-view="3d"].on').count())) fail('domyślnym widokiem przy WebGL powinien być 3D');

  // 1) Ruch: wybór akcji (HTML), klik w figurkę i w pole docelowe na kanwie (raycasting).
  const seat = await page.evaluate(() => window.__panteonState.turn.player);
  await page.click('[data-action="move"]');
  await page.waitForTimeout(1500);
  const plan = await page.evaluate(async (seat) => {
    const engine = await import('/src/engine/index.ts');
    const s = window.__panteonState;
    const m = engine.legalMoves(s).find((x) => x.type === 'moveFigure' && x.push === null && s.figures[x.figure].kind === 'god' && x.figure.startsWith(`p${seat}`));
    return { figure: m.figure, from: s.figures[m.figure].pos, to: m.to };
  }, seat);
  await waitCameraStill();
  const fromW = await worldOfHex(plan.from);
  const figPt = await project(fromW[0], fromW[1] + 0.6, fromW[2]);
  await page.mouse.click(figPt.x, figPt.y);
  await page.waitForTimeout(2500);
  await waitCameraStill();
  const toW = await worldOfHex(plan.to);
  const hexPt = await project(toW[0], toW[1], toW[2]);
  await page.mouse.move(hexPt.x, hexPt.y);
  await page.waitForTimeout(2500);
  await page.screenshot({ path: `${out}/3d-hover-target.png` });
  // wycinek w granicach okna (ujemne x przewija stronę i psuje kolejne kliknięcia)
  const cx = Math.max(0, Math.min(1440 - 320, hexPt.x - 160));
  const cy = Math.max(0, Math.min(900 - 220, hexPt.y - 110));
  await page.screenshot({ path: `${out}/3d-hover-zoom.png`, clip: { x: cx, y: cy, width: 320, height: 220 } });
  await page.mouse.click(hexPt.x, hexPt.y);
  await page.waitForTimeout(1500);
  const moved = await page.evaluate((f) => window.__panteonState.figures[f].pos, plan.figure);
  if (moved !== plan.to) fail(`figurka nie przeszła na ${plan.to} (jest na ${moved})`);
  console.log(`ruch przez kanwę: ${plan.figure} ${plan.from} → ${plan.to} ✓`);
  await page.waitForTimeout(3000);
  await page.screenshot({ path: `${out}/3d-after-move.png` });

  // 2) Bitwa: najazd kamery na region bitwy.
  await page.evaluate(async () => {
    const engine = await import('/src/engine/index.ts');
    const conflict = await import('/src/engine/conflict.ts');
    const game = await import('/src/engine/game.ts');
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
  await page.waitForTimeout(3000);
  await waitCameraStill();
  const camTarget = await page.evaluate(() => window.__three.camera.position.toArray().map((v) => +v.toFixed(1)));
  console.log('kamera podczas bitwy:', camTarget.join(', '));
  await page.screenshot({ path: `${out}/3d-battle.png` });
  // sama scena bitwy (okno przekazania urządzenia ukryte tylko na potrzeby zrzutu)
  await page.addStyleTag({ content: '.handoff { display: none !important; }' });
  await page.waitForTimeout(1500);
  await page.screenshot({ path: `${out}/3d-battle-scene.png` });

  // 3) Panel ustawień: przełączenie na wysoką jakość działa bez błędów (spokojny stan — bez okna bitwy).
  await page.evaluate(async () => {
    const engine = await import('/src/engine/index.ts');
    window.__panteonLoad(engine.createGame({ scenario: 'trzy-krainy', gods: ['amun', 'ra', 'isis'], seed: 8, firstPlayer: 0 }));
  });
  await page.waitForTimeout(3000);
  await page.click('[data-settings-toggle]');
  await page.click('[data-quality="high"]');
  await page.waitForTimeout(15000);
  await page.screenshot({ path: `${out}/3d-settings.png` });
  console.log('statystyki:', await page.locator('[data-fps]').textContent());
  console.log('błędy strony:', errors.length ? errors.slice(0, 5) : 'brak');
  if (errors.length) process.exitCode = 1;
} finally {
  await browser.close();
  await server.close();
}
