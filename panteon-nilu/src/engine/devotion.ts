import type { GameState, PlayerId } from './types';
import { godName, log } from './util';

/** Gracze od najmniejszego do największego oddania (stos rozstrzyga remis pola). */
export function devotionAscending(state: GameState): PlayerId[] {
  return state.players
    .filter((p) => !p.eliminated)
    .sort((a, b) => a.devotion - b.devotion || a.devotionSeq - b.devotionSeq)
    .map((p) => p.id);
}

export const isInRed = (state: GameState, p: PlayerId): boolean =>
  state.players[p].devotion <= state.rules.devotion.redMax;

/**
 * Zmienia oddanie jednego gracza. Żeton wchodzący na pole trafia na szczyt stosu.
 * Dotarcie do szczytu toru = natychmiastowa wygrana.
 */
export function changeDevotion(state: GameState, p: PlayerId, delta: number, reason: string): void {
  if (delta === 0 || state.result) return;
  const player = state.players[p];
  const before = player.devotion;
  const after = Math.max(0, Math.min(state.rules.devotion.top, before + delta));
  if (after === before) return;
  player.devotion = after;
  player.devotionSeq = ++state.devotionSeqCounter;
  log(state, `${godName(state, p)}: ${delta > 0 ? '+' : ''}${after - before} oddania (${reason}) → ${after}.`, p);
  if (after === state.rules.devotion.top) {
    state.result = { winners: [p], reason: `${godName(state, p)} osiąga szczyt toru oddania.` };
    state.pending = null;
    log(state, state.result.reason, p);
  }
}

/** Jednoczesne zmiany oddania: od gracza z najmniejszym oddaniem rosnąco (s. 11). */
export function changeDevotionSimultaneous(
  state: GameState,
  deltas: Partial<Record<PlayerId, number>>,
  reason: string,
): void {
  for (const p of devotionAscending(state)) {
    const d = deltas[p];
    if (d) changeDevotion(state, p, d, reason);
  }
}
