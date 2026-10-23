// Headless C64 harness built on c64-ready's emulator core.
// usage: node c64run.mjs game.prg [--frames N] [--shot out.png@frame ...] [--key KEY@from-to ...] [--peek addr ...] [--scale N]
import fs from 'node:fs';
import { encodePNG } from './png.mjs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
const HERE = path.dirname(fileURLToPath(import.meta.url));
const EMU = path.join(HERE, '..', 'web', 'emu');
const { C64WASM } = await import(path.join(EMU, 'emulator', 'c64-wasm.js'));
const { C64Emulator } = await import(path.join(EMU, 'emulator', 'c64-emulator.js'));
const { C64_KEY } = await import(path.join(EMU, 'emulator', 'c64-keys.js'));
const FRAME_WIDTH = 384, FRAME_HEIGHT = 272;

const args = process.argv.slice(2);
const prgPath = args[0];
let frames = 300, scale = 1, boot = 0, trace = 0, lbl = {}, traceFrom = 0;
const traces = [];
const shotons = [];
const shots = [], keys = [], peeks = [], joys = [], dumps = [];
for (let i = 1; i < args.length; i++) {
  const a = args[i];
  if (a === '--frames') frames = +args[++i];
  else if (a === '--scale') scale = +args[++i];
  else if (a === '--boot') boot = +args[++i];
  else if (a === '--shot') { const [file, fr] = args[++i].split('@'); shots.push({ file, fr: +fr }); }
  else if (a === '--key') { const [name, range] = args[++i].split('@'); const [from, to] = range.split('-').map(Number); keys.push({ code: C64_KEY[name], name, from, to }); }
  else if (a === '--joy') { const [dir, range] = args[++i].split('@'); const [from, to] = range.split('-').map(Number); joys.push({ dir: +dir, from, to }); }
  else if (a === '--lbl') { for (const line of fs.readFileSync(args[++i], 'utf8').split('\n')) { const m = line.match(/^al ([0-9A-Fa-f]+) \.(\S+)/); if (m) lbl[m[2]] = parseInt(m[1], 16); } }
  else if (a === '--peek') peeks.push(resolve(args[++i]));
  else if (a === '--trace') trace = +args[++i];
  else if (a === '--tr') traces.push(args[++i]);
  else if (a === '--shoton') { const [name, rest] = args[++i].split('='); const [file, delay] = rest.split('@'); shotons.push({ name, file, delay: +(delay || 0), fired: false, prev: 0, at: -1 }); }
  else if (a === '--trace-from') traceFrom = +args[++i];
  else if (a === '--dump') { const [ad, ln] = args[++i].split(':'); dumps.push({ addr: parseInt(ad, 16), len: +ln }); }
}
function resolve(name) { if (/^[0-9a-f]+$/i.test(name) && !(name in lbl)) return parseInt(name, 16); if (name in lbl) return lbl[name]; if (('_' + name) in lbl) return lbl['_' + name]; throw new Error('nieznany symbol ' + name); }
function rd16(a) { const v = emu.cpuRead(a) | (emu.cpuRead(a + 1) << 8); return v >= 32768 ? v - 65536 : v; }
function traceLine(fr) { const o = { fr }; for (const t of traces) { const [n, w] = t.split(':'); const a = resolve(n); o[n] = w === '16' ? rd16(a) : emu.cpuRead(a); } console.log(JSON.stringify(o)); }
const wasm = new C64WASM();
await wasm.instantiate(fs.readFileSync(path.join(EMU, 'c64.wasm')));
const emu = new C64Emulator(wasm, 'file', {});
emu.init();
let lastFrame = null;
emu.onFrame = (f) => { lastFrame = f.data.slice(); };
emu.start();
// Boot BASIC first, then load the program (c64_loadPRG with autorun).
const BOOT = boot || 150;
for (let i = 0; i < BOOT; i++) emu.tick(20);
if (prgPath && prgPath !== '-') {
  emu.loadGame({ type: 'prg', data: new Uint8Array(fs.readFileSync(prgPath)), autoRun: true });
  for (let i = 0; i < 10; i++) emu.tick(20);
  // wpisz RUN do bufora klawiatury BASIC-a
  const text = [82, 85, 78, 13];
  text.forEach((b, i) => emu.cpuWrite(0x0277 + i, b));
  emu.cpuWrite(0xC6, text.length);
  for (let i = 0; i < 20; i++) emu.tick(20);
}
const t0 = Date.now();
for (let fr = 0; fr <= frames; fr++) {
  for (const k of keys) { if (fr === k.from) emu.keyDown(k.code); if (fr === k.to) emu.keyUp(k.code); }
  for (const j of joys) { if (fr === j.from) emu.joystickPush(2, j.dir); if (fr === j.to) emu.joystickRelease(2, j.dir); }
  if (trace && fr >= traceFrom && fr % trace === 0) traceLine(fr);
  for (const so of shotons) { const v = emu.cpuRead(resolve(so.name)); if (!so.fired && so.at < 0 && v && !so.prev) so.at = fr + so.delay; if (!so.fired && so.at === fr && lastFrame) { so.fired = true; fs.writeFileSync(so.file, encodePNG(FRAME_WIDTH, FRAME_HEIGHT, lastFrame, scale)); const o = { shoton: so.name, fr }; for (const t of traces) { const [n, w] = t.split(':'); const a = resolve(n); o[n] = w === '16' ? rd16(a) : emu.cpuRead(a); } for (const d of dumps) { const a = []; for (let i = 0; i < d.len; i++) a.push(emu.cpuRead(d.addr + i).toString(16).padStart(2, '0')); o['dump$' + d.addr.toString(16)] = a.join(' '); } console.log(JSON.stringify(o)); } so.prev = v; }
  for (const s of shots) if (s.fr === fr && lastFrame) fs.writeFileSync(s.file, encodePNG(FRAME_WIDTH, FRAME_HEIGHT, lastFrame, scale));
  emu.tick(20);
}
const ms = Date.now() - t0;
const out = { frames, ms, pc: emu.getPC().toString(16), cycles: emu.getCycleCount() };
for (const p of peeks) out['$' + p.toString(16)] = emu.cpuRead(p);
for (const d of dumps) { const a = []; for (let i = 0; i < d.len; i++) a.push(emu.cpuRead(d.addr + i).toString(16).padStart(2, '0')); out['dump$' + d.addr.toString(16)] = a.join(' '); }
console.log(JSON.stringify(out));
