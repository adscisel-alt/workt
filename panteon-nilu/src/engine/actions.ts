import { ANKH_POWERS } from '../content/ankhPowers';
import { GUARDIANS } from '../content/guardians';
import type { ActionType } from '../config/rules';
import { anyHook, forEachHook } from './hooks';
import { adjacentHexes, figureAt } from './map';
import {
  aimOptions, availableActions, boardFiguresOf, canPlace, followersGain, moveOptions, nextUnlock, summonOptions,
} from './queries';
import type { Figure, FigureId, GameState, HexKey, PlayerId, Task } from './types';
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
      if (canStillMove(state, p, [])) state.pending = { kind: 'move', player: p, moved: [] };
      else log(state, 'Żadna figurka nie może się ruszyć.', p);
      return;
    }
    case 'summon': {
      if (summonOptions(state, p, []).length) state.pending = { kind: 'summon', player: p, used: [] };
      else log(state, 'Brak figurki w puli lub wolnego pola — przywołanie bez efektu.', p);
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

// ---------- Ruch ----------

const canStillMove = (state: GameState, p: PlayerId, moved: FigureId[]) =>
  boardFiguresOf(state, p).some((f) => !moved.includes(f.id) && moveOptions(state, f.id).length > 0);

/** Zadania celowania dla skorpionów, które właśnie stanęły lub się przesunęły. */
function aimTasks(state: GameState, figures: Figure[]): Task[] {
  return figures
    .filter((f) => anyHook(state, f.owner, (h, ctx) => h.needsAim?.({ ...ctx, figure: f })))
    .map((f) => ({ t: 'aimScorpion' as const, figure: f.id }));
}

export function moveFigure(state: GameState, figure: FigureId, to: HexKey, push: HexKey | null): void {
  const pending = state.pending;
  if (pending?.kind !== 'move') return;
  const fig = state.figures[figure];
  const from = fig.pos;
  const moved: Figure[] = [fig];
  if (push) {
    const enemy = figureAt(state, to)!;
    enemy.pos = push;
    moved.push(enemy);
    log(state, `${godName(state, fig.owner)}: ${figure} spycha ${enemy.id} na ${push}.`, fig.owner);
  }
  fig.pos = to;
  log(state, `${godName(state, fig.owner)}: ${figure} ${from} → ${to}.`, fig.owner);
  const done = [...pending.moved, figure];
  state.pending = null;
  schedule(state, ...aimTasks(state, moved), { t: 'resumeMove', player: pending.player, moved: done });
}

export function resumeMove(state: GameState, p: PlayerId, moved: FigureId[]): void {
  if (canStillMove(state, p, moved)) state.pending = { kind: 'move', player: p, moved };
}

export function endMove(state: GameState): void {
  state.pending = null;
}

export function aimScorpionTask(state: GameState, figure: FigureId): void {
  const fig = state.figures[figure];
  if (!fig.pos) return;
  const options = aimOptions(state, figure);
  if (options.length === 0) fig.aim = null;
  else if (options.length === 1) fig.aim = options[0];
  else state.pending = { kind: 'aimScorpion', player: fig.owner, figure };
}

export function aimScorpion(state: GameState, figure: FigureId, aim: [HexKey, HexKey] | null): void {
  state.figures[figure].aim = aim;
  log(state, `${godName(state, state.figures[figure].owner)}: skorpion celuje w ${aim?.join(' i ') ?? '—'}.`);
  state.pending = null;
}

// ---------- Przywołanie ----------

/** Stawia figurkę z puli jako przywołaną (wywołuje efekty przywołania, np. promienność). */
function placeSummoned(state: GameState, fig: Figure, to: HexKey, radiant: boolean): Task[] {
  fig.pos = to;
  forEachHook(state, (h, ctx) => h.onSummoned?.({ ...ctx, figure: fig, radiant }));
  return aimTasks(state, [fig]);
}

export function summonFigure(state: GameState, p: PlayerId, figure: FigureId, to: HexKey, source: string, radiant: boolean): void {
  const pending = state.pending;
  if (pending?.kind !== 'summon') return;
  const fig = state.figures[figure];
  if (fig.trappedBy !== undefined) {
    const anubis = fig.trappedBy;
    state.players[p].followers--;
    state.players[anubis].followers++;
    delete fig.trappedBy;
    log(state, `${godName(state, p)} uwalnia wojownika od ${godName(state, anubis)} za 1 wyznawcę.`, p);
  }
  log(state, `${godName(state, p)} przywołuje ${figure} na ${to}.`, p);
  const used = [...pending.used, source];
  state.pending = null;
  schedule(state, ...placeSummoned(state, fig, to, radiant), { t: 'continueSummon', player: p, used });
}

export function continueSummon(state: GameState, p: PlayerId, used: string[]): void {
  if (summonOptions(state, p, used).length) state.pending = { kind: 'summon', player: p, used };
}

export function endSummon(state: GameState): void {
  state.pending = null;
}

/** Mumia po śmierci wraca obok swojego boga (to przywołanie). */
export function mummyReturnTargets(state: GameState, figure: FigureId): HexKey[] {
  const fig = state.figures[figure];
  const god = Object.values(state.figures).find((f) => f.owner === fig.owner && f.kind === 'god' && f.pos);
  if (!god) return [];
  return adjacentHexes(state.map, god.pos!).filter((h) => canPlace(state, fig, h)).sort();
}

export function mummyReturnTask(state: GameState, figure: FigureId): void {
  const fig = state.figures[figure];
  if (fig.pos !== null) return;
  const targets = mummyReturnTargets(state, figure);
  if (!targets.length) {
    log(state, `${godName(state, fig.owner)}: mumia nie ma miejsca obok boga — wraca do puli.`, fig.owner);
  } else {
    state.pending = { kind: 'mummyReturn', player: fig.owner, figure };
  }
}

export function mummyReturn(state: GameState, figure: FigureId, to: HexKey, radiant: boolean): void {
  const fig = state.figures[figure];
  log(state, `${godName(state, fig.owner)}: mumia powstaje na ${to}.`, fig.owner);
  state.pending = null;
  schedule(state, ...placeSummoned(state, fig, to, radiant));
}

// ---------- Anubis ----------

export function anubisTrapTask(state: GameState, player: PlayerId, candidates: FigureId[]): void {
  const still = candidates.filter((id) => state.figures[id].pos === null && state.figures[id].trappedBy === undefined);
  if (still.length) state.pending = { kind: 'anubisTrap', player, candidates: still };
}

export function anubisTrap(state: GameState, player: PlayerId, figure: FigureId | null): void {
  if (figure) {
    state.figures[figure].trappedBy = player;
    log(state, `${godName(state, player)} więzi wojownika ${figure}.`, player);
  }
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
