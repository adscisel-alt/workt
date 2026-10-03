import {
  afterAction, aimScorpion, aimScorpionTask, anubisTrap, anubisTrapTask, chooseAction, continueSummon, endMove,
  endSummon, moveFigure, mummyReturn, mummyReturnTask, resetMarker, resolveAction, resumeMove, summonFigure,
  unlockPower,
} from './actions';
import {
  afterBattlePhase, afterBattleStep, announceTwoCards, battleAfter, battleBuild, battleCards, battleEnd, battleKill,
  battleMajority, battleObelisk, battlePlague, battleResolution, battleReveal, battleSettle, buildFor, buildMonument,
  conflictEnd, conflictStart, obeliskDone, obeliskMove, placeUnderworld, plagueBid, plagueBidStart, plagueResolve,
  protectAsk, protectFigure, resolveRegion, selectCard, skipBuild, useTiebreaker, worshipful,
} from './conflict';
import { caravan, caravanKeep, caravanSwap } from './caravan';
import { mergeGuardian } from './merge';
import { advanceEvent, afterEvent, resolveEvent, takeMonument } from './events';
import { isLegal } from './legal';
import type { GameState, Move, Task } from './types';
import { IllegalMoveError, log } from './util';

/** Główne API silnika: (stan, ruch) -> nowy stan. Wejściowy stan nie jest modyfikowany. */
export function applyMove(state: GameState, move: Move): GameState {
  if (!isLegal(state, move)) throw new IllegalMoveError(`Nielegalny ruch: ${JSON.stringify(move)}`);
  const next = structuredClone(state);
  dispatch(next, move);
  runQueue(next);
  return next;
}

function dispatch(state: GameState, m: Move): void {
  switch (m.type) {
    case 'chooseAction':
      return chooseAction(state, m.action);
    case 'moveFigure':
      return moveFigure(state, m.figure, m.to, m.push);
    case 'endMove':
      return endMove(state);
    case 'summon':
      return summonFigure(state, m.player, m.figure, m.to, m.source, m.radiant);
    case 'endSummon':
      return endSummon(state);
    case 'unlockPower':
      return unlockPower(state, m.player, m.power);
    case 'controlMonument':
      return takeMonument(state, m.monument);
    case 'selectCard':
      return selectCard(state, m.player, m.card, m.second);
    case 'build':
      return buildMonument(state, m.player, m.monument, m.at);
    case 'skipBuild':
      return skipBuild(state, m.player);
    case 'plagueBid':
      return plagueBid(state, m.player, m.amount);
    case 'useTiebreaker':
      return useTiebreaker(state, m.use);
    case 'aimScorpion':
      return aimScorpion(state, m.figure, m.aim);
    case 'caravan':
      return caravan(state, m.player, m.camels);
    case 'caravanKeep':
      return caravanKeep(state, m.player, m.region);
    case 'caravanSwap':
      return caravanSwap(state, m.player, m.swap);
    case 'obeliskMove':
      return obeliskMove(state, m.player, m.figure, m.to);
    case 'obeliskDone':
      return obeliskDone(state, m.player);
    case 'amunAnnounce':
      return announceTwoCards(state, m.player, m.use);
    case 'anubisTrap':
      return anubisTrap(state, m.player, m.figure);
    case 'isisProtect':
      return protectFigure(state, m.player, m.figure);
    case 'underworld':
      return placeUnderworld(state, m.player, m.from, m.to);
    case 'worshipful':
      return worshipful(state, m.player, m.use);
    case 'mummyReturn':
      return mummyReturn(state, m.figure, m.to, m.radiant);
    case 'mergeGuardian':
      return mergeGuardian(state, m.player, m.figure);
  }
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
    case 'conflictStart':
      return conflictStart(state);
    case 'resolveRegion':
      return resolveRegion(state, task.token);
    case 'conflictEnd':
      return conflictEnd(state);
    case 'battleObelisk':
      return battleObelisk(state);
    case 'battleCards':
      return battleCards(state);
    case 'battleReveal':
      return battleReveal(state);
    case 'battleBuild':
      return battleBuild(state);
    case 'buildFor':
      return buildFor(state, task.player);
    case 'battlePlague':
      return battlePlague(state);
    case 'plagueBid':
      return plagueBidStart(state);
    case 'plagueResolve':
      return plagueResolve(state);
    case 'battleMajority':
      return battleMajority(state);
    case 'battleResolution':
      return battleResolution(state);
    case 'battleSettle':
      return battleSettle(state);
    case 'protectAsk':
      return protectAsk(state, task.player, task.candidates);
    case 'battleKill':
      return battleKill(state);
    case 'battleAfter':
      return battleAfter(state);
    case 'afterBattlePhase':
      return afterBattlePhase(state, task.phase);
    case 'afterBattleStep':
      return afterBattleStep(state, task.phase, task.player);
    case 'battleEnd':
      return battleEnd(state);
    case 'continueSummon':
      return continueSummon(state, task.player, task.used);
    case 'resumeMove':
      return resumeMove(state, task.player, task.moved);
    case 'aimScorpion':
      return aimScorpionTask(state, task.figure);
    case 'mummyReturn':
      return mummyReturnTask(state, task.figure);
    case 'anubisTrap':
      return anubisTrapTask(state, task.player, task.candidates);
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
