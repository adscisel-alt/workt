import { parseHex } from '../engine/hex';
import type { EdgeKey, HexKey } from '../engine/types';

export const HEX_R = 34;
const SQRT3 = Math.sqrt(3);

export interface Point {
  x: number;
  y: number;
}

/** Środek heksu „pointy-top” we współrzędnych osiowych. */
export function hexCenter(h: HexKey): Point {
  const { q, r } = parseHex(h);
  return { x: HEX_R * SQRT3 * (q + r / 2), y: HEX_R * 1.5 * r };
}

export function hexCorners(h: HexKey, radius = HEX_R): Point[] {
  const c = hexCenter(h);
  return Array.from({ length: 6 }, (_, i) => {
    const a = (Math.PI / 180) * (60 * i - 30);
    return { x: c.x + radius * Math.cos(a), y: c.y + radius * Math.sin(a) };
  });
}

export const pointsAttr = (pts: Point[]) => pts.map((p) => `${p.x.toFixed(1)},${p.y.toFixed(1)}`).join(' ');

/** Odcinek wspólnej krawędzi dwóch sąsiednich heksów (dla rzek i wielbłądów). */
export function edgeSegment(e: EdgeKey): [Point, Point] {
  const [a, b] = e.split('|');
  const cb = hexCenter(b);
  const corners = hexCorners(a)
    .map((p) => ({ p, d: Math.hypot(p.x - cb.x, p.y - cb.y) }))
    .sort((x, y) => x.d - y.d);
  return [corners[0].p, corners[1].p];
}

export function boardBounds(hexes: HexKey[], pad = HEX_R + 6) {
  const cs = hexes.map(hexCenter);
  const minX = Math.min(...cs.map((c) => c.x)) - pad;
  const maxX = Math.max(...cs.map((c) => c.x)) + pad;
  const minY = Math.min(...cs.map((c) => c.y)) - pad;
  const maxY = Math.max(...cs.map((c) => c.y)) + pad;
  return { minX, minY, width: maxX - minX, height: maxY - minY };
}
