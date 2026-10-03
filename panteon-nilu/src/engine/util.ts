import { GODS } from '../content/gods';
import type { GameState, PlayerId, Task } from './types';

export function log(state: GameState, text: string, player?: PlayerId): void {
  state.log.push({ n: state.log.length + 1, text, ...(player !== undefined ? { player } : {}) });
}

/** Wstawia kroki na początek kolejki, zachowując ich kolejność. */
export function schedule(state: GameState, ...tasks: Task[]): void {
  state.queue.unshift(...tasks);
}

/** Bóg, którym steruje dane miejsce przy stole (po połączeniu — bóg „wyższy”). */
export const entityOf = (state: GameState, seat: PlayerId): PlayerId => state.players[seat].mergedInto ?? seat;

/** Czy gracz jest samodzielnym bogiem w grze (nie zapomniany i nie wchłonięty). */
export const isEntity = (state: GameState, p: PlayerId): boolean =>
  !state.players[p].eliminated && state.players[p].mergedInto === undefined;

/** Miejsca przy stole sterujące danym bogiem (1 albo 2 po połączeniu). */
export const seatsOf = (state: GameState, entity: PlayerId): PlayerId[] =>
  state.players.filter((p) => p.id === entity || p.mergedInto === entity).map((p) => p.id);

/** Nazwa boga (połączony: „Amun-Ra”). */
export const godName = (state: GameState, p: PlayerId): string => {
  const e = state.players[entityOf(state, p)];
  return [e.god, ...e.extraGods].map((g) => GODS[g].name).join('-');
};

export class IllegalMoveError extends Error {}
