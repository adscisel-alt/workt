// Czyste zapytania o stan — wspólne dla silnika, generatora legalnych ruchów i UI.
import { powersOfLevel } from '../content/ankhPowers';
import type { ActionType } from '../config/rules';
import { allowedByAll, sumHook } from './hooks';
import { neighborKeys } from './hex';
import { adjacentHexes, areAdjacent, isEmptyLand, isOnBoard } from './map';
import type { AnkhPowerId, Figure, FigureId, GameState, HexKey, MonumentId, PlayerId } from './types';

export const figuresOf = (state: GameState, p: PlayerId): Figure[] =>
  Object.values(state.figures).filter((f) => f.owner === p);

export const boardFiguresOf = (state: GameState, p: PlayerId): Figure[] =>
  figuresOf(state, p).filter((f) => f.pos !== null);

export const poolFiguresOf = (state: GameState, p: PlayerId): Figure[] =>
  figuresOf(state, p).filter((f) => f.pos === null);

// ---------- Tura i akcje ----------

export function actionsPerTurn(_state: GameState, _p: PlayerId): number {
  return 2; // TODO etap 5: bóg połączony ma 1 akcję
}

/** Akcje dostępne teraz: pierwsza dowolna, druga w niższym wierszu panelu. */
export function availableActions(state: GameState): ActionType[] {
  const order = state.rules.actionOrder;
  const { actions } = state.turn;
  if (actions.length >= actionsPerTurn(state, state.turn.player)) return [];
  if (actions.length === 0) return [...order];
  const lastIdx = order.indexOf(actions[actions.length - 1]);
  return order.slice(lastIdx + 1);
}

// ---------- Ruch ----------

export function canEndMoveOn(state: GameState, figure: Figure, hex: HexKey): boolean {
  if (!isEmptyLand(state, hex)) return false;
  return allowedByAll(state, (h, ctx) => h.canEndMoveOn?.({ ...ctx, figure, hex }));
}

/** Pola docelowe figurki: do `moveRange` kroków przez dowolne pola planszy, koniec na pustym lądzie. */
export function moveDestinations(state: GameState, figureId: FigureId): HexKey[] {
  const fig = state.figures[figureId];
  if (!fig?.pos) return [];
  const range = state.rules.moveRange;
  const dist = new Map<HexKey, number>([[fig.pos, 0]]);
  const queue: HexKey[] = [fig.pos];
  while (queue.length) {
    const h = queue.shift()!;
    const d = dist.get(h)!;
    if (d === range) continue;
    for (const n of neighborKeys(h)) {
      if (!isOnBoard(state.map, n) || dist.has(n)) continue;
      dist.set(n, d + 1);
      queue.push(n);
    }
  }
  return [...dist.keys()].filter((h) => h !== fig.pos && canEndMoveOn(state, fig, h)).sort();
}

// ---------- Przywołanie ----------

/** Puste pola lądowe sąsiadujące z figurką gracza lub kontrolowanym przez niego monumentem. */
export function summonTargets(state: GameState, p: PlayerId): HexKey[] {
  const anchors = [
    ...boardFiguresOf(state, p).map((f) => f.pos!),
    ...Object.values(state.monuments).filter((m) => m.owner === p).map((m) => m.pos),
  ];
  const out = new Set<HexKey>();
  for (const a of anchors) for (const h of adjacentHexes(state.map, a)) if (isEmptyLand(state, h)) out.add(h);
  return [...out].sort();
}

/** Figurki z puli do wyboru — po jednym reprezentancie na rodzaj (wojownicy są wymienni). */
export function summonableFigures(state: GameState, p: PlayerId): Figure[] {
  const seen = new Set<string>();
  const out: Figure[] = [];
  for (const f of poolFiguresOf(state, p).sort((a, b) => a.id.localeCompare(b.id, 'en', { numeric: true }))) {
    const kind = f.kind === 'guardian' ? `g:${f.guardian}` : f.kind;
    if (seen.has(kind)) continue;
    seen.add(kind);
    out.push(f);
  }
  return out;
}

// ---------- Wyznawcy ----------

/** Monumenty (własne lub neutralne), z którymi gracz ma sąsiadującą figurkę. */
export function followerMonuments(state: GameState, p: PlayerId): MonumentId[] {
  const figs = boardFiguresOf(state, p);
  return Object.values(state.monuments)
    .filter((m) => m.owner === null || m.owner === p)
    .filter((m) => figs.some((f) => areAdjacent(state.map, f.pos!, m.pos)))
    .map((m) => m.id)
    .sort();
}

export function followersGain(state: GameState, p: PlayerId): number {
  return followerMonuments(state, p).length + sumHook(state, p, (h, ctx) => h.followersBonus?.(ctx));
}

// ---------- Moce ankh ----------

export interface UnlockInfo {
  slot: number;
  level: 1 | 2 | 3;
  cost: number;
  options: AnkhPowerId[];
}

/** Następny slot do odblokowania lub null, gdy nic nie da się odblokować. */
export function nextUnlock(state: GameState, p: PlayerId): UnlockInfo | null {
  const player = state.players[p];
  const slot = player.unlocked.length;
  if (slot >= state.rules.dashboardSlots) return null;
  const level = (Math.floor(slot / 2) + 1) as 1 | 2 | 3;
  const cost = state.rules.unlockCost[level - 1];
  if (player.followers < cost) return null;
  const options = powersOfLevel(level).map((x) => x.id).filter((id) => !player.unlocked.includes(id));
  return { slot, level, cost, options };
}

// ---------- Przejęcie monumentu ----------

/** Monumenty do przejęcia: neutralne obok figurki gracza; gdy na planszy nie ma neutralnych — cudze. */
export function controlMonumentCandidates(state: GameState, p: PlayerId): MonumentId[] {
  if (state.players[p].ankhPool <= 0) return [];
  const all = Object.values(state.monuments);
  const anyNeutral = all.some((m) => m.owner === null);
  const figs = boardFiguresOf(state, p);
  return all
    .filter((m) => (anyNeutral ? m.owner === null : m.owner !== null && m.owner !== p))
    .filter((m) => figs.some((f) => areAdjacent(state.map, f.pos!, m.pos)))
    .map((m) => m.id)
    .sort();
}
