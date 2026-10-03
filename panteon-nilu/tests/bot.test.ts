import { botMove, type Controller } from '../src/bot';
import { applyMove, isLegal, legalMoves } from '../src/engine';
import { pendingPlayers } from '../src/engine/legal';
import type { GameState, GodId } from '../src/engine/types';
import { card, clearBoard, conflictNow, GODS5, newGame, place, R1 } from './helpers';

/** Rozgrywa partię botami; zwraca stan końcowy. Każdy ruch bota jest sprawdzany przez silnik (applyMove). */
export function botGame(state: GameState, controllers: Exclude<Controller, 'human'>[], seed: number, maxMoves = 4000): GameState {
  let s = state;
  for (let i = 0; i < maxMoves && !s.result; i++) {
    const seat = pendingPlayers(s.pending)[0];
    const m = botMove(s, seat, controllers[seat], seed + i);
    if (!m) throw new Error(`Bot nie zwrócił ruchu: ${JSON.stringify(s.pending)}`);
    s = applyMove(s, m);
  }
  return s;
}

describe('bot losowy', () => {
  it.each([2, 3, 4, 5])('%i botów losowych kończy partię legalnymi ruchami', (n) => {
    const s = botGame(newGame({ scenario: 'trzy-krainy', gods: GODS5.slice(0, n), seed: n }, true), Array(n).fill('random'), 11);
    expect(s.result).not.toBeNull();
  });

  it('jest deterministyczny dla tego samego ziarna', () => {
    const a = botGame(newGame({ scenario: 'trzy-krainy', seed: 3 }, true), ['random', 'random'], 5);
    const b = botGame(newGame({ scenario: 'trzy-krainy', seed: 3 }, true), ['random', 'random'], 5);
    expect(a).toEqual(b);
  });

  it('nie rusza się, gdy decyzja nie należy do niego', () => {
    expect(botMove(newGame(), 1, 'random', 1)).toBeNull();
  });
});

describe('bot heurystyczny', () => {
  it('zwraca legalny ruch w każdej sytuacji partii (vs bot losowy)', () => {
    let s = newGame({ scenario: 'trzy-krainy', seed: 21 }, true);
    for (let i = 0; i < 4000 && !s.result; i++) {
      const seat = pendingPlayers(s.pending)[0];
      const m = botMove(s, seat, seat === 0 ? 'heuristic' : 'random', i)!;
      expect(isLegal(s, m)).toBe(true);
      s = applyMove(s, m);
    }
    expect(s.result).not.toBeNull();
  });

  it('nie podgląda tajnego wyboru rywala (decyzja zależy tylko od własnego widoku)', () => {
    const s0 = clearBoard(newGame());
    place(s0, 'p0-god', R1.fertile[0]);
    place(s0, 'p1-god', R1.fertile[1]);
    place(s0, 'p1-w1', R1.fertile[2]);
    const base = conflictNow(s0);
    const choices = (['chariots', 'plague', 'miracle', 'maat'] as const).map((c) => {
      const s = applyMove(base, card(1, c));
      return botMove(s, 0, 'heuristic');
    });
    expect(new Set(choices.map((m) => JSON.stringify(m))).size).toBe(1);
  });

  it('w remisie używa żetonu rozstrzygającego', () => {
    const s0 = clearBoard(newGame());
    place(s0, 'p0-god', R1.fertile[0]);
    place(s0, 'p1-god', R1.fertile[1]);
    const s = applyMove(applyMove(conflictNow(s0), card(0, 'maat')), card(1, 'maat'));
    expect(botMove(s, 0, 'heuristic')).toEqual({ type: 'useTiebreaker', player: 0, use: true });
  });

  it('wygrywa z botem losowym w większości partii', () => {
    let wins = 0;
    const games = 8;
    const gods: [GodId, GodId][] = [['amun', 'ra'], ['ra', 'amun'], ['isis', 'osiris'], ['osiris', 'isis']];
    for (let g = 0; g < games; g++) {
      const heuristicSeat = g % 2;
      const controllers: Exclude<Controller, 'human'>[] = heuristicSeat === 0 ? ['heuristic', 'random'] : ['random', 'heuristic'];
      const s = botGame(newGame({ scenario: 'trzy-krainy', gods: gods[g % 4], seed: 100 + g }, true), controllers, g * 7);
      if (s.result!.winners.includes(heuristicSeat)) wins++;
    }
    expect(wins).toBeGreaterThanOrEqual(6);
  }, 120000);

  it('legalMoves nie jest puste, gdy bot ma decyzję', () => {
    expect(legalMoves(newGame()).length).toBeGreaterThan(0);
  });
});
