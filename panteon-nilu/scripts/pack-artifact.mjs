// Paczka builda dla hostów statycznych z ograniczeniami (np. strona-artefakt na claude.ai):
// - strona bez <!doctype>/<head>/<body> (host dodaje własny szkielet),
// - modele *.glb przepisane bez zmian treści na glTF w JSON (bufor jako data URI), bo host nie serwuje .glb;
//   kompresja Draco/meshopt zostaje, manifest wskazuje nowe pliki przez pole `files`.
// Użycie: npm run build && node scripts/pack-artifact.mjs <katalog_wyjściowy>
import { cpSync, existsSync, mkdirSync, readdirSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';

const out = process.argv[2];
if (!out) throw new Error('podaj katalog wyjściowy');
const dist = 'dist';
if (!existsSync(join(dist, 'index.html'))) throw new Error('brak dist/ — najpierw npm run build');

rmSync(out, { recursive: true, force: true });
mkdirSync(join(out, 'models'), { recursive: true });
cpSync(join(dist, 'assets'), join(out, 'assets'), { recursive: true });
cpSync(join(dist, 'draco'), join(out, 'draco'), { recursive: true });

/** GLB → glTF JSON: fragment JSON + bufor BIN jako data URI (bez dekodowania geometrii). */
function glbToGltfJson(buf) {
  if (buf.toString('ascii', 0, 4) !== 'glTF') throw new Error('to nie jest GLB');
  let off = 12;
  let json = null;
  let bin = null;
  while (off < buf.length) {
    const len = buf.readUInt32LE(off);
    const type = buf.toString('ascii', off + 4, off + 8);
    const data = buf.subarray(off + 8, off + 8 + len);
    if (type === 'JSON') json = JSON.parse(data.toString('utf8'));
    else if (type === 'BIN\0') bin = data;
    off += 8 + len;
  }
  if (!json) throw new Error('GLB bez fragmentu JSON');
  if (bin && json.buffers?.[0] && json.buffers[0].uri === undefined) {
    json.buffers[0].uri = `data:application/octet-stream;base64,${bin.toString('base64')}`;
  }
  return JSON.stringify(json);
}

const manifest = JSON.parse(readFileSync(join(dist, 'models', 'manifest.json'), 'utf8'));
const files = {};
for (const name of readdirSync(join(dist, 'models')).filter((f) => f.endsWith('.glb'))) {
  const target = name.replace(/\.glb$/, '.gltf.json');
  writeFileSync(join(out, 'models', target), glbToGltfJson(readFileSync(join(dist, 'models', name))));
  files[name] = target;
}
writeFileSync(join(out, 'models', 'manifest.json'), `${JSON.stringify({ models: manifest.models, files }, null, 2)}\n`);

// strona: tytuł, styl i skrypt wejściowy z index.html builda
const html = readFileSync(join(dist, 'index.html'), 'utf8');
const title = html.match(/<title>([^<]*)<\/title>/)?.[1] ?? 'Panteon Nilu';
const css = html.match(/<link rel="stylesheet"[^>]*href="([^"]+)"/)?.[1];
const js = html.match(/<script type="module"[^>]*src="([^"]+)"/)?.[1];
if (!css || !js) throw new Error('nie znaleziono stylu albo skryptu w dist/index.html');
writeFileSync(
  join(out, 'index.html'),
  `<title>${title}</title>\n<link rel="stylesheet" href="${css}">\n<div id="root"></div>\n<script type="module" src="${js}"></script>\n`,
);
console.log(`paczka w ${out}: modele ${Object.values(files).join(', ')}`);
