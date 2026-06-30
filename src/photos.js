// Obsługa zdjęć: wczytanie z pliku/aparatu/schowka, zmniejszenie rozdzielczości
// oraz zwrócenie Bloba JPEG do zapisania w bazie.

const MAX_WYMIAR = 1600; // px — wystarczające do protokołu, mniejszy plik
const JAKOSC = 0.82;

// Zamienia plik/blob obrazu na zmniejszony Blob JPEG + wymiary.
export async function przetworzObraz(file) {
  const { drawable, width: w0, height: h0, cleanup } = await wczytajRysowalny(file);
  try {
    const { width, height } = przeskaluj(w0, h0, MAX_WYMIAR);
    const canvas = document.createElement('canvas');
    canvas.width = width;
    canvas.height = height;
    const ctx = canvas.getContext('2d');
    ctx.drawImage(drawable, 0, 0, width, height);
    const blob = await new Promise((res) => canvas.toBlob(res, 'image/jpeg', JAKOSC));
    return { blob, width, height };
  } finally {
    cleanup();
  }
}

async function wczytajRysowalny(file) {
  if (typeof createImageBitmap === 'function') {
    try {
      const bmp = await createImageBitmap(file);
      return { drawable: bmp, width: bmp.width, height: bmp.height,
        cleanup: () => bmp.close && bmp.close() };
    } catch (e) { /* fallback poniżej */ }
  }
  const url = URL.createObjectURL(file);
  const img = await new Promise((res, rej) => {
    const i = new Image();
    i.onload = () => res(i);
    i.onerror = rej;
    i.src = url;
  });
  return { drawable: img, width: img.naturalWidth, height: img.naturalHeight,
    cleanup: () => URL.revokeObjectURL(url) };
}

function przeskaluj(w, h, max) {
  if (w <= max && h <= max) return { width: w, height: h };
  const skala = Math.min(max / w, max / h);
  return { width: Math.round(w * skala), height: Math.round(h * skala) };
}

// Wyciąga pliki obrazów ze zdarzenia wklejenia (Ctrl+V)
export function obrazyZeSchowka(clipboardData) {
  const out = [];
  if (!clipboardData) return out;
  for (const item of clipboardData.items || []) {
    if (item.type && item.type.startsWith('image/')) {
      const f = item.getAsFile();
      if (f) out.push(f);
    }
  }
  return out;
}
