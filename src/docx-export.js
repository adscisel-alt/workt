// Generowanie protokołu jako pliku Word (.docx) — układ wierny oryginalnemu wzorowi:
// strona tytułowa, dane obiektu, kryteria, Rozdział I/II/III, stopka z numeracją stron.
import {
  Document, Packer, Paragraph, TextRun, HeadingLevel, AlignmentType,
  Table, TableRow, TableCell, WidthType, BorderStyle, ImageRun, VerticalAlign,
  Footer, PageNumber,
} from 'docx';
import { wczytajZdjecie } from './storage.js';
import {
  STANY_TECHNICZNE, STOPNIE_PILNOSCI, RODZAJE_KONSTRUKCJI, WYPOSAZENIE,
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

function tabelaKryteriow() {
  const header = new TableRow({ tableHeader: true, children: [
    komorka('L.p.', { width: 7, bold: true, shade: 'D9D9D9' }),
    komorka('Klasyfikacja stanu', { width: 23, bold: true, shade: 'D9D9D9' }),
    komorka('Zużycie (%)', { width: 15, bold: true, shade: 'D9D9D9' }),
    komorka('Kryterium oceny', { width: 55, bold: true, shade: 'D9D9D9' }),
  ] });
  const rows = STANY_TECHNICZNE.map((s, i) => new TableRow({ children: [
    komorka(String(i + 1), { width: 7, align: AlignmentType.CENTER }),
    komorka(s.value, { width: 23 }),
    komorka(s.zuzycie, { width: 15, align: AlignmentType.CENTER }),
    komorka(s.opis, { width: 55, valign: VerticalAlign.TOP }),
  ] }));
  return new Table({ width: { size: 100, type: WidthType.PERCENTAGE }, borders: BORDERS, rows: [header, ...rows] });
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
    komorka(z.pilnosc ? String(z.pilnosc) : '—', { width: 13, align: AlignmentType.CENTER }),
    komorka(z.status || '', { width: 25 }),
  ] }));
  return new Table({ width: { size: 100, type: WidthType.PERCENTAGE }, borders: BORDERS, rows: [header, ...rows] });
}

// Zawartość komórki „Fotografia": zdjęcia z podpisami (jeden pod drugim).
async function komorkaFoto(zdjecia) {
  const dzieci = [];
  for (const z of (zdjecia || [])) {
    const run = await obrazRun(z, 190);
    if (run) dzieci.push(new Paragraph({ alignment: AlignmentType.CENTER, spacing: { after: 20 }, children: [run] }));
    if (z.opis) dzieci.push(p(z.opis, { align: AlignmentType.CENTER, size: 16, italics: true }));
  }
  if (!dzieci.length) dzieci.push(p('—', { align: AlignmentType.CENTER, color: '999999' }));
  return dzieci;
}

// Tabela ustaleń w układzie wzoru: 4 kolumny z kolumną „Fotografia”.
async function tabelaUstalen(ustalenia) {
  const header = new TableRow({ tableHeader: true, children: [
    komorka('L.p.', { width: 5, bold: true, shade: 'D9D9D9' }),
    komorka('Ustalenia / opis stanu technicznego', { width: 50, bold: true, shade: 'D9D9D9' }),
    komorka('Stopień pilności', { width: 11, bold: true, shade: 'D9D9D9' }),
    komorka('Fotografia', { width: 34, bold: true, shade: 'D9D9D9' }),
  ] });
  const rows = [];
  let i = 0;
  for (const u of ustalenia) {
    i += 1;
    rows.push(new TableRow({ children: [
      komorka(String(i), { width: 5, align: AlignmentType.CENTER, valign: VerticalAlign.TOP }),
      komorka(u.text || '', { width: 50, valign: VerticalAlign.TOP }),
      komorka(u.pilnosc ? String(u.pilnosc) : '—', { width: 11, align: AlignmentType.CENTER, valign: VerticalAlign.TOP }),
      komorka(await komorkaFoto(u.zdjecia), { width: 34, valign: VerticalAlign.TOP }),
    ] }));
  }
  return new Table({ width: { size: 100, type: WidthType.PERCENTAGE }, borders: BORDERS, rows: [header, ...rows] });
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
  dzieci.push(listaWyboru(WYPOSAZENIE, m.wyposazenie));
  dzieci.push(tabelaDanych([
    ['Liczba kondygnacji nadziemnych', m.liczbaKondygnacjiNad],
    ['Liczba kondygnacji podziemnych', m.liczbaKondygnacjiPod],
    ['Pozwolenie na użytkowanie', m.pozwolenieUzytkowanie],
    ['Powierzchnia zabudowy', m.powierzchniaZabudowy],
    ['Kubatura', m.kubatura],
  ]));

  dzieci.push(naglowek('PRZYJĘTE KRYTERIA OCENY STANU TECHNICZNEGO'));
  dzieci.push(tabelaKryteriow());
  dzieci.push(p('Stopnie pilności napraw:', { bold: true, spacing: { before: 120, after: 40 } }));
  for (const sp of STOPNIE_PILNOSCI.filter((s) => s.value > 0)) {
    dzieci.push(p(`stopień (${sp.value}) — ${sp.opis}`, { size: 20 }));
  }

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
    dzieci.push(p(`Ogólna ocena stanu technicznego: ${s.ogolnaOcena || '—'}`, { bold: true }));
    if (s.ustalenia && s.ustalenia.length) dzieci.push(await tabelaUstalen(s.ustalenia));
    if (s.zdjecia && s.zdjecia.length) {
      dzieci.push(p('Dokumentacja fotograficzna (zdjęcia ogólne):', { bold: true, spacing: { before: 120, after: 60 } }));
      dzieci.push(await tabelaZdjec(s.zdjecia));
    }
  }

  // --- ROZDZIAŁ III ---
  dzieci.push(naglowek('ROZDZIAŁ III: Zalecenia, podsumowanie i wnioski', HeadingLevel.HEADING_1));
  const akapityPods = (doc.podsumowanie || '').split('\n').filter((l) => l.trim());
  if (akapityPods.length) for (const a of akapityPods) dzieci.push(p(a));
  else dzieci.push(p('—'));
  dzieci.push(new Paragraph({ spacing: { before: 600 }, alignment: AlignmentType.CENTER,
    children: [new TextRun({ text: 'Podpisy osób wykonujących przegląd:', italics: true, font: FONT })] }));
  for (const ins of (m.inspektorzy || [])) {
    if (ins.imie) dzieci.push(p(`.................................   ${ins.imie} (${ins.specjalnosc})`,
      { align: AlignmentType.CENTER, spacing: { before: 240 } }));
  }

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
