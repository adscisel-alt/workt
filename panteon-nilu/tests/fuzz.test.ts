import { legalMoves } from '../src/engine';
import { isLand } from '../src/engine/map';
import type { GameState } from '../src/engine/types';
import { GODS5, newGame, randomPlayout } from './helpers';

function checkInvariants(s: GameState) {
  const occupied = new Map<string, string>();
  for (const f of Object.values(s.figures)) {
    if (f.pos === null) continue;
    expect(isLand(s.map, f.pos), `figurka ${f.id} poza lądem`).toBe(true);
    expect(occupied.has(f.pos), `pole ${f.pos} zajęte podwójnie`).toBe(false);
    occupied.set(f.pos, f.id);
  }
  for (const m of Object.values(s.monuments)) {
    expect(occupied.has(m.pos), `pole ${m.pos} zajęte podwójnie`).toBe(false);
    occupied.set(m.pos, m.id);
  }
  for (const p of s.players) {
    expect(p.followers).toBeGreaterThanOrEqual(0);
    const onMonuments = Object.values(s.monuments).filter((m) => m.owner === p.id).length;
    expect(p.ankhPool + onMonuments).toBe(s.rules.ankhTokensPerGod - s.rules.dashboardSlots);
  }
  if (!s.result) expect(legalMoves(s).length).toBeGreaterThan(0);
}

describe('losowe rozgrywki (tylko legalne ruchy z generatora)', () => {
  it.each([
    ['trzy-krainy', 2, 1],
    ['trzy-krainy', 2, 2],
    ['test', 3, 3],
    ['test', 4, 4],
    ['test', 5, 5],
  ] as const)('%s, %i graczy, ziarno %i: do końca gry bez błędów, niezmienniki zachowane', (scenario, n, seed) => {
    const start = newGame({ ...(scenario === 'test' ? {} : { scenario }), gods: GODS5.slice(0, n), seed });
    let s = start;
    for (let chunk = 0; chunk < 100 && !s.result; chunk++) {
      s = randomPlayout(s, seed * 1000 + chunk, 50).state;
      checkInvariants(s);
      expect(JSON.parse(JSON.stringify(s))).toEqual(s);
    }
    expect(s.result).not.toBeNull();
  });

  it('determinizm: to samo ziarno i te same ruchy dają identyczny stan', () => {
    const a = randomPlayout(newGame({ scenario: 'trzy-krainy', seed: 9 }), 123, 300);
    const b = randomPlayout(newGame({ scenario: 'trzy-krainy', seed: 9 }), 123, 300);
    expect(a.moves).toEqual(b.moves);
    expect(a.state).toEqual(b.state);
  });
});
