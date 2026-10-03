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
  | { kind: 'summon'; player: PlayerId }
  | { kind: 'unlock'; player: PlayerId; level: 1 | 2 | 3 }
  | { kind: 'controlMonument'; player: PlayerId; candidates: MonumentId[] }
  | { kind: 'selectCards'; waiting: PlayerId[] }
  | { kind: 'build'; player: PlayerId }
  | { kind: 'plagueBid'; waiting: PlayerId[] }
  | { kind: 'tiebreaker'; player: PlayerId };

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
  | { t: 'battleEnd' };

export type Move =
  | { type: 'chooseAction'; player: PlayerId; action: ActionType }
  | { type: 'moveFigure'; player: PlayerId; figure: FigureId; to: HexKey }
  | { type: 'endMove'; player: PlayerId }
  | { type: 'summon'; player: PlayerId; figure: FigureId; to: HexKey }
  | { type: 'unlockPower'; player: PlayerId; power: AnkhPowerId }
  | { type: 'controlMonument'; player: PlayerId; monument: MonumentId }
  | { type: 'selectCard'; player: PlayerId; card: BattleCardId }
  | { type: 'build'; player: PlayerId; monument: MonumentType; at: HexKey }
  | { type: 'skipBuild'; player: PlayerId }
  | { type: 'plagueBid'; player: PlayerId; amount: number }
  | { type: 'useTiebreaker'; player: PlayerId; use: boolean };

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
  devotionSeqCounter: number;
  turn: TurnState;
  turnNumber: number;
  pending: Pending | null;
  queue: Task[];
  log: LogEntry[];
  /** Zwycięzcy (wielu przy zespołowym boskim połączeniu); [] przy remisie/porażce wszystkich. */
  result: { winners: PlayerId[]; reason: string } | null;
}
