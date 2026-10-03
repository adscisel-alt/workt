import type { EffectSource } from '../engine/hooks';
import type { AnkhPowerId } from '../engine/types';

export interface AnkhPowerDef extends EffectSource {
  id: AnkhPowerId;
  name: string;
  level: 1 | 2 | 3;
  text: string;
}

// 12 mocy (Rulebook s. 28). Nazwy i opisy własne. Hooki pozostałych mocy — etap 4.
export const ANKH_POWERS: Record<AnkhPowerId, AnkhPowerDef> = {
  commanding: { id: 'commanding', level: 1, name: 'Łup zwycięzcy', hooks: {},
    text: 'Za każdą wygraną bitwę +3 wyznawców (nie za dominację).' },
  inspiring: { id: 'inspiring', level: 1, name: 'Natchnieni budowniczowie', hooks: {},
    text: 'Karta Budowy monumentu nic nie kosztuje.' },
  omnipresent: { id: 'omnipresent', level: 1, name: 'Wszechobecność', hooks: {},
    text: 'Na początku konfliktu +1 wyznawca za każdy region z Twoją figurką.' },
  revered: { id: 'revered', level: 1, name: 'Czczony', text: 'Akcja Wyznawcy daje 1 wyznawcę więcej.',
    hooks: { followersBonus: () => 1 } },
  resplendent: { id: 'resplendent', level: 2, name: 'Majestat', hooks: {},
    text: 'Masz 3+ monumenty jednego typu: Twój bóg ma bazową siłę 3.' },
  obeliskAttuned: { id: 'obeliskAttuned', level: 2, name: 'Zew obelisków', hooks: {},
    text: 'Na początku bitwy możesz przenieść figurki obok swoich obelisków w regionie bitwy.' },
  templeAttuned: { id: 'templeAttuned', level: 2, name: 'Moc świątyń', hooks: {},
    text: 'Każda Twoja świątynia w regionie z Twoją sąsiednią figurką daje +2 siły.' },
  pyramidAttuned: { id: 'pyramidAttuned', level: 2, name: 'Wrota piramid', hooks: {},
    text: 'Przy przywołaniu możesz dodatkowo przywołać figurkę obok każdej swojej piramidy.' },
  glorious: { id: 'glorious', level: 3, name: 'Triumf', hooks: {},
    text: 'Wygrana z przewagą 3+ siły daje 3 oddania zamiast 1.' },
  magnanimous: { id: 'magnanimous', level: 3, name: 'Wielkoduszność', hooks: {},
    text: 'Przegrana bitwa, w której miałeś 2+ figurki: +2 oddania.' },
  bountiful: { id: 'bountiful', level: 3, name: 'Hojność', hooks: {},
    text: 'W czerwonej strefie każdy zysk oddania jest większy o 1.' },
  worshipful: { id: 'worshipful', level: 3, name: 'Uwielbienie', hooks: {},
    text: 'Po bitwie, w której zagrałeś kartę, możesz poświęcić 2 wyznawców za 1 oddania.' },
};

export const powersOfLevel = (level: 1 | 2 | 3): AnkhPowerDef[] =>
  Object.values(ANKH_POWERS).filter((p) => p.level === level);
