import { areNeighbors, edgeHexes, edgeKey, hexDistance, neighborKeys, offsetToAxial, parseHex } from '../src/engine/hex';

describe('heksy (współrzędne osiowe)', () => {
  it('każdy heks ma 6 sąsiadów w odległości 1', () => {
    const ns = neighborKeys('0,0');
    expect(ns).toHaveLength(6);
    for (const n of ns) expect(hexDistance({ q: 0, r: 0 }, parseHex(n))).toBe(1);
  });

  it('klucz krawędzi jest kanoniczny', () => {
    expect(edgeKey('1,0', '0,0')).toBe(edgeKey('0,0', '1,0'));
    expect(edgeHexes(edgeKey('1,0', '0,0'))).toEqual(['0,0', '1,0']);
  });

  it('konwersja odd-r: wiersze nieparzyste przesunięte w prawo', () => {
    expect(offsetToAxial(0, 0)).toEqual({ q: 0, r: 0 });
    expect(offsetToAxial(0, 1)).toEqual({ q: 0, r: 1 });
    expect(offsetToAxial(0, 2)).toEqual({ q: -1, r: 2 });
    // (0,0) i (0,1) oraz (1,0) i (0,1) sąsiadują w układzie odd-r
    const k = (c: number, r: number) => {
      const a = offsetToAxial(c, r);
      return `${a.q},${a.r}`;
    };
    expect(areNeighbors(k(0, 0), k(0, 1))).toBe(true);
    expect(areNeighbors(k(1, 0), k(0, 1))).toBe(true);
    expect(areNeighbors(k(2, 0), k(0, 1))).toBe(false);
  });
});
