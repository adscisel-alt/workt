import { ANKH_POWERS } from '../content/ankhPowers';
import { GUARDIANS } from '../content/guardians';
import type { ActionType } from '../config/rules';
import {
  availableActions, boardFiguresOf, followersGain, moveDestinations, nextUnlock, summonTargets,
  summonableFigures,
} from './queries';
import type { FigureId, GameState, PlayerId } from './types';
import { godName, log, schedule } from './util';

const ACTION_NAMES: Record<ActionType, string> = {
  move: 'Ruch',
  summon: 'Przywołanie',
  followers: 'Wyznawcy',
  unlock: 'Odblokowanie mocy',
};

export function chooseAction(state: GameState, action: ActionType): void {
  const p = state.turn.player;
  const track = state.rules.actionTracks[action];
  state.actionTracks[action]++;
  state.turn.actions.push(action);
  log(state, `${godName(state, p)} wybiera akcję: ${ACTION_NAMES[action]}.`, p);
  if (state.actionTracks[action] >= track.length - 1) state.turn.triggered = action;
  state.pending = null;
  schedule(state, { t: 'resolveAction', action }, { t: 'afterAction', action });
}

export function resolveAction(state: GameState, action: ActionType): void {
  const p = state.turn.player;
  switch (action) {
    case 'move': {
      const movable = boardFiguresOf(state, p).some((f) => moveDestinations(state, f.id).length > 0);
      if (movable) state.pending = { kind: 'move', player: p, moved: [] };
      else log(state, 'Żadna figurka nie może się ruszyć.', p);
      return;
    }
    case 'summon': {
      if (summonableFigures(state, p).length && summonTargets(state, p).length) {
        state.pending = { kind: 'summon', player: p };
      } else log(state, 'Brak figurki w puli lub wolnego pola — przywołanie bez efektu.', p);
      return;
    }
    case 'followers': {
      const gain = followersGain(state, p);
      state.players[p].followers += gain;
      log(state, `${godName(state, p)} zyskuje ${gain} wyznawców.`, p);
      return;
    }
    case 'unlock': {
      const next = nextUnlock(state, p);
      if (next && next.options.length) state.pending = { kind: 'unlock', player: p, level: next.level };
      else log(state, 'Nie można odblokować mocy — akcja bez efektu.', p);
      return;
    }
  }
}

export function afterAction(state: GameState): void {
  if (state.turn.triggered) {
    schedule(state, { t: 'advanceEvent' }, { t: 'resetMarker', action: state.turn.triggered }, { t: 'endTurn' });
  } else if (availableActions(state).length) {
    state.pending = { kind: 'chooseAction', player: state.turn.player };
  } else {
    schedule(state, { t: 'endTurn' });
  }
}

export function resetMarker(state: GameState, action: ActionType): void {
  state.actionTracks[action] = state.rules.actionTracks[action].start[state.playerCount];
}

export function moveFigure(state: GameState, figure: FigureId, to: string): void {
  const pending = state.pending;
  if (pending?.kind !== 'move') return;
  const fig = state.figures[figure];
  const from = fig.pos;
  fig.pos = to;
  pending.moved.push(figure);
  log(state, `${godName(state, fig.owner)}: ${figure} ${from} → ${to}.`, fig.owner);
  const remaining = boardFiguresOf(state, pending.player).some((f) => !pending.moved.includes(f.id));
  if (!remaining) state.pending = null;
}

export function endMove(state: GameState): void {
  state.pending = null;
}

export function summonFigure(state: GameState, figure: FigureId, to: string): void {
  const fig = state.figures[figure];
  fig.pos = to;
  log(state, `${godName(state, fig.owner)} przywołuje ${figure} na ${to}.`, fig.owner);
  state.pending = null;
}

export function unlockPower(state: GameState, p: PlayerId, power: keyof typeof ANKH_POWERS): void {
  const next = nextUnlock(state, p)!;
  const player = state.players[p];
  player.followers -= next.cost;
  player.unlocked.push(power);
  log(state, `${godName(state, p)} poświęca ${next.cost} wyznawców i odblokowuje moc „${ANKH_POWERS[power].name}”.`, p);
  if (state.rules.guardianSlots.includes(next.slot)) gainGuardian(state, p, next.level);
  state.pending = null;
}

export function gainGuardian(state: GameState, p: PlayerId, level: 1 | 2 | 3): void {
  const type = state.guardianCards[level];
  const def = GUARDIANS[type];
  const player = state.players[p];
  if (!state.guardianSupply[type]) {
    log(state, `Brak wolnych figurek: ${def.name}.`, p);
    return;
  }
  if (player.bases[def.size] <= 0) {
    log(state, `Brak wolnej podstawki — ${def.name} nie dołącza.`, p);
    return;
  }
  state.guardianSupply[type]!--;
  player.bases[def.size]--;
  let i = 1;
  while (state.figures[`${type}-${i}`]) i++;
  const id = `${type}-${i}`;
  state.figures[id] = { id, owner: p, kind: 'guardian', guardian: type, pos: null };
  log(state, `${godName(state, p)} zyskuje strażnika: ${def.name}.`, p);
}
