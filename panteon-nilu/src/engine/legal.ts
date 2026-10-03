import {
  availableActions, boardFiguresOf, moveDestinations, nextUnlock, summonTargets, summonableFigures,
} from './queries';
import type { GameState, Move } from './types';

/** Pełna lista legalnych ruchów w bieżącym stanie. UI i bot tylko z niej wybierają. */
export function legalMoves(state: GameState): Move[] {
  const pending = state.pending;
  if (!pending || state.result) return [];
  const player = pending.player;
  switch (pending.kind) {
    case 'chooseAction':
      return availableActions(state).map((action) => ({ type: 'chooseAction', player, action }));
    case 'move': {
      const out: Move[] = [];
      for (const f of boardFiguresOf(state, player)) {
        if (pending.moved.includes(f.id)) continue;
        for (const to of moveDestinations(state, f.id)) out.push({ type: 'moveFigure', player, figure: f.id, to });
      }
      out.push({ type: 'endMove', player });
      return out;
    }
    case 'summon': {
      const targets = summonTargets(state, player);
      return summonableFigures(state, player).flatMap((f) =>
        targets.map((to): Move => ({ type: 'summon', player, figure: f.id, to })),
      );
    }
    case 'unlock':
      return (nextUnlock(state, player)?.options ?? []).map((power) => ({ type: 'unlockPower', player, power }));
    case 'controlMonument':
      return pending.candidates.map((monument) => ({ type: 'controlMonument', player, monument }));
  }
}

/** Stabilny klucz ruchu (do porównań i testów). */
export function moveKey(m: Move): string {
  return JSON.stringify(Object.keys(m).sort().map((k) => [k, (m as Record<string, unknown>)[k]]));
}

export function isLegal(state: GameState, move: Move): boolean {
  const key = moveKey(move);
  return legalMoves(state).some((m) => moveKey(m) === key);
}
