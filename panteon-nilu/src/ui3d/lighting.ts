// Światło sceny: ciepłe, niskie słońce („złota godzina”) i obejmujące cienie. Czyste funkcje — testowalne w Node.
import type { Vec3 } from './coords';

export const SUN = {
  /** Wysokość nad horyzontem — nisko, więc cienie są długie. */
  elevation: (22 * Math.PI) / 180,
  /** Kierunek, z którego świeci (w płaszczyźnie stołu): z tyłu po lewej — cienie padają ku widzowi w prawo. */
  from: [-0.8, -0.6] as [number, number],
  color: '#ffc58a',
  intensity: 3.6,
  /** Najwyższy element planszy (obelisk, bóg) — dla zasięgu cienia. */
  tallest: 1.6,
} as const;

export interface SunRig {
  position: Vec3;
  target: Vec3;
  /** Granice kamery cienia w przestrzeni światła. */
  shadow: { left: number; right: number; top: number; bottom: number; near: number; far: number };
}

const sub = (a: Vec3, b: Vec3): Vec3 => [a[0] - b[0], a[1] - b[1], a[2] - b[2]];
const dot = (a: Vec3, b: Vec3) => a[0] * b[0] + a[1] * b[1] + a[2] * b[2];
const cross = (a: Vec3, b: Vec3): Vec3 => [a[1] * b[2] - a[2] * b[1], a[2] * b[0] - a[0] * b[2], a[0] * b[1] - a[1] * b[0]];
const norm = (a: Vec3): Vec3 => {
  const l = Math.hypot(...a);
  return [a[0] / l, a[1] / l, a[2] / l];
};

/** Długość cienia rzucanego przez element o wysokości h przy danym słońcu. */
export const shadowLength = (h: number, elevation = SUN.elevation) => h / Math.tan(elevation);

/**
 * Pozycja słońca i kamera cienia dopasowana do planszy razem z długimi cieniami (także tymi,
 * które spadają poza planszę na stół). Osie liczone tak jak `lookAt` kamery cienia w three.js.
 */
export function sunRig(center: [number, number], radius: number): SunRig {
  const [hx, hz] = SUN.from;
  const hl = Math.hypot(hx, hz);
  const dist = radius * 2.2;
  const cosE = Math.cos(SUN.elevation);
  const target: Vec3 = [center[0], 0, center[1]];
  const position: Vec3 = [
    center[0] + (hx / hl) * cosE * dist,
    Math.sin(SUN.elevation) * dist,
    center[1] + (hz / hl) * cosE * dist,
  ];
  const f = norm(sub(target, position));
  const r = norm(cross(f, [0, 1, 0]));
  const u = cross(r, f);
  // punkty do objęcia: obwód planszy przy stole i na wysokości najwyższych figur, plus koniec cienia za planszą
  const reach = radius + shadowLength(SUN.tallest);
  const pts: Vec3[] = [];
  for (let i = 0; i < 16; i++) {
    const a = (i / 16) * Math.PI * 2;
    const c = Math.cos(a);
    const s = Math.sin(a);
    pts.push([center[0] + c * radius, 0, center[1] + s * radius]);
    pts.push([center[0] + c * radius, SUN.tallest, center[1] + s * radius]);
    pts.push([center[0] + c * reach, -0.25, center[1] + s * reach]);
  }
  const xs = pts.map((p) => dot(sub(p, position), r));
  const ys = pts.map((p) => dot(sub(p, position), u));
  const ds = pts.map((p) => dot(sub(p, position), f));
  const pad = 0.5;
  return {
    position,
    target,
    shadow: {
      left: Math.min(...xs) - pad,
      right: Math.max(...xs) + pad,
      bottom: Math.min(...ys) - pad,
      top: Math.max(...ys) + pad,
      near: Math.max(0.1, Math.min(...ds) - 1),
      far: Math.max(...ds) + 1,
    },
  };
}
