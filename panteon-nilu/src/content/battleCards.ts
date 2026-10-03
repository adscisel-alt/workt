import { changeDevotion } from '../engine/devotion';
import { AFTER_PHASE } from '../engine/phases';
import { figuresInRegion, terrainOf } from '../engine/queries';
import type { BattleCardId, BattleState, GameState, PlayerId } from '../engine/types';
import { godName, log } from '../engine/util';

export interface CardContext {
  state: GameState;
  player: PlayerId;
  battle: BattleState;
}


export interface BattleCardDef {
  id: BattleCardId;
  name: string;
  strength: number;
  text: string;
  /** Karta uruchamia własny krok bitwy: 2 = budowa, 3 = plaga. */
  step?: 'build' | 'plague';
  /** Efekt natychmiast po odkryciu. */
  onReveal?(ctx: CardContext): void;
  /** Dodatek do nagrody za wygraną (ta sama „instancja” zysku oddania). */
  winDevotionBonus?(ctx: CardContext): number;
  /** Efekt po rozstrzygnięciu bitwy, w podanej fazie. */
  after?: { phase: number; run(ctx: CardContext): void };
}

// Siły i efekty: Rulebook s. 29. Opisy własnymi słowami.
export const BATTLE_CARDS: Record<BattleCardId, BattleCardDef> = {
  plague: {
    id: 'plague', name: 'Plaga szarańczy', strength: 1, step: 'plague',
    text: 'Tajna licytacja wyznawców; przeżywają tylko wojownicy i strażnicy gracza, który poświęcił najwięcej.',
  },
  build: {
    id: 'build', name: 'Budowa monumentu', strength: 0, step: 'build',
    text: 'Możesz poświęcić 3 wyznawców, by postawić własny monument na pustym polu regionu bitwy.',
  },
  chariots: { id: 'chariots', name: 'Rydwany', strength: 3, text: 'Tylko +3 do siły.' },
  maat: {
    id: 'maat', name: "Cykl Ma'at", strength: 0,
    text: 'Po bitwie wszystkie Twoje zagrane karty (także ta) wracają na rękę.',
    after: {
      phase: AFTER_PHASE.maat,
      run: ({ state, player }) => {
        const p = state.players[player];
        p.hand = [...p.hand, ...p.used].sort();
        p.used = [];
        log(state, `${godName(state, player)} odzyskuje wszystkie karty bitwy.`, player);
      },
    },
  },
  drought: {
    id: 'drought', name: 'Susza', strength: 1,
    text: 'Wygrana: +1 oddania za każdą Twoją figurkę na pustyni w tym regionie.',
    winDevotionBonus: ({ state, player, battle }) =>
      figuresInRegion(state, battle.region, player).filter((f) => terrainOf(state, f.pos!) === 'desert').length,
  },
  flood: {
    id: 'flood', name: 'Powódź', strength: 0,
    text: 'Od razu +1 wyznawca za każdą Twoją figurkę na polu żyznym; te figurki nie giną w rozstrzygnięciu.',
    onReveal: ({ state, player, battle }) => {
      const fertile = figuresInRegion(state, battle.region, player).filter((f) => terrainOf(state, f.pos!) === 'fertile');
      state.players[player].followers += fertile.length;
      battle.floodProtected.push(...fertile.map((f) => f.id));
      log(state, `${godName(state, player)}: Powódź daje ${fertile.length} wyznawców.`, player);
    },
  },
  miracle: {
    id: 'miracle', name: 'Cud', strength: 0,
    text: 'Po bitwie +1 oddania za każdą Twoją figurkę poległą w tej bitwie.',
    after: {
      phase: AFTER_PHASE.miracle,
      run: ({ state, player, battle }) => changeDevotion(state, player, battle.killed[player] ?? 0, 'Cud'),
    },
  },
};

export const ALL_BATTLE_CARDS = Object.keys(BATTLE_CARDS) as BattleCardId[];
