// Cząsteczki piasku: wyrzuty (przywołanie, śmierć), pył spod podstawki przy lądowaniu, delikatny pył nad pustynią.
// Dwie pule: drobny piasek i większe, jaśniejsze kłęby pyłu (lądowanie — widoczne także na zielonych polach).
import { useFrame } from '@react-three/fiber';
import { createContext, useContext, useMemo, useRef, type ReactNode } from 'react';
import { BufferAttribute, BufferGeometry, CanvasTexture, Color, NormalBlending, PointsMaterial } from 'three';
import { makeTicker } from './clock';
import type { Vec3 } from './coords';

export interface SandApi {
  burst(at: Vec3, count: number, strength?: number): void;
  /** Pierścień pyłu spod podstawki (lądowanie): nisko, na boki. */
  dust(at: Vec3, radius: number, count?: number): void;
}

const SandContext = createContext<SandApi>({ burst: () => {}, dust: () => {} });
export const useSand = () => useContext(SandContext);

function dotTexture(): CanvasTexture {
  const c = document.createElement('canvas');
  c.width = c.height = 32;
  const ctx = c.getContext('2d')!;
  const g = ctx.createRadialGradient(16, 16, 0, 16, 16, 16);
  g.addColorStop(0, 'rgba(255,255,255,1)');
  g.addColorStop(1, 'rgba(255,255,255,0)');
  ctx.fillStyle = g;
  ctx.fillRect(0, 0, 32, 32);
  return new CanvasTexture(c);
}

/** Pula cząstek: pozycje, prędkości, czas życia; fizyka z parametrami puli. */
class Pool {
  pos: Float32Array;
  vel: Float32Array;
  life: Float32Array;
  next = 0;
  geometry = new BufferGeometry();
  constructor(readonly max: number, readonly gravity: number, readonly drag: number) {
    this.pos = new Float32Array(max * 3);
    this.vel = new Float32Array(max * 3);
    this.life = new Float32Array(max);
    this.geometry.setAttribute('position', new BufferAttribute(this.pos, 3));
  }
  spawn(x: number, y: number, z: number, vx: number, vy: number, vz: number, life: number) {
    const i = this.next;
    this.next = (this.next + 1) % this.max;
    this.pos.set([x, y, z], i * 3);
    this.vel.set([vx, vy, vz], i * 3);
    this.life[i] = life;
  }
  step(dt: number, floor: number) {
    const { pos, vel, life } = this;
    for (let i = 0; i < this.max; i++) {
      if (life[i] <= 0) {
        pos[i * 3 + 1] = -100; // poza widokiem
        continue;
      }
      life[i] -= dt;
      vel[i * 3 + 1] -= this.gravity * dt;
      for (let k = 0; k < 3; k++) {
        vel[i * 3 + k] *= 1 - this.drag * dt;
        pos[i * 3 + k] += vel[i * 3 + k] * dt;
      }
      if (pos[i * 3 + 1] < floor) pos[i * 3 + 1] = floor;
    }
    (this.geometry.getAttribute('position') as BufferAttribute).needsUpdate = true;
  }
}

export function SandProvider({ enabled, dustAreas, children }: { enabled: boolean; dustAreas: Vec3[]; children: ReactNode }) {
  // piasek: lekka grawitacja (unosi się); kłęby: prawie bez grawitacji, szybko hamują
  const sand = useMemo(() => new Pool(700, 3.2, 1.8), []);
  const puff = useMemo(() => new Pool(240, 0.4, 3.2), []);
  const mats = useMemo(() => {
    const map = dotTexture();
    return {
      sand: new PointsMaterial({
        size: 0.07, map, color: new Color('#e9cf92'), transparent: true, depthWrite: false, opacity: 0.9,
        blending: NormalBlending, sizeAttenuation: true,
      }),
      puff: new PointsMaterial({
        size: 0.16, map, color: new Color('#f4e6c4'), transparent: true, depthWrite: false, opacity: 0.75,
        blending: NormalBlending, sizeAttenuation: true,
      }),
    };
  }, []);

  const api = useMemo<SandApi>(() => ({
    burst(at, count, strength = 1) {
      if (!enabled) return;
      for (let k = 0; k < count; k++) {
        const a = Math.random() * Math.PI * 2;
        const s = (0.6 + Math.random() * 1.4) * strength;
        sand.spawn(at[0], at[1] + 0.05, at[2], Math.cos(a) * s, (1.2 + Math.random() * 1.6) * strength, Math.sin(a) * s, 0.6 + Math.random() * 0.6);
      }
    },
    dust(at, radius, count = 36) {
      if (!enabled) return;
      for (let k = 0; k < count; k++) {
        const a = (k / count) * Math.PI * 2 + Math.random() * 0.3;
        const s = 1.4 + Math.random() * 1.2;
        const c = Math.cos(a);
        const n = Math.sin(a);
        puff.spawn(at[0] + c * radius, at[1] + 0.06, at[2] + n * radius, c * s, 0.35 + Math.random() * 0.45, n * s, 0.55 + Math.random() * 0.5);
      }
      // trochę drobnego piasku w górę
      for (let k = 0; k < 10; k++) {
        const a = Math.random() * Math.PI * 2;
        sand.spawn(at[0] + Math.cos(a) * radius, at[1] + 0.05, at[2] + Math.sin(a) * radius, Math.cos(a) * 0.8, 1 + Math.random(), Math.sin(a) * 0.8, 0.5);
      }
    },
  }), [enabled, sand, puff]);

  const dustClock = useRef(0);
  const tick = useMemo(() => makeTicker(0.05), []);
  useFrame(() => {
    const dt = tick();
    if (enabled && dustAreas.length) {
      dustClock.current += dt;
      while (dustClock.current > 0.08) {
        dustClock.current -= 0.08;
        const p = dustAreas[Math.floor(Math.random() * dustAreas.length)];
        sand.spawn(p[0] + (Math.random() - 0.5) * 1.6, p[1] + 0.05, p[2] + (Math.random() - 0.5) * 1.6, 0.25 + Math.random() * 0.2, 0.05 + Math.random() * 0.12, 0.05, 2.5 + Math.random() * 1.5);
      }
    }
    sand.step(dt, 0.3);
    puff.step(dt, 0.32);
  });

  return (
    <SandContext.Provider value={api}>
      {children}
      <points geometry={sand.geometry} material={mats.sand} frustumCulled={false} raycast={() => null} />
      <points geometry={puff.geometry} material={mats.puff} frustumCulled={false} raycast={() => null} />
    </SandContext.Provider>
  );
}
