import type { EffectSource } from '../engine/hooks';
import type { GuardianId } from '../engine/types';

export interface GuardianDef extends EffectSource {
  id: GuardianId;
  name: string;
  level: 1 | 2 | 3;
  size: 'small' | 'large';
  /** Liczba figurek w pudełku (Rulebook s. 4). */
  copies: number;
  text: string;
}

// Liczby figurek i rozmiary podstawek: Rulebook s. 4 i 13 (3 małe / 2 duże).
// Poziomy: instrukcja ich nie wypisuje. Poziom 3 Skorpiona potwierdza FAQ 1.0; pozostałe przypisano
// po jednym małym i jednym dużym na poziom (tak jak w podstawowym zestawie gry).
// TODO: potwierdzić poziomy 1–2 na kartach strażników.
export const GUARDIANS: Record<GuardianId, GuardianDef> = {
  catMummy: {
    id: 'catMummy', name: 'Kocia mumia', level: 1, size: 'small', copies: 3, hooks: {},
    text: 'Gdy zginie, każdy poza jej właścicielem traci 1 oddania.',
  },
  satet: {
    id: 'satet', name: 'Satet', level: 1, size: 'small', copies: 3, hooks: {},
    text: 'Może zakończyć ruch na polu wroga, spychając go o 1 pole.',
  },
  mummy: {
    id: 'mummy', name: 'Mumia', level: 2, size: 'small', copies: 3, hooks: {},
    text: 'Po śmierci natychmiast wraca na planszę obok swojego boga.',
  },
  apep: {
    id: 'apep', name: 'Apep', level: 2, size: 'large', copies: 2, hooks: {},
    text: 'Można go przywołać na dowolne pole wody.',
  },
  giantScorpion: {
    id: 'giantScorpion', name: 'Olbrzymi skorpion', level: 3, size: 'large', copies: 2, hooks: {},
    text: 'Na początku konfliktu niszczy sąsiednie monumenty, w które celuje szczypcami.',
  },
  androsphinx: {
    id: 'androsphinx', name: 'Androsfinks', level: 3, size: 'large', copies: 2, hooks: {},
    text: 'Sąsiadujący wrogowie nie wnoszą siły do bitwy.',
  },
};

export const guardiansOfLevel = (level: 1 | 2 | 3): GuardianDef[] =>
  Object.values(GUARDIANS).filter((g) => g.level === level);
