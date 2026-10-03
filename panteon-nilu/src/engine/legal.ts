import { mummyReturnTargets } from './actions';
import { caravanOptions, caravanSwapOptions } from './caravan';
import { buildOptions, relocationOptions, underworldOptions } from './conflict';
import {
  aimOptions, availableActions, boardFiguresOf, canMakeRadiant, moveOptions, nextUnlock, summonOptions,
} from './queries';
import type { GameState, Move, Pending, PlayerId } from './types';

/** Gracze, od których silnik czeka teraz decyzji. */
export function pendingPlayers(pending: Pending | null): PlayerId[] {
  if (!pending) return [];
  return 'waiting' in pending ? pending.waiting : [pending.player];
}

/** Pełna lista legalnych ruchów w bieżącym stanie. UI i bot tylko z niej wybierają. */
export function legalMoves(state: GameState): Move[] {
  const pending = state.pending;
  if (!pending || state.result) return [];
  switch (pending.kind) {
    case 'selectCards':
      return pending.waiting.flatMap((player) => {
        const hand = [...new Set(state.players[player].hand)].sort();
        if (!state.battle?.twoCards.includes(player)) return hand.map((card): Move => ({ type: 'selectCard', player, card }));
        return hand.flatMap((card, i) =>
          hand.slice(i + 1).map((second): Move => ({ type: 'selectCard', player, card, second })),
        );
      });
    case 'plagueBid':
      return pending.waiting.flatMap((player) =>
        Array.from({ length: state.players[player].followers + 1 }, (_, amount): Move => ({ type: 'plagueBid', player, amount })),
      );
  }
  const player = pending.player;
  switch (pending.kind) {
    case 'chooseAction':
      return availableActions(state).map((action) => ({ type: 'chooseAction', player, action }));
    case 'move': {
      const out: Move[] = [];
      for (const f of boardFiguresOf(state, player)) {
        if (pending.moved.includes(f.id)) continue;
        for (const o of moveOptions(state, f.id)) out.push({ type: 'moveFigure', player, figure: f.id, to: o.to, push: o.push });
      }
      out.push({ type: 'endMove', player });
      return out;
    }
    case 'summon': {
      const radiant = canMakeRadiant(state, player) ? [false, true] : [false];
      const out: Move[] = summonOptions(state, player, pending.used).flatMap((o) =>
        radiant.map((r): Move => ({ type: 'summon', player, figure: o.figure, to: o.to, source: o.source, radiant: r })),
      );
      // Zwykłe przywołanie jest obowiązkowe, jeśli możliwe (FAQ); dodatkowe — opcjonalne.
      const regularPossible = out.some((m) => m.type === 'summon' && m.source === 'regular');
      if (!regularPossible) out.push({ type: 'endSummon', player });
      return out;
    }
    case 'aimScorpion':
      return aimOptions(state, pending.figure).map((aim): Move => ({ type: 'aimScorpion', player, figure: pending.figure, aim }));
    case 'caravan':
      return caravanOptions(state).map((camels): Move => ({ type: 'caravan', player, camels }));
    case 'caravanKeep':
      return pending.regions.map((region): Move => ({ type: 'caravanKeep', player, region }));
    case 'caravanSwap':
      return [
        { type: 'caravanSwap', player, swap: null },
        ...caravanSwapOptions(state, pending.tokens).map((swap): Move => ({ type: 'caravanSwap', player, swap })),
      ];
    case 'obeliskMove':
      return [
        ...relocationOptions(state, player).map((o): Move => ({ type: 'obeliskMove', player, figure: o.figure, to: o.to })),
        { type: 'obeliskDone', player },
      ];
    case 'amunAnnounce':
      return [
        { type: 'amunAnnounce', player, use: true },
        { type: 'amunAnnounce', player, use: false },
      ];
    case 'anubisTrap':
      return [
        ...pending.candidates.map((figure): Move => ({ type: 'anubisTrap', player, figure })),
        { type: 'anubisTrap', player, figure: null },
      ];
    case 'isisProtect':
      return [
        ...pending.candidates.map((figure): Move => ({ type: 'isisProtect', player, figure })),
        { type: 'isisProtect', player, figure: null },
      ];
    case 'underworld':
      return [
        ...underworldOptions(state, pending.region).map((o): Move => ({ type: 'underworld', player, from: o.from, to: o.to })),
        { type: 'underworld', player, from: null, to: null },
      ];
    case 'worshipful':
      return [
        { type: 'worshipful', player, use: true },
        { type: 'worshipful', player, use: false },
      ];
    case 'mergeGuardians':
      return [
        ...pending.candidates.map((figure): Move => ({ type: 'mergeGuardian', player, figure })),
        { type: 'mergeGuardian', player, figure: null },
      ];
    case 'mummyReturn': {
      const radiant = canMakeRadiant(state, player) ? [false, true] : [false];
      return mummyReturnTargets(state, pending.figure).flatMap((to) =>
        radiant.map((r): Move => ({ type: 'mummyReturn', player, figure: pending.figure, to, radiant: r })),
      );
    }
    case 'unlock':
      return (nextUnlock(state, player)?.options ?? []).map((power) => ({ type: 'unlockPower', player, power }));
    case 'controlMonument':
      return pending.candidates.map((monument) => ({ type: 'controlMonument', player, monument }));
    case 'build': {
      const { types, sites } = buildOptions(state, player);
      return [
        ...types.flatMap((monument) => sites.map((at): Move => ({ type: 'build', player, monument, at }))),
        { type: 'skipBuild', player },
      ];
    }
    case 'tiebreaker':
      return [
        { type: 'useTiebreaker', player, use: true },
        { type: 'useTiebreaker', player, use: false },
      ];
  }
}

/** Stabilny klucz ruchu (do porównań i testów). */
export function moveKey(m: Move): string {
  return JSON.stringify(Object.keys(m).sort().map((k) => [k, (m as Record<string, unknown>)[k]]));
}

export function isLegal(state: GameState, move: Move): boolean {
  const key = moveKey(move);
  return legalMoves(state).some((m) => moveKey(m) === key);
}
