import type { GameState, PlayerId } from './types';

/**
 * Widok stanu dla danego gracza: ukrywa tajne informacje innych graczy
 * (zakryte karty bitwy przed odkryciem i oferty w licytacji plagi).
 * `viewer = null` — widz bez tajnych informacji (np. ekran przekazania urządzenia).
 */
export function viewFor(state: GameState, viewer: PlayerId | null): GameState {
  if (!state.battle) return state;
  const view = structuredClone(state);
  const b = view.battle!;
  b.selected = viewer !== null && b.selected[viewer] ? { [viewer]: b.selected[viewer] } : {};
  b.bids = viewer !== null && b.bids[viewer] !== undefined ? { [viewer]: b.bids[viewer] } : {};
  return view;
}
