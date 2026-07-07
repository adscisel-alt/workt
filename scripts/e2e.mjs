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

  // Ekran wyboru -> nowy protokół
  await page.waitForSelector('[data-action="nowy-projekt"]');
  await page.click('[data-action="nowy-projekt"]');
  await page.waitForSelector('[data-meta="protokolNr"]', { timeout: 5000 });
  sprawdz(true, 'Utworzono nowy projekt z ekranu wyboru');

  // Dane protokołu
  await page.fill('[data-meta="protokolNr"]', '16/2026');
  await page.selectOption('[data-meta-select="rodzajKontroli"]', 'OKRESOWA ROCZNA (RAZ W ROKU)');
  await page.fill('[data-meta="adres"]', '03-286 Warszawa, ul. Żeromskiego 17');

  // Nowy protokół ma domyślny zestaw sekcji
  const domyslne = await page.locator('[data-sec-card]').count();
  sprawdz(domyslne === 6, 'Nowy protokół ma 6 domyślnych sekcji (' + domyslne + ')');

  // Dodaj sekcję
  await page.fill('#nowa-sekcja-nazwa', 'Elewacje i teren zewnętrzny');
  await page.click('[data-action="dodaj-sekcje"]');
  await page.waitForSelector('.sekcja-title');
  const liczbaSekcji = await page.locator('[data-sec-card]').count();
  sprawdz(liczbaSekcji === 7, 'Dodano kolejną sekcję (' + liczbaSekcji + ')');

  // Podpowiedzi elementów w domyślnej sekcji (pierwsza = „Zewnętrzne elementy budynku")
  const pierwszaSek = await page.locator('[data-sec-card]').first().getAttribute('data-sec-card');
  const maElem = await page.locator(`[data-elem-select][data-sec="${pierwszaSek}"]`).count();
  sprawdz(maElem === 1, 'Sekcja domyślna ma listę gotowych elementów');
  await page.selectOption(`[data-elem-select][data-sec="${pierwszaSek}"]`, 'Obróbki blacharskie');
  await page.waitForTimeout(200);
  const elemText = await page.locator(`[data-sec="${pierwszaSek}"][data-field="element"]`).last().inputValue();
  sprawdz(elemText === 'Obróbki blacharskie', 'Wstawiono gotowy element (pole Element)');

  const secId = await page.locator('[data-sec-card]').last().getAttribute('data-sec-card');

  // Dodaj ustalenie
  await page.click(`[data-action="dodaj-ust"][data-sec="${secId}"]`);
  await page.waitForSelector(`[data-sec="${secId}"][data-field="text"]`);
  await page.fill(`[data-sec="${secId}"][data-field="element"]`, 'Ściany zewnętrzne');
  await page.fill(`[data-sec="${secId}"][data-field="text"]`, 'Mechaniczne uszkodzenia ścian przy wejściu do śmietnika.');
  // Ocena stanu technicznego przy tej pozycji
  await page.selectOption(`[data-sec="${secId}"][data-field="ocena"]`, 'Zły');
  const ocenaVal = await page.locator(`[data-sec="${secId}"][data-field="ocena"]`).first().inputValue();
  sprawdz(ocenaVal === 'Zły', 'Ocena przypisana do pozycji (nie do sekcji)');
  // Stopień pilności
  const pilnoscEl = page.locator(`[data-sec="${secId}"][data-field="pilnosc"]`).first();
  await pilnoscEl.selectOption('2');
  await page.waitForTimeout(200);
  sprawdz((await pilnoscEl.inputValue()) === '2', 'Ustawiono stopień pilności');
  // Rozdział III — automatyczny podgląd zaleceń
  const wierszeZal = await page.locator('.zal-tabela tbody tr').count();
  sprawdz(wierszeZal >= 1, 'Rozdział III: zalecenie pojawiło się automatycznie w tabeli');
  // „dobry z uwagą” też trafia do zaleceń; „brak” nie
  await page.selectOption(`[data-sec="${secId}"][data-field="pilnosc"]`, 'U');
  await page.waitForTimeout(200);
  const maUwaga = await page.locator('.zal-tabela tbody tr td.z-pil', { hasText: 'dobry z uwagą' }).count();
  sprawdz(maUwaga >= 1, 'Rozdział III: „dobry z uwagą” trafia do zaleceń');

  // Ręczna zmiana kolejności pozycji w sekcji (przesuwanie w górę/w dół)
  await page.click(`[data-action="dodaj-ust"][data-sec="${secId}"]`);
  await page.waitForTimeout(150);
  await page.locator(`[data-sec="${secId}"][data-field="element"]`).last().fill('Cokół budynku');
  await page.waitForTimeout(150);
  const przedElementy = await page.locator(`[data-sec-card="${secId}"] [data-field="element"]`).evaluateAll(
    (els) => els.map((e) => e.value));
  // Druga pozycja („Cokół budynku") — przesuń wyżej
  await page.click(`[data-sec-card="${secId}"] .ust-card:nth-child(2) [data-action="ust-gora"]`);
  await page.waitForTimeout(150);
  const poElementy = await page.locator(`[data-sec-card="${secId}"] [data-field="element"]`).evaluateAll(
    (els) => els.map((e) => e.value));
  sprawdz(przedElementy[0] !== poElementy[0] && poElementy[0] === 'Cokół budynku',
    'Przesunięto pozycję w górę (zmiana kolejności)');
  // Przywróć pierwotną kolejność do dalszej części testu (Word)
  await page.click(`[data-sec-card="${secId}"] .ust-card:nth-child(1) [data-action="ust-dol"]`);
  await page.waitForTimeout(150);

  // Dodaj zdjęcie DO USTALENIA (klik „Zdjęcie” w karcie ustalenia ustawia cel)
  await page.click(`.ust-card [data-action="z-pliku"][data-ust]`);
  await page.setInputFiles('#plik-zdjecie', '/tmp/test-foto.png');
  await page.waitForSelector('.ust-card .foto img', { timeout: 5000 });
  const liczbaZdjec = await page.locator('.ust-card .foto').count();
  sprawdz(liczbaZdjec >= 1, 'Dodano zdjęcie do ustalenia');
  await page.fill('.ust-card .foto-opis', 'Uszkodzenie ściany przy śmietniku.');

  // Przenoszenie zdjęcia między sekcjami / pozycjami (okno wyboru po kliknięciu zdjęcia)
  const fotoId = await page.locator('.ust-card .foto img').first().getAttribute('data-foto-img');
  const btn = page.locator(`.foto-move-btn[data-foto="${fotoId}"]`).first();
  const srcSek = await btn.getAttribute('data-sec');
  const srcUst = await btn.getAttribute('data-ust');
  const origCel = srcUst ? `ust:${srcSek}:${srcUst}` : `sek:${srcSek}`;
  await btn.click();
  await page.waitForSelector('.przenies-tlo');
  sprawdz(await page.locator('.cel-naglowek').count() >= 1, 'Okno „Przenieś do…" pokazuje listę rozdziałów');
  await page.click(`[data-action="przenies-do"][data-cel="sek:${secId}"]`);
  await page.waitForTimeout(200);
  const przeniesione = await page.locator(
    `[data-drop-sec="${secId}"]:not([data-drop-ust]) [data-foto-img="${fotoId}"]`).count();
  sprawdz(przeniesione === 1, 'Przeniesiono zdjęcie do innej sekcji');
  // Wróć na pierwotne miejsce (żeby nie zaburzać dalszych sprawdzeń eksportu)
  await page.locator(`.foto-move-btn[data-foto="${fotoId}"]`).first().click();
  await page.waitForSelector('.przenies-tlo');
  await page.click(`[data-action="przenies-do"][data-cel="${origCel}"]`);
  await page.waitForTimeout(200);

  // Zmiana kolejności zdjęć w obrębie tego samego podrozdziału (◀ / ▶)
  await page.click(`.ust-card [data-action="z-pliku"][data-ust]`); // to samo ustalenie
  await page.setInputFiles('#plik-zdjecie', '/tmp/test-foto.png');
  await page.waitForTimeout(300);
  const galSel = `[data-drop-sec="${srcSek}"]${srcUst ? `[data-drop-ust="${srcUst}"]` : ''}`;
  const przedKol = await page.locator(`${galSel} .foto img`).evaluateAll(
    (els) => els.map((e) => e.getAttribute('data-foto-img')));
  sprawdz(przedKol.length >= 2, 'Dodano drugie zdjęcie do tego samego podrozdziału');
  await page.click(`${galSel} .foto:first-child [data-action="foto-prawo"]`);
  await page.waitForTimeout(200);
  const poKol = await page.locator(`${galSel} .foto img`).evaluateAll(
    (els) => els.map((e) => e.getAttribute('data-foto-img')));
  sprawdz(poKol[0] === przedKol[1] && poKol[1] === przedKol[0],
    'Zmieniono kolejność zdjęć w podrozdziale');

  // Stan techniczny przy zdjęciu: dziedziczy z podrozdziału, z możliwością zmiany
  const ustOcenaSel = `[data-sec="${srcSek}"]${srcUst ? `[data-ust="${srcUst}"]` : ''}[data-field="ocena"]`;
  await page.selectOption(ustOcenaSel, 'Dostateczny');
  await page.waitForTimeout(150);
  await page.click(`[data-action="z-pliku"][data-sec="${srcSek}"]${srcUst ? `[data-ust="${srcUst}"]` : ''}`);
  await page.setInputFiles('#plik-zdjecie', '/tmp/test-foto.png');
  await page.waitForTimeout(300);
  const nowaOcena = await page.locator(`${galSel} .foto-ocena select`).last().inputValue();
  sprawdz(nowaOcena === 'Dostateczny', 'Nowe zdjęcie dziedziczy stan techniczny podrozdziału');
  await page.locator(`${galSel} .foto-ocena select`).last().selectOption('Awaryjny');
  await page.waitForTimeout(150);
  const poZmianie = await page.locator(`${galSel} .foto-ocena select`).last().inputValue();
  const parentNadal = await page.locator(ustOcenaSel).inputValue();
  sprawdz(poZmianie === 'Awaryjny' && parentNadal === 'Dostateczny',
    'Można zmienić stan techniczny pojedynczego zdjęcia bez zmiany podrozdziału');

  // Zdjęcie główne obiektu
  await page.click('[data-action="glowne-plik"]');
  await page.setInputFiles('#plik-zdjecie', '/tmp/test-foto.png');
  await page.waitForSelector('.glowne-podglad img', { timeout: 5000 });
  const maGlowne = await page.locator('.glowne-podglad img').count();
  sprawdz(maGlowne === 1, 'Dodano zdjęcie główne obiektu');

  // Osoby wykonujące przegląd — dodanie z zapisanej listy
  await page.selectOption('[data-osoba-select]', '1'); // Zbigniew Łukaszewski
  await page.waitForTimeout(200);
  const inspImie = await page.locator('[data-insp][data-field="imie"]').last().inputValue();
  sprawdz(inspImie === 'Zbigniew Łukaszewski', 'Dodano osobę z listy (' + inspImie + ')');

  // Dane budynku — checkboxy (rodzaj konstrukcji + wyposażenie)
  await page.check('input[data-chk="rodzaj"][data-val="żelbetowa"]');
  await page.check('input[data-chk="wyposazenie"][data-val="instalacje elektryczne"]');

  // Własna pozycja wyposażenia
  await page.fill('#wyp-nowa', 'instalacja SSP (sygnalizacja pożaru)');
  await page.click('[data-action="dodaj-wyp"]');
  await page.waitForTimeout(200);
  const wypCustom = await page.locator('input[data-chk="wyposazenie"][data-val="instalacja SSP (sygnalizacja pożaru)"]').count();
  sprawdz(wypCustom === 1, 'Dodano własną pozycję wyposażenia');

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
  sprawdz(docXml.includes('Fotografia'), 'Tabela Rozdziału II ma kolumnę „Fotografia”');
  sprawdz(docXml.includes('Zestawienie zaleceń'), 'Rozdział III zawiera automatyczne zestawienie zaleceń');
  sprawdz(docXml.includes('OKRESOWA ROCZNA'), 'Word zawiera wybrany rodzaj kontroli (roczna)');
  sprawdz(docXml.includes('Przyjęte kryteria oceny stanu technicznego elementów budynku'), 'Word: tytuł kryteriów 1:1');
  sprawdz(docXml.includes('nie zagrażające bezpieczeństwu publicznemu'), 'Word: pełny opis kryteriów 1:1');
  sprawdz(docXml.includes('podlega weryfikacji i przekwalifikowaniu'), 'Word: akapit o weryfikacji stopnia pilności');
  sprawdz(docXml.includes('ZAKRES KONTROLI OBEJMUJE'), 'Word: stały blok „ZAKRES KONTROLI OBEJMUJE”');
  sprawdz(docXml.includes('Uszkodzenie ściany przy śmietniku'), 'Word: podpis zdjęcia trafia do kolumny „Opis”');
  sprawdz(docXml.includes('Metody i środki użytkowania elementów'), 'Word: końcowy blok metod użytkowania');
  sprawdz(docXml.includes('WNIOSKI'), 'Word: sekcja WNIOSKI na końcu');
  sprawdz(docXml.includes('Oświadczam, iż ustalenia zawarte w protokole'), 'Word: blok oświadczenia/podpisu');
  sprawdz(docXml.includes('Załączniki do protokołu'), 'Word: tabela załączników');
  sprawdz(docXml.includes('Zbigniew Łukaszewski'), 'Word: dane osoby zaciągnięte z Osób wykonujących przegląd');
  sprawdz(docXml.includes('Element, urządzenie, instalacje podlegające kontroli'), 'Word: nazwa kolumny 1');
  sprawdz(!docXml.includes('Ustalenia / opis stanu technicznego'), 'Word: usunięto starą nazwę/kolumnę L.p.');
  sprawdz(docXml.includes('Opis i zalecenia'), 'Word: kolumna „Opis i zalecenia”');
  sprawdz(docXml.includes('☑'), 'Dokument zawiera zaznaczone pola wyboru (dane budynku)');
  // Stopka z numeracją stron (pole PAGE) w osobnym pliku footer
  const listaFull = execSync(`unzip -l ${sciezka}`).toString();
  sprawdz(/footer\d*\.xml/.test(listaFull), 'Dokument zawiera stopkę (numeracja stron)');

  // Test trwałości + wyboru projektu: po przeładowaniu wybieramy zapisany projekt
  await page.click('[data-action="zapisz"]');
  await page.waitForTimeout(400);
  await page.reload({ waitUntil: 'networkidle' });
  await page.waitForSelector('.proj-open', { timeout: 5000 });
  const nazwaProj = (await page.textContent('.proj-nazwa')) || '';
  sprawdz(/Żeromskiego/.test(nazwaProj), 'Projekt na liście nazwany ulicą (' + nazwaProj.trim() + ')');
  await page.click('.proj-open');
  await page.waitForSelector('.sekcja-title', { timeout: 5000 });
  const adrPo = await page.inputValue('[data-meta="protokolNr"]');
  sprawdz(adrPo === '16/2026', 'Dane zachowane i wczytane z wybranego projektu');

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
