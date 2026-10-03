import type { EffectSource } from '../engine/hooks';
import { changeDevotionSimultaneous } from '../engine/devotion';
import { areAdjacent } from '../engine/map';
import { AFTER_PHASE } from '../engine/phases';
import type { Figure, GameState, GuardianId, PlayerId } from '../engine/types';
import { godName, log, schedule } from '../engine/util';

export interface GuardianDef extends EffectSource {
  id: GuardianId;
  name: string;
  level: 1 | 2 | 3;
  size: 'small' | 'large';
  /** Liczba figurek w pudełku (Rulebook s. 4). */
  copies: number;
  text: string;
}

const is = (f: Figure, id: GuardianId, owner: PlayerId) => f.guardian === id && f.owner === owner;

/** Kocia mumia: każdy poza właścicielem traci 1 oddania (jednocześnie). */
function catMummyCurse(state: GameState, owner: PlayerId) {
  const losses: Partial<Record<PlayerId, number>> = {};
  // Bóg połączony to jeden byt — traci 1 oddania raz (FAQ).
  for (const p of state.players) if (p.id !== owner && !p.eliminated && p.mergedInto === undefined) losses[p.id] = -1;
  log(state, `Kocia mumia ${godName(state, owner)} ginie — pozostali tracą 1 oddania.`, owner);
  changeDevotionSimultaneous(state, losses, 'klątwa kociej mumii');
}

// Liczby figurek i rozmiary podstawek: Rulebook s. 4 i 13 (3 małe / 2 duże). Efekty: s. 31, FAQ 1.0.
// Poziomy: instrukcja ich nie wypisuje. Poziom 3 Skorpiona potwierdza FAQ 1.0; pozostałe przypisano
// po jednym małym i jednym dużym na poziom. TODO: potwierdzić poziomy 1–2 na kartach strażników.
export const GUARDIANS: Record<GuardianId, GuardianDef> = {
  catMummy: {
    id: 'catMummy', name: 'Kocia mumia', level: 1, size: 'small', copies: 3,
    text: 'Gdy zginie, każdy poza jej właścicielem traci 1 oddania.',
    hooks: {
      onFigureKilled: ({ state, owner, figure, inResolution }) => {
        if (!is(figure, 'catMummy', owner)) return;
        if (inResolution && state.battle) state.battle.catMummyDeaths.push(owner);
        else catMummyCurse(state, owner);
      },
      afterBattle: [
        {
          phase: AFTER_PHASE.catMummy,
          run: ({ state, owner }) => {
            const b = state.battle!;
            const n = b.catMummyDeaths.filter((p) => p === owner).length;
            b.catMummyDeaths = b.catMummyDeaths.filter((p) => p !== owner);
            for (let i = 0; i < n; i++) catMummyCurse(state, owner);
          },
        },
      ],
    },
  },
  satet: {
    id: 'satet', name: 'Satet', level: 1, size: 'small', copies: 3,
    text: 'W ruchu może zakończyć na polu wroga, spychając go o 1 pole.',
    hooks: { movePush: ({ owner, figure }) => is(figure, 'satet', owner) },
  },
  mummy: {
    id: 'mummy', name: 'Mumia', level: 2, size: 'small', copies: 3,
    text: 'Po śmierci natychmiast wraca na planszę obok swojego boga (to przywołanie).',
    hooks: {
      onFigureKilled: ({ state, owner, figure }) => {
        if (is(figure, 'mummy', owner)) schedule(state, { t: 'mummyReturn', figure: figure.id });
      },
    },
  },
  apep: {
    id: 'apep', name: 'Apep', level: 2, size: 'large', copies: 2,
    text: 'Można go przywołać na dowolne pole wody (przy Wrotach piramid — na wodę obok piramidy).',
    hooks: {
      extraPlacementTargets: ({ state, owner, figure, source }) => {
        if (!is(figure, 'apep', owner)) return [];
        const water = Object.keys(state.map.terrain).filter((h) => state.map.terrain[h] === 'water');
        if (source === 'regular') return water;
        return water.filter((h) => (source.anchors ?? []).some((a) => areAdjacent(state.map, a, h)));
      },
    },
  },
  giantScorpion: {
    id: 'giantScorpion', name: 'Olbrzymi skorpion', level: 3, size: 'large', copies: 2,
    text: 'Po każdym postawieniu lub ruchu celuje szczypcami w 2 sąsiednie pola; na początku konfliktu niszczy sąsiednie monumenty, w które celuje.',
    hooks: {
      needsAim: ({ owner, figure }) => is(figure, 'giantScorpion', owner),
      onConflictStart: ({ state, owner }) => {
        for (const sc of Object.values(state.figures)) {
          if (!is(sc, 'giantScorpion', owner) || !sc.pos || !sc.aim) continue;
          for (const m of Object.values(state.monuments)) {
            if (sc.aim.includes(m.pos) && areAdjacent(state.map, sc.pos, m.pos)) {
              if (m.owner !== null) state.players[m.owner].ankhPool++;
              state.monumentSupply[m.type]++;
              delete state.monuments[m.id];
              log(state, `${godName(state, owner)}: skorpion niszczy monument (${m.type}).`, owner);
            }
          }
        }
      },
    },
  },
  androsphinx: {
    id: 'androsphinx', name: 'Androsfinks', level: 3, size: 'large', copies: 2,
    text: 'Sąsiadujący wrogowie nie wnoszą siły do bitwy (także figurka w wodzie obok niego — w każdej bitwie).',
    hooks: {
      neutralizes: ({ state, owner, figure }) =>
        figure.owner !== owner &&
        figure.pos !== null &&
        Object.values(state.figures).some(
          (s) => is(s, 'androsphinx', owner) && s.pos !== null && areAdjacent(state.map, s.pos, figure.pos!),
        ),
    },
  },
};

export const guardiansOfLevel = (level: 1 | 2 | 3): GuardianDef[] =>
  Object.values(GUARDIANS).filter((g) => g.level === level);
