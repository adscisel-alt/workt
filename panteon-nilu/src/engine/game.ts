import {
  afterAction, chooseAction, endMove, moveFigure, resetMarker, resolveAction, summonFigure, unlockPower,
} from './actions';
import { advanceEvent, afterEvent, resolveEvent, takeMonument } from './events';
import { isLegal } from './legal';
import type { GameState, Move, Task } from './types';
import { IllegalMoveError, log } from './util';

/** Główne API silnika: (stan, ruch) -> nowy stan. Wejściowy stan nie jest modyfikowany. */
export function applyMove(state: GameState, move: Move): GameState {
  if (!isLegal(state, move)) throw new IllegalMoveError(`Nielegalny ruch: ${JSON.stringify(move)}`);
  const next = structuredClone(state);
  switch (move.type) {
    case 'chooseAction':
      chooseAction(next, move.action);
      break;
    case 'moveFigure':
      moveFigure(next, move.figure, move.to);
      break;
    case 'endMove':
      endMove(next);
      break;
    case 'summon':
      summonFigure(next, move.figure, move.to);
      break;
    case 'unlockPower':
      unlockPower(next, move.player, move.power);
      break;
    case 'controlMonument':
      takeMonument(next, move.monument);
      break;
  }
  runQueue(next);
  return next;
}

function runTask(state: GameState, task: Task): void {
  switch (task.t) {
    case 'resolveAction':
      return resolveAction(state, task.action);
    case 'afterAction':
      return afterAction(state);
    case 'advanceEvent':
      return advanceEvent(state);
    case 'resolveEvent':
      return resolveEvent(state, task.event);
    case 'afterEvent':
      return afterEvent(state, task.index);
    case 'resetMarker':
      return resetMarker(state, task.action);
    case 'endTurn':
      return endTurn(state);
  }
}

/** Wykonuje zaplanowane kroki, aż silnik będzie czekał na decyzję albo gra się skończy. */
export function runQueue(state: GameState): void {
  while (!state.pending && !state.result && state.queue.length) runTask(state, state.queue.shift()!);
}

function endTurn(state: GameState): void {
  const n = state.players.length;
  let next = state.turn.player;
  do next = (next + 1) % n;
  while (state.players[next].eliminated && next !== state.turn.player);
  state.turn = { player: next, actions: [], triggered: null };
  state.turnNumber++;
  state.pending = { kind: 'chooseAction', player: next };
  log(state, `— Tura ${state.turnNumber} —`, next);
}
