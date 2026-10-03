import type { EffectSource } from '../engine/hooks';
import { changeDevotion, isInRed } from '../engine/devotion';
import { areAdjacent, computeRegions } from '../engine/map';
import { AFTER_PHASE } from '../engine/phases';
import { figuresInRegion, monumentsInRegion } from '../engine/queries';
import type { AnkhPowerId, GameState, MonumentType, PlayerId } from '../engine/types';
import { godName, log } from '../engine/util';

export interface AnkhPowerDef extends EffectSource {
  id: AnkhPowerId;
  name: string;
  level: 1 | 2 | 3;
  text: string;
}

const owned = (state: GameState, p: PlayerId, type: MonumentType) =>
  Object.values(state.monuments).filter((m) => m.owner === p && m.type === type);

const lostBattle = (state: GameState, p: PlayerId) => {
  const b = state.battle;
  return !!b && b.participants.includes(p) && b.winner !== p;
};

// 12 mocy (Rulebook s. 28, FAQ 1.0). Nazwy i opisy własne.
export const ANKH_POWERS: Record<AnkhPowerId, AnkhPowerDef> = {
  // ---------- poziom 1 ----------
  commanding: {
    id: 'commanding', level: 1, name: 'Łup zwycięzcy',
    text: 'Za każdą wygraną bitwę +3 wyznawców (nie za dominację).',
    hooks: {
      onBattleWon: ({ state, owner }) => {
        state.players[owner].followers += 3;
        log(state, `${godName(state, owner)}: Łup zwycięzcy, +3 wyznawców.`, owner);
      },
    },
  },
  inspiring: {
    id: 'inspiring', level: 1, name: 'Natchnieni budowniczowie',
    text: 'Karta Budowy monumentu nic nie kosztuje.',
    hooks: { buildCost: () => 0 },
  },
  omnipresent: {
    id: 'omnipresent', level: 1, name: 'Wszechobecność',
    text: 'Na początku konfliktu +1 wyznawca za każdy region z Twoją figurką.',
    hooks: {
      onConflictStart: ({ state, owner }) => {
        const n = computeRegions(state.map).regions.filter((_, r) => figuresInRegion(state, r, owner).length).length;
        state.players[owner].followers += n;
        log(state, `${godName(state, owner)}: Wszechobecność, +${n} wyznawców.`, owner);
      },
    },
  },
  revered: {
    id: 'revered', level: 1, name: 'Czczony',
    text: 'Akcja Wyznawcy daje 1 wyznawcę więcej.',
    hooks: { followersBonus: () => 1 },
  },
  // ---------- poziom 2 ----------
  resplendent: {
    id: 'resplendent', level: 2, name: 'Majestat',
    text: 'Masz 3+ monumenty jednego typu na planszy: Twój bóg ma bazową siłę 3.',
    hooks: {
      figureStrength: ({ state, owner, figure, base }) =>
        figure.kind === 'god' && (['obelisk', 'temple', 'pyramid'] as const).some((t) => owned(state, owner, t).length >= 3)
          ? base + 2
          : base,
    },
  },
  obeliskAttuned: {
    id: 'obeliskAttuned', level: 2, name: 'Zew obelisków',
    text: 'Na początku bitwy możesz przestawić dowolne swoje figurki na wolne pola obok swoich obelisków w regionie bitwy.',
    hooks: {
      battleRelocationAnchors: ({ state, owner, region }) =>
        monumentsInRegion(state, region).filter((m) => m.owner === owner && m.type === 'obelisk').map((m) => m.pos),
    },
  },
  templeAttuned: {
    id: 'templeAttuned', level: 2, name: 'Moc świątyń',
    text: 'Każda Twoja świątynia w regionie bitwy, obok której stoi Twoja figurka, daje +2 siły.',
    hooks: {
      strengthBonus: ({ state, owner, region }) => {
        const figs = figuresInRegion(state, region, owner);
        return 2 * monumentsInRegion(state, region)
          .filter((m) => m.owner === owner && m.type === 'temple')
          .filter((m) => figs.some((f) => areAdjacent(state.map, f.pos!, m.pos))).length;
      },
    },
  },
  pyramidAttuned: {
    id: 'pyramidAttuned', level: 2, name: 'Wrota piramid',
    text: 'Przy przywołaniu możesz dodatkowo przywołać po 1 figurce obok każdej swojej piramidy.',
    hooks: {
      extraSummonSources: ({ state, owner }) =>
        owned(state, owner, 'pyramid').map((m) => ({ id: `pyramid:${m.id}`, anchors: [m.pos] })),
    },
  },
  // ---------- poziom 3 ----------
  glorious: {
    id: 'glorious', level: 3, name: 'Triumf',
    text: 'Wygrana z przewagą 3+ siły nad najsilniejszym rywalem daje 3 oddania zamiast 1.',
    hooks: { winBaseDevotion: ({ margin }) => (margin >= 3 ? 3 : undefined) },
  },
  magnanimous: {
    id: 'magnanimous', level: 3, name: 'Wielkoduszność',
    text: 'Przegrana bitwa, w której w rozstrzygnięciu miałeś 2+ figurki: +2 oddania.',
    hooks: {
      afterBattle: [
        {
          phase: AFTER_PHASE.lost,
          run: ({ state, owner }) => {
            if (lostBattle(state, owner) && (state.battle!.figuresAtResolution[owner] ?? 0) >= 2) {
              changeDevotion(state, owner, 2, 'Wielkoduszność');
            }
          },
        },
      ],
    },
  },
  bountiful: {
    id: 'bountiful', level: 3, name: 'Hojność',
    text: 'W czerwonej strefie każdy zysk oddania jest większy o 1.',
    hooks: { devotionGainBonus: ({ state, owner }) => (isInRed(state, owner) ? 1 : 0) },
  },
  worshipful: {
    id: 'worshipful', level: 3, name: 'Uwielbienie',
    text: 'Raz po każdej bitwie, w której zagrałeś kartę, możesz poświęcić 2 wyznawców za 1 oddania.',
    hooks: {
      afterBattle: [
        {
          phase: AFTER_PHASE.worshipful,
          run: ({ state, owner }) => {
            const played = (state.battle?.revealed[owner] ?? []).length > 0;
            if (played && state.players[owner].followers >= 2) state.pending = { kind: 'worshipful', player: owner };
          },
        },
      ],
    },
  },
};

export const powersOfLevel = (level: 1 | 2 | 3): AnkhPowerDef[] =>
  Object.values(ANKH_POWERS).filter((p) => p.level === level);
