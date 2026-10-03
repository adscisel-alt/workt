// Wydarzenie Konflikt (Rulebook s. 22–24, FAQ 1.0). Każdy krok to osobne zadanie kolejki,
// więc decyzje graczy (karty, budowa, licytacja plagi, żeton remisu) mogą wstrzymać silnik w dowolnym miejscu.
import { AFTER_PHASE, BATTLE_CARDS, type CardContext } from '../content/battleCards';
import { changeDevotion, changeDevotionSimultaneous, devotionAscending } from './devotion';
import { regionOfToken, regionsInConflictOrder } from './map';
import { buildSites, figuresInRegion, majorityCount, playersInRegion } from './queries';
import type { BattleCardId, BattleState, FigureId, GameState, HexKey, MonumentType, PlayerId } from './types';
import { godName, log, schedule } from './util';

const BUILD_COST = 3;

const cardsOf = (b: BattleState, p: PlayerId): BattleCardId[] => b.revealed[p] ?? [];
const ctx = (state: GameState, player: PlayerId): CardContext => ({ state, player, battle: state.battle! });

// ---------- Konflikt ----------

export function startConflict(state: GameState): void {
  const holder = state.turn.player;
  state.conflict = { tiebreaker: { holder, faceUp: true } };
  log(state, `${godName(state, holder)} bierze żeton rozstrzygający remis.`, holder);
  schedule(
    state,
    { t: 'conflictStart' },
    ...regionsInConflictOrder(state).map(({ token }) => ({ t: 'resolveRegion' as const, token })),
    { t: 'conflictEnd' },
  );
}

export function conflictStart(_state: GameState): void {
  // Etap 4: efekty „na początku konfliktu” (Wszechobecność, Olbrzymi skorpion).
}

export function conflictEnd(state: GameState): void {
  state.conflict = null;
  state.conflictsResolved++;
  log(state, `Koniec konfliktu nr ${state.conflictsResolved}.`);
}

export function resolveRegion(state: GameState, token: number): void {
  const region = regionOfToken(state, token);
  const players = playersInRegion(state, region);
  if (players.length === 0) {
    log(state, `Region ${token}: brak figurek.`);
  } else if (players.length === 1) {
    dominate(state, region, token, players[0]);
  } else {
    startBattle(state, region, token, players);
  }
}

/** Dominacja: najpierw przewagi monumentów (jeden zysk), potem +1 za dominację (drugi zysk). */
function dominate(state: GameState, region: number, token: number, p: PlayerId): void {
  log(state, `Region ${token}: ${godName(state, p)} dominuje.`, p);
  changeDevotion(state, p, majorityCount(state, region, p), `przewagi monumentów w regionie ${token}`);
  changeDevotion(state, p, 1, `dominacja w regionie ${token}`);
}

// ---------- Bitwa ----------

function startBattle(state: GameState, region: number, token: number, participants: PlayerId[]): void {
  state.battle = {
    token,
    region,
    participants,
    selected: {},
    revealed: {},
    plagueBidders: [],
    bids: {},
    floodProtected: [],
    killed: {},
    strengths: {},
    tied: [],
    tiebreakUsed: false,
  };
  log(state, `Region ${token}: bitwa (${participants.map((p) => godName(state, p)).join(', ')}).`);
  state.pending = { kind: 'selectCards', waiting: [...participants] };
  schedule(
    state,
    { t: 'battleReveal' },
    { t: 'battleBuild' },
    { t: 'battlePlague' },
    { t: 'battleMajority' },
    { t: 'battleResolution' },
    { t: 'battleSettle' },
    { t: 'battleAfter' },
    { t: 'battleEnd' },
  );
}

/** Krok 1: tajny wybór karty. */
export function selectCard(state: GameState, p: PlayerId, card: BattleCardId): void {
  const pending = state.pending;
  if (pending?.kind !== 'selectCards') return;
  state.battle!.selected[p] = [card];
  pending.waiting = pending.waiting.filter((x) => x !== p);
  log(state, `${godName(state, p)} wybiera kartę (zakrytą).`, p);
  if (!pending.waiting.length) state.pending = null;
}

/** Krok 1 (c.d.): jednoczesne odkrycie; karty od razu trafiają na stos zagranych (jawny). */
export function battleReveal(state: GameState): void {
  const b = state.battle!;
  for (const p of b.participants) {
    const cards = b.selected[p] ?? [];
    const player = state.players[p];
    for (const c of cards) {
      player.hand.splice(player.hand.indexOf(c), 1);
      player.used.push(c);
    }
    b.revealed[p] = cards;
    log(state, `${godName(state, p)} odkrywa: ${cards.map((c) => BATTLE_CARDS[c].name).join(' + ')}.`, p);
  }
  b.selected = {};
  for (const p of b.participants) for (const c of cardsOf(b, p)) BATTLE_CARDS[c].onReveal?.(ctx(state, p));
}

/** Krok 2: Budowa monumentu — rosnąco wg oddania. */
export function battleBuild(state: GameState): void {
  const b = state.battle!;
  const builders = devotionAscending(state).flatMap((p) =>
    cardsOf(b, p).filter((c) => BATTLE_CARDS[c].step === 'build').map(() => p),
  );
  schedule(state, ...builders.map((player) => ({ t: 'buildFor' as const, player })));
}

export function buildCost(_state: GameState, _p: PlayerId): number {
  return BUILD_COST; // etap 4: Natchnieni budowniczowie → 0
}

export function buildOptions(state: GameState, p: PlayerId): { types: MonumentType[]; sites: HexKey[] } {
  const player = state.players[p];
  if (player.followers < buildCost(state, p) || player.ankhPool <= 0) return { types: [], sites: [] };
  const types = (Object.keys(state.monumentSupply) as MonumentType[]).filter((t) => state.monumentSupply[t] > 0);
  const sites = buildSites(state, state.battle!.region);
  return types.length && sites.length ? { types, sites } : { types: [], sites: [] };
}

export function buildFor(state: GameState, p: PlayerId): void {
  if (buildOptions(state, p).sites.length) state.pending = { kind: 'build', player: p };
  else log(state, `${godName(state, p)} nie może zbudować monumentu.`, p);
}

export function buildMonument(state: GameState, p: PlayerId, type: MonumentType, at: HexKey): void {
  const player = state.players[p];
  player.followers -= buildCost(state, p);
  player.ankhPool--;
  state.monumentSupply[type]--;
  const id = `m${state.nextMonumentId++}`;
  state.monuments[id] = { id, type, pos: at, owner: p };
  log(state, `${godName(state, p)} buduje monument (${type}) na ${at}.`, p);
  state.pending = null;
}

export function skipBuild(state: GameState, p: PlayerId): void {
  log(state, `${godName(state, p)} rezygnuje z budowy.`, p);
  state.pending = null;
}

/** Krok 3: każda zagrana Plaga to osobna licytacja; licytują obecni w regionie na początku kroku (FAQ). */
export function battlePlague(state: GameState): void {
  const b = state.battle!;
  const plagues = b.participants.flatMap((p) => cardsOf(b, p).filter((c) => BATTLE_CARDS[c].step === 'plague'));
  if (!plagues.length) return;
  b.plagueBidders = playersInRegion(state, b.region);
  schedule(state, ...plagues.flatMap(() => [{ t: 'plagueBid' as const }, { t: 'plagueResolve' as const }]));
}

export function plagueBidStart(state: GameState): void {
  const b = state.battle!;
  b.bids = {};
  // Gracz bez wyznawców może zaoferować tylko 0 — liczba wyznawców jest jawna, więc nie pytamy.
  for (const p of b.plagueBidders) if (state.players[p].followers === 0) b.bids[p] = 0;
  const waiting = b.plagueBidders.filter((p) => b.bids[p] === undefined);
  if (waiting.length) state.pending = { kind: 'plagueBid', waiting };
}

export function plagueBid(state: GameState, p: PlayerId, amount: number): void {
  const pending = state.pending;
  if (pending?.kind !== 'plagueBid') return;
  state.battle!.bids[p] = amount;
  pending.waiting = pending.waiting.filter((x) => x !== p);
  log(state, `${godName(state, p)} składa tajną ofertę.`, p);
  if (!pending.waiting.length) state.pending = null;
}

export function plagueResolve(state: GameState): void {
  const b = state.battle!;
  const bids = b.plagueBidders.map((p) => [p, b.bids[p] ?? 0] as const);
  for (const [p, amount] of bids) state.players[p].followers -= amount;
  log(state, `Plaga — oferty: ${bids.map(([p, a]) => `${godName(state, p)} ${a}`).join(', ')}.`);
  const top = Math.max(...bids.map(([, a]) => a));
  const leaders = bids.filter(([, a]) => a === top).map(([p]) => p);
  const spared = leaders.length === 1 ? leaders[0] : null;
  if (spared !== null) log(state, `${godName(state, spared)} oszczędzony przez plagę.`, spared);
  else log(state, 'Remis w licytacji — plaga nikogo nie oszczędza.');
  const victims = figuresInRegion(state, b.region).filter((f) => f.owner !== spared);
  killFigures(state, victims.map((f) => f.id), 'plaga');
  b.bids = {};
}

/** Krok 4: przewagi monumentów — rosnąco wg oddania, tylko gracze z figurkami w regionie. */
export function battleMajority(state: GameState): void {
  const b = state.battle!;
  const gains: Partial<Record<PlayerId, number>> = {};
  for (const p of b.participants) gains[p] = majorityCount(state, b.region, p);
  changeDevotionSimultaneous(state, gains, `przewagi monumentów w regionie ${b.token}`);
}

/** Siła w bitwie: 1 za figurkę + bonus kart; gracz bez figurek ma 0 (bonusy przepadają). */
export function battleStrength(state: GameState, p: PlayerId): number {
  const b = state.battle!;
  const figs = figuresInRegion(state, b.region, p);
  if (!figs.length) return 0;
  return figs.length + cardsOf(b, p).reduce((sum, c) => sum + BATTLE_CARDS[c].strength, 0);
}

/** Krok 5a: liczenie siły; remis z żetonem rozstrzygającym czeka na decyzję posiadacza. */
export function battleResolution(state: GameState): void {
  const b = state.battle!;
  const contenders = b.participants.filter((p) => figuresInRegion(state, b.region, p).length > 0);
  for (const p of b.participants) b.strengths[p] = battleStrength(state, p);
  log(state, `Siła: ${b.participants.map((p) => `${godName(state, p)} ${b.strengths[p]}`).join(', ')}.`);
  if (!contenders.length) return;
  const top = Math.max(...contenders.map((p) => b.strengths[p]!));
  b.tied = contenders.filter((p) => b.strengths[p] === top);
  const tb = state.conflict!.tiebreaker;
  if (b.tied.length > 1 && tb.faceUp && b.tied.includes(tb.holder)) {
    state.pending = { kind: 'tiebreaker', player: tb.holder };
  }
}

export function useTiebreaker(state: GameState, use: boolean): void {
  const b = state.battle!;
  const tb = state.conflict!.tiebreaker;
  if (use) {
    tb.faceUp = false;
    b.tiebreakUsed = true;
    log(state, `${godName(state, tb.holder)} używa żetonu rozstrzygającego remis.`, tb.holder);
  } else {
    log(state, `${godName(state, tb.holder)} zachowuje żeton rozstrzygający.`, tb.holder);
  }
  state.pending = null;
}

/** Krok 5b: zwycięzca dostaje oddanie i zabija wrogie figurki; remis bez żetonu = giną wszyscy. */
export function battleSettle(state: GameState): void {
  const b = state.battle!;
  if (!b.tied.length) return;
  const winner = b.tied.length === 1 ? b.tied[0] : b.tiebreakUsed ? state.conflict!.tiebreaker.holder : null;
  const killable = (owner: PlayerId | null) =>
    figuresInRegion(state, b.region)
      .filter((f) => f.owner !== owner && !b.floodProtected.includes(f.id))
      .map((f) => f.id);
  if (winner === null) {
    log(state, `Remis w regionie ${b.token} — przegrywają wszyscy.`);
    killFigures(state, killable(null), 'remis');
    return;
  }
  const bonus = cardsOf(b, winner).reduce((sum, c) => sum + (BATTLE_CARDS[c].winDevotionBonus?.(ctx(state, winner)) ?? 0), 0);
  log(state, `${godName(state, winner)} wygrywa bitwę w regionie ${b.token}.`, winner);
  changeDevotion(state, winner, 1 + bonus, `wygrana bitwa w regionie ${b.token}`);
  killFigures(state, killable(winner), 'bitwa');
}

/** Po rozstrzygnięciu: efekty kart w fazach, w każdej fazie rosnąco wg oddania. */
export function battleAfter(state: GameState): void {
  const b = state.battle!;
  const phases = Object.values(AFTER_PHASE).sort((x, y) => x - y);
  for (const phase of phases) {
    for (const p of devotionAscending(state)) {
      if (!b.participants.includes(p)) continue;
      for (const c of cardsOf(b, p)) {
        const after = BATTLE_CARDS[c].after;
        if (after?.phase === phase) after.run(ctx(state, p));
      }
    }
  }
}

export function battleEnd(state: GameState): void {
  state.battle = null;
}

/** Zabija figurki (bogowie nigdy nie giną); polegli wracają do puli właściciela. */
export function killFigures(state: GameState, ids: FigureId[], cause: string): void {
  const dead = ids.map((id) => state.figures[id]).filter((f) => f.pos !== null && f.kind !== 'god');
  for (const f of dead) {
    f.pos = null;
    if (state.battle) state.battle.killed[f.owner] = (state.battle.killed[f.owner] ?? 0) + 1;
  }
  if (dead.length) log(state, `Giną (${cause}): ${dead.map((f) => f.id).join(', ')}.`);
}
