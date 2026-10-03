import { GODS } from '../content/gods';
import type { GameState, PlayerId, Task } from './types';

export function log(state: GameState, text: string, player?: PlayerId): void {
  state.log.push({ n: state.log.length + 1, text, ...(player !== undefined ? { player } : {}) });
}

/** Wstawia kroki na początek kolejki, zachowując ich kolejność. */
export function schedule(state: GameState, ...tasks: Task[]): void {
  state.queue.unshift(...tasks);
}

export const godName = (state: GameState, p: PlayerId): string => GODS[state.players[p].god].name;

export class IllegalMoveError extends Error {}
