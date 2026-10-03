import { applyMove, legalMoves, moveOptions } from '../src/engine';
import { playersInRegion } from '../src/engine/queries';
import { computeRegions } from '../src/engine/map';
import { figureStrength } from '../src/engine/queries';
import type { GameState, Move } from '../src/engine/types';
import { act, addGuardian, addMonument, bid, card, clearBoard, conflictNow, k, newGame, place, play, R1 } from './helpers';

const F = R1.fertile;
const D = R1.desert;
const idx = (s: GameState, re: RegExp) => s.log.findIndex((e) => re.test(e.text));

function base(): GameState {
  const s = clearBoard(newGame());
  place(s, 'p0-god', F[0]);
  place(s, 'p1-god', F[1]);
  return s;
}

describe('Kocia mumia', () => {
  it('zabita plagą: każdy poza właścicielem od razu traci 1 oddania', () => {
    const s0 = base();
    addGuardian(s0, 0, 'catMummy', F[2]);
    s0.players[1].devotion = 3;
    s0.players[0].followers = 0;
    s0.players[1].followers = 1;
    const s = play(conflictNow(s0), card(0, 'maat'), card(1, 'plague'), bid(1, 1));
    expect(s.figures['catMummy-1'].pos).toBeNull();
    expect(idx(s, /klątwa kociej mumii/)).toBeLessThan(idx(s, /Siła:/));
  });

  it('zabita w rozstrzygnięciu: strata po nagrodzie zwycięzcy, przed efektami po bitwie (Cud)', () => {
    const s0 = base();
    addGuardian(s0, 0, 'catMummy', F[2]);
    const s = play(conflictNow(s0), card(0, 'miracle'), card(1, 'chariots'));
    expect(s.players[1].devotion).toBe(0); // +1 za wygraną, −1 klątwa
    expect(idx(s, /wygrana bitwa/)).toBeLessThan(idx(s, /klątwa/));
    expect(idx(s, /klątwa/)).toBeLessThan(idx(s, /\(Cud\)/));
  });
});

describe('Satet', () => {
  it('może zakończyć ruch na polu wroga, spychając go o 1 pole', () => {
    const s0 = clearBoard(newGame());
    place(s0, 'p0-god', D[3]);
    const satet = addGuardian(s0, 0, 'satet', F[0]);
    place(s0, 'p1-w1', F[2]);
    let s = play(s0, act(0, 'move'));
    const push = legalMoves(s).find((m) => m.type === 'moveFigure' && m.figure === satet && m.to === F[2]) as Extract<Move, { type: 'moveFigure' }>;
    expect(push.push).not.toBeNull();
    s = applyMove(s, push);
    expect(s.figures[satet].pos).toBe(F[2]);
    expect(s.figures['p1-w1'].pos).toBe(push.push);
  });

  it('nie wchodzi na pole wroga, którego nie da się zepchnąć', () => {
    const s = clearBoard(newGame());
    const satet = addGuardian(s, 0, 'satet', F[3]);
    place(s, 'p1-w1', k(0, 0)); // narożnik: sąsiedzi (1,0) i (0,1)
    place(s, 'p1-god', k(1, 0));
    place(s, 'p0-god', k(0, 1));
    expect(moveOptions(s, satet).some((o) => o.to === k(0, 0))).toBe(false);
  });

  it('inne figurki nie spychają', () => {
    const s = clearBoard(newGame());
    place(s, 'p0-w1', F[0]);
    place(s, 'p1-w1', F[2]);
    expect(moveOptions(s, 'p0-w1').some((o) => o.to === F[2])).toBe(false);
  });
});

describe('Mumia', () => {
  it('po śmierci od razu wraca obok swojego boga; zabita dwa razy liczy się dwa razy dla Cudu (FAQ)', () => {
    const s0 = base();
    const mummy = addGuardian(s0, 0, 'mummy', F[2]);
    s0.players[0].followers = 0;
    s0.players[1].followers = 1;
    let s = play(conflictNow(s0), card(0, 'miracle'), card(1, 'plague'), bid(1, 1));
    expect(s.pending).toEqual({ kind: 'mummyReturn', player: 0, figure: mummy });
    const ret = legalMoves(s)[0] as Extract<Move, { type: 'mummyReturn' }>;
    s = applyMove(s, ret);
    expect(s.figures[mummy].pos).toBe(ret.to);
    // rozstrzygnięcie: Amun 2 (bóg + mumia) vs Ra 2 (bóg + Plaga) — remis; Amun zachowuje żeton → giną wszyscy
    expect(s.pending).toEqual({ kind: 'tiebreaker', player: 0 });
    s = applyMove(s, { type: 'useTiebreaker', player: 0, use: false });
    expect(s.pending).toEqual({ kind: 'mummyReturn', player: 0, figure: mummy });
    s = applyMove(s, legalMoves(s)[0]);
    expect(s.players[0].devotion).toBe(2); // Cud: 2 śmierci mumii
  });

  it('bez wolnego pola obok boga mumia zostaje w puli', () => {
    // bóg w narożniku (0,0) otoczony: (1,0) i (0,1) zajęte przez figurki Ra
    const s0 = clearBoard(newGame());
    place(s0, 'p0-god', k(0, 0));
    const mummy = addGuardian(s0, 0, 'mummy', F[3]);
    place(s0, 'p1-god', k(0, 1));
    place(s0, 'p1-w1', k(1, 0));
    s0.players[0].followers = 0;
    s0.players[1].followers = 1;
    const s = play(conflictNow(s0), card(0, 'maat'), card(1, 'plague'), bid(1, 1));
    expect(s.figures[mummy].pos).toBeNull();
    expect(s.log.some((e) => /wraca do puli/.test(e.text))).toBe(true);
  });
});

describe('Apep', () => {
  it('przywołanie na dowolne pole wody; ruch nie kończy się na wodzie', () => {
    const s0 = clearBoard(newGame({ scenario: 'trzy-krainy' }));
    place(s0, 'p0-god', k(1, 4));
    const apep = addGuardian(s0, 0, 'apep', null);
    let s = play(s0, act(0, 'summon'));
    const water = legalMoves(s).filter((m) => m.type === 'summon' && m.figure === apep && s.map.terrain[m.to] === 'water');
    expect(water.length).toBe(Object.values(s.map.terrain).filter((t) => t === 'water').length);
    s = applyMove(s, water.find((m) => (m as { to: string }).to === k(4, 3))!);
    expect(s.figures[apep].pos).toBe(k(4, 3));
    // w wodzie należy do każdego regionu, z którym woda graniczy
    const { landRegion } = computeRegions(s.map);
    for (const land of [k(4, 2), k(3, 3), k(5, 3)]) expect(playersInRegion(s, landRegion[land])).toContain(0);
    expect(moveOptions(s, apep).every((o) => s.map.terrain[o.to] !== 'water')).toBe(true);
  });
});

describe('Olbrzymi skorpion', () => {
  it('po przywołaniu celuje szczypcami w 2 sąsiednie pola sąsiadujące ze sobą', () => {
    const s0 = clearBoard(newGame());
    place(s0, 'p0-god', F[3]);
    const sc = addGuardian(s0, 0, 'giantScorpion', null);
    let s = play(s0, act(0, 'summon'));
    s = applyMove(s, legalMoves(s).find((m) => m.type === 'summon' && m.figure === sc)!);
    expect(s.pending).toEqual({ kind: 'aimScorpion', player: 0, figure: sc });
    const aim = legalMoves(s)[0] as Extract<Move, { type: 'aimScorpion' }>;
    s = applyMove(s, aim);
    expect(s.figures[sc].aim).toEqual(aim.aim);
    expect(s.pending).toEqual({ kind: 'chooseAction', player: 0 });
  });

  it('na początku konfliktu niszczy sąsiednie monumenty, w które celuje (nie za rzeką)', () => {
    const s0 = clearBoard(newGame());
    const sc = addGuardian(s0, 0, 'giantScorpion', '3,1');
    s0.figures[sc].aim = ['3,0', '4,0']; // (3,0) w tym samym regionie, (4,0) za rzeką
    const near = addMonument(s0, 'temple', '3,0', 1);
    const far = addMonument(s0, 'obelisk', '4,0', null);
    const pool = s0.players[1].ankhPool;
    const s = conflictNow(s0);
    expect(s.monuments[near]).toBeUndefined();
    expect(s.monuments[far]).toBeDefined();
    expect(s.players[1].ankhPool).toBe(pool + 1);
    expect(s.monumentSupply.temple).toBe(s0.monumentSupply.temple + 1);
  });
});

describe('Androsfinks', () => {
  it('sąsiadujący wrogowie nie mają siły; wrogie androsfinksy obok siebie znoszą się nawzajem', () => {
    const s = clearBoard(newGame());
    const a0 = addGuardian(s, 0, 'androsphinx', F[0]);
    place(s, 'p1-w1', F[1]);
    place(s, 'p1-w2', D[3]);
    expect(figureStrength(s, s.figures['p1-w1'])).toBe(0);
    expect(figureStrength(s, s.figures['p1-w2'])).toBe(1);
    expect(figureStrength(s, s.figures[a0])).toBe(1);
    const a1 = addGuardian(s, 1, 'androsphinx', F[2]);
    expect(figureStrength(s, s.figures[a0])).toBe(0);
    expect(figureStrength(s, s.figures[a1])).toBe(0);
  });
});
