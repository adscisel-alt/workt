// Dispatcher efektów. Zdolności bogów, moce ankh i strażnicy to dane z hookami (src/content);
// silnik pyta o nie tylko przez funkcje z tego pliku, bez rozgałęzień po identyfikatorach.
import { ANKH_POWERS } from '../content/ankhPowers';
import { GODS } from '../content/gods';
import { GUARDIANS } from '../content/guardians';
import type { Figure, GameState, HexKey, PlayerId, Terrain } from './types';

export interface HookContext {
  state: GameState;
  /** Właściciel efektu. */
  owner: PlayerId;
}

type With<T> = HookContext & T;

export { AFTER_PHASE } from './phases';

export interface AfterBattleHook {
  phase: number;
  run(ctx: HookContext): void;
}

/** Dodatkowe źródło przywołania (Wrota piramid, wrota zaświatów): każde raz na akcję. */
export interface SummonSource {
  id: string;
  /** Pola, obok których można przywołać (sąsiedztwo wg zasad). */
  anchors?: HexKey[];
  /** Pola, na które można przywołać bezpośrednio. */
  targets?: HexKey[];
}

export interface EffectHooks {
  // ---- akcje ----
  /** Dodatkowi wyznawcy z akcji Wyznawcy. */
  followersBonus?(ctx: HookContext): number;
  /** Weto zakończenia ruchu na polu (pytani są wszyscy gracze). */
  canEndMoveOn?(ctx: With<{ figure: Figure; hex: HexKey }>): boolean;
  /** Weto postawienia figurki (przywołanie) lub monumentu (`figure = null`) na polu (pytani wszyscy). */
  canPlaceOn?(ctx: With<{ figure: Figure | null; hex: HexKey }>): boolean;
  /** Figurka może zakończyć ruch na polu wroga, spychając go o 1 pole. */
  movePush?(ctx: With<{ figure: Figure }>): boolean;
  /** Dodatkowe pola przywołania dla konkretnej figurki (np. woda). `source` — 'regular' lub id źródła. */
  extraPlacementTargets?(ctx: With<{ figure: Figure; source: SummonSource | 'regular' }>): HexKey[];
  /** Dodatkowe źródła przywołania w jednej akcji. */
  extraSummonSources?(ctx: HookContext): SummonSource[];
  /** Czy przywoływanej figurce można nadać promienność. */
  canMakeRadiant?(ctx: HookContext): boolean;
  /** Figurka gracza została postawiona na planszy przywołaniem. */
  onSummoned?(ctx: With<{ figure: Figure; radiant: boolean }>): void;
  /** Figurka wymaga wycelowania po postawieniu/ruchu (skorpion). */
  needsAim?(ctx: With<{ figure: Figure }>): boolean;

  // ---- teren i budowa ----
  /** Zmiana typu terenu pola dla efektów ('none' = ani żyzne, ani pustynne). */
  terrainOverride?(ctx: With<{ hex: HexKey }>): Terrain | 'none' | undefined;
  /** Koszt budowy monumentu kartą (bierzemy najmniejszy). */
  buildCost?(ctx: HookContext): number | undefined;

  // ---- konflikt ----
  onConflictStart?(ctx: HookContext): void;
  onConflictEnd?(ctx: HookContext): void;
  /** Pola, obok których gracz może na początku bitwy przestawić swoje figurki (Zew obelisków). */
  battleRelocationAnchors?(ctx: With<{ region: number }>): HexKey[];
  /** Siła własnej figurki (dostaje bazę i może ją zmienić). */
  figureStrength?(ctx: With<{ figure: Figure; base: number }>): number;
  /** Czy efekt zeruje siłę tej figurki (pytani wszyscy gracze). */
  neutralizes?(ctx: With<{ figure: Figure }>): boolean;
  /** Dodatkowa siła gracza w bitwie w regionie. */
  strengthBonus?(ctx: With<{ region: number }>): number;
  /** Podstawowa nagroda za wygraną (zamiast 1). `margin` — przewaga nad następnym rywalem. */
  winBaseDevotion?(ctx: With<{ margin: number }>): number | undefined;
  /** Dodatek do nagrody za dominację lub wygraną bitwę w regionie. */
  regionRewardBonus?(ctx: With<{ region: number }>): number;
  onBattleWon?(ctx: With<{ region: number }>): void;
  /** Gracz może zapowiedzieć zagranie dwóch kart w tej bitwie. */
  canPlayTwoCards?(ctx: HookContext): boolean;
  onTwoCardsAnnounced?(ctx: HookContext): void;
  /** Własna figurka jest chroniona w rozstrzygnięciu (gracz może ją ocalić). */
  protects?(ctx: With<{ figure: Figure }>): boolean;
  afterBattle?: AfterBattleHook[];
  /** Dodatek do każdego zysku oddania (pojedyncza „instancja”). */
  devotionGainBonus?(ctx: HookContext): number;
  /** Figurka zginęła (pytani wszyscy gracze). `inResolution` — w kroku rozstrzygnięcia bitwy. */
  onFigureKilled?(ctx: With<{ figure: Figure; inResolution: boolean }>): void;
  /** Zginęli wojownicy (pytani wszyscy gracze). */
  onWarriorsKilled?(ctx: With<{ figures: Figure[] }>): void;
  /** Figurka usunięta z gry (połączenie, zapomnienie) — nie jest to śmierć (pytani wszyscy). */
  onFigureRemoved?(ctx: With<{ figure: Figure }>): void;
  /** Ten bóg zostaje wchłonięty przy połączeniu przez `higher` (wołane dla efektów niższego boga). */
  onMergedInto?(ctx: With<{ higher: PlayerId }>): void;
  /** Ten bóg zostaje zapomniany (wołane dla jego efektów przed usunięciem). */
  onForgotten?(ctx: HookContext): void;
}

export interface EffectSource {
  id: string;
  hooks: EffectHooks;
}

/** Wszystkie aktywne efekty gracza: zdolność boga, odblokowane moce, posiadani strażnicy. */
export function activeEffects(state: GameState, owner: PlayerId): EffectSource[] {
  const p = state.players[owner];
  if (p.eliminated || p.mergedInto !== undefined) return [];
  // Bóg połączony ma zdolności obu bogów (s. 25, krok 6).
  const out: EffectSource[] = [GODS[p.god], ...p.extraGods.map((g) => GODS[g])];
  for (const power of p.unlocked) out.push(ANKH_POWERS[power]);
  const guardianTypes = new Set(
    Object.values(state.figures)
      .filter((f) => f.owner === owner && f.guardian)
      .map((f) => f.guardian!),
  );
  for (const g of [...guardianTypes].sort()) out.push(GUARDIANS[g]);
  return out;
}

/** Samodzielni bogowie w grze (bez zapomnianych i wchłoniętych przy połączeniu). */
const livePlayers = (state: GameState) =>
  state.players.filter((p) => !p.eliminated && p.mergedInto === undefined).map((p) => p.id);

export function sumHook(
  state: GameState,
  owner: PlayerId,
  pick: (h: EffectHooks, ctx: HookContext) => number | undefined,
): number {
  let total = 0;
  for (const src of activeEffects(state, owner)) total += pick(src.hooks, { state, owner }) ?? 0;
  return total;
}

/** Zbiera wartości hooka gracza (pomija undefined). */
export function collectHook<T>(
  state: GameState,
  owner: PlayerId,
  pick: (h: EffectHooks, ctx: HookContext) => T | undefined,
): T[] {
  const out: T[] = [];
  for (const src of activeEffects(state, owner)) {
    const v = pick(src.hooks, { state, owner });
    if (v !== undefined) out.push(v);
  }
  return out;
}

/** Czy którykolwiek efekt gracza zwraca true. */
export function anyHook(state: GameState, owner: PlayerId, check: (h: EffectHooks, ctx: HookContext) => boolean | undefined): boolean {
  return activeEffects(state, owner).some((src) => check(src.hooks, { state, owner }) === true);
}

/** true, jeśli żaden efekt żadnego gracza nie zgłasza weta. */
export function allowedByAll(state: GameState, check: (h: EffectHooks, ctx: HookContext) => boolean | undefined): boolean {
  return livePlayers(state).every((p) =>
    activeEffects(state, p).every((src) => check(src.hooks, { state, owner: p }) !== false),
  );
}

/** Czy efekt któregokolwiek gracza zwraca true. */
export function anyPlayerHook(state: GameState, check: (h: EffectHooks, ctx: HookContext) => boolean | undefined): boolean {
  return livePlayers(state).some((p) => anyHook(state, p, check));
}

/** Uruchamia hook u wszystkich graczy (rosnąco wg id). */
export function forEachHook(state: GameState, run: (h: EffectHooks, ctx: HookContext) => void): void {
  for (const p of livePlayers(state)) for (const src of activeEffects(state, p)) run(src.hooks, { state, owner: p });
}
