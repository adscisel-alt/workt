import { applyMove, IllegalMoveError, legalMoves } from '../src/engine';
import type { GameState } from '../src/engine/types';
import { addMonument, bid, card, clearBoard, conflictNow, newGame, place, play, R1 } from './helpers';

/** Bitwa w regionie 1: gracz 0 i gracz 1, po bogu i podanych wojownikach. */
function battleSetup(p0Warriors: number, p1Warriors: number): GameState {
  const s = clearBoard(newGame());
  const spots = [...R1.fertile, ...R1.desert];
  place(s, 'p0-god', spots[0]);
  place(s, 'p1-god', spots[1]);
  let i = 2;
  for (let w = 1; w <= p0Warriors; w++) place(s, `p0-w${w}`, spots[i++]);
  for (let w = 1; w <= p1Warriors; w++) place(s, `p1-w${w}`, spots[i++]);
  return s;
}

describe('bitwa: wybór kart', () => {
  it('obaj gracze wybierają jednocześnie i tajnie; odkrycie dopiero gdy wybrali wszyscy', () => {
    let s = conflictNow(battleSetup(0, 0));
    expect(s.pending).toEqual({ kind: 'selectCards', waiting: [0, 1] });
    const players = new Set(legalMoves(s).map((m) => m.player));
    expect(players).toEqual(new Set([0, 1]));
    s = applyMove(s, card(1, 'chariots'));
    expect(s.battle?.revealed).toEqual({});
    expect(s.players[1].hand).toContain('chariots'); // jeszcze nieodkryta
    expect(s.pending).toEqual({ kind: 'selectCards', waiting: [0] });
    expect(() => applyMove(s, card(1, 'flood'))).toThrow(IllegalMoveError);
  });

  it('zagrane karty leżą odkryte i nie można ich wybrać ponownie', () => {
    let s = battleSetup(0, 0);
    s = play(conflictNow(s), card(0, 'chariots'), card(1, 'drought'));
    expect(s.players[0].used).toEqual(['chariots']);
    expect(s.players[0].hand).not.toContain('chariots');
    s.figures['p0-w1'].pos = R1.desert[3];
    const again = conflictNow(s);
    expect(legalMoves(again).filter((m) => m.player === 0).map((m) => (m as { card: string }).card)).not.toContain('chariots');
  });
});

describe('bitwa: rozstrzygnięcie', () => {
  it('siła = 1 za figurkę + bonus karty; zwycięzca +1 oddania i zabija wrogie figurki (bogowie nie giną)', () => {
    let s = conflictNow(battleSetup(2, 1));
    s = play(s, card(0, 'miracle'), card(1, 'maat'));
    expect(s.players[0].devotion).toBe(1);
    expect(s.figures['p1-w1'].pos).toBeNull(); // poległy wraca do puli
    expect(s.figures['p1-god'].pos).not.toBeNull();
    expect(s.figures['p0-w1'].pos).not.toBeNull();
  });

  it('remis bez żetonu: przegrywają wszyscy, giną wszystkie figurki poza bogami', () => {
    let s = conflictNow(battleSetup(1, 1), 0);
    s.conflict!.tiebreaker.faceUp = false;
    s = play(s, card(0, 'miracle'), card(1, 'maat'));
    expect(s.figures['p0-w1'].pos).toBeNull();
    expect(s.figures['p1-w1'].pos).toBeNull();
    expect(s.players[0].devotion).toBe(1); // tylko z Cudu
    expect(s.players[1].devotion).toBe(0);
  });

  it('remis z żetonem: posiadacz może go użyć i wygrać; żeton odwraca się do końca konfliktu', () => {
    let s = conflictNow(battleSetup(1, 1), 1);
    s = play(s, card(0, 'maat'), card(1, 'maat'));
    expect(s.pending).toEqual({ kind: 'tiebreaker', player: 1 });
    s = applyMove(s, { type: 'useTiebreaker', player: 1, use: true });
    expect(s.players[1].devotion).toBe(1);
    expect(s.figures['p0-w1'].pos).toBeNull();
    expect(s.figures['p1-w1'].pos).not.toBeNull();
  });

  it('żeton zużyty w jednej bitwie nie działa w kolejnej tego samego konfliktu', () => {
    const s0 = battleSetup(1, 1);
    // druga bitwa w regionie 2
    s0.figures['p0-w2'].pos = '5,0';
    s0.figures['p1-w2'].pos = '6,0';
    let s = conflictNow(s0, 1);
    s = play(s, card(0, 'maat'), card(1, 'maat'));
    s = applyMove(s, { type: 'useTiebreaker', player: 1, use: true });
    expect(s.pending).toEqual({ kind: 'selectCards', waiting: [0, 1] });
    s = play(s, card(0, 'maat'), card(1, 'maat'));
    expect(s.pending).toBeNull(); // brak pytania o żeton
    expect(s.figures['p0-w2'].pos).toBeNull();
    expect(s.figures['p1-w2'].pos).toBeNull();
  });

  it('posiadacz może zachować żeton — wtedy remis = przegrywają wszyscy', () => {
    let s = conflictNow(battleSetup(1, 1), 0);
    s = play(s, card(0, 'maat'), card(1, 'maat'), { type: 'useTiebreaker', player: 0, use: false });
    expect(s.figures['p0-w1'].pos).toBeNull();
    expect(s.figures['p1-w1'].pos).toBeNull();
  });

  it('żeton nie pomaga, gdy jego posiadacz nie remisuje o zwycięstwo', () => {
    const base = clearBoard(newGame({ gods: ['amun', 'ra', 'isis'] }));
    place(base, 'p0-god', R1.fertile[0]);
    place(base, 'p0-w1', R1.fertile[1]);
    place(base, 'p1-god', R1.fertile[2]);
    place(base, 'p1-w1', R1.fertile[3]);
    place(base, 'p2-god', R1.desert[0]); // posiadacz żetonu, siła 1
    let s = conflictNow(base, 2);
    s = play(s, card(0, 'maat'), card(1, 'maat'), card(2, 'maat'));
    expect(s.pending).toBeNull();
    expect(s.conflict).toBeNull();
    expect(s.figures['p0-w1'].pos).toBeNull();
    expect(s.figures['p1-w1'].pos).toBeNull();
    expect(s.players.map((p) => p.devotion)).toEqual([0, 0, 0]);
  });

  it('gracz bez figurek ma siłę 0 i nie może wygrać mimo bonusu karty', () => {
    const base = clearBoard(newGame());
    place(base, 'p0-god', R1.fertile[0]);
    place(base, 'p1-w1', R1.fertile[1]); // jedyna figurka gracza 1
    let s = conflictNow(base);
    s = play(s, card(0, 'plague'), card(1, 'chariots'), bid(0, 1), bid(1, 0));
    expect(s.figures['p1-w1'].pos).toBeNull();
    expect(s.log.find((e) => /Siła:/.test(e.text))?.text).toBe('Siła: Amun 2, Ra 0.');
    expect(s.players[0].devotion).toBe(1);
  });
});

describe('bitwa: kolejność kroków', () => {
  it('budowa (2) → plaga (3) → przewagi (4) → rozstrzygnięcie (5)', () => {
    // p0: tylko wojownik w regionie; buduje obelisk. p1 gra plagę i przebija licytację.
    const s = clearBoard(newGame());
    place(s, 'p0-w1', R1.fertile[0]);
    place(s, 'p1-god', R1.fertile[1]);
    s.players[0].followers = 3;
    s.players[1].followers = 2;
    let c = conflictNow(s, 0);
    c = play(c, card(0, 'build'), card(1, 'plague'));
    expect(c.pending).toEqual({ kind: 'build', player: 0 });
    c = applyMove(c, { type: 'build', player: 0, monument: 'obelisk', at: R1.desert[0] });
    expect(c.players[0].followers).toBe(0);
    expect(c.pending).toEqual({ kind: 'plagueBid', waiting: [1] }); // p0 ma 0 wyznawców → oferta 0 automatycznie
    c = applyMove(c, bid(1, 1));
    // p0 stracił jedyną figurkę przed krokiem przewag: obelisk nie daje mu oddania; siła 0 → wygrywa p1
    expect(c.players[0].devotion).toBe(0);
    expect(c.players[1].devotion).toBe(1);
    const steps = c.log.map((e) => e.text);
    const idx = (re: RegExp) => steps.findIndex((t) => re.test(t));
    expect(idx(/buduje monument/)).toBeLessThan(idx(/Plaga — oferty/));
    expect(idx(/Plaga — oferty/)).toBeLessThan(idx(/Siła:/));
    expect(idx(/Siła:/)).toBeLessThan(idx(/wygrywa bitwę/));
  });

  it('krok 4: przewagi liczone po budowie i plagach, rosnąco wg oddania', () => {
    const s = battleSetup(0, 0);
    addMonument(s, 'temple', R1.desert[0], 0);
    addMonument(s, 'pyramid', R1.desert[1], 1);
    s.players[0].devotion = 3;
    s.players[0].devotionSeq = 99;
    let c = conflictNow(s);
    c = play(c, card(0, 'maat'), card(1, 'chariots'));
    const majority = c.log.filter((e) => /przewagi/.test(e.text)).map((e) => e.player);
    expect(majority).toEqual([1, 0]);
  });

  it('siła uwzględnia tylko figurki w regionie bitwy', () => {
    let s = battleSetup(1, 0);
    place(s, 'p0-w2', '6,0'); // inny region
    s = conflictNow(s);
    s = applyMove(s, card(0, 'chariots'));
    s = applyMove(s, card(1, 'maat'));
    expect(s.log.find((e) => /Siła:/.test(e.text))?.text).toMatch(/Amun 5/);
  });
});
