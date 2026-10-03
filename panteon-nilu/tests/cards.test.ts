import { BATTLE_CARDS } from '../src/content/battleCards';
import { applyMove, legalMoves } from '../src/engine';
import type { GameState } from '../src/engine/types';
import { bid, card, clearBoard, conflictNow, k, newGame, place, play, R1 } from './helpers';

/** Bóg + wojownicy każdego gracza w regionie 1, na wskazanych polach. */
function setup(p0: string[], p1: string[]): GameState {
  const s = clearBoard(newGame());
  p0.forEach((h, i) => place(s, i === 0 ? 'p0-god' : `p0-w${i}`, h));
  p1.forEach((h, i) => place(s, i === 0 ? 'p1-god' : `p1-w${i}`, h));
  return s;
}

const F = R1.fertile;
const D = R1.desert;

describe('karty bitwy — siła', () => {
  it.each([
    ['plague', 1], ['build', 0], ['chariots', 3], ['maat', 0], ['drought', 1], ['flood', 0], ['miracle', 0],
  ] as const)('%s: +%i', (id, strength) => {
    expect(BATTLE_CARDS[id].strength).toBe(strength);
  });
});

describe('Rydwany', () => {
  it('+3 siły rozstrzyga bitwę przeciw liczniejszemu rywalowi', () => {
    let s = conflictNow(setup([F[0]], [F[1], F[2], F[3]]));
    s = play(s, card(0, 'chariots'), card(1, 'maat')); // 4 vs 3
    expect(s.players[0].devotion).toBe(1);
    expect(s.figures['p1-w1'].pos).toBeNull();
  });
});

describe('Budowa monumentu', () => {
  it('poświęca 3 wyznawców i żeton ankh; monument z zapasu na pustym polu lądowym regionu bitwy', () => {
    const s0 = setup([F[0]], [F[1]]);
    s0.players[0].followers = 4;
    let s = play(conflictNow(s0), card(0, 'build'), card(1, 'maat'));
    const sites = legalMoves(s).filter((m) => m.type === 'build').map((m) => (m as { at: string }).at);
    expect(sites).not.toContain(F[0]); // zajęte
    expect(sites).not.toContain(k(2, 2)); // woda
    expect(sites).not.toContain(k(5, 0)); // inny region
    expect(sites).toContain(D[0]);
    const poolBefore = s.players[0].ankhPool;
    s = applyMove(s, { type: 'build', player: 0, monument: 'temple', at: D[0] });
    const m = Object.values(s.monuments).find((x) => x.pos === D[0])!;
    expect(m).toMatchObject({ type: 'temple', owner: 0 });
    expect(s.players[0].followers).toBe(1);
    expect(s.players[0].ankhPool).toBe(poolBefore - 1);
    expect(s.monumentSupply.temple).toBe(9);
  });

  it('budowa jest opcjonalna', () => {
    const s0 = setup([F[0]], [F[1]]);
    s0.players[0].followers = 3;
    const s = play(conflictNow(s0), card(0, 'build'), card(1, 'maat'), { type: 'skipBuild', player: 0 });
    expect(Object.keys(s.monuments)).toHaveLength(0);
    expect(s.players[0].followers).toBe(3);
  });

  it('za mało wyznawców, brak ankh lub brak pustego pola — budowy nie ma', () => {
    const s0 = setup([F[0]], [F[1]]);
    s0.players[0].followers = 2;
    let s = play(conflictNow(s0), card(0, 'build'), card(1, 'maat'));
    expect(s.pending?.kind).not.toBe('build');
    const s1 = setup([F[0]], [F[1]]);
    s1.players[0].followers = 5;
    s1.players[0].ankhPool = 0;
    s = play(conflictNow(s1), card(0, 'build'), card(1, 'maat'));
    expect(Object.keys(s.monuments)).toHaveLength(0);
  });

  it('kilku budujących: rosnąco wg oddania', () => {
    const s0 = setup([F[0]], [F[1]]);
    s0.players[0].followers = 3;
    s0.players[1].followers = 3;
    s0.players[1].devotion = 2; // gracz 0 ma mniej oddania — buduje pierwszy
    const s = play(conflictNow(s0), card(0, 'build'), card(1, 'build'));
    expect(s.pending).toEqual({ kind: 'build', player: 0 });
  });
});

describe('Plaga szarańczy', () => {
  it('tajna licytacja: wszystkie oferty przepadają; przeżywają tylko wojownicy najwyżej licytującego', () => {
    const s0 = setup([F[0], F[2]], [F[1], F[3]]);
    s0.players[0].followers = 3;
    s0.players[1].followers = 3;
    let s = play(conflictNow(s0), card(0, 'plague'), card(1, 'maat'));
    expect(s.pending).toEqual({ kind: 'plagueBid', waiting: [0, 1] });
    s = applyMove(s, bid(0, 2));
    expect(s.battle?.bids).toEqual({ 0: 2 }); // ukryte w widoku gracza (etap 3)
    s = applyMove(s, bid(1, 1));
    expect(s.players[0].followers).toBe(1);
    expect(s.players[1].followers).toBe(2);
    expect(s.figures['p1-w1'].pos).toBeNull();
    expect(s.figures['p0-w1'].pos).not.toBeNull();
    expect(s.figures['p1-god'].pos).not.toBeNull(); // bogowie nie giną
  });

  it('remis najwyższych ofert — nikt nie jest oszczędzony', () => {
    const s0 = setup([F[0], F[2]], [F[1], F[3]]);
    let s = play(conflictNow(s0), card(0, 'plague'), card(1, 'maat'), bid(0, 1), bid(1, 1));
    expect(s.figures['p0-w1'].pos).toBeNull();
    expect(s.figures['p1-w1'].pos).toBeNull();
    expect(s.players[0].followers).toBe(0);
  });

  it('plaga zabija także figurki chronione Powodzią', () => {
    const s0 = setup([F[0], F[2]], [F[1], F[3]]);
    const s = play(conflictNow(s0), card(0, 'plague'), card(1, 'flood'), bid(0, 1), bid(1, 0));
    expect(s.figures['p1-w1'].pos).toBeNull();
  });

  it('dwie plagi = dwie licytacje; licytują wszyscy obecni na początku kroku, nawet po utracie figurek', () => {
    // gracz 1 ma tylko wojownika (bóg poza regionem)
    const s0 = setup([F[0], F[2]], []);
    place(s0, 'p1-w1', F[1]);
    s0.players[0].followers = 5;
    s0.players[1].followers = 5;
    let s = play(conflictNow(s0), card(0, 'plague'), card(1, 'plague'));
    s = play(s, bid(0, 2), bid(1, 1)); // wojownik gracza 1 ginie
    expect(s.figures['p1-w1'].pos).toBeNull();
    expect(s.pending).toEqual({ kind: 'plagueBid', waiting: [0, 1] });
    s = play(s, bid(0, 0), bid(1, 3)); // teraz ginie wojownik gracza 0
    expect(s.figures['p0-w1'].pos).toBeNull();
    expect(s.players[1].followers).toBe(1);
  });
});

describe("Cykl Ma'at", () => {
  it('po bitwie wszystkie zagrane karty (z tą) wracają na rękę', () => {
    const s0 = setup([F[0]], [F[1]]);
    s0.players[0].hand = ['maat', 'plague', 'build'];
    s0.players[0].used = ['chariots', 'drought', 'flood', 'miracle'];
    const s = play(conflictNow(s0), card(0, 'maat'), card(1, 'chariots'));
    expect(s.players[0].hand).toHaveLength(7);
    expect(s.players[0].used).toEqual([]);
    expect(s.players[1].used).toEqual(['chariots']); // rywala nie dotyczy
  });
});

describe('Susza', () => {
  it('wygrana: +1 oddania za każdą własną figurkę na pustyni w regionie (w tej samej nagrodzie)', () => {
    const s0 = setup([D[0], D[1], F[2]], [F[1]]);
    const s = play(conflictNow(s0), card(0, 'drought'), card(1, 'maat'));
    expect(s.players[0].devotion).toBe(1 + 2);
    expect(s.log.filter((e) => e.player === 0 && /oddania/.test(e.text))).toHaveLength(1);
  });

  it('przegrana: bez bonusu', () => {
    const s0 = setup([D[0]], [F[1], F[2], F[3]]);
    const s = play(conflictNow(s0), card(0, 'drought'), card(1, 'chariots'));
    expect(s.players[0].devotion).toBe(0);
  });
});

describe('Powódź', () => {
  it('od razu +1 wyznawca za figurkę na polu żyznym; te figurki nie giną w rozstrzygnięciu', () => {
    const s0 = setup([F[0], F[2], D[0]], [F[1], F[3], D[1], D[2], D[3]]);
    s0.players[0].followers = 0;
    const s = play(conflictNow(s0), card(0, 'flood'), card(1, 'chariots'));
    expect(s.players[0].followers).toBe(2);
    expect(s.players[1].devotion).toBe(1);
    expect(s.figures['p0-w1'].pos).toBe(F[2]); // żyzne — chronione
    expect(s.figures['p0-w2'].pos).toBeNull(); // pustynia — ginie
  });
});

describe('Cud', () => {
  it('po bitwie +1 oddania za każdą własną figurkę poległą w tej bitwie (także od plagi)', () => {
    const s0 = setup([F[0], F[2], F[3]], [F[1], D[0], D[1], D[2]]);
    s0.players[1].followers = 2;
    s0.players[0].followers = 0;
    // gracz 1 gra plagę i przebija; plaga zabija 2 wojowników gracza 0; gracz 0 gra Cud
    const s = play(conflictNow(s0), card(0, 'miracle'), card(1, 'plague'), bid(1, 1));
    expect(s.figures['p0-w1'].pos).toBeNull();
    expect(s.figures['p0-w2'].pos).toBeNull();
    expect(s.players[0].devotion).toBe(2);
  });

  it('kilku graczy z Cudem: rosnąco wg oddania (po rozstrzygnięciu)', () => {
    const s0 = setup([F[0], F[2]], [F[1], F[3]]);
    s0.players[0].devotion = 5;
    let s = conflictNow(s0, 1);
    s.conflict!.tiebreaker.faceUp = false;
    s = play(s, card(0, 'miracle'), card(1, 'miracle'));
    const order = s.log.filter((e) => /\(Cud\)/.test(e.text)).map((e) => e.player);
    expect(order).toEqual([1, 0]);
  });
});
