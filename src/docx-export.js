// Generowanie protokołu jako pliku Word (.docx) — układ wierny oryginalnemu wzorowi:
// strona tytułowa, dane obiektu, kryteria, Rozdział I/II/III, stopka z numeracją stron.
import {
  Document, Packer, Paragraph, TextRun, HeadingLevel, AlignmentType,
  Table, TableRow, TableCell, WidthType, BorderStyle, ImageRun, VerticalAlign,
  Footer, PageNumber,
} from 'docx';
import { wczytajZdjecie } from './storage.js';
import {
  RODZAJE_KONSTRUKCJI, WYPOSAZENIE, wchodziDoZalecen, etykietaPilnosci,
} from './constants.js';

const FONT = 'Calibri';
const CZARNA = { style: BorderStyle.SINGLE, size: 4, color: '000000' };
const BORDERS = { top: CZARNA, bottom: CZARNA, left: CZARNA, right: CZARNA,
  insideHorizontal: CZARNA, insideVertical: CZARNA };

function p(text, opts = {}) {
  return new Paragraph({
    alignment: opts.align,
    spacing: opts.spacing || { after: 80 },
    children: [new TextRun({ text: text ?? '', bold: opts.bold, size: opts.size || 22,
      italics: opts.italics, color: opts.color, font: FONT })],
  });
}

function naglowek(text, level = HeadingLevel.HEADING_2) {
  return new Paragraph({ heading: level, spacing: { before: 220, after: 120 },
    children: [new TextRun({ text, bold: true, font: FONT })] });
}

function komorka(content, opts = {}) {
  const children = Array.isArray(content) ? content
    : [typeof content === 'string' ? p(content, opts) : content];
  return new TableCell({
    children,
    width: opts.width ? { size: opts.width, type: WidthType.PERCENTAGE } : undefined,
    verticalAlign: opts.valign || VerticalAlign.CENTER,
    shading: opts.shade ? { fill: opts.shade } : undefined,
    columnSpan: opts.span,
  });
}

function tabelaDanych(wiersze) {
  return new Table({
    width: { size: 100, type: WidthType.PERCENTAGE },
    borders: BORDERS,
    rows: wiersze.filter((w) => w).map(([etykieta, wartosc]) => new TableRow({
      children: [
        komorka(etykieta, { width: 38, bold: true, shade: 'F2F2F2' }),
        komorka(String(wartosc ?? ''), { width: 62 }),
      ],
    })),
  });
}

// Lista pozycji z polami wyboru ☑ / ☐
function listaWyboru(wszystkie, zaznaczone) {
  const set = new Set(zaznaczone || []);
  const runs = [];
  wszystkie.forEach((opcja, i) => {
    const zazn = set.has(opcja);
    runs.push(new TextRun({ text: (zazn ? '☑ ' : '☐ ') + opcja + '    ',
      size: 20, font: FONT, bold: zazn }));
  });
  return new Paragraph({ spacing: { after: 80 }, children: runs });
}

async function obrazRun(z, szerokoscPx = 250) {
  const blob = await wczytajZdjecie(z.id);
  if (!blob) return null;
  const buf = new Uint8Array(await blob.arrayBuffer());
  const ratio = (z.h && z.w) ? z.h / z.w : 0.75;
  return new ImageRun({ data: buf, type: 'jpg',
    transformation: { width: szerokoscPx, height: Math.round(szerokoscPx * ratio) } });
}

async function tabelaZdjec(zdjecia) {
  const komorki = [];
  for (const z of zdjecia) {
    const run = await obrazRun(z, 250);
    const dzieci = [];
    if (run) dzieci.push(new Paragraph({ alignment: AlignmentType.CENTER, children: [run] }));
    else dzieci.push(p('[brak danych zdjęcia]', { italics: true, color: '999999' }));
    if (z.opis) dzieci.push(p(z.opis, { align: AlignmentType.CENTER, size: 18, italics: true }));
    komorki.push(komorka(dzieci, { width: 50, valign: VerticalAlign.TOP }));
  }
  if (komorki.length % 2 === 1) komorki.push(komorka('', { width: 50 }));
  const wiersze = [];
  for (let i = 0; i < komorki.length; i += 2) {
    wiersze.push(new TableRow({ children: [komorki[i], komorki[i + 1]] }));
  }
  return new Table({ width: { size: 100, type: WidthType.PERCENTAGE }, borders: BORDERS, rows: wiersze });
}

// Kryteria oceny stanu technicznego — tekst 1:1 z wzoru (nie zmieniać).
const KRYTERIA = [
  ['1', 'Dobry', '0-15', 'Element budynku (lub rodzaj konstrukcji, wykończenia, wyposażenia) – jest dobrze utrzymany, konserwowany, nie wykazuje zużycia i uszkodzeń. Cechy i właściwości wbudowanych materiałów odpowiadają wymogom normy.'],
  ['2', 'zadowalający', '16-30', 'Element budynku utrzymany jest należycie. Celowy jest remont bieżący polegający na drobnych naprawach, uzupełnieniach, konserwacji, impregnacji.'],
  ['3', 'dostateczny', '31-50', 'W elementach budynku występują niewielkie uszkodzenia i ubytki nie zagrażające bezpieczeństwu publicznemu. Celowy jest częściowy remont kapitalny.'],
  ['4', 'Zły', '51-73', 'W elementach budynku występują znaczne uszkodzenia, ubytki. Cechy i właściwości wbudowanych materiałów mają obniżoną klasę. Wymagany kompleksowy remont kapitalny.'],
  ['5', 'Awaryjny', '>73', 'W elementach budynku występują znaczne uszkodzenia i ubytki. Rodzaj i zakres uszkodzeń ma bezpośredni wpływ na bezpieczeństwo konstrukcji lub  użytkowania. Wymagane jest podjęcie natychmiastowych działań interwencyjnych.'],
];

function tabelaKryteriow() {
  const header = new TableRow({ tableHeader: true, children: [
    komorka('L.p.', { width: 6, bold: true, shade: 'D9D9D9' }),
    komorka('Klasyfikacja stanu technicznego elementu', { width: 27, bold: true, shade: 'D9D9D9' }),
    komorka('Procentowe zużycie elementu (%)', { width: 17, bold: true, shade: 'D9D9D9' }),
    komorka('Kryterium oceny', { width: 50, bold: true, shade: 'D9D9D9' }),
  ] });
  const rows = KRYTERIA.map(([lp, stan, zuz, opis]) => new TableRow({ children: [
    komorka(lp, { width: 6, align: AlignmentType.CENTER, valign: VerticalAlign.TOP }),
    komorka(stan, { width: 27, valign: VerticalAlign.TOP }),
    komorka(zuz, { width: 17, align: AlignmentType.CENTER, valign: VerticalAlign.TOP }),
    komorka(opis, { width: 50, valign: VerticalAlign.TOP }),
  ] }));
  return new Table({ width: { size: 100, type: WidthType.PERCENTAGE }, borders: BORDERS, rows: [header, ...rows] });
}

// Stały blok „ZAKRES KONTROLI OBEJMUJE:” (tekst 1:1, zawsze taki sam).
function blokZakresKontroli() {
  const pkt = (nr, tekst, bold = false) => new Paragraph({
    spacing: { after: 80 }, indent: { left: 480, hanging: 260 },
    children: [new TextRun({ text: `${nr})\t${tekst}`, size: 22, font: FONT, bold })],
  });
  const naglowekRow = new TableRow({ children: [
    komorka('ZAKRES KONTROLI OBEJMUJE:', { width: 100, bold: true, shade: 'D9D9D9' }),
  ] });
  const trescRow = new TableRow({ children: [
    komorka([
      pkt('1', 'Sprawdzenie wykonania zaleceń z poprzedniej kontroli,'),
      pkt('2', 'Przegląd elementów budynku, budowli i instalacji narażonych na szkodliwe wpływy atmosferyczne i niszczące działania czynników występujących podczas użytkowania budynku, których uszkodzenia mogą powodować zagrożenie dla bezpieczeństwa osób, środowiska oraz konstrukcji budynku, instalacji i urządzeń służących ochronie środowiska,'),
      pkt('3', 'Oględziny elementów budynku', true),
      pkt('4', 'Przegląd stanu technicznego elementów budynku i budowli i instalacji narażonych na szkodliwe wpływy atmosferyczne i niszczące działania czynników występujących podczas użytkowania'),
    ], { width: 100, valign: VerticalAlign.TOP }),
  ] });
  return new Table({ width: { size: 100, type: WidthType.PERCENTAGE }, borders: BORDERS, rows: [naglowekRow, trescRow] });
}

// Punkt listy a)–d): „stopień pilności (N)” pogrubiony + reszta.
function pktPilnosci(litera, numer, tekst) {
  return new Paragraph({
    spacing: { after: 60 }, indent: { left: 360 },
    children: [
      new TextRun({ text: `${litera}) `, size: 22, font: FONT }),
      new TextRun({ text: `stopień pilności (${numer}) `, bold: true, size: 22, font: FONT }),
      new TextRun({ text: `– ${tekst}`, size: 22, font: FONT }),
    ],
  });
}

// Rozdział I — sprawdzenie wykonania zaleceń z poprzedniej kontroli
function tabelaRozdzialI(zalecenia) {
  const header = new TableRow({ tableHeader: true, children: [
    komorka('L.p.', { width: 6, bold: true, shade: 'D9D9D9' }),
    komorka('Zalecenia z poprzedniej kontroli', { width: 56, bold: true, shade: 'D9D9D9' }),
    komorka('Stopień pilności', { width: 13, bold: true, shade: 'D9D9D9' }),
    komorka('Sprawdzenie wykonania', { width: 25, bold: true, shade: 'D9D9D9' }),
  ] });
  const rows = zalecenia.map((z, i) => new TableRow({ children: [
    komorka(String(i + 1), { width: 6, align: AlignmentType.CENTER }),
    komorka(z.text || '', { width: 56, valign: VerticalAlign.TOP }),
    komorka(etykietaPilnosci(z.pilnosc), { width: 13, align: AlignmentType.CENTER }),
    komorka(z.status || '', { width: 25 }),
  ] }));
  return new Table({ width: { size: 100, type: WidthType.PERCENTAGE }, borders: BORDERS, rows: [header, ...rows] });
}

// Zawartość komórki „Fotografia": same zdjęcia (bez podpisu — podpis idzie do kolumny „Opis”).
async function komorkaFoto(zdjecia) {
  const dzieci = [];
  for (const z of (zdjecia || [])) {
    const run = await obrazRun(z, 190);
    if (run) dzieci.push(new Paragraph({ alignment: AlignmentType.CENTER, spacing: { after: 40 }, children: [run] }));
  }
  if (!dzieci.length) dzieci.push(p('—', { align: AlignmentType.CENTER, color: '999999' }));
  return dzieci;
}

// Zawartość komórki „Opis": podpisy zdjęć (np. „elewacja czysta”), jeden pod drugim.
function komorkaOpis(zdjecia) {
  const dzieci = [];
  for (const z of (zdjecia || [])) {
    const o = (z.opis || '').trim();
    if (o) dzieci.push(p(o, { size: 20 }));
  }
  if (!dzieci.length) dzieci.push(p('', { size: 20 }));
  return dzieci;
}

// Akapit treści ustalenia: pogrubiony element + opis.
function akapitUstalenie(u) {
  const el = (u.element || '').trim();
  const tx = (u.text || '').trim();
  const runs = [];
  if (el) runs.push(new TextRun({ text: el, bold: true, size: 22, font: FONT }));
  if (el && tx) runs.push(new TextRun({ text: ' – ', size: 22, font: FONT }));
  if (tx) runs.push(new TextRun({ text: tx, size: 22, font: FONT }));
  if (!runs.length) runs.push(new TextRun({ text: '', size: 22, font: FONT }));
  return new Paragraph({ spacing: { after: 40 }, children: runs });
}

// Tabela ustaleń w układzie wzoru: 4 kolumny z kolumną „Fotografia”.
async function tabelaUstalen(ustalenia) {
  const header = new TableRow({ tableHeader: true, children: [
    komorka('Element, urządzenie, instalacje podlegające kontroli', { width: 24, bold: true, shade: 'D9D9D9' }),
    komorka('Ocena stanu technicznego', { width: 12, bold: true, shade: 'D9D9D9' }),
    komorka('Stopień pilności', { width: 10, bold: true, shade: 'D9D9D9' }),
    komorka('Opis i zalecenia', { width: 26, bold: true, shade: 'D9D9D9' }),
    komorka('Fotografia', { width: 28, bold: true, shade: 'D9D9D9' }),
  ] });
  const rows = [];
  for (const u of ustalenia) {
    rows.push(new TableRow({ children: [
      komorka([akapitUstalenie(u)], { width: 24, valign: VerticalAlign.TOP }),
      komorka(u.ocena || '', { width: 12, align: AlignmentType.CENTER, valign: VerticalAlign.TOP }),
      komorka(etykietaPilnosci(u.pilnosc), { width: 10, align: AlignmentType.CENTER, valign: VerticalAlign.TOP }),
      komorka(komorkaOpis(u.zdjecia), { width: 26, valign: VerticalAlign.TOP }),
      komorka(await komorkaFoto(u.zdjecia), { width: 28, valign: VerticalAlign.TOP }),
    ] }));
  }
  return new Table({ width: { size: 100, type: WidthType.PERCENTAGE }, borders: BORDERS, rows: [header, ...rows] });
}

// Automatyczna tabela zaleceń (Rozdział III) — z ustaleń Rozdziału II z pilnością 1–4.
function tabelaZalecen(doc) {
  const zal = [];
  for (const s of doc.sekcje || []) {
    for (const u of s.ustalenia || []) {
      if (wchodziDoZalecen(u.pilnosc)) zal.push(u);
    }
  }
  const header = new TableRow({ tableHeader: true, children: [
    komorka('L.p.', { width: 6, bold: true, shade: 'D9D9D9' }),
    komorka('Zalecenia', { width: 79, bold: true, shade: 'D9D9D9' }),
    komorka('Stopień pilności', { width: 15, bold: true, shade: 'D9D9D9' }),
  ] });
  const rows = zal.map((u, i) => new TableRow({ children: [
    komorka(String(i + 1), { width: 6, align: AlignmentType.CENTER, valign: VerticalAlign.TOP }),
    komorka([akapitUstalenie(u)], { width: 79, valign: VerticalAlign.TOP }),
    komorka(etykietaPilnosci(u.pilnosc), { width: 15, align: AlignmentType.CENTER, valign: VerticalAlign.TOP }),
  ] }));
  return { liczba: zal.length,
    tabela: new Table({ width: { size: 100, type: WidthType.PERCENTAGE }, borders: BORDERS, rows: [header, ...rows] }) };
}

// Stały blok końcowy: metody i środki użytkowania + WNIOSKI (tekst 1:1).
const METODY_UZYTKOWANIA = [
  '1. Dachy i obróbki blacharskie – Regularnie kontrolować stan pokrycia dachowego, rynien, rur spustowych i obróbek blacharskich – co najmniej raz w roku oraz po wystąpieniu silnych wiatrów lub intensywnych opadów. Oczyszczać rynny i wpusty z liści, gałęzi i innych zanieczyszczeń, aby zapobiegać zastoju wody. Powierzchnie metalowe zabezpieczać powłokami antykorozyjnymi, a miejsca ognisk korozji niezwłocznie usuwać i odnawiać zabezpieczenie.',
  '2. Elewacje i ocieplenia – Prowadzić okresowe przeglądy stanu tynków, okładzin elewacyjnych i połączeń systemów ociepleniowych. Uszkodzenia powierzchniowe (np. pęknięcia, ubytki, odspojenia) naprawiać niezwłocznie, aby ograniczyć wnikanie wody i degradację materiałów. Zaleca się wykonywanie zabiegów mycia i konserwacji elewacji co 3–5 lat, z użyciem środków dopuszczonych do stosowania na danego typu powierzchni.',
  '3. Stolarka okienna i drzwiowa – Okresowo sprawdzać stan powłok malarskich, uszczelek i okuć. W razie potrzeby odnawiać powłoki ochronne, a elementy z drewna impregnować i malować co 3–5 lat. Dbać o drożność otworów odwadniających i właściwą wentylację pomieszczeń w celu ograniczenia kondensacji pary wodnej.',
  '4. Balkony, tarasy, balustrady – Sprawdzać stan hydroizolacji, spadków oraz odwodnienia – w razie uszkodzeń niezwłocznie wykonywać naprawy. Elementy metalowe balustrad malować farbami antykorozyjnymi, a elementy betonowe lub kamienne zabezpieczać impregnatami hydrofobowymi. Nie dopuszczać do gromadzenia się śniegu i lodu w sposób zagrażający nośności lub bezpieczeństwu użytkowników.',
  '5. Pozostałe elementy zewnętrzne – Regularnie kontrolować stan kominów, cokołów, daszków, zadaszeń, reklam i elementów zamocowanych do elewacji. W przypadku występowania spękań lub zawilgoceń – podjąć działania naprawcze i uszczelniające. Stosować materiały i środki posiadające odpowiednie atesty oraz dopuszczenia do stosowania w budownictwie.',
];
const WNIOSKI_TXT = [
  '1. Oceny stanu technicznego dokonano jako oględziny wizualne bez wykonywania odkrywek. Ocena jest ważna na dzień jej opracowania. Autor opracowania nie bierze odpowiedzialności za ewentualne wady ukryte lub błędy w przedstawionej dokumentacji czy uzyskanej informacji.',
  '3. Należy rozpoznać przyczyny i przystąpić do usuwania nieprawidłowości zakwalifikowanych i oznaczonych stopniem pilności „2” ze względu na zagrożenie, jakie stwarzają w dłuższej perspektywie czasowej, dla stanu technicznego konstrukcji budynku i bezpieczeństwa użytkowania.',
  '4. Należy obserwować nieprawidłowości oznaczone stopniem „2/3”. W przypadku stwierdzenia, że stwierdzony proces trwa i pogłębiają się uszkodzenia – przystąpić do procedury przewidzianej dla stopnia pilności „2”.',
  '5. Zagadnienia zakwalifikowane i oznaczone stopniem pilności „3” należy uwzględnić i wykonać w przeciągu roku od daty sporządzenia protokołu.',
  '6. Zagadnienia zakwalifikowane i oznaczone stopniem pilności „4” należy uwzględnić w planach rzeczowo-finansowych dotyczących utrzymania obiektu w perspektywie nie dłuższej niż 5 lat od daty sporządzenia protokołu.',
  '7. Należy wykonać również zalecenia niewykonane z protokołu z roku poprzedniego, które ujęto w tabeli Rozdziału I.',
];

function blokMetodyIWnioski() {
  const out = [];
  const npar = (txt) => new Paragraph({ spacing: { after: 100 }, indent: { left: 360, hanging: 280 },
    children: [new TextRun({ text: txt, size: 22, font: FONT })] });

  out.push(naglowek('Metody i środki użytkowania elementów obiektów budowlanych narażonych na szkodliwe działanie wpływów atmosferycznych i niszczące działanie innych czynników.'));
  for (const t of METODY_UZYTKOWANIA) out.push(npar(t));

  // WNIOSKI — pogrubione, jako osobny, wyraźny akapit
  out.push(new Paragraph({ spacing: { before: 240, after: 120 },
    children: [new TextRun({ text: 'WNIOSKI', bold: true, size: 26, font: FONT })] }));

  out.push(npar(WNIOSKI_TXT[0]));
  // Punkt 2 — pierwsze zdanie pogrubione
  out.push(new Paragraph({ spacing: { after: 100 }, indent: { left: 360, hanging: 280 }, children: [
    new TextRun({ text: '2. ', size: 22, font: FONT }),
    new TextRun({ text: 'Budynek jest w stanie technicznym ogólnym dobrym, zezwalającym na dalsze jego bezpieczne użytkowanie zgodnie z przeznaczeniem. ', bold: true, size: 22, font: FONT }),
    new TextRun({ text: 'Stan konstrukcji podczas kontroli nie zagraża bezpieczeństwu użytkowania.', size: 22, font: FONT }),
  ] }));
  for (const t of WNIOSKI_TXT.slice(1)) out.push(npar(t));
  return out;
}

// Linia roli zależna od specjalności osoby.
function rolaLinia(specjalnosc) {
  const s = (specjalnosc || '').toLowerCase();
  if (/sanit|środowisk|srodowisk|instalac/.test(s)) {
    return 'dokonujący kontroli okresowej stanu technicznego instalacji i urządzeń służących ochronie środowiska';
  }
  return 'dokonujący kontroli okresowej stanu technicznego elementów obiektu budowlanego / budowlanego';
}

// Bloki podpisów + załączniki dla każdej osoby wykonującej przegląd.
function blokPodpisow(inspektorzy) {
  const elementy = [];
  const osoby = (inspektorzy || []).filter((i) => (i.imie || i.uprawnienia || i.specjalnosc));
  let att = 0;
  for (const ins of osoby) {
    const oswiad = new TableRow({ children: [
      komorka([p('Oświadczam, iż ustalenia zawarte w protokole są zgodne ze stanem faktycznym.',
        { align: AlignmentType.CENTER, bold: true, italics: true })], { span: 2, width: 100 }),
    ] });
    const rola = new TableRow({ children: [
      komorka([p(rolaLinia(ins.specjalnosc), { align: AlignmentType.CENTER, bold: true, italics: true, size: 20 })],
        { span: 2, width: 100 }),
    ] });
    const lewa = komorka([
      p(ins.imie || '', { align: AlignmentType.CENTER, bold: true, spacing: { before: 160 } }),
      p(ins.uprawnienia || '', { align: AlignmentType.CENTER, size: 20 }),
      ins.specjalnosc ? p('Specjalność ' + ins.specjalnosc, { align: AlignmentType.CENTER, size: 20 }) : p(''),
      p('imię i nazwisko oraz nr uprawnień, specjalność',
        { align: AlignmentType.CENTER, size: 16, italics: true, spacing: { before: 160 } }),
    ], { width: 55, valign: VerticalAlign.TOP });
    const prawa = komorka([
      new Paragraph({ spacing: { before: 700 }, children: [] }),
      p('...........................................................', { align: AlignmentType.CENTER }),
      p('(podpis)', { align: AlignmentType.CENTER, italics: true, size: 18 }),
    ], { width: 45, valign: VerticalAlign.BOTTOM });
    elementy.push(new Table({ width: { size: 100, type: WidthType.PERCENTAGE }, borders: BORDERS,
      rows: [oswiad, rola, new TableRow({ children: [lewa, prawa] })] }));

    const nag = new TableRow({ children: [
      komorka([p('Załączniki do protokołu', { align: AlignmentType.CENTER, bold: true })], { span: 2, width: 100 }),
    ] });
    const z1 = new TableRow({ children: [
      komorka(String(++att), { width: 12, align: AlignmentType.CENTER }),
      komorka('Uprawnienia budowlane', { width: 88 }),
    ] });
    const z2 = new TableRow({ children: [
      komorka(String(++att), { width: 12, align: AlignmentType.CENTER }),
      komorka('Zaświadczenie z Izby Inżynierów budownictwa', { width: 88 }),
    ] });
    elementy.push(new Paragraph({ spacing: { before: 120 }, children: [] }));
    elementy.push(new Table({ width: { size: 100, type: WidthType.PERCENTAGE }, borders: BORDERS, rows: [nag, z1, z2] }));
    elementy.push(new Paragraph({ spacing: { before: 240 }, children: [] }));
  }
  return elementy;
}

export async function generujDocx(doc) {
  const m = doc.meta;
  const dzieci = [];

  // --- Strona tytułowa ---
  dzieci.push(new Paragraph({ alignment: AlignmentType.CENTER, spacing: { after: 60 },
    children: [new TextRun({ text: `PROTOKÓŁ NR ${m.protokolNr || '....'}`, bold: true, size: 32, font: FONT })] }));
  if (m.dataKontroli) dzieci.push(p(`z dnia ${m.dataKontroli}`, { align: AlignmentType.CENTER, bold: true }));
  dzieci.push(p('z OKRESOWEJ KONTROLI STANU TECHNICZNEGO ELEMENTÓW OBIEKTU BUDOWLANEGO',
    { align: AlignmentType.CENTER, bold: true }));
  dzieci.push(p(`BRANŻA ${m.branza || ''}`, { align: AlignmentType.CENTER, bold: true }));
  dzieci.push(p(`KONTROLA ${m.rodzajKontroli || ''}`, { align: AlignmentType.CENTER }));

  // Zdjęcie główne obiektu na 1. stronie
  if (m.zdjecieGlowne && m.zdjecieGlowne.id) {
    const run = await obrazRun(m.zdjecieGlowne, 380);
    if (run) dzieci.push(new Paragraph({ alignment: AlignmentType.CENTER, spacing: { before: 160, after: 160 }, children: [run] }));
  }

  dzieci.push(naglowek('PODSTAWA OPRACOWANIA'));
  dzieci.push(p(m.podstawa));

  dzieci.push(naglowek('DANE OBIEKTU BUDOWLANEGO'));
  dzieci.push(tabelaDanych([
    ['Adres obiektu budowlanego', m.adres],
    ['Nr ewidencyjny obiektu', m.nrEwidencyjny],
    ['Nazwa obiektu / funkcja', m.nazwaObiektu],
    ['Data bieżącej kontroli', m.dataKontroli],
    ['Data następnej kontroli', m.dataNastepnej],
    ['Właściciel obiektu', m.wlasciciel],
    ['Zarządca obiektu', m.zarzadca],
  ]));

  dzieci.push(naglowek('OSOBY WYKONUJĄCE PRZEGLĄD'));
  const naglowekInsp = new TableRow({ tableHeader: true, children: [
    komorka('Imię i nazwisko', { width: 34, bold: true, shade: 'D9D9D9' }),
    komorka('Specjalność', { width: 30, bold: true, shade: 'D9D9D9' }),
    komorka('Nr uprawnień / przynależność do Izby', { width: 36, bold: true, shade: 'D9D9D9' }),
  ] });
  const wierszeInsp = (m.inspektorzy || []).map((ins) => new TableRow({ children: [
    komorka(ins.imie || '', { width: 34 }),
    komorka(ins.specjalnosc || '', { width: 30 }),
    komorka(ins.uprawnienia || '', { width: 36 }),
  ] }));
  dzieci.push(new Table({ width: { size: 100, type: WidthType.PERCENTAGE }, borders: BORDERS,
    rows: [naglowekInsp, ...wierszeInsp] }));

  dzieci.push(naglowek('PODSTAWOWE DANE OBIEKTU BUDOWLANEGO'));
  dzieci.push(p('Rodzaj konstrukcji:', { bold: true, spacing: { before: 60, after: 40 } }));
  dzieci.push(listaWyboru(RODZAJE_KONSTRUKCJI, m.rodzajKonstrukcji));
  dzieci.push(p('Wyposażenie budynku:', { bold: true, spacing: { before: 60, after: 40 } }));
  dzieci.push(listaWyboru(WYPOSAZENIE.concat(m.wyposazenieDodatkowe || []), m.wyposazenie));
  dzieci.push(tabelaDanych([
    ['Liczba kondygnacji nadziemnych', m.liczbaKondygnacjiNad],
    ['Liczba kondygnacji podziemnych', m.liczbaKondygnacjiPod],
    ['Pozwolenie na użytkowanie', m.pozwolenieUzytkowanie],
    ['Powierzchnia zabudowy', m.powierzchniaZabudowy],
    ['Kubatura', m.kubatura],
  ]));

  dzieci.push(naglowek('Przyjęte kryteria oceny stanu technicznego elementów budynku'));
  dzieci.push(p('Dla napraw bieżących określa się czterostopniowy termin pilności wykonania naprawy. Stopień pilności wykonania naprawy głównej określa się w latach, w której planuje się realizację tej naprawy.'));
  dzieci.push(pktPilnosci('a', '1', 'oznacza roboty awaryjne, wymagające natychmiastowego wykonania.'));
  dzieci.push(pktPilnosci('b', '2', 'oznacza roboty wymagające wykonania w okresie 3 miesięcy od daty kontroli okresowej.'));
  dzieci.push(pktPilnosci('c', '3', 'oznacza roboty do wykonania w przeciągu roku od daty kontroli tj. do następnego przeglądu okresowego.'));
  dzieci.push(pktPilnosci('d', '4', 'oznacza roboty do wykonania w latach następnych, które powinny być uwzględnione w planie rzeczowo-finansowym zarządcy obiektu.'));
  dzieci.push(p('Stopień pilności ( ) podlega weryfikacji i przekwalifikowaniu w trakcie kolejnych kontroli rocznych.'));
  dzieci.push(p('Jednocześnie w celu przyjęcia jednolitych zasad konstruowania sumarycznej oceny stanu technicznego obiektu budowlanego poddanego okresowemu przeglądowi, zastosowano „Ogólne kryteria oceny i klasyfikacji technicznej stanu elementów budynku”, które zamieszczono w tabeli poniżej.'));
  dzieci.push(tabelaKryteriow());

  // Stały blok zakresu kontroli (zaraz po kryteriach)
  dzieci.push(new Paragraph({ spacing: { before: 160 }, children: [] }));
  dzieci.push(blokZakresKontroli());

  // --- ROZDZIAŁ I ---
  dzieci.push(naglowek('ROZDZIAŁ I: Sprawdzenie wykonania zaleceń z poprzedniej kontroli', HeadingLevel.HEADING_1));
  if (m.poprzedniaKontrola) dzieci.push(p(m.poprzedniaKontrola));
  if (doc.rozdzialI && doc.rozdzialI.length) {
    dzieci.push(tabelaRozdzialI(doc.rozdzialI));
  } else {
    dzieci.push(p('Brak zaleceń z poprzedniej kontroli / pierwsza kontrola.', { italics: true }));
  }

  // --- ROZDZIAŁ II ---
  dzieci.push(naglowek('ROZDZIAŁ II: Ustalenia oraz ocena stanu technicznego', HeadingLevel.HEADING_1));
  for (const s of doc.sekcje) {
    dzieci.push(naglowek(s.title || '(bez nazwy)'));
    if (s.ustalenia && s.ustalenia.length) dzieci.push(await tabelaUstalen(s.ustalenia));
    if (s.zdjecia && s.zdjecia.length) {
      dzieci.push(p('Dokumentacja fotograficzna (zdjęcia ogólne):', { bold: true, spacing: { before: 120, after: 60 } }));
      dzieci.push(await tabelaZdjec(s.zdjecia));
    }
  }

  // --- ROZDZIAŁ III ---
  dzieci.push(naglowek('ROZDZIAŁ III: Zalecenia, podsumowanie i wnioski', HeadingLevel.HEADING_1));
  const { liczba, tabela } = tabelaZalecen(doc);
  if (liczba) {
    dzieci.push(p('Zestawienie zaleceń (wg stopnia pilności):', { bold: true, spacing: { after: 60 } }));
    dzieci.push(tabela);
  } else {
    dzieci.push(p('Brak zaleceń wymagających określenia stopnia pilności.', { italics: true }));
  }
  const akapityPods = (doc.podsumowanie || '').split('\n').filter((l) => l.trim());
  if (akapityPods.length) {
    dzieci.push(p('Podsumowanie i wnioski:', { bold: true, spacing: { before: 160, after: 60 } }));
    for (const a of akapityPods) dzieci.push(p(a));
  }
  for (const el of blokMetodyIWnioski()) dzieci.push(el);

  // Bloki oświadczeń/podpisów + załączniki (dane z „Osoby wykonujące przegląd”)
  dzieci.push(new Paragraph({ spacing: { before: 300 }, children: [] }));
  for (const el of blokPodpisow(m.inspektorzy)) dzieci.push(el);

  // Stopka z numeracją stron + identyfikacją protokołu
  const stopka = new Footer({
    children: [new Paragraph({
      alignment: AlignmentType.CENTER,
      children: [
        new TextRun({ text: `Protokół ${m.protokolNr || ''}${m.adres ? ' — ' + m.adres.split(',')[0] : ''}   |   Strona `,
          size: 16, color: '666666', font: FONT }),
        new TextRun({ children: [PageNumber.CURRENT], size: 16, color: '666666', font: FONT }),
        new TextRun({ text: ' z ', size: 16, color: '666666', font: FONT }),
        new TextRun({ children: [PageNumber.TOTAL_PAGES], size: 16, color: '666666', font: FONT }),
      ],
    })],
  });

  const document = new Document({
    creator: 'Aplikacja Protokoły Kontroli',
    title: `Protokół ${m.protokolNr || ''}`,
    styles: { default: { document: { run: { font: FONT, size: 22 } } } },
    sections: [{ properties: {}, footers: { default: stopka }, children: dzieci }],
  });

  return Packer.toBlob(document);
}

export function nazwaPliku(doc) {
  const nr = (doc.meta.protokolNr || 'protokol').replace(/[\\/:*?"<>|]/g, '-');
  const adr = (doc.meta.adres || '').split(',')[0].replace(/[\\/:*?"<>|]/g, '-').trim();
  return `Protokol_${nr}${adr ? '_' + adr : ''}.docx`.replace(/\s+/g, '_');
}
