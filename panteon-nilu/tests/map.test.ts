import { SCENARIOS } from '../src/config/scenarios';
import { buildMap } from '../src/engine';
import { edgeKey } from '../src/engine/hex';
import { areAdjacent, computeRegions, regionsInConflictOrder, regionsOfHex } from '../src/engine/map';
import type { MapState } from '../src/engine/types';
import { k, newGame } from './helpers';

const TRZY = SCENARIOS['trzy-krainy'];

describe('mapa i regiony', () => {
  it('Trzy Krainy: 3 regiony zgodne z etykietami siatki', () => {
    const map = buildMap(TRZY);
    const { regions, landRegion } = computeRegions(map);
    expect(regions).toHaveLength(3);
    TRZY.grid.forEach((line, row) =>
      line.trim().split(/\s+/).forEach((cell, col) => {
        if (cell === 'W') return;
        const sameLabel = TRZY.grid.flatMap((l, r2) =>
          l.trim().split(/\s+/).map((c2, c2i) => (c2 === 'W' ? null : c2.slice(1) === cell.slice(1) ? k(c2i, r2) : null)),
        ).filter(Boolean) as string[];
        for (const h of sameLabel) expect(landRegion[h]).toBe(landRegion[k(col, row)]);
      }),
    );
  });

  it('każdy region scenariusza ma dokładnie jeden żeton kolejności konfliktu', () => {
    const s = newGame({ scenario: 'trzy-krainy' });
    const order = regionsInConflictOrder(s);
    expect(order.map((o) => o.token)).toEqual([1, 2, 3]);
    expect(new Set(order.map((o) => o.region)).size).toBe(computeRegions(s.map).regions.length);
  });

  it('rzeka rozdziela sąsiednie pola: nie sąsiadują', () => {
    const map = buildMap(TRZY);
    // (3,3) F2 i (3,2) F1 — wspólna krawędź, ale różne regiony
    expect(map.rivers).toContain(edgeKey(k(3, 3), k(3, 2)));
    expect(areAdjacent(map, k(3, 3), k(3, 2))).toBe(false);
    expect(areAdjacent(map, k(3, 3), k(2, 3))).toBe(true);
  });

  it('woda należy do każdego regionu, z którym graniczy, i sąsiaduje ze wszystkimi polami wokół', () => {
    const map = buildMap(TRZY);
    const { landRegion } = computeRegions(map);
    const water = k(4, 3); // Nil u ujścia: graniczy z Deltą, Zachodem i Wschodem
    const delta = landRegion[k(4, 2)];
    const west = landRegion[k(3, 3)];
    const east = landRegion[k(5, 3)];
    expect(regionsOfHex(map, water)).toEqual([delta, west, east].sort((a, b) => a - b));
    for (const land of [k(4, 2), k(3, 3), k(5, 3)]) expect(areAdjacent(map, water, land)).toBe(true);
    // dwa pola wody o wspólnym regionie też sąsiadują
    expect(areAdjacent(map, water, k(4, 4))).toBe(true);
  });

  it('wielbłądy na krawędziach dzielą region na dwa', () => {
    // pas 2×3 pól żyznych; wielbłądy na wszystkich krawędziach między kolumną 0 i 1
    const terrain: MapState['terrain'] = {};
    for (let r = 0; r < 3; r++) for (let c = 0; c < 2; c++) terrain[k(c, r)] = 'fertile';
    const before: MapState = { terrain, rivers: [], camels: [] };
    expect(computeRegions(before).regions).toHaveLength(1);
    const left = [k(0, 0), k(0, 1), k(0, 2)];
    const right = [k(1, 0), k(1, 1), k(1, 2)];
    const camels = left.flatMap((a) => right.filter((b) => areAdjacent(before, a, b)).map((b) => edgeKey(a, b)));
    const after: MapState = { terrain, rivers: [], camels };
    expect(computeRegions(after).regions).toHaveLength(2);
    expect(areAdjacent(after, k(0, 0), k(1, 0))).toBe(false);
    expect(areAdjacent(after, k(0, 0), k(0, 1))).toBe(true);
  });
});
