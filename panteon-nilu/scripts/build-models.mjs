// Generuje figurki GLB (własne, proceduralne statuetki z brył three.js) i manifest public/models/manifest.json.
// Bogowie w ikonografii egipskiej: Anubis — głowa szakala, Ra — głowa sokoła z dyskiem słońca, Amun — głowa barana
// z dwoma piórami, Izyda — skrzydła kani i korona z rogów i dysku, Ozyrys — mumia z koroną atef, berłem i cepem.
// Strażnicy: kocia mumia, Satet, mumia, Apep, olbrzymi skorpion, androsfinks. Ogólne god.glb i warrior.glb zostają.
// Kompresja: meshopt (EXT_meshopt_compression); warrior.glb — Draco (KHR_draco_mesh_compression).
// Materiały wg nazw: stone (kamień, barwiony lekko na kolor gracza), team (kolor gracza), gold, paint (malowane
// detale: czarna głowa szakala, czerwony dysk — kolor w wierzchołkach, bez barwienia). Model patrzy w +z, stoi na y = 0, oś pionowa w środku — gra skaluje go i obraca.
// Użycie: npm run models (albo --manifest: tylko manifest z plików *.glb w katalogu).
import { readdirSync, writeFileSync } from 'node:fs';
import { Document, NodeIO } from '@gltf-transform/core';
import { ALL_EXTENSIONS } from '@gltf-transform/extensions';
import { draco, meshopt, weld } from '@gltf-transform/functions';
import draco3d from 'draco3dgltf';
import { MeshoptDecoder, MeshoptEncoder } from 'meshoptimizer';
import {
  BoxGeometry, BufferGeometry, CatmullRomCurve3, Color, ConeGeometry, CylinderGeometry, Float32BufferAttribute,
  LatheGeometry, Quaternion, SphereGeometry, TorusGeometry, Vector2, Vector3,
} from 'three';
import { mergeGeometries } from 'three/examples/jsm/utils/BufferGeometryUtils.js';

const DIR = new URL('../public/models/', import.meta.url);
const only = process.argv[2] === '--manifest';

// ---------- bryły ----------

const lathe = (pts, seg = 20) => new LatheGeometry(pts.map(([r, y]) => new Vector2(r, y)), seg);
const sphere = (r, w = 14, h = 10) => new SphereGeometry(r, w, h);
const cyl = (rt, rb, h, s = 12) => new CylinderGeometry(rt, rb, h, s);
const cone = (r, h, s = 12) => new ConeGeometry(r, h, s);
const box = (w, h, d) => new BoxGeometry(w, h, d);
const at = (g, x, y, z) => g.translate(x, y, z);
const scale = (g, x, y, z) => g.scale(x, y, z);
const rot = (g, x = 0, y = 0, z = 0) => {
  g.rotateX(x);
  g.rotateY(y);
  g.rotateZ(z);
  return g;
};
/** Elipsoida o półosiach rx, ry, rz w punkcie p. */
const blob = (rx, ry, rz, p, w = 16, h = 11) => at(scale(sphere(1, w, h), rx, ry, rz), ...p);

/** Walec (stożek ścięty) od punktu a do b: promień ra przy a, rb przy b. */
function limb(a, b, ra, rb = ra, s = 10) {
  const A = new Vector3(...a);
  const d = new Vector3(...b).sub(A);
  const len = d.length();
  const g = cyl(rb, ra, len, s).translate(0, len / 2, 0);
  g.applyQuaternion(new Quaternion().setFromUnitVectors(new Vector3(0, 1, 0), d.normalize()));
  return g.translate(A.x, A.y, A.z);
}

/** Rura po krzywej przez punkty, promień zmienny wzdłuż (liczba albo funkcja t ∈ [0,1]). */
function tube(points, r0, r1 = r0, tubular = 20, radial = 8) {
  const curve = new CatmullRomCurve3(points.map((p) => new Vector3(...p)));
  const frames = curve.computeFrenetFrames(tubular, false);
  const pos = [];
  const nor = [];
  const idx = [];
  for (let i = 0; i <= tubular; i++) {
    const t = i / tubular;
    const P = curve.getPointAt(t);
    const N = frames.normals[i];
    const B = frames.binormals[i];
    const r = typeof r0 === 'function' ? r0(t) : r0 + (r1 - r0) * t;
    for (let j = 0; j <= radial; j++) {
      const v = (j / radial) * Math.PI * 2;
      const sin = Math.sin(v);
      const cos = -Math.cos(v);
      const nx = cos * N.x + sin * B.x;
      const ny = cos * N.y + sin * B.y;
      const nz = cos * N.z + sin * B.z;
      nor.push(nx, ny, nz);
      pos.push(P.x + r * nx, P.y + r * ny, P.z + r * nz);
    }
  }
  for (let i = 0; i < tubular; i++) {
    for (let j = 0; j < radial; j++) {
      const a = i * (radial + 1) + j;
      const b = (i + 1) * (radial + 1) + j;
      idx.push(a, b, a + 1, b, b + 1, a + 1);
    }
  }
  const g = new BufferGeometry();
  g.setAttribute('position', new Float32BufferAttribute(pos, 3));
  g.setAttribute('normal', new Float32BufferAttribute(nor, 3));
  g.setIndex(idx);
  return g;
}

/** Części modelu pogrupowane wg materiału. */
class Parts {
  constructor() {
    this.by = {};
  }
  add(material, ...geoms) {
    (this.by[material] ??= []).push(...geoms.flat());
    return this;
  }
}

/** Odbicie lustrzane w osi x (para uszu, rogów, nóg) — z odwróceniem trójkątów. */
function mirrorX(g) {
  const m = g.clone().scale(-1, 1, 1);
  const n = m.index ? m.toNonIndexed() : m;
  const p = n.getAttribute('position');
  const q = n.getAttribute('normal');
  for (let i = 0; i < p.count; i += 3) {
    for (const attr of [p, q]) {
      const ax = attr.getX(i + 1);
      const ay = attr.getY(i + 1);
      const az = attr.getZ(i + 1);
      attr.setXYZ(i + 1, attr.getX(i + 2), attr.getY(i + 2), attr.getZ(i + 2));
      attr.setXYZ(i + 2, ax, ay, az);
    }
  }
  return n;
}
const pair = (g) => [g, mirrorX(g)];

/**
 * Głowa i nakrycie głowy w powiększeniu (proporcje figurki do gry — rozpoznawalne z daleka): części budowane
 * w `build` skalowane o k wokół punktu `pivot` (szczyt szyi).
 */
function bigHead(p, pivot, k, build) {
  const tmp = new Parts();
  build(tmp);
  for (const [m, gs] of Object.entries(tmp.by)) {
    p.add(m, gs.map((g) => g.translate(-pivot[0], -pivot[1], -pivot[2]).scale(k, k, k).translate(...pivot)));
  }
}
const HEAD_K = 1.22;

// ---------- materiały (kolory sRGB → liniowe w glTF) ----------

const MATERIALS = {
  stone: { color: '#e9dfc9', rough: 0.72, metal: 0 },
  team: { color: '#ffffff', rough: 0.45, metal: 0.05 },
  gold: { color: '#f5c35a', rough: 0.28, metal: 1 },
  'paint-black': { color: '#1c1a20', rough: 0.35, metal: 0.1 },
  'paint-red': { color: '#c2392a', rough: 0.4, metal: 0 },
  'paint-blue': { color: '#2b4a9e', rough: 0.45, metal: 0 },
  'paint-falcon': { color: '#8a6440', rough: 0.55, metal: 0 },
  'paint-white': { color: '#f1ede2', rough: 0.6, metal: 0 },
  'paint-green': { color: '#4f8f59', rough: 0.5, metal: 0 },
  'paint-linen': { color: '#dccdaa', rough: 0.85, metal: 0 },
  'paint-linen-dark': { color: '#a8916a', rough: 0.9, metal: 0 },
  'paint-ivory': { color: '#e6d7b2', rough: 0.5, metal: 0 },
  'paint-chitin': { color: '#3d2c22', rough: 0.3, metal: 0.15 },
  'paint-eye': { color: '#f2e6c8', rough: 0.3, metal: 0 },
};

// ---------- wspólne korpusy ----------

/** Krok egipskiej statuy: lewa noga wysunięta. Zwraca punkty zaczepienia rąk i szyi. */
function maleBody(p, { kilt = 'team', skin = 'stone' } = {}) {
  p.add(skin, at(box(0.07, 0.035, 0.15), -0.055, 0.0175, 0.06), at(box(0.07, 0.035, 0.15), 0.055, 0.0175, -0.02));
  p.add(skin, limb([-0.055, 0.03, 0.05], [-0.05, 0.3, 0.005], 0.032, 0.047), limb([0.055, 0.03, -0.02], [0.05, 0.3, -0.005], 0.032, 0.047));
  // przepaska shendyt: rozszerza się ku dołowi, z przodu fartuszek
  p.add(kilt, scale(lathe([[0, 0.25], [0.135, 0.25], [0.125, 0.3], [0.1, 0.43], [0, 0.43]]), 1, 1, 0.8));
  p.add(kilt, at(box(0.07, 0.16, 0.02), 0, 0.33, 0.095));
  p.add('gold', at(scale(new TorusGeometry(0.1, 0.012, 6, 24), 1, 0.8, 1).rotateX(Math.PI / 2), 0, 0.43, 0).scale(1, 1, 0.8));
  p.add(skin, scale(lathe([[0, 0.42], [0.095, 0.42], [0.088, 0.5], [0.122, 0.615], [0.115, 0.655], [0.06, 0.69], [0, 0.69]]), 1, 1, 0.72));
  // naszyjnik wesech
  p.add('gold', scale(at(cyl(0.075, 0.143, 0.04, 28), 0, 0.645, 0), 1, 1, 0.76));
  p.add(skin, at(cyl(0.036, 0.042, 0.08), 0, 0.715, 0));
  return { shoulderR: [0.13, 0.63, 0], shoulderL: [-0.13, 0.63, 0], neckTop: 0.75 };
}

/** Prawa ręka wysunięta z berłem was (pionowe, do ziemi), lewa opuszczona z ankh. */
function staffAndAnkh(p, body, skin = 'stone', staffTop = 1.0) {
  const sr = body.shoulderR;
  const hand = [0.17, 0.47, 0.14];
  p.add(skin, limb(sr, [0.155, 0.52, 0.03], 0.032, 0.028), limb([0.155, 0.52, 0.03], hand, 0.028, 0.023), at(sphere(0.03), ...hand));
  // berło was: drzewce, rozwidlony dół, głowica pochylona w przód
  p.add('gold', limb([0.17, 0.02, 0.14], [0.17, staffTop, 0.14], 0.012));
  p.add('gold', limb([0.17, staffTop, 0.14], [0.17, staffTop + 0.03, 0.2], 0.016, 0.01));
  p.add('gold', limb([0.17, 0.05, 0.14], [0.15, 0.0, 0.14], 0.009), limb([0.17, 0.05, 0.14], [0.19, 0.0, 0.14], 0.009));
  const sl = body.shoulderL;
  const lh = [-0.14, 0.4, 0.035];
  p.add(skin, limb(sl, [-0.145, 0.52, 0.0], 0.032, 0.028), limb([-0.145, 0.52, 0.0], lh, 0.028, 0.023), at(sphere(0.028), ...lh));
  ankh(p, [-0.14, 0.33, 0.06]);
}

/** Ankh: pętla, poprzeczka, trzon (w płaszczyźnie xy, środek poprzeczki w p). */
function ankh(p, [x, y, z], k = 1) {
  p.add('gold', at(new TorusGeometry(0.022 * k, 0.007 * k, 6, 20), x, y + 0.035 * k, z));
  p.add('gold', at(box(0.06 * k, 0.012 * k, 0.012 * k), x, y, z), at(box(0.012 * k, 0.075 * k, 0.012 * k), x, y - 0.04 * k, z));
}

/** Postać kobieca w obcisłej sukni (Izyda, Satet). */
function femaleBody(p, { dress = 'team' } = {}) {
  p.add('stone', at(box(0.06, 0.03, 0.1), -0.035, 0.015, 0.05), at(box(0.06, 0.03, 0.1), 0.035, 0.015, 0.04));
  p.add(dress, scale(lathe([[0, 0.02], [0.085, 0.02], [0.088, 0.06], [0.075, 0.28], [0.088, 0.45], [0.107, 0.58], [0, 0.58]]), 1, 1, 0.78));
  p.add('stone', scale(lathe([[0, 0.56], [0.1, 0.56], [0.11, 0.615], [0.105, 0.65], [0.055, 0.68], [0, 0.68]]), 1, 1, 0.72));
  p.add('gold', scale(at(cyl(0.07, 0.13, 0.035, 28), 0, 0.638, 0), 1, 1, 0.76));
  p.add('stone', at(cyl(0.032, 0.038, 0.08), 0, 0.71, 0));
  return { shoulderR: [0.115, 0.625, 0], shoulderL: [-0.115, 0.625, 0], neckTop: 0.745 };
}

/** Peruka trójdzielna: masa z tyłu i dwa pasma z przodu na ramiona. */
function wig(p, material, y, w = 1) {
  p.add(material, blob(0.075 * w, 0.085, 0.07, [0, y, -0.018]));
  p.add(material, ...pair(at(rot(box(0.034, 0.13, 0.026), 0, 0, 0.05), 0.058 * w, y - 0.07, 0.03)));
}

// ---------- bogowie ----------

function anubis() {
  const p = new Parts();
  const body = maleBody(p);
  staffAndAnkh(p, body);
  // głowa szakala: czaszka, długi pysk, wysokie spiczaste uszy, czarna szyja
  p.add('paint-black', at(cyl(0.038, 0.044, 0.09), 0, 0.72, 0));
  bigHead(p, [0, 0.75, 0], HEAD_K, (h) => {
    h.add('paint-black', blob(0.062, 0.06, 0.07, [0, 0.81, 0]));
    h.add('paint-black', limb([0, 0.8, 0.035], [0, 0.765, 0.175], 0.042, 0.016), at(sphere(0.02), 0, 0.765, 0.178));
    h.add('paint-black', limb([0, 0.775, 0.04], [0, 0.748, 0.15], 0.026, 0.012)); // żuchwa
    h.add('paint-black', ...pair(at(rot(scale(cone(0.034, 0.15, 12), 1, 1, 0.45), -0.08, 0, -0.16), 0.038, 0.915, -0.01)));
    h.add('gold', ...pair(at(sphere(0.009), 0.035, 0.825, 0.055))); // oczy
  });
  return p;
}

function ra() {
  const p = new Parts();
  const body = maleBody(p);
  staffAndAnkh(p, body);
  bigHead(p, [0, 0.75, 0], HEAD_K, (h) => {
    wig(h, 'paint-blue', 0.79);
    // głowa sokoła: wysunięta w przód, jasne policzki, mocno zakrzywiony dziób, ciemne pasy pod oczami
    h.add('paint-falcon', blob(0.06, 0.062, 0.072, [0, 0.815, 0.018]));
    h.add('paint-ivory', ...pair(blob(0.022, 0.026, 0.03, [0.034, 0.795, 0.05])));
    h.add('paint-black', tube([[0, 0.835, 0.07], [0, 0.832, 0.112], [0, 0.812, 0.14], [0, 0.786, 0.136], [0, 0.778, 0.124]], (t) => 0.027 * (1 - t) + 0.004, 0, 20, 10));
    h.add('paint-black', ...pair(tube([[0.04, 0.822, 0.055], [0.046, 0.8, 0.05], [0.05, 0.772, 0.035]], 0.008, 0.005, 10, 6)));
    h.add('gold', ...pair(at(sphere(0.012), 0.039, 0.826, 0.056)));
    // dysk słońca w złotej obręczy z ureuszem
    h.add('paint-red', at(scale(sphere(0.088, 20, 12), 1, 1, 0.28), 0, 0.97, -0.02));
    h.add('gold', at(new TorusGeometry(0.088, 0.009, 6, 24), 0, 0.97, -0.02));
    h.add('gold', tube([[0, 0.88, 0.035], [0, 0.92, 0.06], [0, 0.96, 0.05], [0, 0.985, 0.055]], 0.011, 0.008));
    h.add('gold', blob(0.016, 0.02, 0.007, [0, 0.985, 0.058]));
  });
  return p;
}

function amun() {
  const p = new Parts();
  const body = maleBody(p);
  staffAndAnkh(p, body, 'stone', 0.98);
  bigHead(p, [0, 0.75, 0], HEAD_K, (h) => {
    wig(h, 'paint-blue', 0.785, 0.95);
    // głowa barana: krótki, garbaty pysk, uszy na boki
    h.add('stone', blob(0.056, 0.06, 0.066, [0, 0.812, 0.008]));
    h.add('stone', limb([0, 0.81, 0.045], [0, 0.782, 0.112], 0.043, 0.033), at(sphere(0.034), 0, 0.779, 0.115));
    h.add('stone', blob(0.03, 0.018, 0.036, [0, 0.832, 0.06])); // garb nosa
    h.add('stone', ...pair(at(rot(scale(cone(0.018, 0.07, 10), 1, 1, 0.5), 0, 0, -1.9), 0.075, 0.8, 0)));
    // duże rogi skręcone w dół wokół uszu
    const horn = [];
    for (let i = 0; i <= 16; i++) {
      const t = i / 16;
      const a = t * Math.PI * 1.7;
      const r = 0.066 - 0.028 * t;
      horn.push([0.048 + 0.045 * t, 0.835 + r * Math.cos(a) - 0.015, -0.015 - r * Math.sin(a) + 0.025 * t]);
    }
    h.add('paint-ivory', ...pair(tube(horn, 0.027, 0.008, 28, 10)));
    h.add('gold', ...pair(at(sphere(0.009), 0.034, 0.83, 0.05)));
    // korona: modius, dwa wysokie pióra (kolor gracza), mały dysk
    h.add('gold', at(cyl(0.048, 0.052, 0.035, 24), 0, 0.878, -0.005));
    h.add('team', ...pair(at(rot(cylFeather(), 0, 0, -0.04), 0.021, 1.025, -0.01)));
    h.add('gold', at(scale(sphere(0.028), 1, 1, 0.45), 0, 0.908, 0.035));
  });
  return p;
}

/** Pióro korony: płaskie, zwężające się ku górze. */
function cylFeather() {
  return scale(cyl(0.012, 0.022, 0.27, 12), 1, 1, 0.35);
}

function isis() {
  const p = new Parts();
  const body = femaleBody(p);
  // ręce: prawa podniesiona w geście opieki, lewa z ankh
  p.add('stone', limb(body.shoulderR, [0.15, 0.53, 0.06], 0.028, 0.024), limb([0.15, 0.53, 0.06], [0.14, 0.6, 0.13], 0.024, 0.02), at(sphere(0.024), 0.14, 0.61, 0.135));
  p.add('stone', limb(body.shoulderL, [-0.13, 0.5, 0.0], 0.028, 0.024), limb([-0.13, 0.5, 0.0], [-0.12, 0.41, 0.04], 0.024, 0.02), at(sphere(0.024), -0.12, 0.4, 0.045));
  ankh(p, [-0.12, 0.34, 0.065], 0.9);
  // skrzydła kani rozpostarte w dół i lekko w przód — pióra w kolorze gracza, złote pokrywy
  const wing = [];
  const coverts = [];
  for (let k = 0; k < 6; k++) {
    const ang = -0.25 - k * 0.2;
    const len = 0.2 + k * 0.035;
    const root = new Vector3(0.11, 0.6 - k * 0.012, -0.035 - k * 0.004);
    const dir = new Vector3(Math.cos(ang), Math.sin(ang), 0.32).normalize();
    const mid = root.clone().addScaledVector(dir, len / 2);
    const f = scale(sphere(1, 14, 8), len / 2, 0.026, 0.008);
    f.applyQuaternion(new Quaternion().setFromUnitVectors(new Vector3(1, 0, 0), dir));
    wing.push(f.translate(mid.x, mid.y, mid.z));
  }
  coverts.push(tube([[0.1, 0.62, -0.03], [0.2, 0.62, 0.0], [0.29, 0.56, 0.05]], 0.022, 0.012, 20, 10));
  p.add('team', ...wing, ...wing.map(mirrorX));
  p.add('gold', ...coverts, ...coverts.map(mirrorX));
  // głowa kobieca, czarna peruka, korona z rogów krowy i dysku
  bigHead(p, [0, 0.745, 0], HEAD_K, (h) => {
    wig(h, 'paint-black', 0.785);
    h.add('stone', blob(0.054, 0.062, 0.058, [0, 0.79, 0.012]));
    h.add('gold', at(cyl(0.05, 0.054, 0.03, 24), 0, 0.855, -0.005));
    h.add('paint-red', at(scale(sphere(0.06, 24, 16), 1, 1, 0.3), 0, 0.95, -0.005));
    h.add('gold', at(rot(new TorusGeometry(0.068, 0.011, 6, 24, Math.PI * 1.15), 0, 0, Math.PI + Math.PI * -0.075), 0, 0.95, -0.005));
  });
  return p;
}

function osiris() {
  const p = new Parts();
  // ciało owinięte całunem (mumia), bez nóg
  p.add('paint-white', scale(lathe([[0, 0], [0.08, 0], [0.085, 0.03], [0.072, 0.17], [0.088, 0.4], [0.116, 0.6], [0.105, 0.66], [0.05, 0.69], [0, 0.69]]), 1, 1, 0.76));
  p.add('team', at(scale(new TorusGeometry(0.087, 0.014, 6, 24).rotateX(Math.PI / 2), 1, 1, 0.76), 0, 0.4, 0));
  p.add('gold', scale(at(cyl(0.075, 0.14, 0.04, 28), 0, 0.645, 0), 1, 1, 0.78));
  p.add('paint-green', at(cyl(0.036, 0.042, 0.08), 0, 0.715, 0));
  // ręce skrzyżowane na piersi z berłem-pastorałem i cepem
  p.add('paint-green', at(sphere(0.027), 0.045, 0.54, 0.085), at(sphere(0.027), -0.045, 0.54, 0.085));
  p.add('gold', tube([[0.06, 0.46, 0.1], [-0.02, 0.6, 0.11], [-0.07, 0.7, 0.11], [-0.085, 0.74, 0.11], [-0.06, 0.765, 0.11], [-0.045, 0.745, 0.11]], 0.009, 0.009, 24, 6));
  p.add('gold', limb([-0.06, 0.46, 0.1], [0.07, 0.68, 0.11], 0.009));
  for (const dx of [-0.012, 0, 0.012]) p.add('team', tube([[0.07 + dx, 0.68, 0.11], [0.1 + dx, 0.64, 0.12], [0.11 + dx, 0.58, 0.12]], 0.007, 0.005, 12, 6));
  // zielona twarz, broda, korona atef: biała mitra, dwa pióra, rogi baranie, ureusz
  bigHead(p, [0, 0.75, 0], HEAD_K, (h) => {
    h.add('paint-green', blob(0.054, 0.062, 0.058, [0, 0.79, 0.012]));
    h.add('gold', tube([[0, 0.75, 0.05], [0, 0.71, 0.065], [0, 0.68, 0.08]], 0.012, 0.017, 10, 8));
    h.add('paint-white', at(lathe([[0.058, 0], [0.062, 0.05], [0.052, 0.14], [0.034, 0.21], [0.016, 0.24], [0, 0.245]], 24), 0, 0.83, -0.005));
    h.add('gold', at(sphere(0.02), 0, 1.075, -0.005));
    h.add('team', ...pair(at(rot(scale(cyl(0.01, 0.024, 0.24, 12), 1, 1, 0.35), 0, 0, -0.12), 0.07, 0.96, -0.005)));
    h.add('gold', tube([[-0.13, 0.85, -0.01], [-0.07, 0.84, 0.01], [0, 0.85, 0.02], [0.07, 0.84, 0.01], [0.13, 0.85, -0.01]], 0.011, 0.011, 30, 8));
    h.add('gold', tube([[0, 0.84, 0.05], [0, 0.87, 0.065], [0, 0.9, 0.06]], 0.009, 0.007, 10, 8));
  });
  return p;
}

// ---------- strażnicy ----------

function catMummy() {
  const p = new Parts();
  // siedzący kot owinięty płótnem
  p.add('paint-linen', scale(lathe([[0, 0], [0.11, 0], [0.12, 0.05], [0.1, 0.17], [0.075, 0.29], [0.055, 0.36], [0, 0.37]]), 1, 1, 1.15));
  for (const [y, r] of [[0.06, 0.118], [0.12, 0.112], [0.18, 0.098], [0.24, 0.085], [0.3, 0.068]]) {
    p.add('paint-linen-dark', at(scale(new TorusGeometry(r, 0.007, 6, 24).rotateX(Math.PI / 2 + 0.12), 1, 1, 1.15), 0, y, 0));
  }
  p.add('team', at(scale(new TorusGeometry(0.057, 0.012, 6, 24).rotateX(Math.PI / 2), 1, 1, 1.1), 0, 0.345, 0)); // obroża
  p.add('gold', at(sphere(0.016), 0, 0.33, 0.065));
  p.add('paint-linen', blob(0.068, 0.062, 0.064, [0, 0.42, 0.01]), blob(0.03, 0.024, 0.03, [0, 0.405, 0.062]));
  p.add('paint-linen', ...pair(at(rot(scale(cone(0.03, 0.085, 10), 1, 1, 0.5), 0, 0, -0.18), 0.042, 0.49, -0.005)));
  p.add('paint-black', ...pair(at(scale(sphere(0.013), 1.3, 0.8, 0.6), 0.027, 0.43, 0.06)));
  p.add('paint-linen', ...pair(blob(0.03, 0.02, 0.05, [0.05, 0.02, 0.1])));
  p.add('paint-linen', tube([[0.08, 0.02, -0.1], [0.13, 0.02, -0.02], [0.12, 0.02, 0.08], [0.08, 0.03, 0.13]], 0.016, 0.01, 20, 8));
  return p;
}

function mummy() {
  const p = new Parts();
  p.add('paint-linen', at(box(0.06, 0.03, 0.1), -0.035, 0.015, 0.035), at(box(0.06, 0.03, 0.1), 0.035, 0.015, 0.035));
  p.add('paint-linen', scale(lathe([[0, 0.02], [0.075, 0.02], [0.08, 0.06], [0.072, 0.3], [0.094, 0.5], [0.112, 0.6], [0.098, 0.645], [0.045, 0.665], [0, 0.665]]), 1, 1, 0.76));
  for (let i = 0; i < 9; i++) {
    const y = 0.07 + i * 0.065;
    const r = y < 0.3 ? 0.078 : y < 0.5 ? 0.078 + (y - 0.3) * 0.08 : 0.1;
    p.add('paint-linen-dark', at(scale(new TorusGeometry(r, 0.006, 6, 24).rotateX(Math.PI / 2 + (i % 2 ? 0.18 : -0.18)), 1, 1, 0.78), 0, y, 0));
  }
  // ręce skrzyżowane, szarfa w kolorze gracza
  for (const sx of [1, -1]) {
    const elbow = [sx * 0.112, 0.47, 0.035];
    p.add('paint-linen', limb([sx * 0.112, 0.61, 0], elbow, 0.03, 0.027), at(sphere(0.027), ...elbow));
    p.add('paint-linen', limb(elbow, [-sx * 0.055, sx > 0 ? 0.575 : 0.55, 0.088], 0.027, 0.023), at(sphere(0.025), -sx * 0.06, sx > 0 ? 0.578 : 0.553, 0.09));
  }
  p.add('team', tube([[0.1, 0.63, 0.03], [0.02, 0.48, 0.085], [-0.06, 0.33, 0.07], [-0.08, 0.22, 0.05]], 0.016, 0.016, 24, 8));
  p.add('paint-linen', at(cyl(0.033, 0.038, 0.07), 0, 0.69, 0), blob(0.058, 0.066, 0.06, [0, 0.765, 0.005]));
  p.add('paint-linen-dark', at(scale(new TorusGeometry(0.058, 0.006, 6, 24).rotateX(Math.PI / 2 - 0.25), 1, 1, 1.02), 0, 0.8, 0.005));
  p.add('paint-black', at(box(0.075, 0.016, 0.02), 0, 0.775, 0.052));
  p.add('gold', ...pair(at(sphere(0.008), 0.02, 0.776, 0.06))); // błysk oczu
  return p;
}

function satet() {
  const p = new Parts();
  const body = femaleBody(p);
  p.add('stone', limb(body.shoulderR, [0.135, 0.5, 0.02], 0.028, 0.024), limb([0.135, 0.5, 0.02], [0.13, 0.42, 0.08], 0.024, 0.02), at(sphere(0.024), 0.13, 0.415, 0.085));
  ankh(p, [0.13, 0.355, 0.1], 0.9);
  p.add('stone', limb(body.shoulderL, [-0.13, 0.5, 0.0], 0.028, 0.024), limb([-0.13, 0.5, 0.0], [-0.125, 0.4, 0.03], 0.024, 0.02), at(sphere(0.024), -0.125, 0.39, 0.035));
  bigHead(p, [0, 0.745, 0], HEAD_K, (h) => {
    wig(h, 'paint-black', 0.78);
    h.add('stone', blob(0.052, 0.06, 0.056, [0, 0.785, 0.012]));
    // biała korona hedżet i rogi antylopy wygięte w tył
    h.add('paint-white', at(lathe([[0.056, 0], [0.06, 0.05], [0.048, 0.15], [0.03, 0.22], [0.018, 0.25], [0, 0.26]], 24), 0, 0.825, -0.008));
    h.add('gold', at(sphere(0.02), 0, 1.085, -0.008));
    h.add('paint-ivory', ...pair(tube([[0.04, 0.86, -0.01], [0.09, 0.95, -0.04], [0.12, 1.04, -0.1], [0.12, 1.1, -0.17]], 0.022, 0.005, 30, 10)));
    h.add('gold', tube([[0, 0.84, 0.045], [0, 0.87, 0.06], [0, 0.9, 0.055]], 0.009, 0.007, 10, 8));
  });
  return p;
}

function apep() {
  const p = new Parts();
  // zwoje na ziemi (spirala od ogona), potem esowata szyja i uniesiona głowa
  const pts = [];
  for (let i = 0; i <= 20; i++) {
    const t = i / 20;
    const a = t * Math.PI * 3.6;
    const r = 0.06 + t * 0.2;
    pts.push([Math.cos(a) * r, 0.055, Math.sin(a) * r - 0.04]);
  }
  const last = pts[pts.length - 1];
  pts.push([last[0] * 0.7, 0.12, last[2] + 0.06], [0.02, 0.28, 0.08], [-0.02, 0.42, 0.02], [0.0, 0.55, 0.04], [0.0, 0.6, 0.11]);
  const R = (t) => 0.012 + 0.05 * Math.min(1, t * 3) * (t > 0.85 ? 1 - (t - 0.85) * 2.2 : 1);
  p.add('team', tube(pts, R, R, 90, 10));
  // łuski grzbietu — złote punkty co kawałek
  const curve = new CatmullRomCurve3(pts.map((q) => new Vector3(...q)));
  for (let i = 3; i < 26; i++) {
    const t = i / 28;
    const q = curve.getPointAt(t);
    p.add('gold', at(sphere(0.012, 10, 8), q.x, q.y + R(t) * 0.9, q.z));
  }
  // głowa z otwartą paszczą
  const head = curve.getPointAt(1);
  p.add('team', blob(0.05, 0.034, 0.075, [head.x, head.y + 0.01, head.z + 0.05]));
  p.add('team', at(rot(scale(sphere(1, 14, 10), 0.04, 0.014, 0.06), 0.35, 0, 0), head.x, head.y - 0.03, head.z + 0.06));
  p.add('paint-red', blob(0.032, 0.008, 0.05, [head.x, head.y - 0.012, head.z + 0.065]));
  p.add('gold', ...pair(at(sphere(0.011), head.x + 0.03, head.y + 0.03, head.z + 0.065)));
  p.add('paint-ivory', ...pair(at(rot(cone(0.006, 0.03, 6), Math.PI, 0, 0), head.x + 0.018, head.y - 0.01, head.z + 0.1)));
  return p;
}

function giantScorpion() {
  const p = new Parts();
  // głowotułów i odwłok z segmentów; płytki grzbietu w kolorze gracza
  p.add('paint-chitin', blob(0.11, 0.055, 0.12, [0, 0.12, 0.1]));
  const segs = [[0.1, -0.02], [0.095, -0.1], [0.088, -0.175], [0.078, -0.245]];
  for (const [r, z] of segs) {
    p.add('paint-chitin', blob(r, 0.052, 0.05, [0, 0.12, z]));
    p.add('team', blob(r * 0.8, 0.02, 0.038, [0, 0.165, z]));
  }
  // ogon łukiem nad grzbiet, kolec złoty
  const tail = [[0, 0.13, -0.28], [0, 0.24, -0.4], [0, 0.42, -0.4], [0, 0.55, -0.26], [0, 0.56, -0.1]];
  p.add('paint-chitin', tube(tail, 0.042, 0.022, 28, 10));
  const tc = new CatmullRomCurve3(tail.map((q) => new Vector3(...q)));
  for (let i = 1; i <= 5; i++) {
    const q = tc.getPointAt(i / 6);
    p.add('paint-chitin', at(sphere(0.046 - i * 0.004, 14, 10), q.x, q.y, q.z));
  }
  p.add('paint-chitin', blob(0.035, 0.03, 0.045, [0, 0.55, -0.07]));
  p.add('gold', tube([[0, 0.54, -0.04], [0, 0.52, 0.0], [0, 0.48, 0.02]], 0.018, 0.002, 12, 8));
  // osiem odnóży, zgiętych w kolanie
  for (const z of [0.12, 0.05, -0.03, -0.11]) {
    const leg = tube([[0.08, 0.11, z], [0.19, 0.2, z + 0.01], [0.27, 0.06, z + 0.03], [0.29, 0.0, z + 0.035]], 0.016, 0.008, 18, 8);
    p.add('paint-chitin', leg, mirrorX(leg));
  }
  // szczypce
  const arm = tube([[0.07, 0.12, 0.18], [0.16, 0.15, 0.26], [0.17, 0.14, 0.34]], 0.024, 0.02, 18, 10);
  const claw = blob(0.052, 0.036, 0.075, [0.17, 0.14, 0.4]);
  const fingers = [at(rot(cone(0.018, 0.08, 8), Math.PI / 2, 0, 0), 0.19, 0.145, 0.49), at(rot(cone(0.014, 0.07, 8), Math.PI / 2, 0, 0), 0.15, 0.14, 0.48)];
  p.add('paint-chitin', arm, mirrorX(arm), claw, mirrorX(claw), ...fingers, ...fingers.map(mirrorX));
  p.add('gold', ...pair(at(sphere(0.012), 0.035, 0.165, 0.2)));
  return p;
}

function androsphinx() {
  const p = new Parts();
  p.add('stone', at(box(0.34, 0.05, 0.86), 0, 0.025, 0));
  p.add('gold', at(box(0.35, 0.012, 0.87), 0, 0.05, 0));
  // lew w pozie leżącej: tułów, zad, łapy przednie wyciągnięte
  p.add('stone', blob(0.12, 0.1, 0.27, [0, 0.16, -0.08]));
  p.add('stone', blob(0.125, 0.12, 0.11, [0, 0.21, 0.13]));
  p.add('stone', ...pair(blob(0.06, 0.07, 0.13, [0.09, 0.12, -0.2])));
  p.add('stone', ...pair(limb([0.07, 0.09, 0.14], [0.07, 0.075, 0.33], 0.038, 0.032)));
  p.add('stone', ...pair(blob(0.04, 0.025, 0.05, [0.07, 0.072, 0.35])));
  p.add('stone', tube([[0.1, 0.08, -0.33], [0.14, 0.07, -0.2], [0.13, 0.08, -0.05], [0.12, 0.09, 0.02]], 0.014, 0.01, 20, 8));
  // głowa człowieka w chuście nemes (pasy: kolor gracza i złoto), broda
  // chusta nemes: kaptur za twarzą rozszerzający się ku ramionom, pasy w kolorze gracza i złota
  p.add('team', at(scale(lathe([[0, 0.12], [0.05, 0.115], [0.08, 0.08], [0.11, 0.0], [0.115, -0.04], [0, -0.04]], 28), 1, 1, 0.75), 0, 0.33, 0.16));
  p.add('team', ...pair(at(rot(box(0.04, 0.13, 0.026), 0.05, 0, 0.05), 0.072, 0.27, 0.22)));
  for (const y of [0.235, 0.27, 0.305]) p.add('gold', ...pair(at(rot(box(0.042, 0.009, 0.028), 0.05, 0, 0.05), 0.073, y, 0.222)));
  p.add('stone', blob(0.056, 0.066, 0.05, [0, 0.37, 0.215]));
  p.add('gold', at(scale(new TorusGeometry(0.058, 0.007, 6, 24).rotateX(Math.PI / 2 - 0.2), 1, 1, 0.9), 0, 0.41, 0.2));
  p.add('gold', limb([0, 0.315, 0.245], [0, 0.255, 0.255], 0.013, 0.017)); // broda
  p.add('gold', tube([[0, 0.425, 0.25], [0, 0.445, 0.268], [0, 0.462, 0.262]], 0.009, 0.007, 10, 8)); // ureusz
  p.add('paint-black', ...pair(at(scale(sphere(0.01), 1.4, 0.7, 0.6), 0.021, 0.38, 0.258)));
  return p;
}

// ---------- ogólne (wcześniejsze) statuetki ----------

function godGeneric() {
  const p = new Parts();
  const body = maleBody(p);
  staffAndAnkh(p, body);
  p.add('stone', blob(0.06, 0.066, 0.06, [0, 0.8, 0.01]));
  p.add('team', at(lathe([[0.07, 0], [0.085, 0.05], [0.065, 0.2], [0.03, 0.26], [0, 0.27]], 20), 0, 0.83, 0));
  return p;
}

function warrior() {
  const p = new Parts();
  p.add('stone', lathe([[0, 0], [0.13, 0], [0.12, 0.05], [0.09, 0.28], [0.1, 0.33], [0.04, 0.36], [0, 0.36]]));
  p.add('stone', at(sphere(0.06, 16, 12), 0, 0.42, 0));
  p.add('stone', at(cyl(0.01, 0.01, 0.6, 8), 0.12, 0.3, 0.02));
  p.add('team', at(cyl(0.1, 0.1, 0.02, 24).rotateX(Math.PI / 2), -0.08, 0.22, 0.09));
  p.add('team', at(cyl(0.062, 0.062, 0.03, 16), 0, 0.455, 0));
  p.add('gold', at(cone(0.024, 0.08, 10), 0.12, 0.635, 0.02));
  return p;
}

// ---------- zapis ----------

/** Tylko pozycje i normalne (każda bryła ma własne, gładkie normalne — po scaleniu się ich nie przelicza). */
function clean(g) {
  const n = g.index ? g.toNonIndexed() : g;
  for (const k of Object.keys(n.attributes)) if (k !== 'position' && k !== 'normal') n.deleteAttribute(k);
  return n;
}

/** Kolor wierzchołków (liniowy) dla całej bryły. */
function painted(g, hex) {
  const c = new Color(hex);
  const n = clean(g);
  const col = new Float32Array(n.getAttribute('position').count * 3);
  for (let i = 0; i < col.length; i += 3) col.set([c.r, c.g, c.b], i);
  n.setAttribute('color', new Float32BufferAttribute(col, 3));
  return n;
}

/**
 * Prymitywy wg materiału: stone, team, gold osobno; wszystkie `paint-*` scalone w jeden materiał `paint`
 * z kolorem w wierzchołkach — figurka to najwyżej 4 wywołania rysowania.
 */
function toDocument(parts) {
  const doc = new Document();
  const buffer = doc.createBuffer();
  const mesh = doc.createMesh('figurka');
  const groups = {};
  for (const [name, geoms] of Object.entries(parts.by)) {
    if (!MATERIALS[name]) throw new Error(`nieznany materiał ${name}`);
    if (name.startsWith('paint-')) (groups.paint ??= []).push(...geoms.map((g) => painted(g, MATERIALS[name].color)));
    else groups[name] = geoms.map(clean);
  }
  for (const [name, geoms] of Object.entries(groups)) {
    const g = mergeGeometries(geoms, false);
    const def = name === 'paint' ? { color: '#ffffff', rough: 0.45, metal: 0.05 } : MATERIALS[name];
    const c = new Color(def.color); // sRGB → liniowe (zarządzanie kolorem three.js)
    const mat = doc.createMaterial(name).setBaseColorFactor([c.r, c.g, c.b, 1]).setRoughnessFactor(def.rough).setMetallicFactor(def.metal);
    const prim = doc
      .createPrimitive()
      .setAttribute('POSITION', doc.createAccessor().setType('VEC3').setArray(g.getAttribute('position').array).setBuffer(buffer))
      .setAttribute('NORMAL', doc.createAccessor().setType('VEC3').setArray(g.getAttribute('normal').array).setBuffer(buffer))
      .setMaterial(mat);
    if (name === 'paint') prim.setAttribute('COLOR_0', doc.createAccessor().setType('VEC3').setArray(g.getAttribute('color').array).setBuffer(buffer));
    mesh.addPrimitive(prim);
  }
  doc.createScene('scena').addChild(doc.createNode('figurka').setMesh(mesh));
  return doc;
}

export const MODELS = {
  'god.glb': godGeneric,
  'god-anubis.glb': anubis,
  'god-ra.glb': ra,
  'god-amun.glb': amun,
  'god-isis.glb': isis,
  'god-osiris.glb': osiris,
  'guardian-catMummy.glb': catMummy,
  'guardian-mummy.glb': mummy,
  'guardian-satet.glb': satet,
  'guardian-apep.glb': apep,
  'guardian-giantScorpion.glb': giantScorpion,
  'guardian-androsphinx.glb': androsphinx,
  'warrior.glb': warrior,
};

if (!only) {
  await MeshoptEncoder.ready;
  const io = new NodeIO().registerExtensions(ALL_EXTENSIONS).registerDependencies({
    'draco3d.encoder': await draco3d.createEncoderModule(),
    'draco3d.decoder': await draco3d.createDecoderModule(),
    'meshopt.encoder': MeshoptEncoder,
    'meshopt.decoder': MeshoptDecoder,
  });
  for (const [file, make] of Object.entries(MODELS)) {
    const doc = toDocument(make());
    if (file === 'warrior.glb') await doc.transform(weld(), draco({ method: 'edgebreaker' }));
    else await doc.transform(weld(), meshopt({ encoder: MeshoptEncoder, level: 'medium' }));
    await io.write(new URL(file, DIR).pathname, doc);
  }
}

const files = readdirSync(DIR).filter((f) => f.endsWith('.glb')).sort();
writeFileSync(new URL('manifest.json', DIR), JSON.stringify({ models: files }, null, 2) + '\n');
console.log('modele:', files.join(', '));
