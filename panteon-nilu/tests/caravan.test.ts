import type { ScenarioDef } from '../src/config/scenarios';
import { applyMove, legalMoves } from '../src/engine';
import { caravanOptions } from '../src/engine/caravan';
import { computeRegions, regionsInConflictOrder } from '../src/engine/map';
import type { GameState } from '../src/engine/types';
import { act, k, newGame, play } from './helpers';

/** Jeden rząd n pól lądowych — jedyne cięcia to pojedyncze krawędzie od brzegu do brzegu. */
function row(n: number): ScenarioDef {
  return {
    id: `row${n}`, name: 'Rząd', playerCounts: [2],
    grid: [Array(n).fill('F1').join(' ')],
    conflictTokens: { 1: [0, 0] },
    monuments: [],
    starts: { 2: [{ god: [0, 0], warriors: [], monuments: [] }, { god: [n - 1, 0], warriors: [], monuments: [] }] },
  };
}

/** Wyzwala wydarzenie Karawana (pole 5 toru) akcją Wyznawców gracza 0. */
function triggerCaravan(s: GameState): GameState {
  s.eventIndex = 3;
  s.actionTracks.followers = s.rules.actionTracks.followers.length - 2;
  return play(s, act(0, 'followers'));
}

describe('wydarzenie Karawana', () => {
  it('pole 5 toru wydarzeń to Karawana', () => {
    expect(newGame().rules.eventTrack[4].type).toBe('caravan');
  });

  it('oba nowe regiony muszą mieć ≥6 pól lądowych', () => {
    expect(caravanOptions(newGame({ scenario: row(11) }))).toEqual([]);
    expect(caravanOptions(newGame({ scenario: row(12) }))).toEqual([['5,0|6,0']]);
    expect(caravanOptions(newGame({ scenario: row(13) }))).toHaveLength(2);
  });

  it('każda opcja: 1–6 wielbłądów na krawędziach między polami lądowymi jednego regionu, bez rzek; dzieli region na dwa', () => {
    const s = newGame({ scenario: 'trzy-krainy' });
    const opts = caravanOptions(s);
    expect(opts.length).toBeGreaterThan(0);
    const before = computeRegions(s.map);
    for (const camels of opts) {
      expect(camels.length).toBeGreaterThanOrEqual(1);
      expect(camels.length).toBeLessThanOrEqual(6);
      for (const e of camels) {
        const [a, b] = e.split('|');
        expect(s.map.terrain[a]).not.toBe('water');
        expect(s.map.terrain[b]).not.toBe('water');
        expect(s.map.rivers).not.toContain(e);
        expect(before.landRegion[a]).toBe(before.landRegion[b]);
      }
      const after = computeRegions({ ...s.map, camels });
      expect(after.regions.length).toBe(before.regions.length + 1);
      expect(Math.min(...after.regions.map((r) => r.length))).toBeGreaterThanOrEqual(6);
    }
  });

  it('brak wielbłądów w zapasie — brak karawany', () => {
    const s = newGame({ scenario: row(12) });
    s.camelSupply = 0;
    expect(caravanOptions(s)).toEqual([]);
  });

  it('przebieg: linia → wybór regionu dla starego żetonu → najniższy żeton z zapasu → opcjonalna zamiana', () => {
    let s = triggerCaravan(newGame({ scenario: row(12) }));
    expect(s.pending).toEqual({ kind: 'caravan', player: 0 });
    s = applyMove(s, legalMoves(s)[0]);
    expect(s.map.camels).toEqual(['5,0|6,0']);
    expect(s.camelSupply).toBe(29);
    // regiony wskazywane reprezentantem (najmniejszy klucz pola w regionie)
    expect(s.pending).toEqual({ kind: 'caravanKeep', player: 0, token: 1, regions: ['0,0', '10,0'] });
    s = applyMove(s, { type: 'caravanKeep', player: 0, region: '10,0' });
    expect(s.conflictTokens).toEqual({ 1: '10,0', 2: '0,0' });
    expect(s.conflictTokenSupply).not.toContain(2);
    expect(legalMoves(s)).toContainEqual({ type: 'caravanSwap', player: 0, swap: [1, 2] });
    s = applyMove(s, { type: 'caravanSwap', player: 0, swap: [1, 2] });
    expect(s.conflictTokens).toEqual({ 1: '0,0', 2: '10,0' });
    expect(regionsInConflictOrder(s).map((r) => r.token)).toEqual([1, 2]);
    expect(s.turn.player).toBe(1);
  });

  it('wielbłąd przerywa sąsiedztwo: przywołanie nie sięga za linię', () => {
    let s = triggerCaravan(newGame({ scenario: row(12) }));
    s = play(s, legalMoves(s)[0], { type: 'caravanKeep', player: 0, region: '0,0' }, { type: 'caravanSwap', player: 0, swap: null });
    s.figures['p0-god'].pos = k(5, 0);
    s.figures['p1-god'].pos = null;
    s.turn = { player: 0, actions: [], triggered: null };
    s.pending = { kind: 'chooseAction', player: 0 };
    s = play(s, act(0, 'summon'));
    const targets = legalMoves(s).filter((m) => m.type === 'summon').map((m) => (m as { to: string }).to);
    expect(targets).toContain(k(4, 0));
    expect(targets).not.toContain(k(6, 0));
  });
});
