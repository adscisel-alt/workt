// Efekty przywołania: kolumna światła nad polem i złote iskry wznoszące się po spirali.
// Pula stałych obiektów (bez montowania przy każdym przywołaniu); jasność > 1 — łapie ją bloom.
import { useFrame } from '@react-three/fiber';
import { createContext, useContext, useMemo, useRef, type ReactNode } from 'react';
import {
  AdditiveBlending, BufferAttribute, BufferGeometry, CanvasTexture, CircleGeometry, Color, CylinderGeometry, DoubleSide,
  type Group, PointsMaterial, ShaderMaterial,
} from 'three';
import { animNow, makeTicker } from './clock';
import type { Vec3 } from './coords';
import { SUMMON, summonPose } from './motion';

export interface FxApi {
  summon(at: Vec3): void;
}

const FxContext = createContext<FxApi>({ summon: () => {} });
export const useFx = () => useContext(FxContext);

// nasycone złoto: po ACES i bloomie zostaje złote, nie przepala się do bieli
const GOLD = new Color('#ffad3a');
const COLUMNS = 4;
const SPARKS = 420;

/** Promień światła: jasny u podstawy, gasnący ku górze i przy krawędziach (bez twardej sylwetki walca). */
function beamMaterial(color: Color, strength: number): ShaderMaterial {
  return new ShaderMaterial({
    uniforms: { uColor: { value: color.clone().multiplyScalar(strength) }, uOpacity: { value: 0 }, uTime: { value: 0 } },
    vertexShader: `
      varying vec2 vUv;
      varying float vFacing;
      void main() {
        vUv = uv;
        vec4 mv = modelViewMatrix * vec4(position, 1.0);
        vec3 n = normalize(normalMatrix * normal);
        vFacing = abs(dot(n, normalize(-mv.xyz)));
        gl_Position = projectionMatrix * mv;
      }`,
    fragmentShader: `
      uniform vec3 uColor;
      uniform float uOpacity;
      uniform float uTime;
      varying vec2 vUv;
      varying float vFacing;
      void main() {
        float h = vUv.y;
        float fade = pow(1.0 - h, 1.7) * smoothstep(0.0, 0.05, h);
        float edge = pow(vFacing, 1.6);
        float flicker = 0.88 + 0.12 * sin(uTime * 21.0 + h * 14.0);
        gl_FragColor = vec4(uColor * fade * edge * flicker * uOpacity, 1.0);
      }`,
    transparent: true,
    depthWrite: false,
    blending: AdditiveBlending,
    side: DoubleSide,
    toneMapped: false,
  });
}

/** Poświata na ziemi pod kolumną. */
function groundGlowMaterial(color: Color): ShaderMaterial {
  return new ShaderMaterial({
    uniforms: { uColor: { value: color.clone().multiplyScalar(2.2) }, uOpacity: { value: 0 } },
    vertexShader: `varying vec2 vUv; void main() { vUv = uv; gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0); }`,
    fragmentShader: `
      uniform vec3 uColor; uniform float uOpacity; varying vec2 vUv;
      void main() { float d = length(vUv - 0.5) * 2.0; gl_FragColor = vec4(uColor * pow(max(0.0, 1.0 - d), 2.2) * uOpacity, 1.0); }`,
    transparent: true,
    depthWrite: false,
    blending: AdditiveBlending,
    toneMapped: false,
  });
}

function sparkTexture(): CanvasTexture {
  const c = document.createElement('canvas');
  c.width = c.height = 32;
  const ctx = c.getContext('2d')!;
  const g = ctx.createRadialGradient(16, 16, 0, 16, 16, 16);
  g.addColorStop(0, 'rgba(255,255,255,1)');
  g.addColorStop(0.35, 'rgba(255,255,255,0.55)');
  g.addColorStop(1, 'rgba(255,255,255,0)');
  ctx.fillStyle = g;
  ctx.fillRect(0, 0, 32, 32);
  return new CanvasTexture(c);
}

interface Slot {
  at: Vec3;
  start: number;
  active: boolean;
  emitted: number;
}

export function FxProvider({ enabled, children }: { enabled: boolean; children: ReactNode }) {
  const geo = useMemo(
    () => ({
      core: new CylinderGeometry(0.16, 0.24, 3.4, 20, 1, true).translate(0, 1.7, 0),
      halo: new CylinderGeometry(0.42, 0.55, 2.6, 24, 1, true).translate(0, 1.3, 0),
      glow: new CircleGeometry(1, 32).rotateX(-Math.PI / 2),
    }),
    [],
  );
  const slots = useMemo<Slot[]>(() => Array.from({ length: COLUMNS }, () => ({ at: [0, 0, 0], start: 0, active: false, emitted: 0 })), []);
  const mats = useMemo(
    () => slots.map(() => ({ core: beamMaterial(GOLD, 2.2), halo: beamMaterial(GOLD, 0.85), glow: groundGlowMaterial(GOLD) })),
    [slots],
  );
  const groups = useRef<(Group | null)[]>([]);

  // iskry: pozycja, prędkość, czas życia; kolor = złoto × pozostałe życie (addytywnie — gaśnie)
  const sim = useMemo(() => ({
    pos: new Float32Array(SPARKS * 3),
    vel: new Float32Array(SPARKS * 3),
    col: new Float32Array(SPARKS * 3),
    life: new Float32Array(SPARKS),
    max: new Float32Array(SPARKS),
    axis: new Float32Array(SPARKS * 2),
    next: 0,
  }), []);
  const sparkGeo = useMemo(() => {
    const g = new BufferGeometry();
    g.setAttribute('position', new BufferAttribute(sim.pos, 3));
    g.setAttribute('color', new BufferAttribute(sim.col, 3));
    return g;
  }, [sim]);
  const sparkMat = useMemo(
    () => new PointsMaterial({
      size: 0.12, map: sparkTexture(), vertexColors: true, transparent: true, depthWrite: false, blending: AdditiveBlending,
      sizeAttenuation: true, toneMapped: false,
    }),
    [],
  );

  const emit = (slot: Slot, n: number) => {
    for (let k = 0; k < n; k++) {
      const i = sim.next;
      sim.next = (sim.next + 1) % SPARKS;
      const a = Math.random() * Math.PI * 2;
      const r = 0.12 + Math.random() * 0.38;
      sim.pos.set([slot.at[0] + Math.cos(a) * r, slot.at[1] + 0.05 + Math.random() * 0.3, slot.at[2] + Math.sin(a) * r], i * 3);
      // w górę + wir wokół osi kolumny
      const swirl = 0.9 + Math.random() * 0.9;
      sim.vel.set([-Math.sin(a) * swirl + Math.cos(a) * 0.25, 0.9 + Math.random() * 1.6, Math.cos(a) * swirl + Math.sin(a) * 0.25], i * 3);
      sim.axis.set([slot.at[0], slot.at[2]], i * 2);
      sim.max[i] = sim.life[i] = 0.7 + Math.random() * 0.8;
    }
  };

  const api = useMemo<FxApi>(() => ({
    summon(at) {
      if (!enabled) return;
      const slot = slots.find((s) => !s.active) ?? slots.reduce((a, b) => (a.start < b.start ? a : b));
      slot.at = at;
      slot.start = animNow();
      slot.active = true;
      slot.emitted = 0;
      emit(slot, 60); // pierwszy rozbłysk
    },
  }), [enabled]); // eslint-disable-line react-hooks/exhaustive-deps

  const tick = useMemo(() => makeTicker(0.05), []);
  useFrame(() => {
    const dt = tick();
    const now = animNow();
    slots.forEach((slot, k) => {
      const g = groups.current[k];
      if (!g) return;
      if (!slot.active) {
        g.visible = false;
        return;
      }
      const t = now - slot.start;
      const { column } = summonPose(t, 1);
      if (t >= SUMMON.total) slot.active = false;
      g.visible = slot.active;
      g.position.set(slot.at[0], slot.at[1], slot.at[2]);
      const m = mats[k];
      m.core.uniforms.uOpacity.value = column;
      m.halo.uniforms.uOpacity.value = column * 0.8;
      m.glow.uniforms.uOpacity.value = column;
      m.core.uniforms.uTime.value = m.halo.uniforms.uTime.value = now;
      g.scale.set(1 + 0.15 * (1 - column), 1, 1 + 0.15 * (1 - column));
      // iskry: gęsto na początku, rzadziej do końca kolumny
      const want = Math.floor(Math.min(1, t / SUMMON.columnHold) * 150);
      if (want > slot.emitted) {
        emit(slot, want - slot.emitted);
        slot.emitted = want;
      }
    });
    for (let i = 0; i < SPARKS; i++) {
      if (sim.life[i] <= 0) {
        sim.pos[i * 3 + 1] = -100;
        sim.col.set([0, 0, 0], i * 3);
        continue;
      }
      sim.life[i] -= dt;
      const ax = sim.axis[i * 2];
      const az = sim.axis[i * 2 + 1];
      // przyciąganie do osi kolumny (wir się nie rozlatuje), lekka grawitacja i opór
      sim.vel[i * 3] += (ax - sim.pos[i * 3]) * 2.2 * dt;
      sim.vel[i * 3 + 2] += (az - sim.pos[i * 3 + 2]) * 2.2 * dt;
      sim.vel[i * 3 + 1] -= 0.35 * dt;
      for (let c = 0; c < 3; c++) {
        sim.vel[i * 3 + c] *= 1 - 0.9 * dt;
        sim.pos[i * 3 + c] += sim.vel[i * 3 + c] * dt;
      }
      const k = Math.max(0, sim.life[i] / sim.max[i]);
      const twinkle = 0.7 + 0.3 * Math.sin(i * 12.9898 + now * 30);
      const b = 3.4 * k * twinkle;
      sim.col.set([GOLD.r * b, GOLD.g * b, GOLD.b * b], i * 3);
    }
    (sparkGeo.getAttribute('position') as BufferAttribute).needsUpdate = true;
    (sparkGeo.getAttribute('color') as BufferAttribute).needsUpdate = true;
  });

  return (
    <FxContext.Provider value={api}>
      {children}
      {slots.map((_, k) => (
        <group key={k} ref={(g) => void (groups.current[k] = g)} visible={false}>
          <mesh geometry={geo.core} material={mats[k].core} raycast={() => null} renderOrder={3} />
          <mesh geometry={geo.halo} material={mats[k].halo} raycast={() => null} renderOrder={3} />
          <mesh geometry={geo.glow} material={mats[k].glow} position={[0, 0.02, 0]} raycast={() => null} renderOrder={3} />
        </group>
      ))}
      <points geometry={sparkGeo} material={sparkMat} frustumCulled={false} raycast={() => null} renderOrder={4} />
    </FxContext.Provider>
  );
}
