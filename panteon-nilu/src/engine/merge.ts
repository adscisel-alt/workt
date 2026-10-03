// Łączenie bogów po 3. konflikcie (Rulebook s. 25–26, FAQ) i zapomnienie bogów po 4. (s. 27).
import { GUARDIANS } from '../content/guardians';
import { devotionAscending, isInRed } from './devotion';
import { activeEffects, forEachHook } from './hooks';
import type { FigureId, GameState, PlayerId } from './types';
import { godName, isEntity, log, seatsOf } from './util';

/** Usuwa figurkę z gry (to nie jest śmierć — nie wyzwala efektów śmierci). */
export function removeFigure(state: GameState, id: FigureId): void {
  const figure = state.figures[id];
  if (!figure) return;
  delete state.figures[id];
  forEachHook(state, (h, c) => h.onFigureRemoved?.({ ...c, figure }));
}

/** Niszczy monumenty gracza: wracają do zapasu (żetony ankh odchodzą razem z graczem). */
function destroyMonumentsOf(state: GameState, p: PlayerId): void {
  for (const m of Object.values(state.monuments)) {
    if (m.owner !== p) continue;
    state.monumentSupply[m.type]++;
    delete state.monuments[m.id];
  }
}

/**
 * Po 3. konflikcie (3+ graczy): dwaj ostatni na torze oddania łączą się.
 * Niższy traci monumenty, boga, wojowników, karty i żetony ankh; wyznawców oddaje wyższemu;
 * wyższy może przejąć jego strażników (jeśli ma podstawki). Byt połączony stoi na polu niższego.
 */
export function mergeGods(state: GameState): void {
  const order = devotionAscending(state);
  if (order.length < 3) return;
  const [lower, higher] = order;
  const L = state.players[lower];
  const H = state.players[higher];
  log(state, `Łączenie bogów: ${godName(state, higher)} wchłania ${godName(state, lower)}.`);

  for (const src of activeEffects(state, lower)) src.hooks.onMergedInto?.({ state, owner: lower, higher });
  destroyMonumentsOf(state, lower);
  const lowerFigs = Object.values(state.figures).filter((f) => f.owner === lower);
  for (const f of lowerFigs) if (f.kind !== 'guardian') removeFigure(state, f.id);

  H.followers += L.followers;
  L.followers = 0;
  L.hand = [];
  L.used = [];
  L.ankhPool = 0;
  L.unlocked = [...H.unlocked];
  H.extraGods = [...H.extraGods, L.god, ...L.extraGods];
  H.mergedWith = lower;
  L.mergedInto = higher;
  // Żeton wyższego kładziemy na żeton niższego — dalej poruszają się razem.
  H.devotion = L.devotion;
  H.devotionSeq = L.devotionSeq;

  state.mergeGuardians = lowerFigs.filter((f) => f.kind === 'guardian').map((f) => f.id);
  resolveMergeGuardians(state, higher);
}

/** Strażnicy niższego: przechodzą, jeśli wystarczy podstawek; inaczej wyższy wybiera, których zatrzymać. */
function fits(state: GameState, higher: PlayerId, id: FigureId) {
  return state.players[higher].bases[GUARDIANS[state.figures[id].guardian!].size] > 0;
}

function takeGuardian(state: GameState, higher: PlayerId, id: FigureId) {
  const f = state.figures[id];
  state.players[higher].bases[GUARDIANS[f.guardian!].size]--;
  f.owner = higher;
  state.mergeGuardians = state.mergeGuardians.filter((x) => x !== id);
}

function resolveMergeGuardians(state: GameState, higher: PlayerId): void {
  const pending = state.mergeGuardians;
  const need = { small: 0, large: 0 };
  for (const id of pending) need[GUARDIANS[state.figures[id].guardian!].size]++;
  const bases = state.players[higher].bases;
  if (need.small <= bases.small && need.large <= bases.large) {
    for (const id of [...pending]) takeGuardian(state, higher, id);
    finishMerge(state);
    return;
  }
  const candidates = pending.filter((id) => fits(state, higher, id));
  if (candidates.length) state.pending = { kind: 'mergeGuardians', player: higher, candidates };
  else finishMerge(state);
}

export function mergeGuardian(state: GameState, higher: PlayerId, figure: FigureId | null): void {
  state.pending = null;
  if (figure === null) return finishMerge(state);
  takeGuardian(state, higher, figure);
  resolveMergeGuardians(state, higher);
}

/** Strażnicy niższego, których nie przejęto, opuszczają grę. */
function finishMerge(state: GameState): void {
  for (const id of state.mergeGuardians) removeFigure(state, id);
  state.mergeGuardians = [];
}

/**
 * Po 4. konflikcie: bogowie wciąż w czerwonej strefie zostają zapomniani.
 * Zostaje jeden — wygrywa; nie zostaje nikt — przegrywają wszyscy.
 */
export function forgetGods(state: GameState): void {
  const forgotten = state.players.filter((p) => isEntity(state, p.id) && isInRed(state, p.id)).map((p) => p.id);
  for (const p of forgotten) {
    log(state, `${godName(state, p)} zostaje zapomniany.`, p);
    for (const src of activeEffects(state, p)) src.hooks.onForgotten?.({ state, owner: p });
    for (const f of Object.values(state.figures)) if (f.owner === p) removeFigure(state, f.id);
    destroyMonumentsOf(state, p);
    state.players[p].followers = 0;
    for (const seat of seatsOf(state, p)) state.players[seat].eliminated = true;
  }
  const left = state.players.filter((p) => isEntity(state, p.id)).map((p) => p.id);
  if (left.length === 1) {
    state.result = { winners: seatsOf(state, left[0]), reason: `${godName(state, left[0])} zostaje jedynym bogiem Egiptu.` };
  } else if (left.length === 0) {
    state.result = { winners: [], reason: 'Wszyscy bogowie zapomniani — Egipt porzuca wiarę. Przegrywają wszyscy.' };
  }
  if (state.result) {
    state.pending = null;
    state.queue = [];
    log(state, state.result.reason);
  }
}
