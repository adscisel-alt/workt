// Bot heurystyczny.
// - Decyzje jawne: zachłannie, 1 ruch w przód + dokończenie własnych decyzji, ocena `evaluate`.
// - Decyzje tajne (karta bitwy, licytacja plagi): reguły na widoku gracza (viewFor) — bez podglądania.
import { BATTLE_CARDS } from '../content/battleCards';
import { applyLegalMove } from '../engine/game';
import { legalMoves } from '../engine/legal';
import { figureStrength, figuresInRegion, terrainOf } from '../engine/queries';
import { buildOptions } from '../engine/conflict';
import { viewFor } from '../engine/view';
import type { BattleCardId, GameState, Move, PlayerId } from '../engine/types';
import { evaluate } from './evaluate';

const MAX_FOLLOW_UP = 10;

const ownsPending = (s: GameState, seat: PlayerId) =>
  !!s.pending && !s.result && !('waiting' in s.pending) && s.pending.player === seat && s.pending.kind !== 'chooseAction';

/** Dokańcza zachłannie własne, jawne decyzje (np. kolejne figurki w ruchu) i zwraca stan końcowy. */
function followUp(s: GameState, seat: PlayerId, depth = MAX_FOLLOW_UP): GameState {
  while (depth-- > 0 && ownsPending(s, seat)) {
    const options = legalMoves(s).filter((m) => m.player === seat);
    if (!options.length) break;
    s = best(s, seat, options, false).state;
  }
  return s;
}

function best(s: GameState, seat: PlayerId, options: Move[], deep: boolean): { move: Move; state: GameState } {
  let top: { move: Move; state: GameState; score: number } | null = null;
  for (const move of options) {
    let next = applyLegalMove(s, move);
    if (deep) next = followUp(next, seat);
    const score = evaluate(next, seat);
    if (!top || score > top.score) top = { move, state: next, score };
  }
  return top!;
}

export function heuristicMove(state: GameState, seat: PlayerId): Move | null {
  const view = viewFor(state, seat);
  const mine = legalMoves(view).filter((m) => m.player === seat);
  if (!mine.length) return null;
  if (mine.length === 1) return mine[0];
  switch (view.pending?.kind) {
    case 'selectCards':
      return chooseCards(view, seat, mine as Extract<Move, { type: 'selectCard' }>[]);
    case 'plagueBid':
      return choosePlagueBid(view, seat);
    case 'tiebreaker':
      return mine.find((m) => m.type === 'useTiebreaker' && m.use) ?? mine[0];
    case 'move':
    case 'obeliskMove':
      // Figurki ruszają się po jednej — każda kolejna to osobna decyzja, więc wystarczy ocena 1 kroku.
      return best(view, seat, mine, false).move;
    default:
      return best(view, seat, mine, true).move;
  }
}

// ---------- karty bitwy ----------

function battleContext(view: GameState, seat: PlayerId) {
  const b = view.battle!;
  const strength = (p: PlayerId) => figuresInRegion(view, b.region, p).reduce((s, f) => s + figureStrength(view, f), 0);
  const mine = strength(seat);
  const rival = Math.max(0, ...b.participants.filter((p) => p !== seat).map(strength));
  const myFigs = figuresInRegion(view, b.region, seat);
  const enemyWarriors = figuresInRegion(view, b.region).filter((f) => f.owner !== seat && f.kind !== 'god').length;
  return {
    diff: mine - rival - 1.5, // przewidywana karta rywala ≈ +1,5
    desert: myFigs.filter((f) => terrainOf(view, f.pos!) === 'desert').length,
    fertile: myFigs.filter((f) => terrainOf(view, f.pos!) === 'fertile').length,
    killable: myFigs.filter((f) => f.kind !== 'god').length,
    enemyWarriors,
    followers: view.players[seat].followers,
    used: view.players[seat].used.length,
    canBuild: buildOptions(view, seat).sites.length > 0,
  };
}

/** Wartość karty w danej sytuacji (wyższa = lepsza). */
function cardValue(card: BattleCardId, ctx: ReturnType<typeof battleContext>, extraStrength: number): number {
  const diff = ctx.diff + extraStrength + BATTLE_CARDS[card].strength;
  let v = diff > 0 ? 10 : diff > -1 ? 3 : 0;
  const winning = diff > 0;
  switch (card) {
    case 'chariots':
      v -= ctx.diff - 1 > 2 ? 4 : 0; // nie marnuj Rydwanów, gdy i tak wygrywasz
      break;
    case 'drought':
      v += winning ? ctx.desert * 3 : 0;
      break;
    case 'flood':
      v += ctx.fertile * 1.5 + (winning ? 0 : ctx.fertile * 1.5);
      break;
    case 'miracle':
      v += winning ? -1 : ctx.killable * 3;
      break;
    case 'build':
      v += ctx.canBuild ? 5 : -3;
      break;
    case 'plague':
      v += (ctx.enemyWarriors - ctx.killable) * 2 + (ctx.followers >= 2 ? 2 : -3);
      break;
    case 'maat':
      v += ctx.used * 1.5 - 4;
      break;
  }
  return v;
}

function chooseCards(view: GameState, seat: PlayerId, moves: Extract<Move, { type: 'selectCard' }>[]): Move {
  const ctx = battleContext(view, seat);
  let top = moves[0];
  let topScore = -Infinity;
  for (const m of moves) {
    const cards = m.second ? [m.card, m.second] : [m.card];
    const extra = cards.length === 2 ? BATTLE_CARDS[cards[1]].strength : 0;
    const score = cards.reduce((s, c, i) => s + cardValue(c, ctx, i === 0 ? extra : BATTLE_CARDS[cards[0]].strength), 0);
    if (score > topScore) {
      topScore = score;
      top = m;
    }
  }
  return top;
}

function choosePlagueBid(view: GameState, seat: PlayerId): Move {
  const b = view.battle!;
  const followers = view.players[seat].followers;
  const myPlague = (b.revealed[seat] ?? []).includes('plague');
  const atRisk = figuresInRegion(view, b.region, seat).some((f) => f.kind !== 'god');
  const amount = myPlague
    ? Math.min(followers, Math.max(1, Math.ceil(followers * 0.6)))
    : atRisk
      ? Math.min(followers, Math.ceil(followers * 0.34))
      : 0;
  return { type: 'plagueBid', player: seat, amount };
}
