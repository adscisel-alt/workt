import { edgeKey, neighborKeys } from './hex';
import type { GameState, HexKey, MapState, Monument } from './types';

export interface RegionInfo {
  /** Region każdego heksu lądowego. */
  landRegion: Record<HexKey, number>;
  /** Heksy lądowe w każdym regionie. */
  regions: HexKey[][];
}

const cache = new WeakMap<MapState, RegionInfo>();

export const isOnBoard = (map: MapState, h: HexKey): boolean => h in map.terrain;
export const isWater = (map: MapState, h: HexKey): boolean => map.terrain[h] === 'water';
export const isLand = (map: MapState, h: HexKey): boolean => isOnBoard(map, h) && !isWater(map, h);

export function barrierSet(map: MapState): Set<string> {
  return new Set([...map.rivers, ...map.camels]);
}

export function hasBarrier(map: MapState, a: HexKey, b: HexKey): boolean {
  const e = edgeKey(a, b);
  return map.rivers.includes(e) || map.camels.includes(e);
}

/** Regiony = spójne składowe pól lądowych, rozdzielone rzekami i karawanami. */
export function computeRegions(map: MapState): RegionInfo {
  const cached = cache.get(map);
  if (cached) return cached;
  const barriers = barrierSet(map);
  const landRegion: Record<HexKey, number> = {};
  const regions: HexKey[][] = [];
  const land = Object.keys(map.terrain)
    .filter((h) => isLand(map, h))
    .sort();
  for (const start of land) {
    if (start in landRegion) continue;
    const id = regions.length;
    const members: HexKey[] = [];
    const stack = [start];
    landRegion[start] = id;
    while (stack.length) {
      const h = stack.pop()!;
      members.push(h);
      for (const n of neighborKeys(h)) {
        if (!isLand(map, n) || n in landRegion) continue;
        if (barriers.has(edgeKey(h, n))) continue;
        landRegion[n] = id;
        stack.push(n);
      }
    }
    regions.push(members.sort());
  }
  const info = { landRegion, regions };
  cache.set(map, info);
  return info;
}

/** Regiony, do których należy pole. Woda należy do każdego regionu, z którym graniczy. */
export function regionsOfHex(map: MapState, h: HexKey): number[] {
  const { landRegion } = computeRegions(map);
  if (isLand(map, h)) return [landRegion[h]];
  if (!isOnBoard(map, h)) return [];
  const ids = new Set<number>();
  for (const n of neighborKeys(h)) if (isLand(map, n)) ids.add(landRegion[n]);
  return [...ids].sort((a, b) => a - b);
}

/**
 * Sąsiedztwo w sensie zasad: wspólna krawędź ORAZ ten sam region.
 * Pola rozdzielone rzeką lub wielbłądem nie sąsiadują. Woda sąsiaduje ze wszystkimi polami wokół.
 */
export function areAdjacent(map: MapState, a: HexKey, b: HexKey): boolean {
  if (a === b || !isOnBoard(map, a) || !isOnBoard(map, b)) return false;
  if (!neighborKeys(a).includes(b)) return false;
  if (isWater(map, a) || isWater(map, b)) {
    const ra = regionsOfHex(map, a);
    return regionsOfHex(map, b).some((r) => ra.includes(r));
  }
  return !hasBarrier(map, a, b);
}

export function adjacentHexes(map: MapState, h: HexKey): HexKey[] {
  return neighborKeys(h).filter((n) => areAdjacent(map, h, n));
}

export function figureAt(state: GameState, h: HexKey, ignore?: string) {
  return Object.values(state.figures).find((f) => f.pos === h && f.id !== ignore);
}

export function monumentAt(state: GameState, h: HexKey): Monument | undefined {
  return Object.values(state.monuments).find((m) => m.pos === h);
}

/** Puste pole lądowe: bez figurki i bez monumentu (`ignore` — figurka traktowana jak nieobecna). */
export function isEmptyLand(state: GameState, h: HexKey, ignore?: string): boolean {
  return isLand(state.map, h) && !figureAt(state, h, ignore) && !monumentAt(state, h);
}

/** Id regionu przypisanego do żetonu kolejności konfliktu. */
export function regionOfToken(state: GameState, token: number): number {
  return computeRegions(state.map).landRegion[state.conflictTokens[String(token)]];
}

/** Regiony w kolejności rozstrzygania konfliktu (rosnące numery żetonów). */
export function regionsInConflictOrder(state: GameState): { token: number; region: number }[] {
  return Object.keys(state.conflictTokens)
    .map(Number)
    .sort((a, b) => a - b)
    .map((token) => ({ token, region: regionOfToken(state, token) }));
}

export function isHexInRegion(map: MapState, h: HexKey, region: number): boolean {
  return regionsOfHex(map, h).includes(region);
}
