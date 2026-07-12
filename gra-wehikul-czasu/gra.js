/*
  Wehikuł czasu — podróż przez dzieje Polski
  Logika gry + scena 3D (Three.js).  Wszystko po polsku, dla klasy IV.
*/
(() => {
'use strict';

const T = window.TRESCI;                       // pytania, wydarzenia, wyzwania
const { REGIONY } = T;

// ------------------------------------------------------------------ pomocnicze
const $ = (s) => document.querySelector(s);
const losuj = (a) => a[Math.floor(Math.random() * a.length)];
const pauza = (ms) => new Promise((r) => setTimeout(r, ms));
const clamp = (v, a, b) => Math.max(a, Math.min(b, v));
const easeInOut = (t) => t < 0.5 ? 2 * t * t : 1 - Math.pow(-2 * t + 2, 2) / 2;

function shade(hex, percent) {                 // rozjaśnij (+) / przyciemnij (-)
  const num = parseInt(hex.replace('#', ''), 16);
  let r = (num >> 16) & 0xff, g = (num >> 8) & 0xff, b = num & 0xff;
  const t = percent < 0 ? 0 : 255, p = Math.abs(percent) / 100;
  r = Math.round((t - r) * p) + r; g = Math.round((t - g) * p) + g; b = Math.round((t - b) * p) + b;
  return '#' + ((1 << 24) + (r << 16) + (g << 8) + b).toString(16).slice(1);
}

// ------------------------------------------------------------------ kolory drużyn
const KOLORY_DRUZYN = [
  { nazwa: 'Czerwone Wehikuły', c: 0xff5252, hex: '#ff5252' },
  { nazwa: 'Niebieskie Wehikuły', c: 0x4dabf7, hex: '#4dabf7' },
  { nazwa: 'Zielone Wehikuły', c: 0x69db7c, hex: '#69db7c' },
  { nazwa: 'Złote Wehikuły', c: 0xffd43b, hex: '#ffd43b' },
];

// ------------------------------------------------------------------ plansza (pola)
function budujDanePlanszy() {
  const uklad = {
    0: ['pytanie', 'wyzwanie', 'wydarzenie', 'pytanie', 'zeton'],
    1: ['pytanie', 'wydarzenie', 'pytanie', 'wyzwanie', 'zeton'],
    2: ['pytanie', 'pytanie', 'wydarzenie', 'wyzwanie', 'zeton'],
    3: ['pytanie', 'wydarzenie', 'wyzwanie', 'pytanie', 'zeton'],
    4: ['pytanie', 'wyzwanie', 'wydarzenie', 'pytanie', 'zeton'],
    5: ['pytanie', 'wydarzenie', 'wyzwanie', 'pytanie'],
  };
  const P = [{ typ: 'start', region: 0 }];
  for (let r = 0; r < 6; r++) for (const t of uklad[r]) P.push({ typ: t, region: r });
  P.push({ typ: 'meta', region: 5 });
  return P;
}
const PLANSZA = budujDanePlanszy();
const OSTATNIE = PLANSZA.length - 1;           // indeks mety
const TILE_W = 3.2, TILE_H = 0.6;

// ------------------------------------------------------------------ scena 3D
let renderer, scene, camera;
let TILE_POS = [], TILE_PERP = [], TILE_YAW = [];
let BOARD_CENTER, BOARD_R;
let DIE, PIONKI = [], TOKENY = [], starGroup;
const tweeny = [];

function anim(dur, onUpdate, ease = easeInOut) {
  return new Promise((res) => tweeny.push({ t: 0, dur, onUpdate, ease, done: res }));
}
function updateTweeny(dt) {
  for (let i = tweeny.length - 1; i >= 0; i--) {
    const w = tweeny[i];
    w.t += dt;
    const p = clamp(w.t / w.dur, 0, 1);
    w.onUpdate(w.ease(p), p);
    if (p >= 1) { tweeny.splice(i, 1); w.done && w.done(); }
  }
}

// tekstura na wierzch pola (kolor krainy + symbol)
function texturaPola(hex, glyph, glyphColor = '#ffffff', small) {
  const c = document.createElement('canvas'); c.width = c.height = 256;
  const x = c.getContext('2d');
  x.fillStyle = shade(hex, -8);
  x.beginPath(); x.roundRect(10, 10, 236, 236, 34); x.fill();
  x.strokeStyle = shade(hex, 35); x.lineWidth = 10;
  x.beginPath(); x.roundRect(24, 24, 208, 208, 26); x.stroke();
  x.fillStyle = glyphColor;
  x.textAlign = 'center'; x.textBaseline = 'middle';
  x.font = `800 ${small ? 78 : 150}px 'Segoe UI', sans-serif`;
  x.shadowColor = 'rgba(0,0,0,.35)'; x.shadowBlur = 8;
  x.fillText(glyph, 128, small ? 138 : 132);
  const tex = new THREE.CanvasTexture(c);
  tex.anisotropy = 4;
  return tex;
}

const SYMBOLE = {
  start: { g: 'START', kolor: '#20303f', small: true },
  meta: { g: 'META', kolor: '#20303f', small: true },
  pytanie: { g: '?', kolor: '#ffffff' },
  wydarzenie: { g: '!', kolor: '#ffffff' },
  wyzwanie: { g: '★', kolor: '#ffffff' },
  zeton: { g: '◆', kolor: '#fff3bf' },
};

function budujKrzywa() {
  const zRows = [-15, -7.5, 0, 7.5, 15], W = 19;
  const pary = [
    [-W, zRows[0]], [W, zRows[0]], [W, zRows[1]], [-W, zRows[1]],
    [-W, zRows[2]], [W, zRows[2]], [W, zRows[3]], [-W, zRows[3]],
    [-W, zRows[4]], [W, zRows[4]],
  ];
  const pts = pary.map((p, i) => new THREE.Vector3(p[0], (i / (pary.length - 1)) * 3, p[1]));
  return new THREE.CatmullRomCurve3(pts, false, 'catmullrom', 0.5);
}

function budujScene() {
  const canvas = $('#scena');
  renderer = new THREE.WebGLRenderer({ canvas, antialias: true });
  renderer.setPixelRatio(Math.min(2, window.devicePixelRatio || 1));
  renderer.setSize(window.innerWidth, window.innerHeight);
  renderer.shadowMap.enabled = true;
  renderer.shadowMap.type = THREE.PCFSoftShadowMap;

  scene = new THREE.Scene();
  scene.fog = new THREE.Fog(0x0b1026, 60, 130);

  camera = new THREE.PerspectiveCamera(52, window.innerWidth / window.innerHeight, 0.1, 400);

  // światła
  scene.add(new THREE.HemisphereLight(0xbcd0ff, 0x20132e, 0.9));
  const slonce = new THREE.DirectionalLight(0xfff2d6, 1.15);
  slonce.position.set(24, 40, 18);
  slonce.castShadow = true;
  slonce.shadow.mapSize.set(2048, 2048);
  const s = slonce.shadow.camera;
  s.left = -34; s.right = 34; s.top = 34; s.bottom = -34; s.near = 1; s.far = 120;
  scene.add(slonce);

  // gwiazdy (podróż w czasie)
  const gN = 900, gpos = new Float32Array(gN * 3);
  for (let i = 0; i < gN; i++) {
    const r = 90 + Math.random() * 90, th = Math.random() * Math.PI * 2, ph = Math.acos(2 * Math.random() - 1);
    gpos[i * 3] = r * Math.sin(ph) * Math.cos(th);
    gpos[i * 3 + 1] = Math.abs(r * Math.cos(ph)) * 0.6 + 6;
    gpos[i * 3 + 2] = r * Math.sin(ph) * Math.sin(th);
  }
  const gGeo = new THREE.BufferGeometry();
  gGeo.setAttribute('position', new THREE.Float32BufferAttribute(gpos, 3));
  starGroup = new THREE.Points(gGeo, new THREE.PointsMaterial({ color: 0xdfe7ff, size: 0.7, sizeAttenuation: true, transparent: true, opacity: 0.9 }));
  scene.add(starGroup);

  // krzywa i pozycje pól
  const curve = budujKrzywa();
  for (let i = 0; i <= OSTATNIE; i++) {
    const u = i / OSTATNIE;
    const p = curve.getPointAt(u);
    const tan = curve.getTangentAt(u).normalize();
    const perp = new THREE.Vector3().crossVectors(tan, new THREE.Vector3(0, 1, 0)).normalize();
    TILE_POS.push(p); TILE_PERP.push(perp);
    TILE_YAW.push(Math.atan2(tan.x, tan.z));
  }
  BOARD_CENTER = new THREE.Vector3();
  TILE_POS.forEach((p) => BOARD_CENTER.add(p));
  BOARD_CENTER.multiplyScalar(1 / TILE_POS.length);
  BOARD_R = 0;
  TILE_POS.forEach((p) => { BOARD_R = Math.max(BOARD_R, p.distanceTo(BOARD_CENTER)); });

  // podłoże
  const grunt = new THREE.Mesh(
    new THREE.CircleGeometry(BOARD_R + 14, 64),
    new THREE.MeshStandardMaterial({ color: 0x131a33, roughness: 1 })
  );
  grunt.rotation.x = -Math.PI / 2; grunt.position.y = -1.6; grunt.receiveShadow = true;
  scene.add(grunt);

  // pola + filary + dekoracje
  const regionStart = {};
  for (let i = 0; i <= OSTATNIE; i++) {
    const tile = PLANSZA[i], reg = REGIONY[tile.region];
    if (regionStart[tile.region] === undefined) regionStart[tile.region] = i;
    const sym = SYMBOLE[tile.typ];
    const topTex = texturaPola(reg.hex, sym.g, sym.kolor, sym.small);
    const sideMat = new THREE.MeshStandardMaterial({ color: shade(reg.hex, -38), roughness: 0.85 });
    const topMat = new THREE.MeshStandardMaterial({ map: topTex, roughness: 0.55, emissive: new THREE.Color(reg.hex).multiplyScalar(tile.typ === 'zeton' ? 0.25 : 0.06) });
    const box = new THREE.Mesh(new THREE.BoxGeometry(TILE_W, TILE_H, TILE_W),
      [sideMat, sideMat, topMat, sideMat, sideMat, sideMat]);
    box.position.copy(TILE_POS[i]); box.receiveShadow = true; box.castShadow = true;
    scene.add(box);

    // filar podtrzymujący „tor czasu"
    const h = TILE_POS[i].y + 1.6;
    const filar = new THREE.Mesh(new THREE.CylinderGeometry(0.28, 0.34, h, 12),
      new THREE.MeshStandardMaterial({ color: shade(reg.hex, -55), roughness: 0.9 }));
    filar.position.set(TILE_POS[i].x, TILE_POS[i].y - TILE_H / 2 - h / 2, TILE_POS[i].z);
    filar.castShadow = true; scene.add(filar);

    if (tile.typ === 'zeton') dodajZeton(i, reg);
  }

  // punkty orientacyjne krain (obok środkowego pola każdej krainy)
  for (let r = 0; r < 6; r++) {
    const idx = Math.min(regionStart[r] + 2, OSTATNIE);
    const el = budujElement(REGIONY[r].id);
    const p = TILE_POS[idx], perp = TILE_PERP[idx];
    el.position.set(p.x - perp.x * 4.8, -0.6, p.z - perp.z * 4.8);
    scene.add(el);
  }

  // kostka
  DIE = budujKostke(); DIE.visible = false; scene.add(DIE);

  ustawKamere();
  wireOrbit();
  window.addEventListener('resize', onResize);
  requestAnimationFrame(petla);
}

function dodajZeton(i, reg) {
  const grp = new THREE.Group();
  const m = new THREE.MeshStandardMaterial({ color: 0xffd43b, emissive: 0xffa800, emissiveIntensity: 0.6, metalness: 0.7, roughness: 0.25 });
  const coin = new THREE.Mesh(new THREE.CylinderGeometry(0.7, 0.7, 0.16, 24), m);
  coin.rotation.x = Math.PI / 2; grp.add(coin);
  const gwiazdka = new THREE.Mesh(new THREE.TorusGeometry(0.42, 0.08, 8, 5), m);
  gwiazdka.position.z = 0.1; grp.add(gwiazdka);
  grp.position.set(TILE_POS[i].x, TILE_POS[i].y + 2.2, TILE_POS[i].z);
  grp.userData.baseY = grp.position.y;
  scene.add(grp); TOKENY.push(grp);
}

// ---- proste elementy krajobrazu z brył ----
const mat = (c, opt = {}) => new THREE.MeshStandardMaterial(Object.assign({ color: c, roughness: 0.8 }, opt));
function mesh(geo, m, x = 0, y = 0, z = 0) { const o = new THREE.Mesh(geo, m); o.position.set(x, y, z); o.castShadow = true; return o; }

function budujElement(id) {
  const g = new THREE.Group();
  if (id === 'legendy') {
    for (const dx of [-1.4, 0.2, 1.6]) {
      g.add(mesh(new THREE.CylinderGeometry(0.18, 0.22, 1.1, 8), mat(0x6b4423), dx, 0.55, 0));
      g.add(mesh(new THREE.ConeGeometry(0.9, 1.8, 10), mat(0x2f9e44), dx, 1.9, 0));
    }
    g.add(mesh(new THREE.ConeGeometry(0.5, 1.1, 6), mat(0xc92a2a), 0.6, 0.6, 1.4)); // smoczy pyszczek
  } else if (id === 'mieszko') {
    g.add(mesh(new THREE.BoxGeometry(1.8, 2, 2.6), mat(0xe9ecef), 0, 1, 0));
    g.add(mesh(new THREE.ConeGeometry(1.4, 1.3, 4), mat(0x862e9c), 0, 2.65, 0));
    g.add(mesh(new THREE.BoxGeometry(0.9, 2.4, 0.9), mat(0xe9ecef), 0, 1.2, 1.5));
    g.add(mesh(new THREE.ConeGeometry(0.75, 1, 4), mat(0x862e9c), 0, 2.9, 1.5));
    g.add(mesh(new THREE.BoxGeometry(0.14, 0.8, 0.14), mat(0xffd43b), 0, 3.7, 1.5));
    g.add(mesh(new THREE.BoxGeometry(0.5, 0.14, 0.14), mat(0xffd43b), 0, 3.6, 1.5));
  } else if (id === 'kazimierz') {
    g.add(mesh(new THREE.BoxGeometry(3, 1.8, 2.4), mat(0xadb5bd), 0, 0.9, 0));
    for (const [dx, dz] of [[-1.4, -1], [1.4, -1], [-1.4, 1], [1.4, 1]]) {
      g.add(mesh(new THREE.CylinderGeometry(0.5, 0.55, 2.8, 12), mat(0xced4da), dx, 1.4, dz));
      g.add(mesh(new THREE.ConeGeometry(0.65, 0.9, 12), mat(0xc92a2a), dx, 3.25, dz));
    }
    for (let k = -1; k <= 1; k++) g.add(mesh(new THREE.BoxGeometry(0.4, 0.4, 0.4), mat(0xadb5bd), k * 0.9, 1.95, 1.2));
  } else if (id === 'jadwiga') {
    g.add(mesh(new THREE.CylinderGeometry(1.1, 1.3, 0.7, 20), mat(0xffd43b, { metalness: 0.6, roughness: 0.3, emissive: 0x8a6d00, emissiveIntensity: 0.3 }), 0, 1.4, 0));
    for (let k = 0; k < 6; k++) {
      const a = (k / 6) * Math.PI * 2;
      g.add(mesh(new THREE.ConeGeometry(0.22, 0.9, 8), mat(0xffe066, { metalness: 0.6, roughness: 0.3 }), Math.cos(a) * 1.15, 2.1, Math.sin(a) * 1.15));
    }
    g.add(mesh(new THREE.CylinderGeometry(1.35, 1.35, 1.6, 20), mat(0x862e9c), 0, 0.8, 0));
  } else if (id === 'grunwald') {
    const stal = mat(0xdee2e6, { metalness: 0.7, roughness: 0.3 });
    const s1 = mesh(new THREE.BoxGeometry(0.18, 3.4, 0.18), stal, 0, 1.7, 0); s1.rotation.z = 0.5; g.add(s1);
    const s2 = mesh(new THREE.BoxGeometry(0.18, 3.4, 0.18), stal, 0, 1.7, 0.2); s2.rotation.z = -0.5; g.add(s2);
    const tarcza = mesh(new THREE.BoxGeometry(1.4, 1.7, 0.25), mat(0xc92a2a), 0, 1.3, -0.3);
    g.add(tarcza);
    g.add(mesh(new THREE.BoxGeometry(0.9, 0.22, 0.28), mat(0xffd43b), 0, 1.5, -0.18));
    g.add(mesh(new THREE.BoxGeometry(0.22, 0.9, 0.28), mat(0xffd43b), 0, 1.5, -0.18));
  } else if (id === 'kopernik') {
    g.add(mesh(new THREE.CylinderGeometry(1, 1.2, 3, 16), mat(0x495478), 0, 1.5, 0));
    g.add(mesh(new THREE.SphereGeometry(1.1, 20, 14, 0, Math.PI * 2, 0, Math.PI / 2), mat(0x9aa7d6, { metalness: 0.4, roughness: 0.3 }), 0, 3, 0));
    const luneta = mesh(new THREE.CylinderGeometry(0.16, 0.22, 1.8, 10), mat(0x212529), 0.3, 3.4, 0);
    luneta.rotation.z = -0.7; luneta.rotation.x = 0.3; g.add(luneta);
    const ring = mesh(new THREE.TorusGeometry(0.6, 0.06, 8, 24), mat(0xffd43b, { emissive: 0x8a6d00, emissiveIntensity: 0.4 }), 0, 4.2, 0);
    ring.rotation.x = 1.1; g.add(ring);
  }
  g.traverse((o) => { if (o.isMesh) o.castShadow = true; });
  return g;
}

// ---- kostka ----
function pipTex(n) {
  const c = document.createElement('canvas'); c.width = c.height = 128;
  const x = c.getContext('2d');
  x.fillStyle = '#fbfbfd'; x.beginPath(); x.roundRect(4, 4, 120, 120, 22); x.fill();
  x.strokeStyle = '#dfe3ee'; x.lineWidth = 4; x.stroke();
  x.fillStyle = '#20304a';
  const P = { c: [64, 64], tl: [36, 36], tr: [92, 36], bl: [36, 92], br: [92, 92], ml: [36, 64], mr: [92, 64] };
  const map = { 1: ['c'], 2: ['tl', 'br'], 3: ['tl', 'c', 'br'], 4: ['tl', 'tr', 'bl', 'br'], 5: ['tl', 'tr', 'c', 'bl', 'br'], 6: ['tl', 'tr', 'ml', 'mr', 'bl', 'br'] };
  for (const k of map[n]) { const [px, py] = P[k]; x.beginPath(); x.arc(px, py, 12, 0, Math.PI * 2); x.fill(); }
  return new THREE.CanvasTexture(c);
}
// kolejność ścian BoxGeometry: +X,-X,+Y,-Y,+Z,-Z  →  wartości 3,4,1,6,2,5
function budujKostke() {
  const vals = [3, 4, 1, 6, 2, 5];
  const mats = vals.map((v) => new THREE.MeshStandardMaterial({ map: pipTex(v), roughness: 0.4, metalness: 0.05 }));
  const d = new THREE.Mesh(new THREE.BoxGeometry(1.5, 1.5, 1.5), mats);
  d.castShadow = true;
  return d;
}
const DIE_EULER = { 1: [0, 0, 0], 6: [Math.PI, 0, 0], 2: [-Math.PI / 2, 0, 0], 5: [Math.PI / 2, 0, 0], 3: [0, 0, Math.PI / 2], 4: [0, 0, -Math.PI / 2] };

async function rzucKostka() {
  const start = pozPionka(current(), current().poz).clone(); start.y += 5.2;
  DIE.position.copy(start); DIE.visible = true; DIE.scale.setScalar(0.01);
  await anim(0.14, (e) => DIE.scale.setScalar(e));
  const sx = 5 + Math.random() * 4, sy = 6 + Math.random() * 4, sz = 4 + Math.random() * 4;
  await anim(0.85, (e) => {
    DIE.rotation.set(sx * e * 6, sy * e * 6, sz * e * 6);
    DIE.position.y = start.y + Math.sin(e * Math.PI * 3) * 0.7;
  }, (t) => t);
  const val = 1 + Math.floor(Math.random() * 6);
  const q0 = DIE.quaternion.clone();
  const qT = new THREE.Quaternion().setFromEuler(new THREE.Euler(...DIE_EULER[val]));
  await anim(0.55, (e) => DIE.quaternion.slerpQuaternions(q0, qT, e));
  await pauza(500);
  await anim(0.22, (e) => DIE.scale.setScalar(1 - e));
  DIE.visible = false; DIE.scale.setScalar(1);
  return val;
}

// ---- pionki (wehikuły) ----
function budujPionek(kolor) {
  const g = new THREE.Group();
  const metal = mat(0x2b2f45, { metalness: 0.6, roughness: 0.35 });
  g.add(mesh(new THREE.BoxGeometry(1.3, 0.5, 1.7), metal, 0, 0.45, 0));
  const pas = mesh(new THREE.BoxGeometry(1.36, 0.16, 1.76), new THREE.MeshStandardMaterial({ color: kolor, emissive: kolor, emissiveIntensity: 0.3 }), 0, 0.32, 0);
  g.add(pas);
  const kabina = mesh(new THREE.SphereGeometry(0.46, 20, 14, 0, Math.PI * 2, 0, Math.PI / 2),
    new THREE.MeshStandardMaterial({ color: 0x9ad0ff, transparent: true, opacity: 0.5, roughness: 0.1 }), 0, 0.68, -0.05);
  g.add(kabina);
  const rdzen = mesh(new THREE.SphereGeometry(0.24, 16, 16), new THREE.MeshStandardMaterial({ color: kolor, emissive: kolor, emissiveIntensity: 1.1 }), 0, 0.72, -0.05);
  g.add(rdzen);
  const ring = mesh(new THREE.TorusGeometry(0.5, 0.09, 10, 22), new THREE.MeshStandardMaterial({ color: kolor, emissive: kolor, emissiveIntensity: 0.7, metalness: 0.4 }), 0, 0.5, 0.85);
  ring.rotation.x = Math.PI / 2; g.add(ring);
  g.traverse((o) => { if (o.isMesh) o.castShadow = true; });
  g.userData = { rdzen, ring };
  return g;
}

function pozPionka(d, i) {
  const base = TILE_POS[i].clone();
  base.y += TILE_H / 2 + 0.05;
  const off = (d.idx - (stan.druzyny.length - 1) / 2) * 0.95;
  base.addScaledVector(TILE_PERP[i], off);
  return base;
}

// ---- kamera / orbita ----
let azym = 0.65, polar = 0.92, dist;
function ustawKamere() { dist = BOARD_R * 2.05; aktualizujKamere(); }
function aktualizujKamere() {
  polar = clamp(polar, 0.32, 1.32);
  dist = clamp(dist, BOARD_R * 1.15, BOARD_R * 3.2);
  camera.position.set(
    BOARD_CENTER.x + dist * Math.sin(polar) * Math.sin(azym),
    BOARD_CENTER.y + dist * Math.cos(polar),
    BOARD_CENTER.z + dist * Math.sin(polar) * Math.cos(azym)
  );
  camera.lookAt(BOARD_CENTER);
}
function wireOrbit() {
  const el = renderer.domElement;
  const ptr = new Map();
  let lastPinch = 0;
  el.addEventListener('pointerdown', (e) => { ptr.set(e.pointerId, e); el.setPointerCapture(e.pointerId); });
  el.addEventListener('pointerup', (e) => { ptr.delete(e.pointerId); lastPinch = 0; });
  el.addEventListener('pointercancel', (e) => { ptr.delete(e.pointerId); lastPinch = 0; });
  el.addEventListener('pointermove', (e) => {
    if (!ptr.has(e.pointerId)) return;
    const prev = ptr.get(e.pointerId); ptr.set(e.pointerId, e);
    if (ptr.size === 1) {
      azym -= (e.clientX - prev.clientX) * 0.006;
      polar -= (e.clientY - prev.clientY) * 0.006;
      aktualizujKamere();
    } else if (ptr.size === 2) {
      const a = [...ptr.values()];
      const d = Math.hypot(a[0].clientX - a[1].clientX, a[0].clientY - a[1].clientY);
      if (lastPinch) { dist *= 1 - (d - lastPinch) * 0.004; aktualizujKamere(); }
      lastPinch = d;
    }
  });
  el.addEventListener('wheel', (e) => { dist *= 1 + Math.sign(e.deltaY) * 0.08; aktualizujKamere(); e.preventDefault(); }, { passive: false });
}
function onResize() {
  camera.aspect = window.innerWidth / window.innerHeight; camera.updateProjectionMatrix();
  renderer.setSize(window.innerWidth, window.innerHeight);
}

// ---- pętla renderowania ----
let ostatni = performance.now();
function petla(now) {
  const dt = Math.min(0.05, (now - ostatni) / 1000); ostatni = now;
  updateTweeny(dt);
  if (starGroup) starGroup.rotation.y += dt * 0.01;
  for (const t of TOKENY) { t.rotation.z += dt * 1.4; t.position.y = t.userData.baseY + Math.sin(now / 500 + t.position.x) * 0.18; }
  const akt = stan.trwa ? null : current();
  PIONKI.forEach((g, i) => {
    g.userData.ring.rotation.z += dt * (1.5 + i * 0.2);
    const aktywny = akt && stan.druzyny[i] === akt;
    g.userData.rdzen.material.emissiveIntensity = aktywny ? 0.8 + Math.sin(now / 200) * 0.5 : 1.0;
    g.userData.ring.scale.setScalar(aktywny ? 1 + Math.sin(now / 220) * 0.08 : 1);
  });
  renderer.render(scene, camera);
  requestAnimationFrame(petla);
}

// ==================================================================
//  STAN GRY
// ==================================================================
const stan = { druzyny: [], aktualna: 0, trwa: false, koniec: false, blokada: false };
const current = () => stan.druzyny[stan.aktualna];

// unikamy powtarzania tych samych pytań zbyt szybko
const historia = { pytania: {}, trudne: {}, wyd: [], wyz: [] };
function bezPowtorzen(arr, klucz, magazyn) {
  const uz = magazyn[klucz] || (magazyn[klucz] = []);
  let dost = arr.filter((_, i) => !uz.includes(i));
  if (!dost.length) { magazyn[klucz] = []; dost = arr.slice(); }
  const i = arr.indexOf(losuj(dost));
  (magazyn[klucz] || (magazyn[klucz] = [])).push(i);
  return arr[i];
}

// ==================================================================
//  INTERFEJS — karty
// ==================================================================
const ZASLONA = $('#zaslona'), KARTA = $('#karta');
function pokazZaslone() { ZASLONA.classList.add('pokaz'); }
function ukryjZaslone() { ZASLONA.classList.remove('pokaz'); }
function komunikat(html) { $('#komunikat').innerHTML = html; }

function kartaPytanie(pyt, reg, zeton) {
  return new Promise((res) => {
    const L = ['A', 'B', 'C', 'D'];
    // tasujemy kolejność odpowiedzi, żeby poprawna nie była zawsze pierwsza
    const kol = pyt.opcje.map((_, i) => i);
    for (let i = kol.length - 1; i > 0; i--) { const j = Math.floor(Math.random() * (i + 1)); [kol[i], kol[j]] = [kol[j], kol[i]]; }
    const poprawnaPoz = kol.indexOf(pyt.poprawna);
    const opcje = kol.map((oi, pos) => `<button class="opcja" data-i="${pos}"><span class="litera">${L[pos]}</span><span>${pyt.opcje[oi]}</span></button>`).join('');
    const naglowek = zeton
      ? `<div class="karta-naglowek" style="background:linear-gradient(135deg,#f59f00,#e8590c)"><span class="em">🏅</span> Pole żetonu czasu</div>`
      : `<div class="karta-naglowek" style="background:linear-gradient(135deg,${reg.hex},${shade(reg.hex, -28)})"><span class="em">❓</span> Karta pytania</div>`;
    KARTA.innerHTML = naglowek + `<div class="karta-tresc">
        <div class="karta-region">${reg.ikona} ${reg.nazwa}</div>
        <div class="karta-pytanie">${pyt.q}</div>
        <div class="opcje">${opcje}</div>
        <div class="wskazowka"></div>
        <div class="karta-przyciski" style="margin-top:16px; display:none"><button class="btn btn-dalej">Dalej ▸</button></div>
      </div>`;
    pokazZaslone();
    let wybrano = false;
    KARTA.querySelectorAll('.opcja').forEach((b) => b.onclick = () => {
      if (wybrano) return; wybrano = true;
      const i = +b.dataset.i, ok = i === poprawnaPoz;
      KARTA.querySelectorAll('.opcja').forEach((x) => {
        x.disabled = true; const xi = +x.dataset.i;
        if (xi === poprawnaPoz) x.classList.add('dobra');
        if (xi === i && !ok) x.classList.add('zla');
      });
      const w = KARTA.querySelector('.wskazowka');
      w.innerHTML = (ok ? '✅ <b>Świetnie, dobrze!</b> ' : '❌ <b>Niestety, to nie ta odpowiedź.</b> ') + (pyt.wskazowka || '');
      w.classList.add('pokaz');
      const pk = KARTA.querySelector('.karta-przyciski'); pk.style.display = 'flex';
      pk.querySelector('.btn-dalej').onclick = () => { ukryjZaslone(); res(ok); };
    });
  });
}

function kartaWydarzenie(wyd) {
  return new Promise((res) => {
    const znak = wyd.ruch === 'czekaj' ? '⏸️' : (wyd.ruch > 0 ? '⏩' : '⏪');
    KARTA.innerHTML = `<div class="karta-naglowek" style="background:linear-gradient(135deg,#4dabf7,#1971c2)"><span class="em">📜</span> Karta wydarzenia</div>
      <div class="karta-tresc"><div class="wydarzenie-tekst"><div style="font-size:40px">${znak}</div>${wyd.t}</div>
      <div class="karta-przyciski"><button class="btn btn-dalej">Dalej ▸</button></div></div>`;
    pokazZaslone();
    KARTA.querySelector('.btn-dalej').onclick = () => { ukryjZaslone(); res(); };
  });
}

function kartaWyzwanie(txt) {
  return new Promise((res) => {
    KARTA.innerHTML = `<div class="karta-naglowek" style="background:linear-gradient(135deg,#845ef7,#5f3dc4)"><span class="em">🎭</span> Karta wyzwania</div>
      <div class="karta-tresc"><div class="wyzwanie-tekst">${txt}</div>
      <div class="wyzwanie-podpis">Nauczyciel ocenia, czy drużyna wykonała zadanie.<br>Udane wyzwanie = ruch o 2 pola do przodu.</div>
      <div class="karta-przyciski"><button class="btn btn-nie">Nie udało się</button><button class="btn btn-ok">Udało się! ✓</button></div></div>`;
    pokazZaslone();
    KARTA.querySelector('.btn-ok').onclick = () => { ukryjZaslone(); res(true); };
    KARTA.querySelector('.btn-nie').onclick = () => { ukryjZaslone(); res(false); };
  });
}

function pokazZasady() {
  KARTA.innerHTML = `<div class="karta-naglowek" style="background:linear-gradient(135deg,#22b8cf,#1098ad)"><span class="em">📖</span> Zasady gry</div>
    <div class="karta-tresc" style="font-size:14px;line-height:1.55">
      <p><b>Cel:</b> dotrzeć wehikułem do <b>mety</b> (teraźniejszości), zbierając po drodze <b>3 żetony czasu</b> 🏅.</p>
      <p style="margin-top:10px"><b>Kolej drużyny:</b> rzucacie kostką 🎲 i przesuwacie wehikuł. Na polu losujecie kartę:</p>
      <ul style="margin:8px 0 8px 20px">
        <li><b>? Pytanie</b> — dobra odpowiedź to dodatkowy ruch o 2 pola.</li>
        <li><b>! Wydarzenie</b> — coś z historii przesuwa wasz wehikuł.</li>
        <li><b>★ Wyzwanie</b> — zadanie dla całej drużyny (ocenia nauczyciel).</li>
        <li><b>◆ Żeton</b> — trudniejsze pytanie; dobra odpowiedź daje żeton czasu.</li>
      </ul>
      <p>Bez 3 żetonów wehikuł nie wyląduje na mecie — cofnie się o 3 pola!</p>
      <div class="karta-przyciski" style="margin-top:16px"><button class="btn btn-dalej">Gramy dalej ▸</button></div>
    </div>`;
  pokazZaslone();
  KARTA.querySelector('.btn-dalej').onclick = () => ukryjZaslone();
}

// ==================================================================
//  RUCH I ROZGRYWKA
// ==================================================================
function hop(d, from, to) {
  const a = pozPionka(d, from), b = pozPionka(d, to);
  d.mesh.rotation.y = TILE_YAW[to];
  return anim(0.36, (e) => {
    d.mesh.position.lerpVectors(a, b, e);
    d.mesh.position.y += Math.sin(e * Math.PI) * 1.4;
  });
}
async function animPionek(d, cel) {
  const krok = cel > d.poz ? 1 : -1;
  while (d.poz !== cel) { const n = d.poz + krok; await hop(d, d.poz, n); d.poz = n; }
}

async function ruszDruzyne(d, kroki, opts = {}) {
  const cel = clamp(d.poz + kroki, 0, OSTATNIE);
  if (cel !== d.poz) await animPionek(d, cel);
  if (cel === OSTATNIE) { await sprawdzMeta(d); return; }
  if (opts.karta) await obsluzPole(d, PLANSZA[cel]);
}

async function obsluzPole(d, tile) {
  const reg = REGIONY[tile.region];
  if (tile.typ === 'pytanie') {
    const pyt = bezPowtorzen(T.PYTANIA[reg.id], reg.id, historia.pytania);
    const ok = await kartaPytanie(pyt, reg, false);
    if (ok) { komunikat(`<b>${d.nazwa}</b>: dobra odpowiedź! Dodatkowy ruch o 2 pola. 🎉`); await pauza(500); await ruszDruzyne(d, 2, {}); }
    else komunikat(`<b>${d.nazwa}</b>: tym razem bez dodatkowego ruchu.`);
  } else if (tile.typ === 'wydarzenie') {
    const wyd = losuj(T.WYDARZENIA);
    await kartaWydarzenie(wyd);
    if (wyd.ruch === 'czekaj') { d.czekaj = 1; komunikat(`<b>${d.nazwa}</b> traci następną kolejkę.`); }
    else { await pauza(300); await ruszDruzyne(d, wyd.ruch, {}); }
  } else if (tile.typ === 'wyzwanie') {
    const txt = losuj(T.WYZWANIA);
    const ok = await kartaWyzwanie(txt);
    if (ok) { komunikat(`<b>${d.nazwa}</b>: wyzwanie wykonane! Ruch o 2 pola. 🎉`); await pauza(500); await ruszDruzyne(d, 2, {}); }
    else komunikat(`<b>${d.nazwa}</b>: wyzwanie niezaliczone — bez ruchu.`);
  } else if (tile.typ === 'zeton') {
    const pyt = bezPowtorzen(T.PYTANIA_TRUDNE[reg.id], reg.id, historia.trudne);
    const ok = await kartaPytanie(pyt, reg, true);
    if (ok) { d.zetony++; odswiezHud(); komunikat(`<b>${d.nazwa}</b> zdobywa ŻETON CZASU 🏅 (${d.zetony}/3)!`); }
    else komunikat(`<b>${d.nazwa}</b>: żeton czasu tym razem nie zdobyty.`);
  }
}

async function sprawdzMeta(d) {
  if (d.zetony >= 3) { zwyciestwo(d); return; }
  komunikat(`<b>${d.nazwa}</b> dotarli do mety, ale mają tylko ${d.zetony}/3 żetonów. Wehikuł cofa się o 3 pola!`);
  await pauza(1400);
  await ruszDruzyne(d, -3, {});
}

async function onKostka() {
  if (stan.blokada || stan.koniec) return;
  stan.blokada = true; stan.trwa = true; enableKostka(false);
  const d = current();
  const oczka = await rzucKostka();
  komunikat(`<b>${d.nazwa}</b> wyrzuca <b>${oczka}</b>! 🎲`);
  await pauza(300);
  await ruszDruzyne(d, oczka, { karta: true });
  stan.trwa = false; stan.blokada = false;
  if (!stan.koniec) { await pauza(600); nastepnaTura(); }
}

function nastepnaTura() {
  stan.aktualna = (stan.aktualna + 1) % stan.druzyny.length;
  pokazTure();
}
function pokazTure() {
  if (stan.koniec) return;
  const d = current(); podswietlAktywna();
  if (d.czekaj > 0) {
    d.czekaj--;
    komunikat(`⏳ <b>${d.nazwa}</b>: wehikuł w naprawie — tracicie tę kolejkę.`);
    enableKostka(false);
    setTimeout(() => nastepnaTura(), 1700);
    return;
  }
  komunikat(`Kolej: <b>${d.nazwa}</b>. Rzućcie kostką!`);
  enableKostka(true);
}

function zwyciestwo(d) {
  stan.koniec = true; enableKostka(false);
  $('#tekst-zwyciezca').innerHTML = `<span style="color:${d.hex}">${d.nazwa}</span>`;
  $('#tekst-koniec').textContent = `Dotarliście do teraźniejszości z ${d.zetony} żetonami czasu. Gratulacje, znawcy historii Polski!`;
  $('#ekran-koniec').classList.add('pokaz');
}

// ==================================================================
//  HUD / EKRAN STARTU
// ==================================================================
function enableKostka(on) { const b = $('#btn-kostka'); b.disabled = !on; }
function budujHud() {
  const box = $('#druzyny-hud'); box.innerHTML = '';
  stan.druzyny.forEach((d) => {
    const el = document.createElement('div');
    el.className = 'dr-znacznik'; el.dataset.idx = d.idx;
    el.innerHTML = `<span class="dr-kropka" style="color:${d.hex};background:${d.hex}"></span>${d.nazwa}<span class="dr-zetony" id="zet-${d.idx}">🏅 0/3</span>`;
    box.appendChild(el);
  });
}
function odswiezHud() { stan.druzyny.forEach((d) => { const z = $('#zet-' + d.idx); if (z) z.textContent = `🏅 ${d.zetony}/3`; }); }
function podswietlAktywna() {
  document.querySelectorAll('.dr-znacznik').forEach((el) => el.classList.toggle('aktywna', +el.dataset.idx === stan.aktualna));
}

let wybranaLiczba = 3;
function budujWiersze() {
  const box = $('#wiersze-druzyn'); box.innerHTML = '<label>Nazwy drużyn (możecie zmienić):</label>';
  for (let i = 0; i < wybranaLiczba; i++) {
    const k = KOLORY_DRUZYN[i];
    const w = document.createElement('div');
    w.className = 'wiersz-druzyny';
    w.innerHTML = `<span class="kropka" style="color:${k.hex};background:${k.hex}"></span><input type="text" maxlength="22" value="${k.nazwa}" data-i="${i}">`;
    box.appendChild(w);
  }
}

function startGry() {
  const nazwy = [...document.querySelectorAll('#wiersze-druzyn input')].map((i) => i.value.trim() || KOLORY_DRUZYN[+i.dataset.i].nazwa);
  stan.druzyny = nazwy.map((n, i) => {
    const k = KOLORY_DRUZYN[i];
    const meshP = budujPionek(k.c);
    PIONKI.push(meshP); scene.add(meshP);
    return { idx: i, nazwa: n, hex: k.hex, poz: 0, zetony: 0, czekaj: 0, mesh: meshP };
  });
  // ustawiamy pionki na starcie dopiero, gdy znamy liczbę drużyn (odstępy)
  stan.druzyny.forEach((d) => { d.mesh.position.copy(pozPionka(d, 0)); d.mesh.rotation.y = TILE_YAW[0]; });
  stan.aktualna = 0; stan.koniec = false;
  $('#ekran-start').style.display = 'none';
  $('#hud').style.display = 'flex';
  $('#panel-dolny').style.display = 'flex';
  budujHud(); odswiezHud();
  pokazTure();
}

// ==================================================================
//  START
// ==================================================================
function init() {
  budujScene();
  // wybór liczby drużyn
  document.querySelectorAll('#wybor-liczby .chip').forEach((c) => c.onclick = () => {
    document.querySelectorAll('#wybor-liczby .chip').forEach((x) => x.classList.remove('wybrany'));
    c.classList.add('wybrany'); wybranaLiczba = +c.dataset.n; budujWiersze();
  });
  budujWiersze();
  $('#btn-start').onclick = startGry;
  $('#btn-kostka').onclick = onKostka;
  $('#btn-pomoc').onclick = pokazZasady;
  $('#btn-restart').onclick = () => location.reload();
  $('#btn-jeszcze-raz').onclick = () => location.reload();
}

if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', init);
else init();

})();
