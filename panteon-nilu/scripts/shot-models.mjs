// Zrzut galerii figurek z bliska (Playwright + SwiftShader). Użycie: node scripts/shot-models.mjs <katalog> [gods|guardians|all] [yaw]
import { chromium } from 'playwright';
import { createServer } from 'vite';

const out = process.argv[2] ?? '.';
const set = process.argv[3] ?? 'all';
const yaw = process.argv[4] && process.argv[4] !== '-' ? process.argv[4] : undefined;
const pick = process.argv[5];
const server = await createServer({ server: { port: 4193, strictPort: true }, logLevel: 'error' });
await server.listen();
const browser = await chromium.launch({
  executablePath: process.env.CHROMIUM_PATH || undefined,
  args: ['--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--ignore-gpu-blocklist'],
});
const page = await browser.newPage({ viewport: { width: 1600, height: set === 'all' ? 1000 : 640 } });
const errors = [];
page.on('pageerror', (e) => errors.push(e.message));
page.on('console', (m) => m.type() === 'error' && errors.push(m.text()));
try {
  await page.goto(`http://localhost:4193/scripts/gallery/index.html?set=${set}${yaw ? `&yaw=${yaw}` : ''}${pick ? `&pick=${pick}` : ''}`);
  await page.waitForFunction(() => window.__ready, null, { timeout: 240000 });
  await page.waitForTimeout(1500);
  const file = `${out}/models-${set}${yaw ? `-yaw${yaw}` : ''}${pick ? `-${pick.replace(/,/g, '+')}` : ''}.png`;
  await page.screenshot({ path: file });
  console.log('zrzut:', file);
  console.log('błędy:', errors.length ? errors.slice(0, 5) : 'brak');
} finally {
  await browser.close();
  await server.close();
}
