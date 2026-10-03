import type { EdgeKey, HexKey } from './types';

export interface Axial {
  q: number;
  r: number;
}

/** Kierunki sąsiadów dla heksów „pointy-top” we współrzędnych osiowych. */
export const DIRECTIONS: readonly Axial[] = [
  { q: 1, r: 0 },
  { q: 1, r: -1 },
  { q: 0, r: -1 },
  { q: -1, r: 0 },
  { q: -1, r: 1 },
  { q: 0, r: 1 },
];

export const hexKey = (q: number, r: number): HexKey => `${q},${r}`;

export function parseHex(key: HexKey): Axial {
  const [q, r] = key.split(',').map(Number);
  return { q, r };
}

export function neighborKeys(key: HexKey): HexKey[] {
  const { q, r } = parseHex(key);
  return DIRECTIONS.map((d) => hexKey(q + d.q, r + d.r));
}

export function areNeighbors(a: HexKey, b: HexKey): boolean {
  const A = parseHex(a);
  const B = parseHex(b);
  return hexDistance(A, B) === 1;
}

export function hexDistance(a: Axial, b: Axial): number {
  return (Math.abs(a.q - b.q) + Math.abs(a.q + a.r - b.q - b.r) + Math.abs(a.r - b.r)) / 2;
}

/** Kanoniczny klucz krawędzi między dwoma sąsiednimi heksami. */
export function edgeKey(a: HexKey, b: HexKey): EdgeKey {
  return a < b ? `${a}|${b}` : `${b}|${a}`;
}

export function edgeHexes(e: EdgeKey): [HexKey, HexKey] {
  const [a, b] = e.split('|');
  return [a, b];
}

/** Współrzędne „odd-r” (kolumna, wiersz; nieparzyste wiersze przesunięte w prawo) -> osiowe. */
export function offsetToAxial(col: number, row: number): Axial {
  return { q: col - (row - (row & 1)) / 2, r: row };
}

export function offsetKey(col: number, row: number): HexKey {
  const { q, r } = offsetToAxial(col, row);
  return hexKey(q, r);
}
