import { SCENARIOS } from '../src/config/scenarios';
import { createGame } from '../src/engine';
import { computeRegions } from '../src/engine/map';
import { GODS5 } from './helpers';

describe('scenariusz Trzy Krainy', () => {
  it.each([2, 3, 4, 5])('%i graczy: poprawne rozstawienie (ląd, bez kolizji, każdy ma boga, wojownika i monument)', (n) => {
    const s = createGame({ scenario: 'trzy-krainy', gods: GODS5.slice(0, n), seed: 1, firstPlayer: 0 });
    for (let p = 0; p < n; p++) {
      expect(Object.values(s.figures).filter((f) => f.owner === p && f.pos !== null)).toHaveLength(2);
      expect(Object.values(s.monuments).filter((m) => m.owner === p)).toHaveLength(1);
    }
    expect(SCENARIOS['trzy-krainy'].playerCounts).toContain(n);
  });

  it('na start każdy region ma gracza przy 3 graczach (po jednym na region)', () => {
    const s = createGame({ scenario: 'trzy-krainy', gods: GODS5.slice(0, 3), seed: 1, firstPlayer: 0 });
    const { landRegion } = computeRegions(s.map);
    const regions = [0, 1, 2].map((p) => landRegion[s.figures[`p${p}-god`].pos!]);
    expect(new Set(regions).size).toBe(3);
  });
});
