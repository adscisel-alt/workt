// Przyciemnienie planszy poza regionem bitwy: maska pól (tekstura) + łatka shadera materiałów sceny.
// Piksel → pole heksu liczone w shaderze z pozycji w świecie, więc granica idzie dokładnie po krawędziach pól,
// a figurki i monumenty ciemnieją razem ze swoim polem. Czyste części (maska, przeliczenie) są testowalne w Node.
import { DataTexture, type Material, MeshPhysicalMaterial, MeshStandardMaterial, RGBAFormat, Vector4 } from 'three';
import { parseHex } from '../engine/hex';
import type { HexKey, MapState } from '../engine/types';

const SQRT3 = Math.sqrt(3);

/** Pole heksu pod punktem świata (x, z) — to samo zaokrąglenie co w shaderze. */
export function worldToAxial(x: number, z: number): { q: number; r: number } {
  const r = z / 1.5;
  const q = x / SQRT3 - r / 2;
  const cx = q;
  const cz = r;
  const cy = -cx - cz;
  let rx = Math.round(cx);
  let ry = Math.round(cy);
  let rz = Math.round(cz);
  const dx = Math.abs(rx - cx);
  const dy = Math.abs(ry - cy);
  const dz = Math.abs(rz - cz);
  if (dx > dy && dx > dz) rx = -ry - rz;
  else if (dy > dz) ry = -rx - rz;
  else rz = -rx - ry;
  return { q: rx + 0, r: rz + 0 };
}

export interface DimMask {
  data: Uint8Array;
  /** Najmniejsze q, r w siatce i jej wymiary (z marginesem zer wokół planszy). */
  qMin: number;
  rMin: number;
  width: number;
  height: number;
}

/** Maska: 255 dla pól, które zostają jasne (region bitwy), 0 dla reszty. */
export function buildDimMask(map: MapState, lit: HexKey[]): DimMask {
  const all = Object.keys(map.terrain).map(parseHex);
  const qMin = Math.min(...all.map((h) => h.q)) - 1;
  const rMin = Math.min(...all.map((h) => h.r)) - 1;
  const width = Math.max(...all.map((h) => h.q)) - qMin + 2;
  const height = Math.max(...all.map((h) => h.r)) - rMin + 2;
  const data = new Uint8Array(width * height * 4);
  for (const h of lit) {
    const { q, r } = parseHex(h);
    const i = ((r - rMin) * width + (q - qMin)) * 4;
    data[i] = data[i + 1] = data[i + 2] = data[i + 3] = 255;
  }
  return { data, qMin, rMin, width, height };
}

export function maskAt(mask: DimMask, q: number, r: number): boolean {
  const x = q - mask.qMin;
  const y = r - mask.rMin;
  if (x < 0 || y < 0 || x >= mask.width || y >= mask.height) return false;
  return mask.data[(y * mask.width + x) * 4] > 0;
}

// ---------- wspólne uniformy i łatka materiałów ----------

const empty = new DataTexture(new Uint8Array(4), 1, 1, RGBAFormat);
empty.needsUpdate = true;

export const DIM = {
  uDimMask: { value: empty as DataTexture },
  uDimGrid: { value: new Vector4(0, 0, 1, 1) },
  /** 0 — brak przyciemnienia, 1 — pełne (animowane płynnie). */
  uDim: { value: 0 },
  /** Jasność pól poza regionem przy pełnym przyciemnieniu. */
  uDimLevel: { value: 0.3 },
};

export function setDimMask(mask: DimMask) {
  const tex = new DataTexture(mask.data, mask.width, mask.height, RGBAFormat);
  tex.needsUpdate = true;
  const old = DIM.uDimMask.value;
  DIM.uDimMask.value = tex;
  DIM.uDimGrid.value.set(mask.qMin, mask.rMin, mask.width, mask.height);
  if (old !== empty) old.dispose();
}

const VERT_DECL = 'varying vec2 vDimWorld;\n';
const VERT_CODE = `
  {
    vec4 dimW = vec4(transformed, 1.0);
    #ifdef USE_INSTANCING
      dimW = instanceMatrix * dimW;
    #endif
    vDimWorld = (modelMatrix * dimW).xz;
  }`;
const FRAG_DECL = `
uniform sampler2D uDimMask;
uniform vec4 uDimGrid;
uniform float uDim;
uniform float uDimLevel;
varying vec2 vDimWorld;
float panteonDim(vec2 p) {
  if (uDim <= 0.0) return 1.0;
  float r = p.y / 1.5;
  float q = p.x / 1.7320508 - r * 0.5;
  float y = -q - r;
  float rx = floor(q + 0.5); float ry = floor(y + 0.5); float rz = floor(r + 0.5);
  float dx = abs(rx - q); float dy = abs(ry - y); float dz = abs(rz - r);
  if (dx > dy && dx > dz) rx = -ry - rz; else if (dy > dz) ry = -rx - rz; else rz = -rx - ry;
  vec2 uv = (vec2(rx - uDimGrid.x, rz - uDimGrid.y) + 0.5) / uDimGrid.zw;
  float lit = (uv.x < 0.0 || uv.y < 0.0 || uv.x > 1.0 || uv.y > 1.0) ? 0.0 : texture2D(uDimMask, uv).r;
  return mix(1.0, uDimLevel, uDim * (1.0 - lit));
}
`;

/** Czy materiał dostaje przyciemnienie (oświetlone materiały sceny; podświetlenia i efekty — nie). */
export function dimmable(m: Material): boolean {
  return (m instanceof MeshStandardMaterial || m instanceof MeshPhysicalMaterial) && !m.userData.noDim;
}

/** Dokleja przyciemnienie do shadera materiału (zachowuje jego własne `onBeforeCompile`). Idempotentne. */
export function patchDim(m: Material): boolean {
  if (m.userData.dimPatched || !dimmable(m)) return false;
  m.userData.dimPatched = true;
  const prevCompile = m.onBeforeCompile;
  const prevKey = m.customProgramCacheKey;
  m.onBeforeCompile = (shader, renderer) => {
    prevCompile.call(m, shader, renderer);
    Object.assign(shader.uniforms, DIM);
    shader.vertexShader = shader.vertexShader
      .replace('#include <common>', `#include <common>\n${VERT_DECL}`)
      .replace('#include <project_vertex>', `#include <project_vertex>${VERT_CODE}`);
    shader.fragmentShader = shader.fragmentShader
      .replace('#include <common>', `#include <common>\n${FRAG_DECL}`)
      .replace('#include <opaque_fragment>', '#include <opaque_fragment>\n  gl_FragColor.rgb *= panteonDim(vDimWorld);');
  };
  m.customProgramCacheKey = () => `${prevKey.call(m)}|dim`;
  m.needsUpdate = true;
  return true;
}
