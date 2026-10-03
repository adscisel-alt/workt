// Przeliczenia plansza → świat 3D (czyste funkcje, testowalne bez WebGL).
// Oś X = prawo na planszy 2D, oś Z = dół na planszy 2D, oś Y = wysokość.
import { neighborKeys } from '../engine/hex';
import { computeRegions } from '../engine/map';
import type { EdgeKey, GameState, HexKey, MapState, Terrain } from '../engine/types';
import { edgeSegment, HEX_R, hexCenter } from '../ui/layout';

/** Promień heksu w jednostkach świata. */
export const TILE_R = 1;
const SCALE = TILE_R / HEX_R;

/** Wierzch kafla wg terenu (pustynia lekko wyżej — wydmy; woda niżej). */
export const TILE_TOP: Record<Terrain, number> = { fertile: 0.3, desert: 0.34, water: 0.12 };
/** Poziom lustra wody. */
export const WATER_LEVEL = 0.22;

export type Vec3 = [number, number, number];

export function hexToWorld(h: HexKey): [number, number] {
  const c = hexCenter(h);
  return [c.x * SCALE, c.y * SCALE];
}

export function hexTop(map: MapState, h: HexKey): number {
  const t = map.terrain[h];
  return t === 'water' ? WATER_LEVEL : TILE_TOP[t];
}

/** Punkt postawienia figurki/monumentu na polu. */
export function hexAnchor(map: MapState, h: HexKey): Vec3 {
  const [x, z] = hexToWorld(h);
  return [x, hexTop(map, h), z];
}

/** Środek, kąt (wokół osi Y) i długość krawędzi między heksami — dla rzek, wielbłądów i wyboru krawędzi. */
export function edgeWorld(e: EdgeKey): { mid: [number, number]; angle: number; length: number } {
  const [p, q] = edgeSegment(e);
  const a = [p.x * SCALE, p.y * SCALE];
  const b = [q.x * SCALE, q.y * SCALE];
  return {
    mid: [(a[0] + b[0]) / 2, (a[1] + b[1]) / 2],
    angle: -Math.atan2(b[1] - a[1], b[0] - a[0]),
    length: Math.hypot(b[0] - a[0], b[1] - a[1]),
  };
}

/** Środek i rozpiętość planszy. */
export function boardExtent(map: MapState): { center: [number, number]; radius: number } {
  const pts = Object.keys(map.terrain).map(hexToWorld);
  const xs = pts.map((p) => p[0]);
  const zs = pts.map((p) => p[1]);
  const center: [number, number] = [(Math.min(...xs) + Math.max(...xs)) / 2, (Math.min(...zs) + Math.max(...zs)) / 2];
  const radius = Math.max(...pts.map((p) => Math.hypot(p[0] - center[0], p[1] - center[1]))) + TILE_R;
  return { center, radius };
}

/** Środek ciężkości i promień regionu (najazd kamery podczas bitwy). */
export function regionFocus(state: GameState, region: number): { center: [number, number]; radius: number } {
  const hexes = computeRegions(state.map).regions[region] ?? [];
  const pts = hexes.map(hexToWorld);
  if (!pts.length) return boardExtent(state.map);
  // środek prostokąta otaczającego (nie środek ciężkości) — nieregularny region mieści się w kadrze symetrycznie
  const xs = pts.map((p) => p[0]);
  const zs = pts.map((p) => p[1]);
  const center: [number, number] = [(Math.min(...xs) + Math.max(...xs)) / 2, (Math.min(...zs) + Math.max(...zs)) / 2];
  const radius = Math.max(...pts.map((p) => Math.hypot(p[0] - center[0], p[1] - center[1]))) + TILE_R;
  return { center, radius };
}

/**
 * Obrys granicy regionu: pary punktów (odcinki) na krawędziach między polem regionu a polem spoza niego.
 * Odcinki leżą tuż nad wierzchem kafla, lekko odsunięte do środka pola (nie giną w szczelinie między kaflami).
 */
export function regionOutline(state: GameState, region: number, inset = 0.06): Vec3[] {
  const members = new Set(computeRegions(state.map).regions[region] ?? []);
  const pts: Vec3[] = [];
  for (const h of [...members].sort()) {
    const [cx, cz] = hexToWorld(h);
    const y = hexTop(state.map, h) + 0.025;
    for (const n of neighborKeys(h)) {
      if (members.has(n)) continue;
      for (const p of edgeSegment(`${h}|${n}`)) {
        const x = p.x * SCALE;
        const z = p.y * SCALE;
        pts.push([x + (cx - x) * inset, y, z + (cz - z) * inset]);
      }
    }
  }
  return pts;
}

// ---------- animacje ----------

export const easeInOutCubic = (t: number) => (t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2);

export function easeOutBack(t: number): number {
  const c1 = 1.70158;
  const c3 = c1 + 1;
  return 1 + c3 * Math.pow(t - 1, 3) + c1 * Math.pow(t - 1, 2);
}

/** Wysokość łuku skoku zależna od odległości. */
export const arcHeight = (from: Vec3, to: Vec3) => 0.5 + 0.18 * Math.hypot(to[0] - from[0], to[2] - from[2]);

/** Punkt na łuku (parabola) dla t ∈ [0,1], z easingiem. */
export function arcPoint(from: Vec3, to: Vec3, t: number): Vec3 {
  const k = easeInOutCubic(Math.min(1, Math.max(0, t)));
  const h = arcHeight(from, to);
  return [
    from[0] + (to[0] - from[0]) * k,
    from[1] + (to[1] - from[1]) * k + 4 * h * k * (1 - k),
    from[2] + (to[2] - from[2]) * k,
  ];
}

/** Pole na żeton kolejności konfliktu: wolne pole lądowe regionu najbliżej jego środka. */
export function regionBadgeHex(state: GameState, region: number): HexKey | null {
  const all = computeRegions(state.map).regions[region] ?? [];
  const taken = new Set<string | null>([
    ...Object.values(state.figures).map((f) => f.pos),
    ...Object.values(state.monuments).map((m) => m.pos),
  ]);
  const free = all.filter((h) => !taken.has(h));
  const pool = free.length ? free : all;
  if (!pool.length) return null;
  const { center } = regionFocus(state, region);
  return pool.reduce((best, h) => {
    const [x, z] = hexToWorld(h);
    const [bx, bz] = hexToWorld(best);
    return Math.hypot(x - center[0], z - center[1]) < Math.hypot(bx - center[0], bz - center[1]) ? h : best;
  });
}
