// Materiały PBR z proceduralnymi teksturami (canvas) i animowana woda.
// Tekstury generowane deterministycznie (własny RNG) — bez plików graficznych i bez sieci.
import {
  CanvasTexture, Color, MeshStandardMaterial, RepeatWrapping, SRGBColorSpace, type Texture, type WebGLProgramParametersWithUniforms,
} from 'three';
import { rngStep } from '../engine/rng';

type Paint = (ctx: CanvasRenderingContext2D, size: number, rnd: () => number) => void;

function makeRng(seed: number) {
  let s = seed >>> 0;
  return () => {
    const [v, n] = rngStep(s);
    s = n;
    return v;
  };
}

function canvasTexture(size: number, seed: number, paint: Paint, srgb: boolean): Texture {
  const canvas = document.createElement('canvas');
  canvas.width = canvas.height = size;
  const ctx = canvas.getContext('2d')!;
  paint(ctx, size, makeRng(seed));
  const tex = new CanvasTexture(canvas);
  tex.wrapS = tex.wrapT = RepeatWrapping;
  tex.anisotropy = 4;
  if (srgb) tex.colorSpace = SRGBColorSpace;
  return tex;
}

/** Plamy (miękkie koła) — szum „malowany ręcznie”, kafelkowalny przez zawijanie. */
function blotches(ctx: CanvasRenderingContext2D, size: number, rnd: () => number, n: number, colors: string[], rMin: number, rMax: number, alpha: number) {
  for (let i = 0; i < n; i++) {
    const x = rnd() * size;
    const y = rnd() * size;
    const r = rMin + rnd() * (rMax - rMin);
    ctx.globalAlpha = alpha * (0.5 + rnd() * 0.5);
    ctx.fillStyle = colors[Math.floor(rnd() * colors.length)];
    for (const dx of [-size, 0, size]) {
      for (const dy of [-size, 0, size]) {
        ctx.beginPath();
        ctx.arc(x + dx, y + dy, r, 0, Math.PI * 2);
        ctx.fill();
      }
    }
  }
  ctx.globalAlpha = 1;
}

/** Mapa normalnych z mapy wysokości narysowanej na kanwie (różnice skończone). */
function normalFromHeight(size: number, seed: number, paintHeight: Paint, strength: number): Texture {
  const src = document.createElement('canvas');
  src.width = src.height = size;
  const sctx = src.getContext('2d')!;
  paintHeight(sctx, size, makeRng(seed));
  const h = sctx.getImageData(0, 0, size, size).data;
  const out = sctx.createImageData(size, size);
  const at = (x: number, y: number) => h[(((y + size) % size) * size + ((x + size) % size)) * 4] / 255;
  for (let y = 0; y < size; y++) {
    for (let x = 0; x < size; x++) {
      const dx = (at(x + 1, y) - at(x - 1, y)) * strength;
      const dy = (at(x, y + 1) - at(x, y - 1)) * strength;
      const len = Math.hypot(dx, dy, 1);
      const i = (y * size + x) * 4;
      out.data[i] = ((-dx / len) * 0.5 + 0.5) * 255;
      out.data[i + 1] = ((-dy / len) * 0.5 + 0.5) * 255;
      out.data[i + 2] = ((1 / len) * 0.5 + 0.5) * 255;
      out.data[i + 3] = 255;
    }
  }
  sctx.putImageData(out, 0, 0);
  const tex = new CanvasTexture(src);
  tex.wrapS = tex.wrapT = RepeatWrapping;
  return tex;
}

/**
 * UV w przestrzeni świata (XZ) zamiast UV geometrii — każdy kafel dostaje inny fragment tekstury,
 * więc wzór się nie powtarza. Działa też dla InstancedMesh.
 */
function worldUv(material: MeshStandardMaterial, scale: number): MeshStandardMaterial {
  material.onBeforeCompile = (shader) => {
    shader.vertexShader = shader.vertexShader.replace(
      '#include <uv_vertex>',
      `#include <uv_vertex>
      {
        vec4 wp = vec4(position, 1.0);
        #ifdef USE_INSTANCING
          wp = instanceMatrix * wp;
        #endif
        wp = modelMatrix * wp;
        vec2 wuv = wp.xz * ${scale.toFixed(4)};
        #ifdef USE_MAP
          vMapUv = wuv;
        #endif
        #ifdef USE_NORMALMAP
          vNormalMapUv = wuv;
        #endif
        #ifdef USE_ROUGHNESSMAP
          vRoughnessMapUv = wuv;
        #endif
      }`,
    );
  };
  material.customProgramCacheKey = () => `worldUv-${scale}`;
  return material;
}

export function fertileMaterial(): MeshStandardMaterial {
  const map = canvasTexture(256, 11, (ctx, s, rnd) => {
    ctx.fillStyle = '#7fae5a';
    ctx.fillRect(0, 0, s, s);
    blotches(ctx, s, rnd, 140, ['#6d9c4a', '#8fbd66', '#79a853', '#9cc46c'], 6, 26, 0.55);
    blotches(ctx, s, rnd, 900, ['#5f8c3e', '#a6cf78', '#6f9a49'], 0.8, 2.2, 0.8);
  }, true);
  const normalMap = normalFromHeight(256, 12, (ctx, s, rnd) => {
    ctx.fillStyle = '#808080';
    ctx.fillRect(0, 0, s, s);
    blotches(ctx, s, rnd, 1400, ['#a0a0a0', '#606060'], 0.8, 2.5, 0.7);
  }, 1.5);
  return worldUv(new MeshStandardMaterial({ map, normalMap, roughness: 0.88, metalness: 0 }), 0.32);
}

export function desertMaterial(): MeshStandardMaterial {
  const map = canvasTexture(256, 21, (ctx, s, rnd) => {
    ctx.fillStyle = '#e2c47f';
    ctx.fillRect(0, 0, s, s);
    blotches(ctx, s, rnd, 120, ['#d6b46a', '#ecd398', '#dcbd77'], 8, 30, 0.5);
    blotches(ctx, s, rnd, 1600, ['#c9a65c', '#f3dfaa'], 0.5, 1.4, 0.7);
  }, true);
  // fale wydm: sinusoidy w mapie wysokości
  const normalMap = normalFromHeight(256, 22, (ctx, s, rnd) => {
    const img = ctx.createImageData(s, s);
    const phase = rnd() * 6.28;
    for (let y = 0; y < s; y++) {
      for (let x = 0; x < s; x++) {
        const v = 0.5 + 0.35 * Math.sin(((x + y * 0.35) / s) * Math.PI * 2 * 9 + Math.sin((y / s) * Math.PI * 4 + phase) * 1.4);
        const i = (y * s + x) * 4;
        img.data[i] = img.data[i + 1] = img.data[i + 2] = v * 255;
        img.data[i + 3] = 255;
      }
    }
    ctx.putImageData(img, 0, 0);
  }, 2.2);
  return worldUv(new MeshStandardMaterial({ map, normalMap, roughness: 0.95, metalness: 0 }), 0.22);
}

export function waterBedMaterial(): MeshStandardMaterial {
  return new MeshStandardMaterial({ color: '#2f5f74', roughness: 0.9 });
}

export function woodMaterial(): MeshStandardMaterial {
  const map = canvasTexture(512, 31, (ctx, s, rnd) => {
    ctx.fillStyle = '#6b4428';
    ctx.fillRect(0, 0, s, s);
    for (let i = 0; i < 260; i++) {
      const y = rnd() * s;
      ctx.strokeStyle = rnd() < 0.5 ? 'rgba(52,30,16,0.35)' : 'rgba(140,96,60,0.25)';
      ctx.lineWidth = 0.6 + rnd() * 2.4;
      ctx.beginPath();
      for (let x = -10; x <= s + 10; x += 16) {
        const yy = y + Math.sin((x / s) * Math.PI * 2 * (1 + rnd() * 0.2) + i) * 3;
        if (x < 0) ctx.moveTo(x, yy);
        else ctx.lineTo(x, yy);
      }
      ctx.stroke();
    }
  }, true);
  map.repeat.set(3, 3);
  return new MeshStandardMaterial({ map, roughness: 0.62, metalness: 0 });
}

export function frameMaterial(): MeshStandardMaterial {
  return new MeshStandardMaterial({ color: '#3a2a1c', roughness: 0.55, metalness: 0.05 });
}

export function sandstoneMaterial(): MeshStandardMaterial {
  const map = canvasTexture(128, 41, (ctx, s, rnd) => {
    ctx.fillStyle = '#e6d3ab';
    ctx.fillRect(0, 0, s, s);
    blotches(ctx, s, rnd, 300, ['#d8c194', '#f0e2c2', '#cdb486'], 0.6, 3, 0.6);
  }, true);
  return new MeshStandardMaterial({ map, roughness: 0.78, metalness: 0 });
}

/** Animowana woda: PBR (odbicia HDRI, światło) + fale w normalnych liczone w shaderze. */
export interface WaterMaterial extends MeshStandardMaterial {
  userData: { time: { value: number } };
}

export function waterMaterial(animated = true): WaterMaterial {
  const m = new MeshStandardMaterial({
    color: new Color('#3b8fb8'),
    roughness: 0.08,
    metalness: 0.1,
    transparent: true,
    opacity: 0.88,
  }) as WaterMaterial;
  const time = { value: 0 };
  m.userData.time = time;
  m.onBeforeCompile = (shader: WebGLProgramParametersWithUniforms) => {
    shader.uniforms.uTime = time;
    shader.vertexShader = shader.vertexShader
      .replace('#include <common>', '#include <common>\nvarying vec3 vWPos;')
      .replace(
        '#include <worldpos_vertex>',
        `#include <worldpos_vertex>
        {
          vec4 w = vec4(transformed, 1.0);
          #ifdef USE_INSTANCING
            w = instanceMatrix * w;
          #endif
          vWPos = (modelMatrix * w).xyz;
        }`,
      );
    shader.fragmentShader = shader.fragmentShader
      .replace('#include <common>', '#include <common>\nuniform float uTime;\nvarying vec3 vWPos;')
      .replace(
        '#include <normal_fragment_maps>',
        `#include <normal_fragment_maps>
        {
          vec2 p = vWPos.xz;
          float t = ${animated ? 'uTime' : '0.0'};
          // suma fal w różnych kierunkach → pochodne wysokości
          vec2 d1 = vec2(0.8, 0.6); vec2 d2 = vec2(-0.5, 0.9); vec2 d3 = vec2(0.2, -1.0);
          float a1 = dot(p, d1) * 3.1 + t * 1.3;
          float a2 = dot(p, d2) * 4.7 - t * 1.7;
          float a3 = dot(p, d3) * 7.9 + t * 2.3;
          vec2 g = d1 * cos(a1) * 0.06 + d2 * cos(a2) * 0.045 + d3 * cos(a3) * 0.03;
          vec3 wn = normalize(vec3(-g.x, 1.0, -g.y));
          vec3 vn = normalize((viewMatrix * vec4(wn, 0.0)).xyz);
          normal = normalize(mix(normal, vn, 0.85));
          float crest = smoothstep(0.75, 1.0, sin(a1) * 0.5 + sin(a2) * 0.35 + sin(a3) * 0.25);
          diffuseColor.rgb += vec3(0.10, 0.14, 0.15) * crest;
        }`,
      );
  };
  m.customProgramCacheKey = () => `water-${animated}`;
  return m;
}
