import { controlMonumentCandidates } from './queries';
import { startCaravan } from './caravan';
import { startConflict } from './conflict';
import { devotionAscending } from './devotion';
import type { EventType } from '../config/rules';
import type { GameState, MonumentId } from './types';
import { godName, log, schedule } from './util';

const EVENT_NAMES: Record<EventType, string> = {
  controlMonument: 'Przejęcie monumentu',
  caravan: 'Karawana',
  conflict: 'Konflikt',
};

export function advanceEvent(state: GameState): void {
  state.eventIndex++;
  const space = state.rules.eventTrack[state.eventIndex];
  log(state, `Wydarzenie ${state.eventIndex + 1}/${state.rules.eventTrack.length}: ${EVENT_NAMES[space.type]}.`);
  schedule(state, { t: 'resolveEvent', event: space.type }, { t: 'afterEvent', index: state.eventIndex });
}

export function resolveEvent(state: GameState, event: EventType): void {
  const p = state.turn.player;
  switch (event) {
    case 'controlMonument': {
      const candidates = controlMonumentCandidates(state, p);
      if (candidates.length) state.pending = { kind: 'controlMonument', player: p, candidates };
      else log(state, `${godName(state, p)} nie może przejąć żadnego monumentu.`, p);
      break;
    }
    case 'caravan':
      startCaravan(state);
      break;
    case 'conflict':
      startConflict(state);
      break;
  }
}

/** Skutki pola toru po rozstrzygnięciu wydarzenia (łączenie, eliminacja — etap 5; koniec gry). */
export function afterEvent(state: GameState, index: number): void {
  const after = state.rules.eventTrack[index].after;
  if (after === 'endGame' || index === state.rules.eventTrack.length - 1) endGameByDevotion(state);
}

export function takeMonument(state: GameState, monument: MonumentId): void {
  const p = state.turn.player;
  const m = state.monuments[monument];
  if (m.owner !== null) {
    state.players[m.owner].ankhPool++;
    log(state, `${godName(state, p)} odbiera monument (${m.type}) bogu ${godName(state, m.owner)}.`, p);
  } else {
    log(state, `${godName(state, p)} przejmuje neutralny monument (${m.type}).`, p);
  }
  m.owner = p;
  state.players[p].ankhPool--;
  state.pending = null;
}

/** Zwycięzca po ostatnim wydarzeniu: najwięcej oddania (stos rozstrzyga remis). */
export function endGameByDevotion(state: GameState): void {
  if (state.result) return;
  const order = devotionAscending(state);
  const best = order[order.length - 1];
  state.result = { winners: [best], reason: `Koniec toru wydarzeń — najwięcej oddania ma ${godName(state, best)}.` };
  state.pending = null;
  state.queue = [];
  log(state, state.result.reason);
}
