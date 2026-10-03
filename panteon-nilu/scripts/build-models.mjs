// Generuje przykładowe figurki GLB (własne, proceduralne „statuetki”) i manifest public/models/manifest.json.
// god.glb — kompresja meshopt (EXT_meshopt_compression), warrior.glb — Draco (KHR_draco_mesh_compression).
// Manifest powstaje z plików *.glb w katalogu — po dodaniu własnego modelu wystarczy uruchomić: npm run models
import { readdirSync, writeFileSync } from 'node:fs';
import { Document, NodeIO } from '@gltf-transform/core';
import { ALL_EXTENSIONS } from '@gltf-transform/extensions';
import { draco, meshopt, weld } from '@gltf-transform/functions';
import draco3d from 'draco3dgltf';
import { MeshoptDecoder, MeshoptEncoder } from 'meshoptimizer';
import {
  BoxGeometry, ConeGeometry, CylinderGeometry, LatheGeometry, SphereGeometry, TorusGeometry, Vector2,
} from 'three';
import { mergeGeometries } from 'three/examples/jsm/utils/BufferGeometryUtils.js';

const DIR = new URL('../public/models/', import.meta.url);
const only = process.argv[2] === '--manifest';

const lathe = (pts, seg = 28) => new LatheGeometry(pts.map(([r, y]) => new Vector2(r, y)), seg);
const at = (g, x, y, z) => g.translate(x, y, z);
const merge = (parts) => mergeGeometries(parts.map((p) => (p.index ? p.toNonIndexed() : p)), false);

/** Statuetka boga: szata, ramiona, głowa, wysokie nakrycie głowy i laska z pętlą. Kolor gracza: przepaska + korona. */
function god() {
  const stone = merge([
    lathe([[0, 0], [0.2, 0], [0.19, 0.05], [0.15, 0.35], [0.12, 0.55], [0.13, 0.62], [0.06, 0.66], [0, 0.66]]),
    at(new SphereGeometry(0.085, 18, 14), 0, 0.74, 0),
    at(new BoxGeometry(0.06, 0.24, 0.06).rotateZ(0.35), -0.16, 0.5, 0),
    at(new BoxGeometry(0.06, 0.24, 0.06).rotateZ(-0.6), 0.15, 0.52, 0.03),
    at(new CylinderGeometry(0.014, 0.014, 0.85, 8), 0.23, 0.43, 0.05),
    at(new TorusGeometry(0.05, 0.014, 8, 20), 0.23, 0.9, 0.05),
  ]);
  const team = merge([
    at(new CylinderGeometry(0.155, 0.16, 0.05, 24), 0, 0.4, 0),
    at(lathe([[0.075, 0], [0.09, 0.05], [0.07, 0.2], [0.03, 0.26], [0, 0.27]], 20), 0, 0.79, 0),
  ]);
  return { stone, team };
}

/** Statuetka wojownika: korpus, głowa, tarcza (kolor gracza) i włócznia. */
function warrior() {
  const stone = merge([
    lathe([[0, 0], [0.13, 0], [0.12, 0.05], [0.09, 0.28], [0.1, 0.33], [0.04, 0.36], [0, 0.36]]),
    at(new SphereGeometry(0.06, 16, 12), 0, 0.42, 0),
    at(new CylinderGeometry(0.01, 0.01, 0.6, 8), 0.12, 0.3, 0.02),
    at(new ConeGeometry(0.022, 0.07, 8), 0.12, 0.63, 0.02),
  ]);
  const team = merge([
    at(new CylinderGeometry(0.1, 0.1, 0.02, 24).rotateX(Math.PI / 2), -0.08, 0.22, 0.09),
    at(new CylinderGeometry(0.062, 0.062, 0.03, 16), 0, 0.455, 0),
  ]);
  return { stone, team };
}

function toDocument({ stone, team }) {
  const doc = new Document();
  const buffer = doc.createBuffer();
  const mesh = doc.createMesh('figurka');
  const mats = {
    stone: doc.createMaterial('stone').setBaseColorFactor([0.82, 0.78, 0.7, 1]).setRoughnessFactor(0.7).setMetallicFactor(0),
    team: doc.createMaterial('team').setBaseColorFactor([1, 1, 1, 1]).setRoughnessFactor(0.45).setMetallicFactor(0.05),
  };
  for (const [name, g] of Object.entries({ stone, team })) {
    g.computeVertexNormals();
    const prim = doc
      .createPrimitive()
      .setAttribute('POSITION', doc.createAccessor().setType('VEC3').setArray(g.getAttribute('position').array).setBuffer(buffer))
      .setAttribute('NORMAL', doc.createAccessor().setType('VEC3').setArray(g.getAttribute('normal').array).setBuffer(buffer))
      .setMaterial(mats[name]);
    mesh.addPrimitive(prim);
  }
  doc.createScene('scena').addChild(doc.createNode('figurka').setMesh(mesh));
  return doc;
}

if (!only) {
  await MeshoptEncoder.ready;
  const io = new NodeIO().registerExtensions(ALL_EXTENSIONS).registerDependencies({
    'draco3d.encoder': await draco3d.createEncoderModule(),
    'draco3d.decoder': await draco3d.createDecoderModule(),
    'meshopt.encoder': MeshoptEncoder,
    'meshopt.decoder': MeshoptDecoder,
  });
  const g = toDocument(god());
  await g.transform(weld(), meshopt({ encoder: MeshoptEncoder, level: 'medium' }));
  await io.write(new URL('god.glb', DIR).pathname, g);
  const w = toDocument(warrior());
  await w.transform(weld(), draco({ method: 'edgebreaker' }));
  await io.write(new URL('warrior.glb', DIR).pathname, w);
}

const files = readdirSync(DIR).filter((f) => f.endsWith('.glb')).sort();
writeFileSync(new URL('manifest.json', DIR), JSON.stringify({ models: files }, null, 2) + '\n');
console.log('modele:', files.join(', '));
