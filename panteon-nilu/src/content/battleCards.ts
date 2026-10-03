import type { BattleCardId } from '../engine/types';

export interface BattleCardDef {
  id: BattleCardId;
  name: string;
  strength: number;
  text: string;
}

// Siły kart: Rulebook s. 29. Efekty — etap 2.
export const BATTLE_CARDS: Record<BattleCardId, BattleCardDef> = {
  plague: { id: 'plague', name: 'Plaga szarańczy', strength: 1,
    text: 'Tajna licytacja wyznawców; przeżywają tylko figurki gracza, który poświęcił najwięcej.' },
  build: { id: 'build', name: 'Budowa monumentu', strength: 0,
    text: 'Poświęć 3 wyznawców, by postawić monument na pustym polu regionu bitwy.' },
  chariots: { id: 'chariots', name: 'Rydwany', strength: 3, text: 'Tylko +3 do siły.' },
  maat: { id: 'maat', name: "Cykl Ma'at", strength: 0,
    text: 'Po bitwie wszystkie zagrane karty wracają na rękę.' },
  drought: { id: 'drought', name: 'Susza', strength: 1,
    text: 'Wygrana: +1 oddania za każdą Twoją figurkę na pustyni w regionie.' },
  flood: { id: 'flood', name: 'Powódź', strength: 0,
    text: 'Od razu +1 wyznawca za figurkę na polu żyznym; te figurki nie giną w rozstrzygnięciu.' },
  miracle: { id: 'miracle', name: 'Cud', strength: 0,
    text: 'Po bitwie +1 oddania za każdą Twoją poległą figurkę.' },
};

export const ALL_BATTLE_CARDS = Object.keys(BATTLE_CARDS) as BattleCardId[];
