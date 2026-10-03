// Dispatcher efektów. Zdolności bogów, moce ankh i strażnicy to dane z hookami (src/content);
// silnik pyta o nie tylko przez funkcje z tego pliku, bez rozgałęzień po identyfikatorach.
import { ANKH_POWERS } from '../content/ankhPowers';
import { GODS } from '../content/gods';
import { GUARDIANS } from '../content/guardians';
import type { Figure, GameState, HexKey, PlayerId } from './types';

export interface HookContext {
  state: GameState;
  /** Właściciel efektu. */
  owner: PlayerId;
}

export interface EffectHooks {
  /** Dodatkowi wyznawcy z akcji Wyznawcy. */
  followersBonus?(ctx: HookContext): number;
  /** Czy figurka może zakończyć ruch na polu (false = weto). Wołane dla efektów wszystkich graczy. */
  canEndMoveOn?(ctx: HookContext & { figure: Figure; hex: HexKey }): boolean;
}

export interface EffectSource {
  id: string;
  hooks: EffectHooks;
}

/** Wszystkie aktywne efekty: zdolność boga, odblokowane moce, strażnicy gracza. */
export function activeEffects(state: GameState, owner: PlayerId): EffectSource[] {
  const p = state.players[owner];
  if (p.eliminated) return [];
  const out: EffectSource[] = [GODS[p.god]];
  for (const power of p.unlocked) out.push(ANKH_POWERS[power]);
  const guardianTypes = new Set(
    Object.values(state.figures)
      .filter((f) => f.owner === owner && f.guardian)
      .map((f) => f.guardian!),
  );
  for (const g of guardianTypes) out.push(GUARDIANS[g]);
  return out;
}

export function sumHook(
  state: GameState,
  owner: PlayerId,
  pick: (h: EffectHooks, ctx: HookContext) => number | undefined,
): number {
  let total = 0;
  for (const src of activeEffects(state, owner)) total += pick(src.hooks, { state, owner }) ?? 0;
  return total;
}

/** true, jeśli żaden efekt żadnego gracza nie zgłasza weta. */
export function allowedByAll(
  state: GameState,
  check: (h: EffectHooks, ctx: HookContext) => boolean | undefined,
): boolean {
  for (const p of state.players) {
    for (const src of activeEffects(state, p.id)) {
      if (check(src.hooks, { state, owner: p.id }) === false) return false;
    }
  }
  return true;
}
