// Liczby i tory gry. Źródło: pełna instrukcja (Rulebook, CMON 2021) — strony podane przy wpisach.
// Wszystko, co silnik wie o „rozmiarze” gry, pochodzi stąd; nic nie jest wpisane w logikę na sztywno.

export type ActionType = 'move' | 'summon' | 'followers' | 'unlock';
export type EventType = 'controlMonument' | 'caravan' | 'conflict';
export type PlayerCount = 2 | 3 | 4 | 5;

export interface ActionTrackDef {
  /** Liczba pól toru; ostatnie pole (białe) wyzwala wydarzenie. */
  length: number;
  /** Indeks pola startowego (0 = pierwsze od lewej) zależnie od liczby graczy. */
  start: Record<PlayerCount, number>;
}

export interface EventSpaceDef {
  type: EventType;
  /** Dodatkowe skutki po rozstrzygnięciu (łączenie bogów, eliminacja, koniec gry). */
  after?: 'mergeGods' | 'eliminateRed' | 'endGame';
}

export interface RulesConfig {
  /** Kolejność wierszy na panelu akcji — druga akcja musi być niżej. */
  actionOrder: ActionType[];
  actionTracks: Record<ActionType, ActionTrackDef>;
  eventTrack: EventSpaceDef[];
  devotion: {
    /** Indeks pola szczytowego (dotarcie = natychmiastowa wygrana). Start = 0. */
    top: number;
    /** Najwyższy indeks czerwonej strefy (0..redMax). */
    redMax: number;
  };
  startingFollowers: number;
  warriorsPerGod: number;
  ankhTokensPerGod: number;
  /** Żetony ankh kładzione na dolnym rzędzie panelu boga (2 na kolumnę). */
  dashboardSlots: number;
  /** Koszt (w wyznawcach) odblokowania mocy danego poziomu. Indeks 0 = poziom 1. */
  unlockCost: [number, number, number];
  /** Indeksy slotów dolnego rzędu (0..5), pod którymi jest symbol strażnika. */
  guardianSlots: number[];
  /** Kolorowe podstawki na strażników (na boga). */
  bases: { small: number; large: number };
  /** Liczba figurek każdego strażnika w grze; 'all' = wszystkie egzemplarze. */
  guardiansPerType: Record<PlayerCount, number | 'all'>;
  monumentSupply: { obelisk: number; temple: number; pyramid: number };
  camelSupply: number;
  conflictOrderTokens: number;
  moveRange: number;
  caravan: { maxCamels: number; minRegionSize: number };
  merge: { afterConflict: number; minPlayers: number };
  eliminateAfterConflict: number;
}

const START: Record<PlayerCount, number> = { 5: 0, 4: 1, 3: 2, 2: 3 };

export const RULES: RulesConfig = {
  actionOrder: ['move', 'summon', 'followers', 'unlock'],
  // Rulebook s. 9 (diagram panelu centralnego): tory Ruch / Przywołanie / Wyznawcy mają 7 pól,
  // tor Odblokowania 6 pól; pola startowe oznaczone 5P, 4P, 3P, 2P od lewej.
  actionTracks: {
    move: { length: 7, start: START },
    summon: { length: 7, start: START },
    followers: { length: 7, start: START },
    unlock: { length: 6, start: START },
  },
  // Rulebook s. 9: tor wydarzeń (po polu startowym), 18 pól, 5 konfliktów.
  eventTrack: [
    { type: 'controlMonument' },
    { type: 'controlMonument' },
    { type: 'controlMonument' },
    { type: 'conflict' },
    { type: 'caravan' },
    { type: 'controlMonument' },
    { type: 'controlMonument' },
    { type: 'conflict' },
    { type: 'caravan' },
    { type: 'controlMonument' },
    { type: 'controlMonument' },
    { type: 'conflict', after: 'mergeGods' },
    { type: 'caravan' },
    { type: 'controlMonument' },
    { type: 'controlMonument' },
    { type: 'conflict', after: 'eliminateRed' },
    { type: 'controlMonument' },
    { type: 'conflict', after: 'endGame' },
  ],
  // Rulebook s. 11 (diagram toru oddania): pole startowe + 19 czerwonych + 11 niebieskich + szczyt.
  // Odczytane z grafiki — TODO: potwierdzić na fizycznej planszy.
  devotion: { top: 31, redMax: 19 },
  startingFollowers: 1, // s. 12
  warriorsPerGod: 6, // s. 4
  ankhTokensPerGod: 15, // s. 6
  dashboardSlots: 6, // s. 12
  unlockCost: [1, 2, 3], // s. 18
  // s. 10 i 18: symbol strażnika odsłania drugi żeton kolumny poziomu 1. Dla poziomów 2 i 3
  // grafika go nie pokazuje — przyjęto ten sam układ (drugi żeton kolumny). TODO: potwierdzić.
  guardianSlots: [1, 3, 5],
  bases: { small: 2, large: 2 }, // s. 4: 10 dużych i 10 małych podstawek (po 2 na boga)
  guardiansPerType: { 2: 1, 3: 2, 4: 'all', 5: 'all' }, // s. 13
  monumentSupply: { obelisk: 10, temple: 10, pyramid: 10 }, // s. 6
  camelSupply: 30, // s. 5
  conflictOrderTokens: 8, // s. 6
  moveRange: 3, // s. 15
  caravan: { maxCamels: 6, minRegionSize: 6 }, // s. 21
  merge: { afterConflict: 3, minPlayers: 3 }, // s. 25
  eliminateAfterConflict: 4, // s. 27
};
