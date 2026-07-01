// Trwałe przechowywanie danych w przeglądarce (IndexedDB).
// Obsługa WIELU projektów (protokołów):
//  - indeks projektów pod kluczem 'projekty' (lista metadanych)
//  - każdy dokument pod kluczem 'projekt:<id>'
//  - zdjęcia jako Blob pod kluczami 'photo:<id>' (wspólne, klucz = id zdjęcia)
import { get, set, del, keys } from 'idb-keyval';

const STARY_DOC_KEY = 'dokument';        // dawny pojedynczy dokument (migracja)
const INDEKS_KEY = 'projekty';
const PROJ_PREFIX = 'projekt:';
const PHOTO_PREFIX = 'photo:';

// ---------- Projekty ----------
export async function listaProjektow() {
  try {
    const idx = (await get(INDEKS_KEY)) || [];
    return idx.slice().sort((a, b) => (b.zmodyfikowano || 0) - (a.zmodyfikowano || 0));
  } catch (e) { return []; }
}

export async function wczytajProjekt(id) {
  try { return (await get(PROJ_PREFIX + id)) || null; } catch (e) { return null; }
}

async function aktualizujIndeks(doc) {
  const idx = (await get(INDEKS_KEY)) || [];
  const wpis = {
    id: doc.id,
    nazwa: doc.nazwa || '',
    adres: doc.meta?.adres || '',
    protokolNr: doc.meta?.protokolNr || '',
    zmodyfikowano: Date.now(),
  };
  const i = idx.findIndex((p) => p.id === doc.id);
  if (i === -1) idx.push(wpis); else idx[i] = wpis;
  await set(INDEKS_KEY, idx);
}

let zapisTimer = null;
// Zapis projektu z debounce (żeby nie pisać przy każdej literze).
export function zapiszProjekt(doc, { natychmiast = false } = {}) {
  if (!doc || !doc.id) return;
  const wykonaj = async () => {
    try {
      await set(PROJ_PREFIX + doc.id, JSON.parse(JSON.stringify(doc)));
      await aktualizujIndeks(doc);
    } catch (e) { console.warn('Błąd zapisu projektu:', e); }
  };
  if (zapisTimer) clearTimeout(zapisTimer);
  if (natychmiast) return wykonaj();
  zapisTimer = setTimeout(wykonaj, 500);
}

export async function usunProjekt(id) {
  try {
    await del(PROJ_PREFIX + id);
    const idx = (await get(INDEKS_KEY)) || [];
    await set(INDEKS_KEY, idx.filter((p) => p.id !== id));
    await sprzatnijZdjecia();
  } catch (e) { console.warn('Błąd usuwania projektu:', e); }
}

// Migracja dawnego pojedynczego dokumentu do listy projektów.
export async function migrujStaryDokument(nadajId, nazwaFn) {
  try {
    const stary = await get(STARY_DOC_KEY);
    const idx = (await get(INDEKS_KEY)) || [];
    if (stary && idx.length === 0) {
      if (!stary.id) stary.id = nadajId();
      if (!stary.nazwa && nazwaFn) stary.nazwa = nazwaFn(stary);
      await set(PROJ_PREFIX + stary.id, stary);
      await aktualizujIndeks(stary);
      await del(STARY_DOC_KEY);
      return stary.id;
    }
  } catch (e) { /* ignore */ }
  return null;
}

// ---------- Zdjęcia ----------
export async function zapiszZdjecie(id, blob) {
  await set(PHOTO_PREFIX + id, blob);
}

export async function wczytajZdjecie(id) {
  return get(PHOTO_PREFIX + id);
}

export async function usunZdjecie(id) {
  try { await del(PHOTO_PREFIX + id); } catch (e) { /* ignore */ }
}

// Sprzątanie osieroconych zdjęć — bierze pod uwagę WSZYSTKIE projekty,
// żeby nie usunąć zdjęć innego protokołu.
export async function sprzatnijZdjecia() {
  try {
    const idx = (await get(INDEKS_KEY)) || [];
    const uzywane = new Set();
    for (const p of idx) {
      const doc = await get(PROJ_PREFIX + p.id);
      if (!doc) continue;
      for (const s of doc.sekcje || []) {
        for (const z of (s.zdjecia || [])) uzywane.add(PHOTO_PREFIX + z.id);
        for (const u of (s.ustalenia || [])) for (const z of (u.zdjecia || [])) uzywane.add(PHOTO_PREFIX + z.id);
      }
    }
    const wszystkie = await keys();
    for (const k of wszystkie) {
      if (typeof k === 'string' && k.startsWith(PHOTO_PREFIX) && !uzywane.has(k)) {
        await del(k);
      }
    }
  } catch (e) { /* ignore */ }
}
