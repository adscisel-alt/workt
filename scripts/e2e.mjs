// Test e2e: uruchamia podgląd produkcyjny i sprawdza pełny przepływ:
// dane -> sekcja -> ustalenie -> zdjęcie -> eksport .docx.
import { chromium } from 'playwright';
import { createServer } from 'vite';
import { writeFileSync, readFileSync, existsSync } from 'node:fs';
import { execSync } from 'node:child_process';

const CHROME = '/opt/pw-browsers/chromium-1194/chrome-linux/chrome';
const PORT = 5179;

// Mały, prawdziwy obraz JPEG (czerwony kwadrat 2x2) wygenerowany przez canvas w przeglądarce nie zadziała
// poza stroną — użyjemy 1x1 PNG przekonwertowanego; ale aplikacja akceptuje image/*, więc damy PNG.
const PNG_1x1 = Buffer.from(
  'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAAC0lEQVR42mP8z8BQDwAEhQGAhKmMIQAAAABJRU5ErkJggg==',
  'base64');
writeFileSync('/tmp/test-foto.png', PNG_1x1);

const server = await createServer({ server: { port: PORT }, logLevel: 'warn' });
await server.listen();
const url = `http://localhost:${PORT}/`;
console.log('Serwer dev na', url);

const browser = await chromium.launch({ executablePath: CHROME });
const ctx = await browser.newContext({ acceptDownloads: true });
const page = await ctx.newPage();
const bledy = [];
page.on('console', (m) => { if (m.type() === 'error') bledy.push(m.text()); });
page.on('pageerror', (e) => bledy.push('PAGEERROR: ' + e.message));

let ok = true;
function sprawdz(warunek, opis) {
  console.log((warunek ? '  ✓ ' : '  ✗ ') + opis);
  if (!warunek) ok = false;
}

try {
  await page.goto(url, { waitUntil: 'networkidle' });
  await page.waitForSelector('#app .topbar', { timeout: 10000 });
  sprawdz(true, 'Aplikacja załadowana');

  // Dane protokołu
  await page.fill('[data-meta="protokolNr"]', '16/2026');
  await page.fill('[data-meta="adres"]', '03-286 Warszawa, ul. Żeromskiego 17');

  // Dodaj sekcję
  await page.fill('#nowa-sekcja-nazwa', 'Elewacje i teren zewnętrzny');
  await page.click('[data-action="dodaj-sekcje"]');
  await page.waitForSelector('.sekcja-title');
  const liczbaSekcji = await page.locator('[data-sec-card]').count();
  sprawdz(liczbaSekcji === 1, 'Dodano sekcję');

  const secId = await page.getAttribute('[data-sec-card]', 'data-sec-card');

  // Ustaw ocenę
  await page.selectOption(`[data-sec="${secId}"][data-field="ogolnaOcena"]`, 'Zły');

  // Dodaj ustalenie
  await page.click(`[data-action="dodaj-ust"][data-sec="${secId}"]`);
  await page.waitForSelector(`[data-sec="${secId}"][data-field="text"]`);
  await page.fill(`[data-sec="${secId}"][data-field="text"]`, 'Mechaniczne uszkodzenia ścian przy wejściu do śmietnika.');
  // Stopień pilności
  await page.selectOption(`[data-sec="${secId}"][data-ust]`, '2').catch(() => {});
  const pilnoscEl = page.locator(`[data-sec="${secId}"][data-field="pilnosc"]`).first();
  await pilnoscEl.selectOption('2');
  sprawdz((await pilnoscEl.inputValue()) === '2', 'Ustawiono stopień pilności');

  // Dodaj zdjęcie przez ukryty input
  await page.setInputFiles('#plik-zdjecie', '/tmp/test-foto.png');
  await page.waitForSelector('.foto img', { timeout: 5000 });
  const liczbaZdjec = await page.locator('.foto').count();
  sprawdz(liczbaZdjec >= 1, 'Dodano zdjęcie');
  await page.fill('.foto-opis', 'Uszkodzenie ściany przy śmietniku.');

  // Dane budynku — checkboxy (rodzaj konstrukcji + wyposażenie)
  await page.check('input[data-chk="rodzaj"][data-val="żelbetowa"]');
  await page.check('input[data-chk="wyposazenie"][data-val="instalacje elektryczne"]');

  // Rozdział I — zalecenie z poprzedniej kontroli (rozwiń sekcję)
  await page.evaluate(() => document.querySelectorAll('details.karta').forEach((d) => { d.open = true; }));
  await page.click('[data-action="dodaj-zal"]');
  await page.waitForSelector('[data-field="text"][data-zal]');
  await page.fill('[data-zal][data-field="text"]', 'Uszkodzenia ścian przy śmietniku — wykonać naprawy.');
  await page.locator('[data-zal][data-field="status"]').first().selectOption('Nie wykonano');

  // Podsumowanie
  await page.fill('[data-field="podsumowanie"]', 'Budynek w stanie dostatecznym.\nZalecane naprawy bieżące.');

  // Eksport .docx
  const [download] = await Promise.all([
    page.waitForEvent('download', { timeout: 15000 }),
    page.click('[data-action="eksport"]'),
  ]);
  const sciezka = '/tmp/wynik-protokol.docx';
  await download.saveAs(sciezka);
  sprawdz(existsSync(sciezka), 'Pobrano plik .docx');

  // Walidacja: to poprawny ZIP z word/document.xml zawierający nasze dane i obraz
  const lista = execSync(`unzip -l ${sciezka}`).toString();
  sprawdz(/word\/document\.xml/.test(lista), 'Plik zawiera word/document.xml');
  sprawdz(/word\/media\/|media\//.test(lista), 'Plik zawiera osadzone media (zdjęcie)');
  const docXml = execSync(`unzip -p ${sciezka} word/document.xml`).toString();
  sprawdz(docXml.includes('16/2026'), 'Dokument zawiera numer protokołu');
  sprawdz(docXml.includes('Żeromskiego'), 'Dokument zawiera adres');
  sprawdz(docXml.includes('śmietnika'), 'Dokument zawiera treść ustalenia');
  sprawdz(docXml.includes('Elewacje'), 'Dokument zawiera nazwę sekcji');
  sprawdz(docXml.includes('ROZDZIAŁ I'), 'Dokument zawiera Rozdział I');
  sprawdz(docXml.includes('☑'), 'Dokument zawiera zaznaczone pola wyboru (dane budynku)');
  // Stopka z numeracją stron (pole PAGE) w osobnym pliku footer
  const listaFull = execSync(`unzip -l ${sciezka}`).toString();
  sprawdz(/footer\d*\.xml/.test(listaFull), 'Dokument zawiera stopkę (numeracja stron)');

  // Test trwałości: po przeładowaniu dane są wczytane z IndexedDB
  await page.click('[data-action="zapisz"]');
  await page.waitForTimeout(400);
  await page.reload({ waitUntil: 'networkidle' });
  await page.waitForSelector('.sekcja-title');
  const adrPo = await page.inputValue('[data-meta="protokolNr"]');
  sprawdz(adrPo === '16/2026', 'Dane zachowane po przeładowaniu (IndexedDB)');

} catch (e) {
  console.error('BŁĄD TESTU:', e.message);
  ok = false;
} finally {
  if (bledy.length) {
    console.log('\nBŁĘDY KONSOLI:');
    for (const b of bledy) console.log('  ! ' + b);
  }
  await browser.close();
  await server.close();
  console.log('\n' + (ok && bledy.length === 0 ? 'WYNIK: OK ✅' : 'WYNIK: NIEPOWODZENIE ❌'));
  process.exit(ok && bledy.length === 0 ? 0 : 1);
}
