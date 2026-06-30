// Generowanie protokołu jako pliku Word (.docx) w układzie zgodnym ze wzorem.
import {
  Document, Packer, Paragraph, TextRun, HeadingLevel, AlignmentType,
  Table, TableRow, TableCell, WidthType, BorderStyle, ImageRun, VerticalAlign,
} from 'docx';
import { wczytajZdjecie } from './storage.js';
import { STANY_TECHNICZNE, STOPNIE_PILNOSCI } from './constants.js';

const CZARNA = { style: BorderStyle.SINGLE, size: 4, color: '000000' };
const BORDERS = { top: CZARNA, bottom: CZARNA, left: CZARNA, right: CZARNA,
  insideHorizontal: CZARNA, insideVertical: CZARNA };

function p(text, opts = {}) {
  return new Paragraph({
    alignment: opts.align,
    spacing: opts.spacing || { after: 80 },
    children: [new TextRun({ text: text ?? '', bold: opts.bold, size: opts.size || 22,
      italics: opts.italics, color: opts.color })],
  });
}

function naglowek(text, level = HeadingLevel.HEADING_2) {
  return new Paragraph({ heading: level, spacing: { before: 200, after: 120 },
    children: [new TextRun({ text, bold: true })] });
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
    rows: wiersze.map(([etykieta, wartosc]) => new TableRow({
      children: [
        komorka(etykieta, { width: 38, bold: true, shade: 'F2F2F2' }),
        komorka(String(wartosc ?? ''), { width: 62 }),
      ],
    })),
  });
}

// Wczytuje zdjęcie z bazy i tworzy ImageRun o zadanej szerokości (px),
// z zachowaniem proporcji.
async function obrazRun(z, szerokoscPx = 260) {
  const blob = await wczytajZdjecie(z.id);
  if (!blob) return null;
  const buf = new Uint8Array(await blob.arrayBuffer());
  const ratio = (z.h && z.w) ? z.h / z.w : 0.75;
  const width = szerokoscPx;
  const height = Math.round(szerokoscPx * ratio);
  return new ImageRun({ data: buf, type: 'jpg', transformation: { width, height } });
}

// Układa zdjęcia w tabeli 2 kolumny: obraz + podpis pod spodem.
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

function tabelaUstalen(ustalenia) {
  const header = new TableRow({
    tableHeader: true,
    children: [
      komorka('L.p.', { width: 7, bold: true, shade: 'D9D9D9' }),
      komorka('Ustalenia / opis stanu technicznego', { width: 78, bold: true, shade: 'D9D9D9' }),
      komorka('Stopień pilności', { width: 15, bold: true, shade: 'D9D9D9' }),
    ],
  });
  const wiersze = ustalenia.map((u, i) => new TableRow({
    children: [
      komorka(String(i + 1), { width: 7, align: AlignmentType.CENTER }),
      komorka(u.text || '', { width: 78, valign: VerticalAlign.TOP }),
      komorka(u.pilnosc ? String(u.pilnosc) : '—', { width: 15, align: AlignmentType.CENTER }),
    ],
  }));
  return new Table({ width: { size: 100, type: WidthType.PERCENTAGE }, borders: BORDERS,
    rows: [header, ...wiersze] });
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

export async function generujDocx(doc) {
  const m = doc.meta;
  const dzieci = [];

  // --- Strona tytułowa ---
  dzieci.push(new Paragraph({ alignment: AlignmentType.CENTER, spacing: { after: 120 },
    children: [new TextRun({ text: `PROTOKÓŁ NR ${m.protokolNr || '....'}`, bold: true, size: 32 })] }));
  dzieci.push(p(m.dataKontroli ? `z dnia ${m.dataKontroli}` : '', { align: AlignmentType.CENTER, bold: true }));
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

  dzieci.push(naglowek('PODSTAWOWE DANE OBIEKTU'));
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

  // --- ROZDZIAŁ II: ustalenia ---
  dzieci.push(naglowek('ROZDZIAŁ II: USTALENIA I OCENA STANU TECHNICZNEGO', HeadingLevel.HEADING_1));
  for (const s of doc.sekcje) {
    dzieci.push(naglowek(s.title || '(bez nazwy)'));
    dzieci.push(p(`Ogólna ocena stanu technicznego: ${s.ogolnaOcena || '—'}`, { bold: true }));
    if (s.ustalenia && s.ustalenia.length) {
      dzieci.push(tabelaUstalen(s.ustalenia));
    }
    if (s.zdjecia && s.zdjecia.length) {
      dzieci.push(p('Dokumentacja fotograficzna:', { bold: true, spacing: { before: 120, after: 60 } }));
      dzieci.push(await tabelaZdjec(s.zdjecia));
    }
  }

  // --- ROZDZIAŁ III: podsumowanie ---
  dzieci.push(naglowek('ROZDZIAŁ III: ZALECENIA, PODSUMOWANIE I WNIOSKI', HeadingLevel.HEADING_1));
  const akapityPods = (doc.podsumowanie || '').split('\n').filter((l) => l.trim());
  if (akapityPods.length) {
    for (const a of akapityPods) dzieci.push(p(a));
  } else {
    dzieci.push(p('—'));
  }
  dzieci.push(new Paragraph({ spacing: { before: 600 }, alignment: AlignmentType.CENTER,
    children: [new TextRun({ text: 'Podpisy osób wykonujących przegląd:', italics: true })] }));
  for (const ins of (m.inspektorzy || [])) {
    if (ins.imie) dzieci.push(p(`.................................   ${ins.imie} (${ins.specjalnosc})`,
      { align: AlignmentType.CENTER, spacing: { before: 240 } }));
  }

  const document = new Document({
    creator: 'Aplikacja Protokoły Kontroli',
    title: `Protokół ${m.protokolNr || ''}`,
    styles: { default: { document: { run: { font: 'Calibri', size: 22 } } } },
    sections: [{ properties: {}, children: dzieci }],
  });

  return Packer.toBlob(document);
}

// Tworzy nazwę pliku na podstawie danych protokołu
export function nazwaPliku(doc) {
  const nr = (doc.meta.protokolNr || 'protokol').replace(/[\\/:*?"<>|]/g, '-');
  const adr = (doc.meta.adres || '').split(',')[0].replace(/[\\/:*?"<>|]/g, '-').trim();
  return `Protokol_${nr}${adr ? '_' + adr : ''}.docx`.replace(/\s+/g, '_');
}
