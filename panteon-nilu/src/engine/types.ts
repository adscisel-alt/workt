import type { ActionType, EventType, RulesConfig } from '../config/rules';

export type HexKey = string; // "q,r" (współrzędne osiowe)
export type EdgeKey = string; // "q1,r1|q2,r2" (posortowane)
export type Terrain = 'fertile' | 'desert' | 'water';
export type MonumentType = 'obelisk' | 'temple' | 'pyramid';
export type PlayerId = number; // indeks w GameState.players (kolejność tury)
export type FigureId = string;
export type MonumentId = string;
export type GodId = 'amun' | 'anubis' | 'isis' | 'osiris' | 'ra';
export type GuardianId = 'catMummy' | 'satet' | 'mummy' | 'apep' | 'giantScorpion' | 'androsphinx';
export type AnkhPowerId =
  | 'commanding' | 'inspiring' | 'omnipresent' | 'revered'
  | 'resplendent' | 'obeliskAttuned' | 'templeAttuned' | 'pyramidAttuned'
  | 'glorious' | 'magnanimous' | 'bountiful' | 'worshipful';
export type BattleCardId = 'plague' | 'build' | 'chariots' | 'maat' | 'drought' | 'flood' | 'miracle';

export interface MapState {
  terrain: Record<HexKey, Terrain>;
  rivers: EdgeKey[];
  camels: EdgeKey[];
}

export interface Figure {
  id: FigureId;
  owner: PlayerId;
  kind: 'god' | 'warrior' | 'guardian';
  guardian?: GuardianId;
  /** null = w puli gracza */
  pos: HexKey | null;
  /** Wojownik uwięziony przez Anubisa (id gracza Anubisa). */
  trappedBy?: PlayerId;
  /** Olbrzymi skorpion: dwa pola, w które celują szczypce. */
  aim?: [HexKey, HexKey] | null;
}

export interface Monument {
  id: MonumentId;
  type: MonumentType;
  pos: HexKey;
  owner: PlayerId | null;
}

export interface PlayerState {
  id: PlayerId;
  god: GodId;
  followers: number;
  /** Żetony ankh w osobistej puli (nie na panelu, nie na monumentach). */
  ankhPool: number;
  /** Odblokowane moce w kolejności odblokowania (slot i = i-ty żeton z dolnego rzędu). */
  unlocked: AnkhPowerId[];
  bases: { small: number; large: number };
  devotion: number;
  /** Pozycja w stosie: większa = wyżej w stosie na tym samym polu. */
  devotionSeq: number;
  hand: BattleCardId[];
  used: BattleCardId[];
  eliminated: boolean;
}

export interface TurnState {
  player: PlayerId;
  actions: ActionType[];
  /** Akcja, której znacznik dotarł do końca toru w tej turze. */
  triggered: ActionType | null;
}

/**
 * Decyzja, na którą silnik czeka. `player` — decyzja jednego gracza;
 * `waiting` — decyzja jednoczesna (tajna), czekamy na wszystkich z listy.
 */
export type Pending =
  | { kind: 'chooseAction'; player: PlayerId }
  | { kind: 'move'; player: PlayerId; moved: FigureId[] }
  | { kind: 'summon'; player: PlayerId; used: string[] }
  | { kind: 'unlock'; player: PlayerId; level: 1 | 2 | 3 }
  | { kind: 'controlMonument'; player: PlayerId; candidates: MonumentId[] }
  | { kind: 'selectCards'; waiting: PlayerId[] }
  | { kind: 'build'; player: PlayerId }
  | { kind: 'plagueBid'; waiting: PlayerId[] }
  | { kind: 'tiebreaker'; player: PlayerId }
  | { kind: 'aimScorpion'; player: PlayerId; figure: FigureId }
  | { kind: 'caravan'; player: PlayerId }
  | { kind: 'caravanKeep'; player: PlayerId; token: number; regions: [HexKey, HexKey] }
  | { kind: 'caravanSwap'; player: PlayerId; tokens: [number, number] }
  | { kind: 'obeliskMove'; player: PlayerId }
  | { kind: 'amunAnnounce'; player: PlayerId }
  | { kind: 'anubisTrap'; player: PlayerId; candidates: FigureId[] }
  | { kind: 'isisProtect'; player: PlayerId; candidates: FigureId[] }
  | { kind: 'underworld'; player: PlayerId; region: number }
  | { kind: 'worshipful'; player: PlayerId }
  | { kind: 'mummyReturn'; player: PlayerId; figure: FigureId };

export interface ConflictState {
  /** Żeton rozstrzygający remis: bierze go gracz, który wyzwolił konflikt. */
  tiebreaker: { holder: PlayerId; faceUp: boolean };
}

export interface BattleState {
  token: number;
  region: number;
  /** Gracze z co najmniej 1 figurką w regionie na początku bitwy. */
  participants: PlayerId[];
  /** Tajnie wybrane karty (ukrywane w widoku gracza do odkrycia). */
  selected: Partial<Record<PlayerId, BattleCardId[]>>;
  revealed: Partial<Record<PlayerId, BattleCardId[]>>;
  /** Uczestnicy licytacji plagi (obecni w regionie na początku kroku plagi). */
  plagueBidders: PlayerId[];
  /** Tajne oferty bieżącej licytacji plagi. */
  bids: Partial<Record<PlayerId, number>>;
  /** Figurki chronione Powodzią przed śmiercią w rozstrzygnięciu. */
  floodProtected: FigureId[];
  /** Liczba poległych figurek każdego gracza w tej bitwie (dla Cudu). */
  killed: Partial<Record<PlayerId, number>>;
  strengths: Partial<Record<PlayerId, number>>;
  /** Gracze remisujący o zwycięstwo (gdy remis). */
  tied: PlayerId[];
  tiebreakUsed: boolean;
  /** Kolejka graczy używających Zewu obelisków (na zmianę po 1 figurce). */
  obeliskQueue: PlayerId[];
  /** Liczba figurek w regionie w chwili rozstrzygnięcia (dla Wielkoduszności). */
  figuresAtResolution: Partial<Record<PlayerId, number>>;
  winner: PlayerId | null;
  /** Figurki do zabicia w rozstrzygnięciu (po decyzji Izydy). */
  toKill: FigureId[];
  /** Właściciele kocich mumii poległych w rozstrzygnięciu (strata oddania po nagrodach). */
  catMummyDeaths: PlayerId[];
  /** Gracze, którzy zapowiedzieli dwie karty (Amun), i ci już zapytani. */
  twoCards: PlayerId[];
  askedTwoCards: PlayerId[];
}

/** Zaplanowany krok silnika (kolejka — w pełni serializowalna). */
export type Task =
  | { t: 'resolveAction'; action: ActionType }
  | { t: 'afterAction'; action: ActionType }
  | { t: 'advanceEvent' }
  | { t: 'resetMarker'; action: ActionType }
  | { t: 'resolveEvent'; event: EventType }
  | { t: 'afterEvent'; index: number }
  | { t: 'endTurn' }
  | { t: 'conflictStart' }
  | { t: 'resolveRegion'; token: number }
  | { t: 'conflictEnd' }
  | { t: 'battleReveal' }
  | { t: 'battleBuild' }
  | { t: 'buildFor'; player: PlayerId }
  | { t: 'battlePlague' }
  | { t: 'plagueBid' }
  | { t: 'plagueResolve' }
  | { t: 'battleMajority' }
  | { t: 'battleResolution' }
  | { t: 'battleSettle' }
  | { t: 'battleAfter' }
  | { t: 'battleEnd' }
  | { t: 'battleObelisk' }
  | { t: 'battleCards' }
  | { t: 'battleKill' }
  | { t: 'afterBattleStep'; phase: number; player: PlayerId }
  | { t: 'continueSummon'; player: PlayerId; used: string[] }
  | { t: 'resumeMove'; player: PlayerId; moved: FigureId[] }
  | { t: 'aimScorpion'; figure: FigureId }
  | { t: 'mummyReturn'; figure: FigureId }
  | { t: 'anubisTrap'; player: PlayerId; candidates: FigureId[] }
  | { t: 'afterBattlePhase'; phase: number }
  | { t: 'protectAsk'; player: PlayerId; candidates: FigureId[] };

export type Move =
  | { type: 'chooseAction'; player: PlayerId; action: ActionType }
  | { type: 'moveFigure'; player: PlayerId; figure: FigureId; to: HexKey; push: HexKey | null }
  | { type: 'endMove'; player: PlayerId }
  | { type: 'summon'; player: PlayerId; figure: FigureId; to: HexKey; source: string; radiant: boolean }
  | { type: 'endSummon'; player: PlayerId }
  | { type: 'unlockPower'; player: PlayerId; power: AnkhPowerId }
  | { type: 'controlMonument'; player: PlayerId; monument: MonumentId }
  | { type: 'selectCard'; player: PlayerId; card: BattleCardId; second?: BattleCardId }
  | { type: 'build'; player: PlayerId; monument: MonumentType; at: HexKey }
  | { type: 'skipBuild'; player: PlayerId }
  | { type: 'plagueBid'; player: PlayerId; amount: number }
  | { type: 'useTiebreaker'; player: PlayerId; use: boolean }
  | { type: 'aimScorpion'; player: PlayerId; figure: FigureId; aim: [HexKey, HexKey] | null }
  | { type: 'caravan'; player: PlayerId; camels: EdgeKey[] }
  | { type: 'caravanKeep'; player: PlayerId; region: HexKey }
  | { type: 'caravanSwap'; player: PlayerId; swap: [number, number] | null }
  | { type: 'obeliskMove'; player: PlayerId; figure: FigureId; to: HexKey }
  | { type: 'obeliskDone'; player: PlayerId }
  | { type: 'amunAnnounce'; player: PlayerId; use: boolean }
  | { type: 'anubisTrap'; player: PlayerId; figure: FigureId | null }
  | { type: 'isisProtect'; player: PlayerId; figure: FigureId | null }
  | { type: 'underworld'; player: PlayerId; from: HexKey | null; to: HexKey | null }
  | { type: 'worshipful'; player: PlayerId; use: boolean }
  | { type: 'mummyReturn'; player: PlayerId; figure: FigureId; to: HexKey; radiant: boolean };

export interface LogEntry {
  n: number;
  player?: PlayerId;
  text: string;
}

export interface GameState {
  version: 1;
  rules: RulesConfig;
  scenarioId: string;
  playerCount: 2 | 3 | 4 | 5;
  rng: number;
  map: MapState;
  players: PlayerState[];
  figures: Record<FigureId, Figure>;
  monuments: Record<MonumentId, Monument>;
  monumentSupply: Record<MonumentType, number>;
  nextMonumentId: number;
  /** Numer żetonu kolejności konfliktu -> heks-kotwica regionu. */
  conflictTokens: Record<string, HexKey>;
  conflictTokenSupply: number[];
  camelSupply: number;
  guardianCards: Record<1 | 2 | 3, GuardianId>;
  guardianSupply: Partial<Record<GuardianId, number>>;
  actionTracks: Record<ActionType, number>;
  /** -1 = znacznik na polu startowym toru wydarzeń. */
  eventIndex: number;
  conflictsResolved: number;
  conflict: ConflictState | null;
  battle: BattleState | null;
  /** Stan zdolności bogów (każdy bóg występuje w grze najwyżej raz). */
  abilities: {
    /** Ra: figurki ze słońcem (promienne). */
    radiant: FigureId[];
    /** Ozyrys: pola z wrotami zaświatów na planszy. */
    underworld: HexKey[];
    /** Amun: żeton zdolności odkryty (dostępny w tym konflikcie). */
    amunTokenUp: boolean;
  };
  devotionSeqCounter: number;
  turn: TurnState;
  turnNumber: number;
  pending: Pending | null;
  queue: Task[];
  log: LogEntry[];
  /** Zwycięzcy (wielu przy zespołowym boskim połączeniu); [] przy remisie/porażce wszystkich. */
  result: { winners: PlayerId[]; reason: string } | null;
}
