// Czyste zapytania o stan — wspólne dla silnika, generatora legalnych ruchów i UI.
import { powersOfLevel } from '../content/ankhPowers';
import type { ActionType } from '../config/rules';
import { allowedByAll, anyHook, anyPlayerHook, activeEffects, collectHook, sumHook, type SummonSource } from './hooks';
import { neighborKeys } from './hex';
import { adjacentHexes, areAdjacent, computeRegions, figureAt, isEmptyLand, isHexInRegion, isLand, isOnBoard } from './map';
import type {
  AnkhPowerId, Figure, FigureId, GameState, HexKey, Monument, MonumentId, MonumentType, PlayerId, Terrain,
} from './types';

export const figuresOf = (state: GameState, p: PlayerId): Figure[] =>
  Object.values(state.figures).filter((f) => f.owner === p);

export const boardFiguresOf = (state: GameState, p: PlayerId): Figure[] =>
  figuresOf(state, p).filter((f) => f.pos !== null);

export const poolFiguresOf = (state: GameState, p: PlayerId): Figure[] =>
  figuresOf(state, p).filter((f) => f.pos === null && f.trappedBy === undefined);

// ---------- Tura i akcje ----------

/** Liczba akcji w turze: miejsce sterujące połączonym bogiem ma tylko 1 akcję (s. 26). */
export function actionsPerTurn(state: GameState, seat: PlayerId): number {
  const p = state.players[seat];
  return p.mergedInto !== undefined || p.mergedWith !== undefined ? 1 : 2;
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

export function canEndMoveOn(state: GameState, figure: Figure, hex: HexKey, ignore?: FigureId): boolean {
  if (!isEmptyLand(state, hex, ignore)) return false;
  return allowedByAll(state, (h, ctx) => h.canEndMoveOn?.({ ...ctx, figure, hex }));
}

/** Pola w zasięgu `range` kroków przez dowolne pola planszy (bez pola startowego). */
export function reachable(state: GameState, from: HexKey, range: number): HexKey[] {
  const dist = new Map<HexKey, number>([[from, 0]]);
  const queue: HexKey[] = [from];
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
  dist.delete(from);
  return [...dist.keys()].sort();
}

export interface MoveOption {
  to: HexKey;
  /** Gdzie zostaje zepchnięty wróg z pola `to` (Satet); null — zwykły ruch. */
  push: HexKey | null;
}

/** Możliwe ruchy figurki: koniec na pustym lądzie albo (Satet) na polu wroga ze zepchnięciem go o 1 pole. */
export function moveOptions(state: GameState, figureId: FigureId): MoveOption[] {
  const fig = state.figures[figureId];
  if (!fig?.pos) return [];
  const out: MoveOption[] = [];
  const canPush = anyHook(state, fig.owner, (h, ctx) => h.movePush?.({ ...ctx, figure: fig }));
  for (const h of reachable(state, fig.pos, state.rules.moveRange)) {
    if (canEndMoveOn(state, fig, h)) {
      out.push({ to: h, push: null });
      continue;
    }
    if (!canPush || !isLand(state.map, h)) continue;
    const enemy = figureAt(state, h);
    if (!enemy || enemy.owner === fig.owner) continue;
    // Pole wroga musi być dozwolone dla spychającego (np. wrota zaświatów), gdyby było puste.
    if (!allowedByAll(state, (x, ctx) => x.canEndMoveOn?.({ ...ctx, figure: fig, hex: h }))) continue;
    for (const n of neighborKeys(h)) {
      if (isOnBoard(state.map, n) && canEndMoveOn(state, enemy, n, fig.id)) out.push({ to: h, push: n });
    }
  }
  return out;
}

export function moveDestinations(state: GameState, figureId: FigureId): HexKey[] {
  return [...new Set(moveOptions(state, figureId).map((o) => o.to))].sort();
}

// ---------- Przywołanie ----------

/** Czy figurkę (lub monument, gdy `figure = null`) można postawić na polu. */
export function canPlace(state: GameState, figure: Figure | null, hex: HexKey): boolean {
  return isEmptyLand(state, hex) && allowedByAll(state, (h, ctx) => h.canPlaceOn?.({ ...ctx, figure, hex }));
}

function adjacentPlaceable(state: GameState, figure: Figure | null, anchors: HexKey[]): HexKey[] {
  const out = new Set<HexKey>();
  for (const a of anchors) for (const h of adjacentHexes(state.map, a)) if (canPlace(state, figure, h)) out.add(h);
  return [...out];
}

/** Źródła przywołania w akcji: zwykłe (obowiązkowe, jeśli możliwe) + dodatkowe z efektów. */
export function summonSources(state: GameState, p: PlayerId): (SummonSource | 'regular')[] {
  return ['regular', ...collectHook(state, p, (h, ctx) => h.extraSummonSources?.(ctx)).flat()];
}

const sourceId = (src: SummonSource | 'regular') => (src === 'regular' ? 'regular' : src.id);

/** Pola, na które gracz może przywołać figurkę z danego źródła. */
export function summonTargetsFor(
  state: GameState,
  p: PlayerId,
  figure: Figure | null,
  source: SummonSource | 'regular' = 'regular',
): HexKey[] {
  const out = new Set<HexKey>();
  if (source === 'regular') {
    const anchors = [
      ...boardFiguresOf(state, p).map((f) => f.pos!),
      ...Object.values(state.monuments).filter((m) => m.owner === p).map((m) => m.pos),
    ];
    for (const h of adjacentPlaceable(state, figure, anchors)) out.add(h);
  } else {
    for (const h of adjacentPlaceable(state, figure, source.anchors ?? [])) out.add(h);
    for (const h of source.targets ?? []) if (canPlace(state, figure, h)) out.add(h);
  }
  if (figure) {
    for (const h of collectHook(state, p, (x, ctx) => x.extraPlacementTargets?.({ ...ctx, figure, source })).flat()) {
      if (!figureAt(state, h)) out.add(h);
    }
  }
  return [...out].sort();
}

/** Zwykłe pola przywołania (bez efektów zależnych od rodzaju figurki). */
export function summonTargets(state: GameState, p: PlayerId): HexKey[] {
  return summonTargetsFor(state, p, null);
}

const byId = (a: Figure, b: Figure) => a.id.localeCompare(b.id, 'en', { numeric: true });

/**
 * Figurki do przywołania — po jednym reprezentancie na rodzaj (wojownicy są wymienni).
 * Wojownik uwięziony przez Anubisa może zastąpić wojownika z puli za 1 wyznawcę dla Anubisa.
 */
export function summonableFigures(state: GameState, p: PlayerId): Figure[] {
  const seen = new Set<string>();
  const out: Figure[] = [];
  const canFree = state.players[p].followers >= 1;
  for (const f of figuresOf(state, p).filter((x) => x.pos === null).sort(byId)) {
    if (f.trappedBy !== undefined && !canFree) continue;
    const kind = f.trappedBy !== undefined ? 'trapped' : f.kind === 'guardian' ? `g:${f.guardian}` : f.kind;
    if (seen.has(kind)) continue;
    seen.add(kind);
    out.push(f);
  }
  return out;
}

export interface SummonOption {
  figure: FigureId;
  to: HexKey;
  source: string;
}

/** Wszystkie możliwe przywołania przy już użytych źródłach `used`. */
export function summonOptions(state: GameState, p: PlayerId, used: string[]): SummonOption[] {
  const figs = summonableFigures(state, p);
  const out: SummonOption[] = [];
  for (const src of summonSources(state, p)) {
    const id = sourceId(src);
    if (used.includes(id)) continue;
    for (const f of figs) for (const to of summonTargetsFor(state, p, f, src)) out.push({ figure: f.id, to, source: id });
  }
  return out;
}

/** Możliwe kierunki szczypiec skorpiona: 2 pola o 1 od niego i o 1 od siebie (FAQ). */
export function aimOptions(state: GameState, figure: FigureId): [HexKey, HexKey][] {
  const pos = state.figures[figure].pos;
  if (!pos) return [];
  const ns = neighborKeys(pos);
  const out: [HexKey, HexKey][] = [];
  for (let i = 0; i < 6; i++) {
    const a = ns[i];
    const b = ns[(i + 1) % 6];
    if (isOnBoard(state.map, a) && isOnBoard(state.map, b)) out.push(a < b ? [a, b] : [b, a]);
  }
  return out;
}

export const canMakeRadiant = (state: GameState, p: PlayerId): boolean =>
  anyHook(state, p, (h, ctx) => h.canMakeRadiant?.(ctx));

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

/** Typ terenu pola z punktu widzenia efektów (np. pole z wrotami zaświatów nie jest ani żyzne, ani pustynne). */
export function terrainOf(state: GameState, h: HexKey): Terrain | 'none' {
  for (const p of state.players) {
    for (const o of collectHook(state, p.id, (x, ctx) => x.terrainOverride?.({ ...ctx, hex: h }))) return o;
  }
  return state.map.terrain[h];
}

/** Siła figurki w bitwie: baza 1, modyfikowana efektami właściciela; zerowana przez efekty neutralizujące. */
export function figureStrength(state: GameState, figure: Figure): number {
  if (anyPlayerHook(state, (h, ctx) => h.neutralizes?.({ ...ctx, figure }))) return 0;
  let s = 1;
  for (const src of activeEffects(state, figure.owner)) {
    s = src.hooks.figureStrength?.({ state, owner: figure.owner, figure, base: s }) ?? s;
  }
  return s;
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
  return computeRegions(state.map).regions[region].filter((h) => canPlace(state, null, h));
}
