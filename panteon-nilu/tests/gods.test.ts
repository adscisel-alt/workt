import { applyMove, legalMoves, moveOptions, summonTargets } from '../src/engine';
import { buildSites, figureStrength, terrainOf } from '../src/engine/queries';
import type { GameState, GodId, Move } from '../src/engine/types';
import { act, card, clearBoard, conflictNow, newGame, place, play, R1 } from './helpers';

const F = R1.fertile;
const D = R1.desert;

function duel(gods: [GodId, GodId], p0: string[], p1: string[], amunReady = false): GameState {
  const s = clearBoard(newGame({ gods }, amunReady));
  p0.forEach((h, i) => place(s, i === 0 ? 'p0-god' : `p0-w${i}`, h));
  p1.forEach((h, i) => place(s, i === 0 ? 'p1-god' : `p1-w${i}`, h));
  return s;
}

describe('Amun', () => {
  it('raz na konflikt zapowiada dwie karty przed wyborem rywali; siła i efekty obu się sumują', () => {
    let s = conflictNow(duel(['amun', 'ra'], [F[0]], [F[1], F[2]], true));
    expect(s.pending).toEqual({ kind: 'amunAnnounce', player: 0 });
    s = applyMove(s, { type: 'amunAnnounce', player: 0, use: true });
    expect(s.abilities.amunTokenUp).toBe(false);
    const mine = legalMoves(s).filter((m) => m.player === 0) as Extract<Move, { type: 'selectCard' }>[];
    expect(mine.every((m) => m.second !== undefined)).toBe(true);
    expect(mine).toHaveLength(21); // C(7,2)
    s = play(s, { type: 'selectCard', player: 0, card: 'chariots', second: 'drought' }, card(1, 'maat'));
    expect(s.log.find((e) => /Siła:/.test(e.text))?.text).toBe('Siła: Amun 5, Ra 2.');
    expect(s.players[0].used.sort()).toEqual(['chariots', 'drought']);
    expect(s.abilities.amunTokenUp).toBe(true); // po konflikcie żeton wraca
  });

  it('bez zapowiedzi — jedna karta; drugiej bitwy w tym samym konflikcie nie dotyczy po użyciu', () => {
    const s0 = duel(['amun', 'ra'], [F[0], '5,0'], [F[1], '6,0'], true);
    let s = conflictNow(s0);
    s = applyMove(s, { type: 'amunAnnounce', player: 0, use: true });
    s = play(s, { type: 'selectCard', player: 0, card: 'chariots', second: 'flood' }, card(1, 'maat'));
    expect(s.pending).toEqual({ kind: 'selectCards', waiting: [0, 1] }); // bitwa w regionie 2 — bez pytania
  });
});

describe('Anubis', () => {
  it('więzi jednego poległego wrogiego wojownika; bóg Anubisa +1 siły za uwięzionego (maks. +3)', () => {
    let s = conflictNow(duel(['anubis', 'ra'], [F[0], F[2]], [F[1], F[3]]));
    s = play(s, card(0, 'chariots'), card(1, 'maat'));
    expect(s.pending).toEqual({ kind: 'anubisTrap', player: 0, candidates: ['p1-w1'] });
    s = applyMove(s, { type: 'anubisTrap', player: 0, figure: 'p1-w1' });
    expect(s.figures['p1-w1'].trappedBy).toBe(0);
    expect(figureStrength(s, s.figures['p0-god'])).toBe(2);
    for (const w of ['p1-w2', 'p1-w3', 'p1-w4']) s.figures[w].trappedBy = 0;
    expect(figureStrength(s, s.figures['p0-god'])).toBe(4); // limit +3
  });

  it('właściciel uwalnia uwięzionego wojownika przy przywołaniu, płacąc 1 wyznawcę Anubisowi', () => {
    let s = duel(['anubis', 'ra'], [F[0]], [F[1]]);
    s.figures['p1-w1'].trappedBy = 0;
    s.turn = { player: 1, actions: [], triggered: null };
    s.pending = { kind: 'chooseAction', player: 1 };
    s.players[0].followers = 0;
    s.players[1].followers = 1;
    s = play(s, act(1, 'summon'));
    const free = legalMoves(s).find((m) => m.type === 'summon' && m.figure === 'p1-w1')!;
    s = applyMove(s, free);
    expect(s.figures['p1-w1'].trappedBy).toBeUndefined();
    expect(s.players[1].followers).toBe(0);
    expect(s.players[0].followers).toBe(1);
  });

  it('nie więzi własnych wojowników', () => {
    // Anubis (gracz 1) przegrywa: giną tylko jego wojownicy — nie ma kogo uwięzić
    let s = conflictNow(duel(['ra', 'anubis'], [F[0], F[2]], [F[1], F[3]]));
    s = play(s, card(0, 'chariots'), card(1, 'maat'));
    expect(s.figures['p1-w1'].pos).toBeNull();
    expect(s.figures['p1-w1'].trappedBy).toBeUndefined();
    expect(s.pending).toBeNull();
  });

  it('więzi także wojowników poległych w bitwie, w której nie uczestniczy (FAQ)', () => {
    const s0 = clearBoard(newGame({ gods: ['ra', 'anubis', 'isis'] }));
    place(s0, 'p0-god', F[0]);
    place(s0, 'p0-w1', F[1]);
    place(s0, 'p2-god', D[0]);
    place(s0, 'p2-w1', D[1]);
    place(s0, 'p1-god', '5,0'); // Anubis w innym regionie
    let s = conflictNow(s0);
    s = play(s, card(0, 'chariots'), card(2, 'maat')); // wojownik Izydy nie stoi obok wroga — nie jest chroniony
    expect(s.pending).toEqual({ kind: 'anubisTrap', player: 1, candidates: ['p2-w1'] });
  });
});

describe('Izyda', () => {
  it('jej figurka obok wroga jest chroniona: w rozstrzygnięciu może ją ocalić', () => {
    let s = conflictNow(duel(['isis', 'ra'], [F[0], F[2]], [F[1], F[3], D[0]]));
    s = play(s, card(0, 'maat'), card(1, 'chariots'));
    expect(s.pending).toEqual({ kind: 'isisProtect', player: 0, candidates: ['p0-w1'] });
    s = applyMove(s, { type: 'isisProtect', player: 0, figure: 'p0-w1' });
    expect(s.figures['p0-w1'].pos).toBe(F[2]);
  });

  it('figurka bez wroga obok nie jest chroniona; plaga zabija także chronione', () => {
    let s = conflictNow(duel(['isis', 'ra'], [F[0], D[3]], [F[1], F[3]]));
    s = play(s, card(0, 'maat'), card(1, 'chariots'));
    expect(s.figures['p0-w1'].pos).toBeNull();
    const p = duel(['isis', 'ra'], [F[0], F[2]], [F[1]]);
    p.players[0].followers = 0;
    s = play(conflictNow(p), card(0, 'maat'), card(1, 'plague'), { type: 'plagueBid', player: 1, amount: 1 });
    expect(s.figures['p0-w1'].pos).toBeNull();
  });
});

describe('Ozyrys', () => {
  function osirisLost(): GameState {
    let s = conflictNow(duel(['osiris', 'ra'], [F[0]], [F[1], F[2]]));
    s = play(s, card(0, 'maat'), card(1, 'chariots'));
    expect(s.pending).toEqual({ kind: 'underworld', player: 0, region: s.battle!.region });
    return applyMove(s, { type: 'underworld', player: 0, from: null, to: D[0] });
  }

  it('po przegranej bitwie stawia wrota zaświatów na wolnym polu regionu', () => {
    expect(osirisLost().abilities.underworld).toEqual([D[0]]);
  });

  it('obcy nie kończą tam ruchu, nie przywołują tam figurek i nie budują; pole nie jest ani żyzne, ani pustynne', () => {
    const s = osirisLost();
    expect(moveOptions(s, 'p1-god').some((o) => o.to === D[0])).toBe(false);
    expect(summonTargets(s, 1)).not.toContain(D[0]);
    expect(buildSites(s, s.battle?.region ?? 0)).not.toContain(D[0]);
    expect(terrainOf(s, D[0])).toBe('none');
  });

  it('Ozyrys przywołuje dodatkową figurkę na pole z wrotami', () => {
    let s = osirisLost();
    s.turn = { player: 0, actions: [], triggered: null };
    s.pending = { kind: 'chooseAction', player: 0 };
    s = play(s, act(0, 'summon'));
    expect(legalMoves(s).some((m) => m.type === 'summon' && m.source === `underworld:${D[0]}` && m.to === D[0])).toBe(true);
  });

  it('wszystkie 3 wrota na planszy — kolejne przegrane przenoszą istniejące', () => {
    let s = conflictNow(duel(['osiris', 'ra'], [F[0]], [F[1], F[2]]));
    s.abilities.underworld = ['5,0', '6,0', '5,1'];
    s = play(s, card(0, 'maat'), card(1, 'chariots'));
    const froms = new Set(legalMoves(s).map((m) => (m as { from: string | null }).from));
    expect(froms).toEqual(new Set(['5,0', '6,0', '5,1', null])); // null także w „pomiń”
    expect(legalMoves(s).filter((m) => m.type === 'underworld' && m.from === null && m.to !== null)).toEqual([]);
  });
});

describe('Ra', () => {
  it('może nadać przywołanej figurce słońce; promienna obecność daje +1 za dominację', () => {
    let s = duel(['ra', 'amun'], [F[0]], []);
    s = play(s, act(0, 'summon'));
    const m = legalMoves(s).find((x) => x.type === 'summon' && x.radiant)! as Extract<Move, { type: 'summon' }>;
    s = applyMove(s, m);
    expect(s.abilities.radiant).toEqual([m.figure]);
    const after = conflictNow(s);
    expect(after.players[0].devotion).toBe(2);
  });

  it('promienna figurka po śmierci oddaje słońce; limit 3 słońc', () => {
    let s = duel(['ra', 'amun'], [F[0], F[2]], [F[1], F[3], D[0]]);
    s.abilities.radiant = ['p0-w1'];
    s = play(conflictNow(s), card(0, 'maat'), card(1, 'chariots'));
    expect(s.abilities.radiant).toEqual([]);
    const full = duel(['ra', 'amun'], [F[0]], []);
    full.abilities.radiant = ['a', 'b', 'c'];
    const sm = play(full, act(0, 'summon'));
    expect(legalMoves(sm).some((x) => x.type === 'summon' && x.radiant)).toBe(false);
  });
});
