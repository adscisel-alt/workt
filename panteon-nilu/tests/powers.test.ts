import { applyMove, legalMoves } from '../src/engine';
import { figureStrength } from '../src/engine/queries';
import type { AnkhPowerId, GameState, Move } from '../src/engine/types';
import { act, addMonument, card, clearBoard, conflictNow, newGame, place, play, R1, R2 } from './helpers';

const F = R1.fertile;
const D = R1.desert;

/** Plansza: bóg + wojownicy graczy na podanych polach; moce graczy. */
function setup(p0: string[], p1: string[], powers: [AnkhPowerId[], AnkhPowerId[]] = [[], []]): GameState {
  const s = clearBoard(newGame());
  p0.forEach((h, i) => place(s, i === 0 ? 'p0-god' : `p0-w${i}`, h));
  p1.forEach((h, i) => place(s, i === 0 ? 'p1-god' : `p1-w${i}`, h));
  s.players[0].unlocked = powers[0];
  s.players[1].unlocked = powers[1];
  return s;
}

describe('moce poziomu 1', () => {
  it('Łup zwycięzcy: wygrana bitwa +3 wyznawców; dominacja nic nie daje', () => {
    const s0 = setup([F[0], F[2]], [F[1]], [['commanding'], []]);
    s0.players[0].followers = 0;
    let s = play(conflictNow(s0), card(0, 'chariots'), card(1, 'maat'));
    expect(s.players[0].followers).toBe(3);
    const dom = setup([F[0]], [], [['commanding'], []]);
    dom.players[0].followers = 0;
    s = conflictNow(dom);
    expect(s.players[0].followers).toBe(0);
  });

  it('Natchnieni budowniczowie: budowa za 0 wyznawców', () => {
    const s0 = setup([F[0]], [F[1]], [['inspiring'], []]);
    s0.players[0].followers = 0;
    let s = play(conflictNow(s0), card(0, 'build'), card(1, 'maat'));
    expect(s.pending).toEqual({ kind: 'build', player: 0 });
    s = applyMove(s, { type: 'build', player: 0, monument: 'obelisk', at: D[0] });
    expect(s.players[0].followers).toBe(0);
    expect(Object.values(s.monuments).some((m) => m.owner === 0 && m.pos === D[0])).toBe(true);
  });

  it('Wszechobecność: na początku konfliktu +1 wyznawca za każdy region z własną figurką', () => {
    const s0 = setup([F[0], R2.desert[0]], [], [['omnipresent'], []]);
    s0.players[0].followers = 0;
    const s = conflictNow(s0);
    expect(s.players[0].followers).toBe(2);
    expect(s.log.findIndex((e) => /Wszechobecność/.test(e.text))).toBeLessThan(s.log.findIndex((e) => /dominuje/.test(e.text)));
  });

  it('Czczony: akcja Wyznawcy +1', () => {
    const s0 = setup([F[0]], [], [['revered'], []]);
    s0.players[0].followers = 0;
    expect(play(s0, act(0, 'followers')).players[0].followers).toBe(1);
  });
});

describe('moce poziomu 2', () => {
  it('Majestat: 3+ monumenty jednego typu na planszy → bóg ma bazową siłę 3', () => {
    const s = setup([F[0]], [], [['resplendent'], []]);
    addMonument(s, 'temple', R2.desert[0], 0);
    addMonument(s, 'temple', R2.desert[1], 0);
    expect(figureStrength(s, s.figures['p0-god'])).toBe(1);
    addMonument(s, 'temple', R2.desert[2], 0);
    expect(figureStrength(s, s.figures['p0-god'])).toBe(3);
    place(s, 'p0-w1', F[2]);
    expect(figureStrength(s, s.figures['p0-w1'])).toBe(1); // tylko bóg
  });

  it('Zew obelisków: na początku bitwy przestawia figurki spoza regionu obok własnego obelisku', () => {
    const s0 = setup([F[0], R2.desert[0]], [F[1]], [['obeliskAttuned'], []]);
    addMonument(s0, 'obelisk', D[1], 0);
    let s = conflictNow(s0);
    expect(s.pending).toEqual({ kind: 'obeliskMove', player: 0 });
    const m = legalMoves(s).find((x) => x.type === 'obeliskMove' && x.figure === 'p0-w1')! as Extract<Move, { type: 'obeliskMove' }>;
    s = applyMove(s, m);
    expect(s.figures['p0-w1'].pos).toBe(m.to);
    s = applyMove(s, { type: 'obeliskDone', player: 0 });
    expect(s.pending).toEqual({ kind: 'selectCards', waiting: [0, 1] });
    s = play(s, card(0, 'maat'), card(1, 'maat'));
    expect(s.players[0].devotion).toBe(2); // przewaga obelisków +1, wygrana (2 figurki vs 1) +1
  });

  it('Zew obelisków: każdą figurkę przestawia się najwyżej raz', () => {
    const s0 = setup([F[0], R2.desert[0]], [F[1]], [['obeliskAttuned'], []]);
    addMonument(s0, 'obelisk', D[1], 0);
    let s = conflictNow(s0);
    s = applyMove(s, legalMoves(s).find((x) => x.type === 'obeliskMove' && x.figure === 'p0-w1')!);
    expect(legalMoves(s).some((x) => x.type === 'obeliskMove' && x.figure === 'p0-w1')).toBe(false);
  });

  it('Zew obelisków: kilku graczy — rosnąco wg oddania, na zmianę po 1 figurce', () => {
    const s0 = setup([F[0], R2.desert[0], R2.desert[1]], [F[1], R2.desert[2], R2.desert[3]], [['obeliskAttuned'], ['obeliskAttuned']]);
    addMonument(s0, 'obelisk', D[0], 0);
    addMonument(s0, 'obelisk', D[3], 1);
    s0.players[0].devotion = 5;
    let s = conflictNow(s0);
    expect(s.pending).toEqual({ kind: 'obeliskMove', player: 1 });
    s = applyMove(s, legalMoves(s).find((x) => x.type === 'obeliskMove')!);
    expect(s.pending).toEqual({ kind: 'obeliskMove', player: 0 });
    s = applyMove(s, { type: 'obeliskDone', player: 0 });
    expect(s.pending).toEqual({ kind: 'obeliskMove', player: 1 });
  });

  it('Moc świątyń: +2 za każdą własną świątynię w regionie z własną figurką obok', () => {
    const s0 = setup([F[0]], [F[3]], [['templeAttuned'], []]);
    addMonument(s0, 'temple', F[1], 0); // obok boga (0,0)
    addMonument(s0, 'temple', D[3], 0); // bez figurki obok
    let s = conflictNow(s0);
    s = applyMove(s, card(0, 'maat'));
    s = applyMove(s, card(1, 'maat'));
    expect(s.log.find((e) => /Siła:/.test(e.text))?.text).toBe('Siła: Amun 3, Ra 1.');
  });

  it('Wrota piramid: dodatkowe przywołanie obok każdej własnej piramidy; łańcuch; zwykłe obowiązkowe', () => {
    const s0 = setup([F[0]], [], [['pyramidAttuned'], []]);
    const pyr = addMonument(s0, 'pyramid', R2.desert[0], 0);
    let s = play(s0, act(0, 'summon'));
    const sources = new Set(legalMoves(s).map((m) => (m as { source?: string }).source));
    expect(sources).toEqual(new Set(['regular', `pyramid:${pyr}`]));
    expect(legalMoves(s).some((m) => m.type === 'endSummon')).toBe(false);
    // najpierw dodatkowe obok piramidy (w regionie 2)…
    const extra = legalMoves(s).find((m) => m.type === 'summon' && m.source === `pyramid:${pyr}`)! as Extract<Move, { type: 'summon' }>;
    s = applyMove(s, extra);
    // …potem zwykłe — także obok świeżo przywołanej figurki („łańcuch”)
    const regular = legalMoves(s).filter((m) => m.type === 'summon') as Extract<Move, { type: 'summon' }>[];
    expect(regular.every((m) => m.source === 'regular')).toBe(true);
    expect(regular.some((m) => m.to === R2.desert[1] || m.to === R2.desert[2])).toBe(true);
    s = applyMove(s, regular[0]);
    expect(s.pending).toEqual({ kind: 'chooseAction', player: 0 });
  });
});

describe('moce poziomu 3', () => {
  it('Triumf: przewaga 3+ siły → 3 oddania zamiast 1', () => {
    let s = play(conflictNow(setup([F[0]], [F[1]], [['glorious'], []])), card(0, 'chariots'), card(1, 'maat')); // 4 vs 1
    expect(s.players[0].devotion).toBe(3);
    s = play(conflictNow(setup([F[0]], [F[1], F[2]], [['glorious'], []])), card(0, 'chariots'), card(1, 'maat')); // 4 vs 2
    expect(s.players[0].devotion).toBe(1);
  });

  it('Wielkoduszność: przegrana z 2+ figurkami w rozstrzygnięciu → +2, po nagrodzie zwycięzcy', () => {
    let s = play(conflictNow(setup([F[0], F[2], F[3]], [F[1], D[0]], [[], ['magnanimous']])), card(0, 'chariots'), card(1, 'maat'));
    expect(s.players[1].devotion).toBe(2);
    const idx = (re: RegExp) => s.log.findIndex((e) => re.test(e.text));
    expect(idx(/wygrana bitwa/)).toBeLessThan(idx(/Wielkoduszność/));
    s = play(conflictNow(setup([F[0], F[2]], [F[1]], [[], ['magnanimous']])), card(0, 'chariots'), card(1, 'maat'));
    expect(s.players[1].devotion).toBe(0); // tylko 1 figurka
  });

  it('Hojność: w czerwonej strefie każdy zysk (instancja) +1; poza nią nic', () => {
    const s0 = setup([F[0]], [], [['bountiful'], []]);
    addMonument(s0, 'obelisk', D[0], 0);
    expect(conflictNow(s0).players[0].devotion).toBe((1 + 1) + (1 + 1)); // przewaga + dominacja
    s0.players[0].devotion = s0.rules.devotion.redMax + 1;
    expect(conflictNow(s0).players[0].devotion).toBe(s0.rules.devotion.redMax + 1 + 2);
  });

  it('Hojność: premia Suszy to część nagrody za wygraną — +1 tylko raz', () => {
    const s0 = setup([D[0], D[1]], [F[1]], [['bountiful'], []]);
    const s = play(conflictNow(s0), card(0, 'drought'), card(1, 'maat'));
    expect(s.players[0].devotion).toBe(1 + 2 + 1);
  });

  it('Uwielbienie: po bitwie z zagraną kartą raz można poświęcić 2 wyznawców za 1 oddania', () => {
    const s0 = setup([F[0]], [F[1], F[2]], [['worshipful'], []]);
    s0.players[0].followers = 5;
    let s = play(conflictNow(s0), card(0, 'maat'), card(1, 'chariots'));
    expect(s.pending).toEqual({ kind: 'worshipful', player: 0 });
    s = applyMove(s, { type: 'worshipful', player: 0, use: true });
    expect(s.players[0].followers).toBe(3);
    expect(s.players[0].devotion).toBe(1);
    expect(s.pending).toBeNull();
    const poor = setup([F[0]], [F[1]], [['worshipful'], []]);
    poor.players[0].followers = 1;
    s = play(conflictNow(poor), card(0, 'maat'), card(1, 'chariots'));
    expect(s.pending).toBeNull();
  });
});
