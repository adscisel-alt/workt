import type { ActionType, EventType } from '../config/rules';
import type { MonumentType } from '../engine/types';

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
