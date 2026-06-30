// Generator ikon PWA (PNG) bez zewnętrznych zależności — czysty Node + zlib.
import { deflateSync } from 'node:zlib';
import { writeFileSync, mkdirSync } from 'node:fs';

const PUBLIC = new URL('../public/', import.meta.url);
mkdirSync(PUBLIC, { recursive: true });

function crc32(buf) {
  let c = ~0;
  for (let i = 0; i < buf.length; i++) {
    c ^= buf[i];
    for (let k = 0; k < 8; k++) c = (c >>> 1) ^ (0xEDB88320 & -(c & 1));
  }
  return (~c) >>> 0;
}
function chunk(type, data) {
  const len = Buffer.alloc(4); len.writeUInt32BE(data.length, 0);
  const t = Buffer.from(type, 'ascii');
  const body = Buffer.concat([t, data]);
  const crc = Buffer.alloc(4); crc.writeUInt32BE(crc32(body), 0);
  return Buffer.concat([len, body, crc]);
}
function encodePNG(width, height, rgba) {
  const sig = Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]);
  const ihdr = Buffer.alloc(13);
  ihdr.writeUInt32BE(width, 0); ihdr.writeUInt32BE(height, 4);
  ihdr[8] = 8; ihdr[9] = 6; ihdr[10] = 0; ihdr[11] = 0; ihdr[12] = 0;
  const stride = width * 4;
  const raw = Buffer.alloc((stride + 1) * height);
  for (let y = 0; y < height; y++) {
    raw[y * (stride + 1)] = 0;
    rgba.copy(raw, y * (stride + 1) + 1, y * stride, y * stride + stride);
  }
  const idat = deflateSync(raw, { level: 9 });
  return Buffer.concat([sig, chunk('IHDR', ihdr), chunk('IDAT', idat), chunk('IEND', Buffer.alloc(0))]);
}

function rysuj(size) {
  const buf = Buffer.alloc(size * size * 4);
  const set = (x, y, r, g, b, a = 255) => {
    if (x < 0 || y < 0 || x >= size || y >= size) return;
    const i = (y * size + x) * 4;
    buf[i] = r; buf[i + 1] = g; buf[i + 2] = b; buf[i + 3] = a;
  };
  // Tło: niebieski (gradient pionowy)
  for (let y = 0; y < size; y++) {
    const t = y / size;
    const r = Math.round(31 + t * 10);
    const g = Math.round(111 - t * 20);
    const b = Math.round(235 - t * 30);
    for (let x = 0; x < size; x++) set(x, y, r, g, b);
  }
  // Biały "dokument" (zaokrąglony prostokąt)
  const m = Math.round(size * 0.22);
  const w = size - m * 2;
  const h = Math.round(w * 1.25);
  const x0 = m, y0 = Math.round((size - h) / 2);
  const rad = Math.round(size * 0.04);
  const inRound = (x, y) => {
    if (x < x0 || x > x0 + w || y < y0 || y > y0 + h) return false;
    const cx = Math.min(Math.max(x, x0 + rad), x0 + w - rad);
    const cy = Math.min(Math.max(y, y0 + rad), y0 + h - rad);
    return (x - cx) ** 2 + (y - cy) ** 2 <= rad ** 2 || (x >= x0 + rad && x <= x0 + w - rad) || (y >= y0 + rad && y <= y0 + h - rad);
  };
  for (let y = y0; y <= y0 + h; y++) for (let x = x0; x <= x0 + w; x++) if (inRound(x, y)) set(x, y, 255, 255, 255);
  // Niebieskie linie tekstu + checkboxy
  const blue = [31, 111, 235];
  const green = [31, 157, 85];
  const lh = Math.round(h / 6);
  for (let n = 1; n <= 3; n++) {
    const ly = y0 + lh * n + Math.round(lh * 0.2);
    const bx = x0 + Math.round(w * 0.12);
    const bs = Math.round(lh * 0.45);
    // checkbox (zielony)
    for (let y = ly; y < ly + bs; y++) for (let x = bx; x < bx + bs; x++) set(x, y, green[0], green[1], green[2]);
    // linia tekstu (niebieska)
    const tx0 = bx + bs + Math.round(w * 0.06);
    const tx1 = x0 + w - Math.round(w * 0.12);
    const ty = ly + Math.round(bs * 0.25);
    for (let y = ty; y < ty + Math.round(bs * 0.5); y++) for (let x = tx0; x < tx1; x++) set(x, y, blue[0], blue[1], blue[2]);
  }
  return buf;
}

for (const size of [192, 512]) {
  const png = encodePNG(size, size, rysuj(size));
  writeFileSync(new URL(`icon-${size}.png`, PUBLIC), png);
  console.log(`icon-${size}.png (${png.length} B)`);
}

// Ikona SVG (do <link rel=icon>)
const svg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 512 512">
<rect width="512" height="512" rx="96" fill="#1f6feb"/>
<rect x="120" y="96" width="272" height="340" rx="20" fill="#fff"/>
<g fill="#1f9d55"><rect x="150" y="170" width="40" height="40" rx="6"/><rect x="150" y="250" width="40" height="40" rx="6"/><rect x="150" y="330" width="40" height="40" rx="6"/></g>
<g fill="#1f6feb"><rect x="210" y="182" width="150" height="16" rx="8"/><rect x="210" y="262" width="150" height="16" rx="8"/><rect x="210" y="342" width="150" height="16" rx="8"/></g>
</svg>`;
writeFileSync(new URL('icon.svg', PUBLIC), svg);
console.log('icon.svg');
