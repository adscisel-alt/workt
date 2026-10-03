// Wydarzenie Karawana (Rulebook s. 21): linia do 6 wielbłądów na krawędziach heksów dzieli region na dwa.
// Wierzchołek siatki = narożnik wspólny dla 3 heksów (identyfikowany trójką kluczy, także spoza planszy).
import { edgeKey, neighborKeys } from './hex';
import { computeRegions, isLand, isOnBoard, isWater } from './map';
import type { EdgeKey, GameState, HexKey, MapState, PlayerId } from './types';
import { entityOf, godName, log } from './util';

type VertexKey = string;

const vertexKey = (a: HexKey, b: HexKey, c: HexKey): VertexKey => [a, b, c].sort().join(';');

/** Dwa wierzchołki (końce) krawędzi między sąsiednimi heksami a i b. */
function edgeVertices(a: HexKey, b: HexKey): [VertexKey, VertexKey] {
  const common = neighborKeys(a).filter((n) => neighborKeys(b).includes(n));
  return [vertexKey(a, b, common[0]), vertexKey(a, b, common[1])];
}

/** Wierzchołek jest „cechą planszy”: brzeg mapy, woda, rzeka albo wielbłąd. */
function isFeatureVertex(map: MapState, v: VertexKey): boolean {
  const hexes = v.split(';');
  if (hexes.some((h) => !isOnBoard(map, h) || isWater(map, h))) return true;
  const barriers = new Set([...map.rivers, ...map.camels]);
  for (let i = 0; i < 3; i++) {
    for (let j = i + 1; j < 3; j++) if (barriers.has(edgeKey(hexes[i], hexes[j]))) return true;
  }
  return false;
}

/** Czy dodanie wielbłądów dzieli dokładnie jeden region na dwa, każdy z ≥ minSize polami lądowymi. */
function splitsRegion(state: GameState, camels: EdgeKey[]): boolean {
  const before = computeRegions(state.map);
  const after = computeRegions({ ...state.map, camels: [...state.map.camels, ...camels] });
  if (after.regions.length !== before.regions.length + 1) return false;
  const [a] = camels[0].split('|');
  const original = before.regions[before.landRegion[a]];
  const parts = [...new Set(original.map((h) => after.landRegion[h]))];
  return parts.length === 2 && parts.every((r) => after.regions[r].length >= state.rules.caravan.minRegionSize);
}

const cache = new WeakMap<MapState, Map<number, EdgeKey[][]>>();

/** Wszystkie legalne linie karawany (posortowane listy krawędzi). */
export function caravanOptions(state: GameState): EdgeKey[][] {
  const maxLen = Math.min(state.rules.caravan.maxCamels, state.camelSupply);
  if (maxLen <= 0) return [];
  const byMap = cache.get(state.map) ?? new Map<number, EdgeKey[][]>();
  cache.set(state.map, byMap);
  const hit = byMap.get(maxLen);
  if (hit) return hit;

  const { regions, landRegion } = computeRegions(state.map);
  const barriers = new Set([...state.map.rivers, ...state.map.camels]);
  const found = new Map<string, EdgeKey[]>();
  for (let r = 0; r < regions.length; r++) {
    // Krawędzie wewnątrz regionu (między dwoma polami lądowymi, bez rzek i wielbłądów).
    const adj = new Map<VertexKey, { edge: EdgeKey; to: VertexKey }[]>();
    for (const a of regions[r]) {
      for (const b of neighborKeys(a)) {
        if (a >= b || !isLand(state.map, b) || landRegion[b] !== r) continue;
        const e = edgeKey(a, b);
        if (barriers.has(e)) continue;
        const [v1, v2] = edgeVertices(a, b);
        adj.set(v1, [...(adj.get(v1) ?? []), { edge: e, to: v2 }]);
        adj.set(v2, [...(adj.get(v2) ?? []), { edge: e, to: v1 }]);
      }
    }
    const starts = [...adj.keys()].filter((v) => isFeatureVertex(state.map, v)).sort();
    const walk = (v: VertexKey, path: EdgeKey[], seen: Set<VertexKey>) => {
      if (path.length && isFeatureVertex(state.map, v)) {
        const key = [...path].sort().join(',');
        if (!found.has(key)) found.set(key, [...path].sort());
      }
      if (path.length === maxLen) return;
      for (const { edge, to } of adj.get(v) ?? []) {
        if (seen.has(to)) continue;
        seen.add(to);
        walk(to, [...path, edge], seen);
        seen.delete(to);
      }
    };
    for (const s of starts) walk(s, [], new Set([s]));
  }
  const out = [...found.values()].filter((camels) => splitsRegion(state, camels)).sort((x, y) => x.join().localeCompare(y.join()));
  byMap.set(maxLen, out);
  return out;
}

export function startCaravan(state: GameState): void {
  const p = entityOf(state, state.turn.player);
  if (caravanOptions(state).length) state.pending = { kind: 'caravan', player: p };
  else log(state, `${godName(state, p)} nie może poprowadzić karawany.`, p);
}

/** Reprezentant regionu (najmniejszy klucz pola) — do wskazywania regionów w ruchach. */
const representative = (hexes: HexKey[]) => [...hexes].sort()[0];

export function caravan(state: GameState, p: PlayerId, camels: EdgeKey[]): void {
  const before = computeRegions(state.map);
  const [a] = camels[0].split('|');
  const originalRegion = before.landRegion[a];
  const token = Number(
    Object.keys(state.conflictTokens).find((t) => before.landRegion[state.conflictTokens[t]] === originalRegion),
  );
  state.map = { ...state.map, camels: [...state.map.camels, ...camels].sort() };
  state.camelSupply -= camels.length;
  const after = computeRegions(state.map);
  const parts = [...new Set(before.regions[originalRegion].map((h) => after.landRegion[h]))];
  const regions = parts.map((r) => representative(after.regions[r])).sort() as [HexKey, HexKey];
  log(state, `${godName(state, p)} prowadzi karawanę (${camels.length} wielbłądów) i dzieli region ${token}.`, p);
  state.pending = { kind: 'caravanKeep', player: p, token, regions };
}

export function caravanKeep(state: GameState, p: PlayerId, region: HexKey): void {
  const pending = state.pending;
  if (pending?.kind !== 'caravanKeep') return;
  const other = pending.regions.find((r) => r !== region)!;
  const fresh = Math.min(...state.conflictTokenSupply);
  state.conflictTokenSupply = state.conflictTokenSupply.filter((t) => t !== fresh);
  state.conflictTokens[String(pending.token)] = region;
  state.conflictTokens[String(fresh)] = other;
  log(state, `Żeton ${pending.token} zostaje w regionie przy ${region}; nowy żeton ${fresh} przy ${other}.`, p);
  state.pending = { kind: 'caravanSwap', player: p, tokens: [pending.token, fresh] };
}

/** Możliwe zamiany: żeton jednego z nowych regionów z dowolnym innym żetonem na planszy. */
export function caravanSwapOptions(state: GameState, tokens: [number, number]): [number, number][] {
  const all = Object.keys(state.conflictTokens).map(Number).sort((x, y) => x - y);
  const out = new Map<string, [number, number]>();
  for (const t of tokens) {
    for (const u of all) {
      if (u === t) continue;
      const pair: [number, number] = t < u ? [t, u] : [u, t];
      out.set(pair.join(), pair);
    }
  }
  return [...out.values()];
}

export function caravanSwap(state: GameState, p: PlayerId, swap: [number, number] | null): void {
  if (swap) {
    const [x, y] = swap.map(String);
    [state.conflictTokens[x], state.conflictTokens[y]] = [state.conflictTokens[y], state.conflictTokens[x]];
    log(state, `${godName(state, p)} zamienia żetony kolejności ${swap[0]} i ${swap[1]}.`, p);
  }
  state.pending = null;
}
