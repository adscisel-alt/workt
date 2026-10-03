import { ALL_BATTLE_CARDS } from '../content/battleCards';
import { GUARDIANS, guardiansOfLevel } from '../content/guardians';
import { RULES, type PlayerCount, type RulesConfig } from '../config/rules';
import { SCENARIOS, type ScenarioDef } from '../config/scenarios';
import type { Cell } from '../config/scenarios/types';
import { edgeKey, neighborKeys, offsetKey } from './hex';
import { randomInt, seedFrom } from './rng';
import type {
  Figure, GameState, GodId, GuardianId, HexKey, MapState, Monument, MonumentType, PlayerState,
} from './types';

export interface NewGameOptions {
  scenario: string | ScenarioDef;
  /** Bogowie w kolejności siedzenia (zgodnie z ruchem wskazówek zegara). */
  gods: GodId[];
  seed: number | string;
  /** Indeks (w `gods`) gracza rozpoczynającego; domyślnie losowany. */
  firstPlayer?: number;
  /** Wybrane karty strażników; domyślnie losowane. */
  guardianCards?: Partial<Record<1 | 2 | 3, GuardianId>>;
  rules?: RulesConfig;
}

const key = ([c, r]: Cell): HexKey => offsetKey(c, r);

/** Buduje mapę ze scenariusza; rzeki = krawędzie między różnymi etykietami regionów. */
export function buildMap(scenario: ScenarioDef): MapState {
  const terrain: MapState['terrain'] = {};
  const label: Record<HexKey, string> = {};
  scenario.grid.forEach((line, row) => {
    line.trim().split(/\s+/).forEach((cell, col) => {
      const h = offsetKey(col, row);
      if (cell === 'W') terrain[h] = 'water';
      else if (cell[0] === 'F' || cell[0] === 'D') {
        terrain[h] = cell[0] === 'F' ? 'fertile' : 'desert';
        label[h] = cell.slice(1);
      } else if (cell !== '.') throw new Error(`Nieznane pole "${cell}" w scenariuszu ${scenario.id}`);
    });
  });
  const rivers = new Set<string>();
  for (const h of Object.keys(label)) {
    for (const n of neighborKeys(h)) {
      if (n in label && label[n] !== label[h]) rivers.add(edgeKey(h, n));
    }
  }
  return { terrain, rivers: [...rivers].sort(), camels: [] };
}

export function createGame(opts: NewGameOptions): GameState {
  const rules = opts.rules ?? RULES;
  const scenario = typeof opts.scenario === 'string' ? SCENARIOS[opts.scenario] : opts.scenario;
  if (!scenario) throw new Error(`Nieznany scenariusz: ${String(opts.scenario)}`);
  const n = opts.gods.length;
  if (n < 2 || n > 5) throw new Error('Gra wymaga 2–5 graczy');
  if (!scenario.playerCounts.includes(n) || !scenario.starts[n]) {
    throw new Error(`Scenariusz ${scenario.id} nie obsługuje ${n} graczy`);
  }
  if (new Set(opts.gods).size !== n) throw new Error('Każdy gracz musi mieć innego boga');
  const playerCount = n as PlayerCount;

  const state = {
    version: 1,
    rules,
    scenarioId: scenario.id,
    playerCount,
    rng: seedFrom(opts.seed),
  } as GameState;

  const first = opts.firstPlayer ?? randomInt(state, n);
  const gods = [...opts.gods.slice(first), ...opts.gods.slice(0, first)];

  state.map = buildMap(scenario);
  state.figures = {};
  state.monuments = {};
  state.monumentSupply = { ...rules.monumentSupply };
  state.nextMonumentId = 1;

  const addMonument = (type: MonumentType, at: Cell, owner: number | null) => {
    const pos = key(at);
    if (!(pos in state.map.terrain) || state.map.terrain[pos] === 'water') {
      throw new Error(`Monument poza lądem: ${pos}`);
    }
    if (state.monumentSupply[type] <= 0) throw new Error(`Brak monumentów typu ${type}`);
    state.monumentSupply[type]--;
    const m: Monument = { id: `m${state.nextMonumentId++}`, type, pos, owner };
    state.monuments[m.id] = m;
  };
  for (const m of scenario.monuments) addMonument(m.type, m.at, null);

  state.players = gods.map((god, id): PlayerState => ({
    id,
    god,
    followers: rules.startingFollowers,
    ankhPool: rules.ankhTokensPerGod - rules.dashboardSlots,
    unlocked: [],
    bases: { ...rules.bases },
    devotion: 0,
    devotionSeq: n - id, // pierwszy gracz na szczycie stosu (s. 12, krok 5)
    hand: [...ALL_BATTLE_CARDS],
    used: [],
    eliminated: false,
  }));
  state.devotionSeqCounter = n;

  scenario.starts[n].forEach((start, pid) => {
    const figs: Figure[] = [{ id: `p${pid}-god`, owner: pid, kind: 'god', pos: null }];
    for (let w = 1; w <= rules.warriorsPerGod; w++) {
      figs.push({ id: `p${pid}-w${w}`, owner: pid, kind: 'warrior', pos: null });
    }
    figs[0].pos = key(start.god);
    start.warriors.forEach((cell, i) => (figs[i + 1].pos = key(cell)));
    for (const f of figs) state.figures[f.id] = f;
    for (const m of start.monuments) {
      addMonument(m.type, m.at, pid);
      state.players[pid].ankhPool--;
    }
  });

  const occupied = new Set<HexKey>();
  for (const pos of [
    ...Object.values(state.figures).map((f) => f.pos),
    ...Object.values(state.monuments).map((m) => m.pos),
  ]) {
    if (pos === null) continue;
    if (occupied.has(pos)) throw new Error(`Pole ${pos} zajęte podwójnie w scenariuszu`);
    occupied.add(pos);
  }

  state.conflictTokens = {};
  for (const [token, cell] of Object.entries(scenario.conflictTokens)) state.conflictTokens[token] = key(cell);
  const usedTokens = new Set(Object.keys(scenario.conflictTokens).map(Number));
  state.conflictTokenSupply = [];
  for (let t = 1; t <= rules.conflictOrderTokens; t++) if (!usedTokens.has(t)) state.conflictTokenSupply.push(t);
  state.camelSupply = rules.camelSupply;

  const cards = {} as Record<1 | 2 | 3, GuardianId>;
  state.guardianSupply = {};
  for (const level of [1, 2, 3] as const) {
    const options = guardiansOfLevel(level);
    const chosen = opts.guardianCards?.[level] ?? options[randomInt(state, options.length)].id;
    if (GUARDIANS[chosen].level !== level) throw new Error(`${chosen} nie jest strażnikiem poziomu ${level}`);
    cards[level] = chosen;
    const per = rules.guardiansPerType[playerCount];
    state.guardianSupply[chosen] = per === 'all' ? GUARDIANS[chosen].copies : per;
  }
  state.guardianCards = cards;

  state.actionTracks = {
    move: rules.actionTracks.move.start[playerCount],
    summon: rules.actionTracks.summon.start[playerCount],
    followers: rules.actionTracks.followers.start[playerCount],
    unlock: rules.actionTracks.unlock.start[playerCount],
  };
  state.eventIndex = -1;
  state.conflictsResolved = 0;
  state.conflict = null;
  state.battle = null;
  state.turn = { player: 0, actions: [], triggered: null };
  state.turnNumber = 1;
  state.pending = { kind: 'chooseAction', player: 0 };
  state.queue = [];
  state.log = [{ n: 1, text: `Początek gry: ${scenario.name}, ${n} graczy.` }];
  state.result = null;
  return state;
}
