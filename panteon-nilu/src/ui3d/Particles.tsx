// Cząsteczki piasku: wyrzuty (przywołanie, lądowanie, śmierć) + delikatny pył nad pustynią.
import { useFrame } from '@react-three/fiber';
import { createContext, useContext, useMemo, useRef, type ReactNode } from 'react';
import { BufferAttribute, BufferGeometry, CanvasTexture, Color, NormalBlending, Points, PointsMaterial } from 'three';
import type { Vec3 } from './coords';

const MAX = 700;

export interface SandApi {
  burst(at: Vec3, count: number, strength?: number): void;
}

const SandContext = createContext<SandApi>({ burst: () => {} });
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

export function SandProvider({ enabled, dustAreas, children }: { enabled: boolean; dustAreas: Vec3[]; children: ReactNode }) {
  const pts = useRef<Points>(null);
  const sim = useMemo(() => ({
    pos: new Float32Array(MAX * 3),
    vel: new Float32Array(MAX * 3),
    life: new Float32Array(MAX), // pozostały czas życia (s); 0 = wolna
    next: 0,
  }), []);
  const geometry = useMemo(() => {
    const g = new BufferGeometry();
    g.setAttribute('position', new BufferAttribute(sim.pos, 3));
    g.setDrawRange(0, MAX);
    return g;
  }, [sim]);
  const material = useMemo(
    () => new PointsMaterial({
      size: 0.07, map: dotTexture(), color: new Color('#e9cf92'), transparent: true, depthWrite: false,
      opacity: 0.9, blending: NormalBlending, sizeAttenuation: true,
    }),
    [],
  );

  const spawn = (x: number, y: number, z: number, vx: number, vy: number, vz: number, life: number) => {
    const i = sim.next;
    sim.next = (sim.next + 1) % MAX;
    sim.pos.set([x, y, z], i * 3);
    sim.vel.set([vx, vy, vz], i * 3);
    sim.life[i] = life;
  };

  const api = useMemo<SandApi>(() => ({
    burst(at, count, strength = 1) {
      if (!enabled) return;
      for (let k = 0; k < count; k++) {
        const a = Math.random() * Math.PI * 2;
        const s = (0.6 + Math.random() * 1.4) * strength;
        spawn(at[0], at[1] + 0.05, at[2], Math.cos(a) * s, (1.2 + Math.random() * 1.6) * strength, Math.sin(a) * s, 0.6 + Math.random() * 0.6);
      }
    },
  }), [enabled]); // eslint-disable-line react-hooks/exhaustive-deps

  const dustClock = useRef(0);
  useFrame((_, dtRaw) => {
    const dt = Math.min(dtRaw, 0.05);
    if (enabled && dustAreas.length) {
      dustClock.current += dt;
      while (dustClock.current > 0.08) {
        dustClock.current -= 0.08;
        const p = dustAreas[Math.floor(Math.random() * dustAreas.length)];
        spawn(p[0] + (Math.random() - 0.5) * 1.6, p[1] + 0.05, p[2] + (Math.random() - 0.5) * 1.6, 0.25 + Math.random() * 0.2, 0.05 + Math.random() * 0.12, 0.05, 2.5 + Math.random() * 1.5);
      }
    }
    for (let i = 0; i < MAX; i++) {
      if (sim.life[i] <= 0) {
        sim.pos[i * 3 + 1] = -100; // poza widokiem
        continue;
      }
      sim.life[i] -= dt;
      sim.vel[i * 3 + 1] -= 3.2 * dt; // grawitacja (lekka — piasek unosi się)
      for (let k = 0; k < 3; k++) {
        sim.vel[i * 3 + k] *= 1 - 1.8 * dt;
        sim.pos[i * 3 + k] += sim.vel[i * 3 + k] * dt;
      }
      if (sim.pos[i * 3 + 1] < 0.3) sim.pos[i * 3 + 1] = 0.3;
    }
    (geometry.getAttribute('position') as BufferAttribute).needsUpdate = true;
  });

  return (
    <SandContext.Provider value={api}>
      {children}
      <points ref={pts} geometry={geometry} material={material} frustumCulled={false} raycast={() => null} />
    </SandContext.Provider>
  );
}
