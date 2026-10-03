// Czyste zapytania o stan — wspólne dla silnika, generatora legalnych ruchów i UI.
import { powersOfLevel } from '../content/ankhPowers';
import type { ActionType } from '../config/rules';
import { allowedByAll, sumHook } from './hooks';
import { neighborKeys } from './hex';
import { adjacentHexes, areAdjacent, computeRegions, isEmptyLand, isHexInRegion, isOnBoard } from './map';
import type {
  AnkhPowerId, Figure, FigureId, GameState, HexKey, Monument, MonumentId, MonumentType, PlayerId, Terrain,
} from './types';

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

// ---------- Regiony i konflikt ----------

/** Typ terenu pola z punktu widzenia efektów (etap 4: pole z wrotami zaświatów nie jest ani żyzne, ani pustynne). */
export function terrainOf(state: GameState, h: HexKey): Terrain {
  return state.map.terrain[h];
}

export function figuresInRegion(state: GameState, region: number, p?: PlayerId): Figure[] {
  return Object.values(state.figures)
    .filter((f) => f.pos !== null && (p === undefined || f.owner === p))
    .filter((f) => isHexInRegion(state.map, f.pos!, region))
    .sort((a, b) => a.id.localeCompare(b.id, 'en', { numeric: true }));
}

/** Gracze z co najmniej jedną figurką w regionie (rosnąco wg id). */
export function playersInRegion(state: GameState, region: number): PlayerId[] {
  return [...new Set(figuresInRegion(state, region).map((f) => f.owner))].sort((a, b) => a - b);
}

export function monumentsInRegion(state: GameState, region: number): Monument[] {
  const { landRegion } = computeRegions(state.map);
  return Object.values(state.monuments).filter((m) => landRegion[m.pos] === region);
}

const MONUMENT_TYPES: MonumentType[] = ['obelisk', 'temple', 'pyramid'];

/** Przewaga monumentów: gracz kontrolujący w regionie więcej monumentów danego typu niż każdy rywal. */
export function monumentMajorities(state: GameState, region: number): Record<MonumentType, PlayerId | null> {
  const out = {} as Record<MonumentType, PlayerId | null>;
  const ms = monumentsInRegion(state, region);
  for (const type of MONUMENT_TYPES) {
    const counts = new Map<PlayerId, number>();
    for (const m of ms) if (m.type === type && m.owner !== null) counts.set(m.owner, (counts.get(m.owner) ?? 0) + 1);
    const sorted = [...counts.entries()].sort((a, b) => b[1] - a[1]);
    out[type] = sorted.length && (sorted.length === 1 || sorted[0][1] > sorted[1][1]) ? sorted[0][0] : null;
  }
  return out;
}

/**
 * Liczba przewag, za które gracz dostaje oddanie: musi mieć figurkę w regionie.
 * Gdy przewagę ma gracz bez figurek, nikt inny nie dostaje za nią oddania (FAQ).
 */
export function majorityCount(state: GameState, region: number, p: PlayerId): number {
  if (!figuresInRegion(state, region, p).length) return 0;
  return Object.values(monumentMajorities(state, region)).filter((owner) => owner === p).length;
}

/** Puste pola lądowe regionu, na których można zbudować monument. */
export function buildSites(state: GameState, region: number): HexKey[] {
  return computeRegions(state.map).regions[region].filter((h) => isEmptyLand(state, h));
}
