// Galeria figurek z bliska (tylko do oceny modeli): te same barwienie, skala i obrót co w grze.
// /scripts/gallery/index.html?set=gods|guardians|all&yaw=0.55
import {
  ACESFilmicToneMapping, Box3, CircleGeometry, Color, DirectionalLight, Group, HemisphereLight, Mesh, MeshStandardMaterial,
  PCFShadowMap, PerspectiveCamera, PMREMGenerator, Scene, SRGBColorSpace, Vector3, WebGLRenderer,
} from 'three';
import { DRACOLoader } from 'three/examples/jsm/loaders/DRACOLoader.js';
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js';
import { MeshoptDecoder } from 'three/examples/jsm/libs/meshopt_decoder.module.js';
import { RoomEnvironment } from 'three/examples/jsm/environments/RoomEnvironment.js';
import { FIGURE_HEIGHT, fitScale, MODEL_YAW, tintMaterial } from '/src/ui3d/modelFiles.ts';

const GODS = [
  ['god-anubis.glb', 'Anubis', '#4b4b5a'], ['god-ra.glb', 'Ra', '#e0782c'], ['god-amun.glb', 'Amun', '#3b6fd8'],
  ['god-isis.glb', 'Izyda', '#2fa58a'], ['god-osiris.glb', 'Ozyrys', '#8a4fc8'],
];
const GUARDIANS = [
  ['guardian-catMummy.glb', 'Kocia mumia', '#3b6fd8'], ['guardian-satet.glb', 'Satet', '#e0782c'], ['guardian-mummy.glb', 'Mumia', '#2fa58a'],
  ['guardian-apep.glb', 'Apep', '#8a4fc8'], ['guardian-giantScorpion.glb', 'Skorpion', '#e0782c'], ['guardian-androsphinx.glb', 'Androsfinks', '#3b6fd8'],
];
const q = new URLSearchParams(location.search);
const set = q.get('set') ?? 'all';
const yaw = Number(q.get('yaw') ?? MODEL_YAW);
const pick = q.get('pick')?.split(',');
const rows = (set === 'gods' ? [GODS] : set === 'guardians' ? [GUARDIANS] : [GODS, GUARDIANS])
  .map((row) => (pick ? row.filter(([f]) => pick.some((p) => f.includes(p))) : row))
  .filter((row) => row.length);

const renderer = new WebGLRenderer({ antialias: true, preserveDrawingBuffer: true });
renderer.setSize(innerWidth, innerHeight);
renderer.toneMapping = ACESFilmicToneMapping;
renderer.outputColorSpace = SRGBColorSpace;
renderer.shadowMap.enabled = true;
renderer.shadowMap.type = PCFShadowMap;
document.body.appendChild(renderer.domElement);
const scene = new Scene();
scene.background = new Color('#2a2019');
scene.environment = new PMREMGenerator(renderer).fromScene(new RoomEnvironment(), 0.04).texture;
scene.environmentIntensity = 0.45;
scene.add(new HemisphereLight('#a9c1ec', '#4a3322', 0.35));
const sun = new DirectionalLight('#ffc58a', 3.2);
sun.position.set(-6, 5, 6);
sun.castShadow = true;
sun.shadow.mapSize.set(2048, 2048);
Object.assign(sun.shadow.camera, { left: -8, right: 8, top: 8, bottom: -8 });
sun.shadow.radius = 4;
scene.add(sun);

const loader = new GLTFLoader().setDRACOLoader(new DRACOLoader().setDecoderPath('/draco/')).setMeshoptDecoder(MeshoptDecoder);
const SPACING = 2.1;
const labels = [];
await Promise.all(rows.flatMap((row, r) => row.map(async ([file, name, color], c) => {
  const gltf = await loader.loadAsync(`/models/${file}`);
  const model = gltf.scene;
  model.traverse((o) => {
    if (o.isMesh) {
      o.castShadow = o.receiveShadow = true;
      tintMaterial(o.material, color);
    }
  });
  const box = new Box3().setFromObject(model);
  const radius = Math.max(...[box.min.x, box.max.x].flatMap((x) => [box.min.z, box.max.z].map((z) => Math.hypot(x, z))));
  const k = fitScale({ height: box.max.y - box.min.y, radius }, file.startsWith('god') ? FIGURE_HEIGHT.god : FIGURE_HEIGHT.guardian);
  model.scale.setScalar(k);
  model.position.y = -box.min.y * k;
  const holder = new Group();
  holder.rotation.y = yaw;
  holder.add(model);
  holder.position.set((c - (row.length - 1) / 2) * SPACING, 0, r * SPACING * 1.05);
  const base = new Mesh(new CircleGeometry(0.95, 6).rotateX(-Math.PI / 2).rotateY(Math.PI / 6), new MeshStandardMaterial({ color: '#cdb27a', roughness: 0.9 }));
  base.receiveShadow = true;
  base.position.copy(holder.position).setY(-0.001);
  scene.add(holder, base);
  labels.push({ name, at: holder.position.clone().setY(-0.25) });
})));

const cols = Math.max(...rows.map((r) => r.length));
const camera = new PerspectiveCamera(30, innerWidth / innerHeight, 0.1, 100);
const width = cols * SPACING;
const depth = (rows.length - 1) * SPACING;
const dist = Math.max(width / (2 * Math.tan(((30 * Math.PI) / 180) * 0.5) * camera.aspect), 4) * 1.05;
const close = cols <= 3;
camera.position.set(0, close ? dist * 0.28 + 0.6 : dist * 0.42 + 0.4, depth / 2 + dist * (close ? 0.75 : 0.9));
camera.lookAt(0, close ? 0.6 : 0.45, depth / 2);
renderer.render(scene, camera);
for (const l of labels) {
  const v = l.at.clone().project(camera);
  const el = document.createElement('div');
  el.className = 'label';
  el.textContent = l.name;
  el.style.left = `${((v.x + 1) / 2) * innerWidth}px`;
  el.style.top = `${((1 - v.y) / 2) * innerHeight}px`;
  document.body.appendChild(el);
}
window.__ready = true;
