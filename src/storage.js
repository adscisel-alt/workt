// Trwałe przechowywanie danych w przeglądarce (IndexedDB).
// - dokument (JSON) pod kluczem 'dokument'
// - zdjęcia jako Blob pod kluczami 'photo:<id>'
import { get, set, del, keys } from 'idb-keyval';

const DOC_KEY = 'dokument';
const PHOTO_PREFIX = 'photo:';

export async function wczytajDokument() {
  try {
    return (await get(DOC_KEY)) || null;
  } catch (e) {
    console.warn('Nie udało się wczytać dokumentu:', e);
    return null;
  }
}

let zapisTimer = null;
// Zapis z debounce, żeby nie pisać do bazy przy każdej literze
export function zapiszDokument(doc, { natychmiast = false } = {}) {
  const wykonaj = () => set(DOC_KEY, JSON.parse(JSON.stringify(doc))).catch((e) =>
    console.warn('Błąd zapisu dokumentu:', e));
  if (natychmiast) {
    if (zapisTimer) clearTimeout(zapisTimer);
    return wykonaj();
  }
  if (zapisTimer) clearTimeout(zapisTimer);
  zapisTimer = setTimeout(wykonaj, 500);
}

export async function zapiszZdjecie(id, blob) {
  await set(PHOTO_PREFIX + id, blob);
}

export async function wczytajZdjecie(id) {
  return get(PHOTO_PREFIX + id);
}

export async function usunZdjecie(id) {
  try { await del(PHOTO_PREFIX + id); } catch (e) { /* ignore */ }
}

// Sprzątanie osieroconych zdjęć (których nie ma już w dokumencie)
export async function sprzatnijZdjecia(doc) {
  try {
    const uzywane = new Set();
    for (const s of doc.sekcje) {
      for (const z of (s.zdjecia || [])) uzywane.add(PHOTO_PREFIX + z.id);
      for (const u of (s.ustalenia || [])) for (const z of (u.zdjecia || [])) uzywane.add(PHOTO_PREFIX + z.id);
    }
    const wszystkie = await keys();
    for (const k of wszystkie) {
      if (typeof k === 'string' && k.startsWith(PHOTO_PREFIX) && !uzywane.has(k)) {
        await del(k);
      }
    }
  } catch (e) { /* ignore */ }
}
