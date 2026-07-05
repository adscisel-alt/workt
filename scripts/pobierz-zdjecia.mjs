#!/usr/bin/env node
// Pobiera prawdziwe zdjęcia zabytków z Wikimedia Commons do public/qix-grecja/img/,
// aby gra QIX ΕΛΛΑΣ działała z fotografiami także w pełni offline.
//
// Uruchom LOKALNIE (na komputerze z dostępem do internetu):
//     node scripts/pobierz-zdjecia.mjs
//
// Nie wymaga żadnych zależności (Node 18+ ma wbudowane fetch).
// Zdjęcia z Wikimedia Commons są na wolnych licencjach (CC/Public Domain) —
// informacje o autorze i licencji zapisujemy obok, w pliku licencje.txt.

import { writeFile, mkdir } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';

const __dirname = dirname(fileURLToPath(import.meta.url));
const OUT = join(__dirname, '..', 'public', 'qix-grecja', 'img');

const MONUMENTS = [
  { id: 'parthenon',   query: 'Parthenon Acropolis Athens temple' },
  { id: 'erechtheion', query: 'Caryatids Erechtheion Acropolis Athens' },
  { id: 'sounion',     query: 'Temple of Poseidon Sounion' },
];

const API = 'https://commons.wikimedia.org/w/api.php';

function strip(html) {
  return (html || '').replace(/<[^>]*>/g, '').replace(/\s+/g, ' ').trim();
}

async function findPhoto(query) {
  const qs = new URLSearchParams({
    action: 'query', generator: 'search',
    gsrsearch: 'filetype:bitmap ' + query, gsrnamespace: '6', gsrlimit: '8',
    prop: 'imageinfo', iiprop: 'url|extmetadata|mime', iiurlwidth: '1600',
    format: 'json', origin: '*',
  });
  const r = await fetch(API + '?' + qs.toString());
  if (!r.ok) throw new Error('API ' + r.status);
  const j = await r.json();
  const pages = j?.query?.pages;
  if (!pages) return null;
  const arr = Object.values(pages).sort((a, b) => (a.index || 0) - (b.index || 0));
  for (const pg of arr) {
    const ii = pg.imageinfo?.[0];
    if (!ii) continue;
    if (ii.mime && !/^image\/(jpeg|png)$/.test(ii.mime)) continue;
    if (ii.thumbwidth && ii.thumbheight && ii.thumbheight > ii.thumbwidth) continue; // pozioma
    const md = ii.extmetadata || {};
    return {
      url: ii.thumburl || ii.url,
      title: (pg.title || '').replace(/^File:/, ''),
      artist: strip(md.Artist?.value),
      license: strip(md.LicenseShortName?.value),
      descriptionurl: ii.descriptionurl || '',
    };
  }
  return null;
}

async function main() {
  await mkdir(OUT, { recursive: true });
  const credits = [];
  for (const m of MONUMENTS) {
    process.stdout.write(`• ${m.id}: szukam zdjęcia… `);
    try {
      const info = await findPhoto(m.query);
      if (!info) { console.log('nie znaleziono — pomijam (gra użyje rysunku).'); continue; }
      const res = await fetch(info.url);
      if (!res.ok) throw new Error('pobieranie ' + res.status);
      const buf = Buffer.from(await res.arrayBuffer());
      await writeFile(join(OUT, m.id + '.jpg'), buf);
      credits.push(`${m.id}.jpg\n  Plik: ${info.title}\n  Autor: ${info.artist || '—'}\n  Licencja: ${info.license || '—'}\n  Źródło: ${info.descriptionurl}\n`);
      console.log(`OK (${Math.round(buf.length / 1024)} KB) — ${info.license || 'licencja w licencje.txt'}`);
    } catch (e) {
      console.log('błąd: ' + e.message + ' — pomijam.');
    }
  }
  if (credits.length) {
    await writeFile(join(OUT, 'licencje.txt'),
      'Zdjęcia pobrane z Wikimedia Commons.\n\n' + credits.join('\n'));
    console.log('\nGotowe. Informacje o licencjach zapisano w img/licencje.txt');
  } else {
    console.log('\nNie pobrano żadnego zdjęcia — gra nadal działa na grafice wektorowej.');
  }
}

main().catch(e => { console.error(e); process.exit(1); });
