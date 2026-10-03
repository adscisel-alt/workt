import type { EffectSource } from '../engine/hooks';
import type { GodId } from '../engine/types';

export interface GodDef extends EffectSource {
  id: GodId;
  name: string;
  epithet: string;
  ability: string;
  color: string;
}

// Zdolności bogów — hooki dochodzą w etapie 4. Opisy własnymi słowami.
export const GODS: Record<GodId, GodDef> = {
  amun: {
    id: 'amun', name: 'Amun', epithet: 'Ukryty', color: '#3b6fd8', hooks: {},
    ability: 'Raz na konflikt, przed wyborem kart przez rywali, może zagrać w jednej bitwie dwie karty naraz.',
  },
  anubis: {
    id: 'anubis', name: 'Anubis', epithet: 'Sędzia', color: '#4b4b5a', hooks: {},
    ability: 'Więzi poległych wrogich wojowników; każdy uwięziony daje jego figurce +1 siły (maks. +3).',
  },
  isis: {
    id: 'isis', name: 'Izyda', epithet: 'Opiekunka', color: '#2fa58a', hooks: {},
    ability: 'Jej figurki stojące obok wroga są chronione — mogą przeżyć rozstrzygnięcie bitwy.',
  },
  osiris: {
    id: 'osiris', name: 'Ozyrys', epithet: 'Brama Zaświatów', color: '#8a4fc8', hooks: {},
    ability: 'Po przegranej bitwie stawia wrota zaświatów; przez nie może przywoływać dodatkową figurkę.',
  },
  ra: {
    id: 'ra', name: 'Ra', epithet: 'Promienny', color: '#e0782c', hooks: {},
    ability: 'Przywołanym figurkom może nadać słońce; promienna obecność zwiększa nagrodę za region o 1.',
  },
};
