import type { ScenarioDef } from '../src/config/scenarios';
import type { Cell } from '../src/config/scenarios/types';
import { applyMove, createGame, legalMoves, type GameState, type GodId, type Move } from '../src/engine';
import { offsetKey } from '../src/engine/hex';
import { rngStep } from '../src/engine/rng';

export const k = (c: number, r: number) => offsetKey(c, r);

export const GODS5: GodId[] = ['amun', 'ra', 'isis', 'osiris', 'anubis'];

/** Mała plansza testowa obsługująca 2–5 graczy: dwa regiony (rzeka między kolumnami 3 i 4) i woda. */
export const TEST_SCENARIO: ScenarioDef = {
  id: 'test',
  name: 'Test',
  playerCounts: [2, 3, 4, 5],
  grid: [
    'F1 F1 F1 F1 D2 D2 D2 D2',
    'F1 F1 F1 F1 D2 D2 D2 D2',
    'F1 F1 W  F1 D2 D2 D2 D2',
    'F1 F1 F1 F1 D2 D2 D2 D2',
    'D1 D1 D1 D1 F2 F2 F2 F2',
    'D1 D1 D1 D1 F2 F2 F2 F2',
  ],
  conflictTokens: { 1: [0, 0], 2: [7, 0] },
  monuments: [],
  starts: Object.fromEntries(
    [2, 3, 4, 5].map((n) => [
      n,
      Array.from({ length: n }, (_, i) => ({ god: [i, 5] as Cell, warriors: [], monuments: [] })),
    ]),
  ),
};

export function newGame(overrides: Partial<Parameters<typeof createGame>[0]> = {}): GameState {
  return createGame({
    scenario: TEST_SCENARIO,
    gods: ['amun', 'ra'],
    seed: 42,
    firstPlayer: 0,
    guardianCards: { 1: 'catMummy', 2: 'mummy', 3: 'androsphinx' },
    ...overrides,
  });
}

/** Czyści planszę z figurek (wszystkie do puli) i monumentów — do precyzyjnych ustawień w testach. */
export function clearBoard(state: GameState): GameState {
  for (const f of Object.values(state.figures)) f.pos = null;
  state.monuments = {};
  return state;
}

export function place(state: GameState, figureId: string, hex: string): GameState {
  state.figures[figureId].pos = hex;
  return state;
}

export function addMonument(
  state: GameState,
  type: 'obelisk' | 'temple' | 'pyramid',
  hex: string,
  owner: number | null,
): string {
  const id = `m${state.nextMonumentId++}`;
  state.monuments[id] = { id, type, pos: hex, owner };
  return id;
}

export function play(state: GameState, ...moves: Move[]): GameState {
  return moves.reduce((s, m) => applyMove(s, m), state);
}

export const act = (player: number, action: 'move' | 'summon' | 'followers' | 'unlock'): Move => ({
  type: 'chooseAction',
  player,
  action,
});

/** Rozgrywa losowe legalne ruchy (deterministycznie wg ziarna). */
export function randomPlayout(state: GameState, seed: number, maxMoves: number): { state: GameState; moves: Move[] } {
  let s = state;
  let r = seed >>> 0;
  const moves: Move[] = [];
  for (let i = 0; i < maxMoves && !s.result; i++) {
    const legal = legalMoves(s);
    if (!legal.length) throw new Error(`Brak legalnych ruchów przy pending=${JSON.stringify(s.pending)}`);
    const [v, next] = rngStep(r);
    r = next;
    const m = legal[Math.floor(v * legal.length)];
    moves.push(m);
    s = applyMove(s, m);
  }
  return { state: s, moves };
}
