import type { EffectSource } from '../engine/hooks';
import { areAdjacent } from '../engine/map';
import { AFTER_PHASE } from '../engine/phases';
import { buildSites, figuresInRegion } from '../engine/queries';
import type { GameState, GodId, PlayerId } from '../engine/types';
import { godName, log, schedule } from '../engine/util';

export interface GodDef extends EffectSource {
  id: GodId;
  name: string;
  epithet: string;
  ability: string;
  color: string;
  /** Krótki opis stanu zdolności do panelu gracza. */
  status?(state: GameState, player: PlayerId): string;
}

/** Limity żetonów zdolności (Rulebook s. 30). */
export const GOD_LIMITS = { sunTokens: 3, underworldTokens: 3, anubisSlots: 3, anubisMaxBonus: 3 } as const;

export const trappedBy = (state: GameState, anubis: PlayerId) =>
  Object.values(state.figures).filter((f) => f.trappedBy === anubis);

const lostBattle = (state: GameState, p: PlayerId) => {
  const b = state.battle;
  return !!b && b.participants.includes(p) && b.winner !== p;
};

// Zdolności bogów (Rulebook s. 30). Opisy własnymi słowami.
export const GODS: Record<GodId, GodDef> = {
  amun: {
    id: 'amun', name: 'Amun', epithet: 'Ukryty', color: '#3b6fd8',
    ability: 'Raz na konflikt, przed wyborem kart przez rywali, może zapowiedzieć i zagrać w jednej bitwie dwie karty naraz.',
    status: (state) => `Żeton dwóch kart: ${state.abilities.amunTokenUp ? 'dostępny' : 'zużyty w tym konflikcie'}`,
    hooks: {
      canPlayTwoCards: ({ state, owner }) => state.abilities.amunTokenUp && state.players[owner].hand.length >= 2,
      onTwoCardsAnnounced: ({ state }) => {
        state.abilities.amunTokenUp = false;
      },
      onConflictEnd: ({ state }) => {
        state.abilities.amunTokenUp = true;
      },
    },
  },
  anubis: {
    id: 'anubis', name: 'Anubis', epithet: 'Sędzia', color: '#4b4b5a',
    ability: 'Gdy giną wrodzy wojownicy, może uwięzić jednego (maks. 3); każdy uwięziony daje jego figurce boga +1 siły. Właściciel może go uwolnić przy przywołaniu za 1 wyznawcę dla Anubisa.',
    status: (state, p) => `Uwięzieni: ${trappedBy(state, p).length}/${GOD_LIMITS.anubisSlots}`,
    hooks: {
      onWarriorsKilled: ({ state, owner, figures }) => {
        if (trappedBy(state, owner).length >= GOD_LIMITS.anubisSlots) return;
        const candidates = figures.filter((f) => f.owner !== owner && f.trappedBy === undefined).map((f) => f.id);
        if (candidates.length) schedule(state, { t: 'anubisTrap', player: owner, candidates });
      },
      figureStrength: ({ state, owner, figure, base }) =>
        figure.kind === 'god' ? base + Math.min(GOD_LIMITS.anubisMaxBonus, trappedBy(state, owner).length) : base,
      // Anubis wchłonięty: uwięzieni wojownicy wyższego boga wracają do jego puli, pozostali zostają w pułapce (s. 30).
      onMergedInto: ({ state, owner, higher }) => {
        for (const f of trappedBy(state, owner)) {
          if (f.owner === higher) delete f.trappedBy;
          else f.trappedBy = higher;
        }
      },
      // Anubis zapomniany: uwięzieni wracają do pul swoich właścicieli.
      onForgotten: ({ state, owner }) => {
        for (const f of trappedBy(state, owner)) delete f.trappedBy;
      },
    },
  },
  isis: {
    id: 'isis', name: 'Izyda', epithet: 'Opiekunka', color: '#2fa58a',
    ability: 'Jej figurki stojące obok wroga są chronione — w rozstrzygnięciu bitwy może je ocalić.',
    hooks: {
      protects: ({ state, owner, figure }) =>
        figure.owner === owner &&
        Object.values(state.figures).some(
          (e) => e.owner !== owner && e.pos !== null && areAdjacent(state.map, figure.pos!, e.pos),
        ),
    },
  },
  osiris: {
    id: 'osiris', name: 'Ozyrys', epithet: 'Brama Zaświatów', color: '#8a4fc8',
    ability: 'Po przegranej bitwie stawia lub przenosi wrota zaświatów w regionie bitwy; przez wrota przywołuje dodatkową figurkę. Obcy nie mogą tam stanąć ani budować.',
    status: (state) => `Wrota na planszy: ${state.abilities.underworld.length}/${GOD_LIMITS.underworldTokens}`,
    hooks: {
      extraSummonSources: ({ state }) =>
        state.abilities.underworld.map((h) => ({ id: `underworld:${h}`, targets: [h] })),
      canEndMoveOn: ({ state, owner, figure, hex }) =>
        !(figure.owner !== owner && state.abilities.underworld.includes(hex)),
      canPlaceOn: ({ state, owner, figure, hex }) =>
        !((figure === null || figure.owner !== owner) && state.abilities.underworld.includes(hex)),
      terrainOverride: ({ state, hex }) => (state.abilities.underworld.includes(hex) ? 'none' : undefined),
      onForgotten: ({ state }) => {
        state.abilities.underworld = []; // wrota znikają z gry (s. 30)
      },
      afterBattle: [
        {
          phase: AFTER_PHASE.lost,
          run: ({ state, owner }) => {
            const b = state.battle!;
            if (!lostBattle(state, owner)) return;
            const sites = buildSites(state, b.region).filter((h) => !state.abilities.underworld.includes(h));
            if (sites.length) state.pending = { kind: 'underworld', player: owner, region: b.region };
          },
        },
      ],
    },
  },
  ra: {
    id: 'ra', name: 'Ra', epithet: 'Promienny', color: '#e0782c',
    ability: 'Przywołanym figurkom może nadać słońce (3 żetony); obecność promiennej figurki zwiększa o 1 nagrodę za dominację lub wygraną w regionie.',
    status: (state) => `Wolne słońca: ${GOD_LIMITS.sunTokens - state.abilities.radiant.length}/${GOD_LIMITS.sunTokens}`,
    hooks: {
      canMakeRadiant: ({ state }) => state.abilities.radiant.length < GOD_LIMITS.sunTokens,
      onSummoned: ({ state, owner, figure, radiant }) => {
        if (radiant && figure.owner === owner) {
          state.abilities.radiant.push(figure.id);
          log(state, `${godName(state, owner)}: ${figure.id} staje się promienny.`, owner);
        }
      },
      regionRewardBonus: ({ state, owner, region }) =>
        figuresInRegion(state, region, owner).some((f) => state.abilities.radiant.includes(f.id)) ? 1 : 0,
      onFigureKilled: ({ state, figure }) => {
        state.abilities.radiant = state.abilities.radiant.filter((id) => id !== figure.id);
      },
      onFigureRemoved: ({ state, figure }) => {
        state.abilities.radiant = state.abilities.radiant.filter((id) => id !== figure.id);
      },
    },
  },
};
