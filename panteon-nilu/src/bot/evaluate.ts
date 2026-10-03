// Ocena stanu z perspektywy boga (bot heurystyczny). Liczy tylko informacje jawne.
import { computeRegions } from '../engine/map';
import { figureStrength, figuresInRegion, majorityCount, monumentsInRegion } from '../engine/queries';
import { entityOf, isEntity } from '../engine/util';
import type { GameState, PlayerId } from '../engine/types';

export const WEIGHTS = {
  devotion: 10,
  follower: 1.5,
  followerCap: 12,
  boardFigure: 3,
  monument: 5,
  power: 4,
  guardian: 2,
  dominance: 6,
  majority: 4,
  winning: 4,
  tie: 1,
  rival: 4,
  redPenalty: 3,
  win: 100000,
};

/** Siła gracza w regionie: suma sił jego figurek (bez kart). */
function regionStrength(state: GameState, region: number, p: PlayerId): number {
  return figuresInRegion(state, region, p).reduce((s, f) => s + figureStrength(state, f), 0);
}

export function evaluate(state: GameState, seat: PlayerId): number {
  const me = entityOf(state, seat);
  if (state.result) {
    return state.result.winners.includes(me) ? WEIGHTS.win : -WEIGHTS.win;
  }
  if (!isEntity(state, me)) return -WEIGHTS.win;
  const W = WEIGHTS;
  const p = state.players[me];
  let score = p.devotion * W.devotion;
  score += Math.min(p.followers, W.followerCap) * W.follower;
  const figs = Object.values(state.figures).filter((f) => f.owner === me);
  score += figs.filter((f) => f.pos !== null).length * W.boardFigure;
  score += figs.filter((f) => f.kind === 'guardian').length * W.guardian;
  score += Object.values(state.monuments).filter((m) => m.owner === me).length * W.monument;
  score += p.unlocked.length * W.power;

  // Przewidywany wynik najbliższego konfliktu w każdym regionie.
  const { regions } = computeRegions(state.map);
  const others = state.players.filter((o) => o.id !== me && isEntity(state, o.id)).map((o) => o.id);
  for (let r = 0; r < regions.length; r++) {
    const mine = regionStrength(state, r, me);
    if (mine === 0) continue;
    const rival = Math.max(0, ...others.map((o) => regionStrength(state, r, o)));
    const maj = monumentsInRegion(state, r).length ? majorityCount(state, r, me) : 0;
    if (rival === 0) score += W.dominance + maj * W.majority;
    else if (mine > rival) score += W.winning + maj * W.majority * 0.5;
    else if (mine === rival) score += W.tie;
  }

  // Najgroźniejszy rywal i czerwona strefa przed eliminacją.
  score -= Math.max(0, ...others.map((o) => state.players[o].devotion)) * W.rival;
  if (state.conflictsResolved >= 2 && state.conflictsResolved < state.rules.eliminateAfterConflict) {
    const missing = state.rules.devotion.redMax + 1 - p.devotion;
    if (missing > 0) score -= missing * W.redPenalty;
  }
  return score;
}
