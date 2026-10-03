// Wydarzenie Konflikt (Rulebook s. 22–24, FAQ 1.0). Każdy krok to osobne zadanie kolejki,
// więc decyzje graczy mogą wstrzymać silnik w dowolnym miejscu. Efekty bogów, mocy i strażników
// wchodzą wyłącznie przez hooki (src/engine/hooks.ts).
import { BATTLE_CARDS, type CardContext } from '../content/battleCards';
import { changeDevotion, changeDevotionSimultaneous, devotionAscending } from './devotion';
import { activeEffects, anyHook, collectHook, forEachHook, sumHook } from './hooks';
import { adjacentHexes, regionOfToken, regionsInConflictOrder } from './map';
import { AFTER_PHASE } from './phases';
import {
  boardFiguresOf, buildSites, canEndMoveOn, figuresInRegion, figureStrength, majorityCount, playersInRegion,
} from './queries';
import type { BattleCardId, BattleState, Figure, FigureId, GameState, HexKey, MonumentType, PlayerId } from './types';
import { entityOf, godName, log, schedule } from './util';

const BUILD_COST = 3;

const cardsOf = (b: BattleState, p: PlayerId): BattleCardId[] => b.revealed[p] ?? [];
const ctx = (state: GameState, player: PlayerId): CardContext => ({ state, player, battle: state.battle! });

// ---------- Konflikt ----------

export function startConflict(state: GameState): void {
  const holder = entityOf(state, state.turn.player);
  state.conflict = { tiebreaker: { holder, faceUp: true } };
  log(state, `${godName(state, holder)} bierze żeton rozstrzygający remis.`, holder);
  schedule(
    state,
    { t: 'conflictStart' },
    ...regionsInConflictOrder(state).map(({ token }) => ({ t: 'resolveRegion' as const, token })),
    { t: 'conflictEnd' },
  );
}

/** Efekty „na początku konfliktu”, zanim rozstrzygnie się jakikolwiek region. */
export function conflictStart(state: GameState): void {
  forEachHook(state, (h, c) => h.onConflictStart?.(c));
}

export function conflictEnd(state: GameState): void {
  forEachHook(state, (h, c) => h.onConflictEnd?.(c));
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

const regionBonus = (state: GameState, p: PlayerId, region: number) =>
  sumHook(state, p, (h, c) => h.regionRewardBonus?.({ ...c, region }));

/** Dominacja: najpierw przewagi monumentów (jeden zysk), potem nagroda za dominację (drugi zysk). */
function dominate(state: GameState, region: number, token: number, p: PlayerId): void {
  log(state, `Region ${token}: ${godName(state, p)} dominuje.`, p);
  changeDevotion(state, p, majorityCount(state, region, p), `przewagi monumentów w regionie ${token}`);
  changeDevotion(state, p, 1 + regionBonus(state, p, region), `dominacja w regionie ${token}`);
}

// ---------- Bitwa: początek ----------

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
    obeliskQueue: devotionAscending(state).filter((p) => participants.includes(p)),
    obeliskMoved: [],
    figuresAtResolution: {},
    winner: null,
    toKill: [],
    catMummyDeaths: [],
    twoCards: [],
    askedTwoCards: [],
  };
  log(state, `Region ${token}: bitwa (${participants.map((p) => godName(state, p)).join(', ')}).`);
  schedule(
    state,
    { t: 'battleObelisk' },
    { t: 'battleCards' },
    { t: 'battleReveal' },
    { t: 'battleBuild' },
    { t: 'battlePlague' },
    { t: 'battleMajority' },
    { t: 'battleResolution' },
    { t: 'battleSettle' },
    { t: 'battleKill' },
    { t: 'battleAfter' },
    { t: 'battleEnd' },
  );
}

/** Zew obelisków: przestawienia na pola obok własnych obelisków w regionie bitwy. */
export function relocationOptions(state: GameState, p: PlayerId): { figure: FigureId; to: HexKey }[] {
  const b = state.battle!;
  const anchors = collectHook(state, p, (h, c) => h.battleRelocationAnchors?.({ ...c, region: b.region })).flat();
  if (!anchors.length) return [];
  const targets = [...new Set(anchors.flatMap((a) => adjacentHexes(state.map, a)))].sort();
  const out: { figure: FigureId; to: HexKey }[] = [];
  for (const f of boardFiguresOf(state, p)) {
    if (b.obeliskMoved.includes(f.id)) continue; // każda figurka najwyżej raz
    for (const to of targets) if (to !== f.pos && canEndMoveOn(state, f, to)) out.push({ figure: f.id, to });
  }
  return out;
}

/** Gracze z Zewem obelisków przestawiają po 1 figurce na zmianę, rosnąco wg oddania. */
export function battleObelisk(state: GameState): void {
  const b = state.battle!;
  b.obeliskQueue = b.obeliskQueue.filter((p) => relocationOptions(state, p).length > 0);
  if (b.obeliskQueue.length) state.pending = { kind: 'obeliskMove', player: b.obeliskQueue[0] };
}

export function obeliskMove(state: GameState, p: PlayerId, figure: FigureId, to: HexKey): void {
  const b = state.battle!;
  const fig = state.figures[figure];
  log(state, `${godName(state, p)}: Zew obelisków — ${figure} na ${to}.`, p);
  fig.pos = to;
  b.obeliskMoved.push(figure);
  b.obeliskQueue = [...b.obeliskQueue.filter((x) => x !== p), p];
  state.pending = null;
  const aim = anyHook(state, p, (h, c) => h.needsAim?.({ ...c, figure: fig }))
    ? [{ t: 'aimScorpion' as const, figure }]
    : [];
  schedule(state, ...aim, { t: 'battleObelisk' });
}

export function obeliskDone(state: GameState, p: PlayerId): void {
  const b = state.battle!;
  b.obeliskQueue = b.obeliskQueue.filter((x) => x !== p);
  state.pending = null;
  schedule(state, { t: 'battleObelisk' });
}

/** Krok 1: najpierw zapowiedzi dwóch kart (przed wyborem rywali), potem tajny wybór. */
export function battleCards(state: GameState): void {
  const b = state.battle!;
  const ask = b.participants.find(
    (p) => !b.askedTwoCards.includes(p) && anyHook(state, p, (h, c) => h.canPlayTwoCards?.(c)),
  );
  if (ask !== undefined) {
    state.pending = { kind: 'amunAnnounce', player: ask };
    return;
  }
  state.pending = { kind: 'selectCards', waiting: [...b.participants] };
}

export function announceTwoCards(state: GameState, p: PlayerId, use: boolean): void {
  const b = state.battle!;
  b.askedTwoCards.push(p);
  if (use) {
    b.twoCards.push(p);
    forEachHook(state, (h, c) => (c.owner === p ? h.onTwoCardsAnnounced?.(c) : undefined));
    log(state, `${godName(state, p)} zapowiada zagranie dwóch kart w tej bitwie.`, p);
  }
  state.pending = null;
  schedule(state, { t: 'battleCards' });
}

export function selectCard(state: GameState, p: PlayerId, card: BattleCardId, second?: BattleCardId): void {
  const pending = state.pending;
  if (pending?.kind !== 'selectCards') return;
  state.battle!.selected[p] = second ? [card, second] : [card];
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

// ---------- Krok 2: budowa ----------

export function battleBuild(state: GameState): void {
  const b = state.battle!;
  const builders = devotionAscending(state).flatMap((p) =>
    cardsOf(b, p).filter((c) => BATTLE_CARDS[c].step === 'build').map(() => p),
  );
  schedule(state, ...builders.map((player) => ({ t: 'buildFor' as const, player })));
}

export function buildCost(state: GameState, p: PlayerId): number {
  return Math.min(BUILD_COST, ...collectHook(state, p, (h, c) => h.buildCost?.(c)));
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

// ---------- Krok 3: plaga ----------

/** Każda zagrana Plaga to osobna licytacja; licytują obecni w regionie na początku kroku (FAQ). */
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
  killFigures(state, victims.map((f) => f.id), 'plaga', false);
  b.bids = {};
}

// ---------- Krok 4: przewagi ----------

export function battleMajority(state: GameState): void {
  const b = state.battle!;
  const gains: Partial<Record<PlayerId, number>> = {};
  for (const p of b.participants) gains[p] = majorityCount(state, b.region, p);
  changeDevotionSimultaneous(state, gains, `przewagi monumentów w regionie ${b.token}`);
}

// ---------- Krok 5: rozstrzygnięcie ----------

/** Siła w bitwie: siła figurek + bonus kart + bonusy efektów; gracz bez figurek ma 0 (bonusy przepadają). */
export function battleStrength(state: GameState, p: PlayerId): number {
  const b = state.battle!;
  const figs = figuresInRegion(state, b.region, p);
  if (!figs.length) return 0;
  return (
    figs.reduce((s, f) => s + figureStrength(state, f), 0) +
    cardsOf(b, p).reduce((sum, c) => sum + BATTLE_CARDS[c].strength, 0) +
    sumHook(state, p, (h, c) => h.strengthBonus?.({ ...c, region: b.region }))
  );
}

/** Krok 5a: liczenie siły; remis z żetonem rozstrzygającym czeka na decyzję posiadacza. */
export function battleResolution(state: GameState): void {
  const b = state.battle!;
  for (const p of b.participants) {
    b.figuresAtResolution[p] = figuresInRegion(state, b.region, p).length;
    b.strengths[p] = battleStrength(state, p);
  }
  log(state, `Siła: ${b.participants.map((p) => `${godName(state, p)} ${b.strengths[p]}`).join(', ')}.`);
  const contenders = b.participants.filter((p) => b.figuresAtResolution[p]! > 0);
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

/** Krok 5b: zwycięzca dostaje nagrodę (jeden zysk oddania); wyznaczenie poległych. */
export function battleSettle(state: GameState): void {
  const b = state.battle!;
  if (!b.tied.length) return;
  const winner = b.tied.length === 1 ? b.tied[0] : b.tiebreakUsed ? state.conflict!.tiebreaker.holder : null;
  b.winner = winner;
  const victims = figuresInRegion(state, b.region)
    .filter((f) => f.owner !== winner && f.kind !== 'god' && !b.floodProtected.includes(f.id));
  if (winner === null) {
    log(state, `Remis w regionie ${b.token} — przegrywają wszyscy.`);
  } else {
    const rivals = b.participants.filter((p) => p !== winner).map((p) => b.strengths[p] ?? 0);
    const margin = b.strengths[winner]! - Math.max(0, ...rivals);
    const base = Math.max(1, ...collectHook(state, winner, (h, c) => h.winBaseDevotion?.({ ...c, margin })));
    const cardBonus = cardsOf(b, winner).reduce(
      (sum, c) => sum + (BATTLE_CARDS[c].winDevotionBonus?.(ctx(state, winner)) ?? 0),
      0,
    );
    log(state, `${godName(state, winner)} wygrywa bitwę w regionie ${b.token}.`, winner);
    changeDevotion(state, winner, base + cardBonus + regionBonus(state, winner, b.region), `wygrana bitwa w regionie ${b.token}`);
    for (const src of activeEffects(state, winner)) src.hooks.onBattleWon?.({ state, owner: winner, region: b.region });
  }
  b.toKill = victims.map((f) => f.id);
  // Ochrona (Izyda): właściciel chronionych figurek decyduje, które ocalić.
  const owners = [...new Set(victims.filter((f) => isProtected(state, f)).map((f) => f.owner))];
  for (const owner of owners) {
    const candidates = victims.filter((f) => f.owner === owner && isProtected(state, f)).map((f) => f.id);
    schedule(state, { t: 'protectAsk', player: owner, candidates });
  }
}

const isProtected = (state: GameState, f: Figure) =>
  anyHook(state, f.owner, (h, c) => h.protects?.({ ...c, figure: f }));

export function protectAsk(state: GameState, player: PlayerId, candidates: FigureId[]): void {
  state.pending = { kind: 'isisProtect', player, candidates };
}

export function protectFigure(state: GameState, player: PlayerId, figure: FigureId | null): void {
  const pending = state.pending;
  if (pending?.kind !== 'isisProtect') return;
  if (figure === null) {
    state.pending = null;
    return;
  }
  const b = state.battle!;
  b.toKill = b.toKill.filter((id) => id !== figure);
  log(state, `${godName(state, player)} ocala ${figure}.`, player);
  const rest = pending.candidates.filter((id) => id !== figure);
  state.pending = rest.length ? { kind: 'isisProtect', player, candidates: rest } : null;
}

export function battleKill(state: GameState): void {
  const b = state.battle!;
  killFigures(state, b.toKill, b.winner === null ? 'remis' : 'bitwa', true);
  b.toKill = [];
}

// ---------- Po rozstrzygnięciu ----------

/** Efekty po bitwie w fazach (FAQ); w każdej fazie rosnąco wg oddania (kolejność liczona na początku fazy). */
export function battleAfter(state: GameState): void {
  const phases = [...new Set(Object.values(AFTER_PHASE))].sort((x, y) => x - y);
  schedule(state, ...phases.map((phase) => ({ t: 'afterBattlePhase' as const, phase })));
}

export function afterBattlePhase(state: GameState, phase: number): void {
  const b = state.battle!;
  const order = devotionAscending(state).filter((p) => b.participants.includes(p));
  schedule(state, ...order.map((player) => ({ t: 'afterBattleStep' as const, phase, player })));
}

export function afterBattleStep(state: GameState, phase: number, player: PlayerId): void {
  for (const c of cardsOf(state.battle!, player)) {
    const after = BATTLE_CARDS[c].after;
    if (after?.phase === phase) after.run(ctx(state, player));
  }
  for (const src of activeEffects(state, player)) {
    for (const hook of src.hooks.afterBattle ?? []) if (hook.phase === phase) hook.run({ state, owner: player });
  }
}

export function worshipful(state: GameState, p: PlayerId, use: boolean): void {
  if (use) {
    state.players[p].followers -= 2;
    log(state, `${godName(state, p)}: Uwielbienie — poświęca 2 wyznawców.`, p);
    changeDevotion(state, p, 1, 'Uwielbienie');
  }
  state.pending = null;
}

/** Wrota zaświatów: nowe pole wolne w regionie bitwy (z zapasu albo przeniesione). */
export function underworldOptions(state: GameState, region: number): { from: HexKey | null; to: HexKey }[] {
  const sites = buildSites(state, region).filter((h) => !state.abilities.underworld.includes(h));
  const froms: (HexKey | null)[] = [
    ...(state.abilities.underworld.length < 3 ? [null] : []),
    ...state.abilities.underworld,
  ];
  return froms.flatMap((from) => sites.map((to) => ({ from, to })));
}

export function placeUnderworld(state: GameState, p: PlayerId, from: HexKey | null, to: HexKey | null): void {
  if (to) {
    state.abilities.underworld = [...state.abilities.underworld.filter((h) => h !== from), to].sort();
    log(state, `${godName(state, p)} otwiera wrota zaświatów na ${to}.`, p);
  }
  state.pending = null;
}

export function battleEnd(state: GameState): void {
  state.battle = null;
}

/** Zabija figurki (bogowie nigdy nie giną); polegli wracają do puli właściciela. */
export function killFigures(state: GameState, ids: FigureId[], cause: string, inResolution: boolean): void {
  const dead = ids.map((id) => state.figures[id]).filter((f) => f.pos !== null && f.kind !== 'god');
  if (!dead.length) return;
  for (const f of dead) {
    f.pos = null;
    f.aim = undefined;
    if (state.battle) state.battle.killed[f.owner] = (state.battle.killed[f.owner] ?? 0) + 1;
  }
  log(state, `Giną (${cause}): ${dead.map((f) => f.id).join(', ')}.`);
  for (const figure of dead) forEachHook(state, (h, c) => h.onFigureKilled?.({ ...c, figure, inResolution }));
  const warriors = dead.filter((f) => f.kind === 'warrior');
  if (warriors.length) forEachHook(state, (h, c) => h.onWarriorsKilled?.({ ...c, figures: warriors }));
}
