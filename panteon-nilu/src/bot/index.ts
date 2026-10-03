import { pendingPlayers } from '../engine/legal';
import type { GameState, Move, PlayerId } from '../engine/types';
import { heuristicMove } from './heuristic';
import { randomMove } from './random';

export type Controller = 'human' | 'random' | 'heuristic';

/** Ruch bota dla danego miejsca albo null, gdy silnik nie czeka na jego decyzję. */
export function botMove(state: GameState, seat: PlayerId, kind: Exclude<Controller, 'human'>, seed = 0): Move | null {
  if (!pendingPlayers(state.pending).includes(seat)) return null;
  return kind === 'random' ? randomMove(state, seat, seed ^ (state.log.length * 2654435761)) : heuristicMove(state, seat);
}

/** Kto teraz decyduje i czy to bot (pierwszy z oczekujących, którym steruje bot). */
export function nextBotSeat(state: GameState, controllers: Controller[]): PlayerId | null {
  return pendingPlayers(state.pending).find((p) => controllers[p] !== 'human') ?? null;
}

export { evaluate } from './evaluate';
