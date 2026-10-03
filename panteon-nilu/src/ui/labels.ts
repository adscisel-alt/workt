import type { ActionType, EventType } from '../config/rules';
import { GODS } from '../content/gods';
import { GUARDIANS } from '../content/guardians';
import { godName } from '../engine/util';
import type { GameState, MonumentType } from '../engine/types';

export const ACTION_LABEL: Record<ActionType, string> = {
  move: 'Ruch',
  summon: 'Przywołanie',
  followers: 'Wyznawcy',
  unlock: 'Odblokowanie mocy',
};

export const ACTION_HINT: Record<ActionType, string> = {
  move: 'Każda figurka do 3 pól',
  summon: '1 figurka z puli obok Twojej figurki lub monumentu',
  followers: '+1 za każdy monument (Twój lub neutralny) obok Twojej figurki',
  unlock: 'Poświęć wyznawców: 1 / 2 / 3 wg poziomu',
};

export const EVENT_LABEL: Record<EventType, string> = {
  controlMonument: 'Przejęcie monumentu',
  caravan: 'Karawana',
  conflict: 'Konflikt',
};

export const MONUMENT_LABEL: Record<MonumentType, string> = {
  obelisk: 'Obelisk',
  temple: 'Świątynia',
  pyramid: 'Piramida',
};

/** Czytelna nazwa figurki, np. „Wojownik (uwięziony)”, „Satet”. */
export function figureLabel(state: GameState, id: string): string {
  const f = state.figures[id];
  if (!f) return id;
  if (f.kind === 'guardian') return GUARDIANS[f.guardian!].name;
  if (f.kind === 'god') return 'Bóg';
  return f.trappedBy !== undefined ? 'Wojownik (uwięziony — 1 wyznawca)' : 'Wojownik';
}

/** Nazwa miejsca przy stole: po połączeniu „Izyda (gra jako Ra-Izyda)”. */
export function seatLabel(state: GameState, seat: number): string {
  const p = state.players[seat];
  const own = GODS[p.god].name;
  return p.mergedInto !== undefined ? `${own} (gra jako ${godName(state, seat)})` : godName(state, seat);
}
