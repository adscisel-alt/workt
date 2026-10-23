// Test dymny strony web/ w przeglądarce (Playwright z zależności projektu). Uruchom: node tools/webtest.mjs [url]
import { chromium } from '../../node_modules/playwright/index.mjs';
import fs from 'node:fs';
const exe = process.env.PW_CHROMIUM || (fs.existsSync('/opt/pw-browsers/chromium') ? '/opt/pw-browsers/chromium' : undefined);
const browser = await chromium.launch({ executablePath: exe, args: ['--autoplay-policy=no-user-gesture-required'] });
const page = await browser.newPage({ viewport: { width: 900, height: 800 } });
const logs = [];
page.on('console', m => logs.push(m.type() + ': ' + m.text()));
page.on('pageerror', e => logs.push('pageerror: ' + e.message));
await page.goto(process.argv[2] || 'http://localhost:8765/index.html');
await page.click('#btn-start');
await page.waitForTimeout(9000);
await page.screenshot({ path: '/home/user/tools/shots/web1.png' });
const st = await page.textContent('#status');
console.log('status:', st);
// klawisze: strzałka w górę 1.5 s, spacja
await page.click('#c64-screen');
await page.keyboard.down('ArrowUp'); await page.waitForTimeout(1500); await page.keyboard.up('ArrowUp');
await page.keyboard.press('Space');
await page.waitForTimeout(1500);
await page.screenshot({ path: '/home/user/tools/shots/web2.png' });
console.log(logs.slice(0, 20).join('\n'));
await browser.close();
