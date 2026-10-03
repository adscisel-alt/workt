import { legalMoves } from '../engine/legal';
import { rngStep } from '../engine/rng';
import type { GameState, Move, PlayerId } from '../engine/types';

/** Bot losowy: dowolny legalny ruch danego gracza (deterministyczny wg ziarna). */
export function randomMove(state: GameState, seat: PlayerId, seed: number): Move | null {
  const mine = legalMoves(state).filter((m) => m.player === seat);
  if (!mine.length) return null;
  const [v] = rngStep(seed >>> 0);
  return mine[Math.floor(v * mine.length)];
}
