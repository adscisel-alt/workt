import { applyMove, legalMoves, summonTargets } from '../src/engine';
import { act, addMonument, clearBoard, k, newGame, place, play } from './helpers';

describe('akcja Przywołanie', () => {
  it('cel: puste pole lądowe obok własnej figurki, tylko w tym samym regionie', () => {
    const s = clearBoard(newGame());
    place(s, 'p0-god', k(3, 1)); // przy rzece; kolumna 4 to inny region
    expect(summonTargets(s, 0)).toEqual([k(2, 1), k(3, 0), k(3, 2)].sort());
  });

  it('cel: obok kontrolowanego monumentu (bez figurek w pobliżu); cudzy monument się nie liczy', () => {
    const s = clearBoard(newGame());
    addMonument(s, 'temple', k(6, 3), 0);
    addMonument(s, 'temple', k(1, 1), 1);
    const t = summonTargets(s, 0);
    expect(t).toContain(k(5, 3));
    expect(t).toContain(k(7, 3));
    expect(t).not.toContain(k(0, 1));
  });

  it('nie na wodę ani na zajęte pole', () => {
    const s = clearBoard(newGame());
    place(s, 'p0-god', k(1, 2)); // sąsiaduje z wodą (2,2)
    place(s, 'p1-god', k(0, 2));
    addMonument(s, 'obelisk', k(1, 1), null);
    const t = summonTargets(s, 0);
    expect(t).not.toContain(k(2, 2));
    expect(t).not.toContain(k(0, 2));
    expect(t).not.toContain(k(1, 1));
  });

  it('przywołana figurka trafia z puli na planszę, a tura toczy się dalej', () => {
    let s = play(newGame(), act(0, 'summon'));
    const m = legalMoves(s)[0];
    expect(m.type).toBe('summon');
    s = applyMove(s, m);
    const fig = (m as { figure: string; to: string });
    expect(s.figures[fig.figure].pos).toBe(fig.to);
    expect(s.pending).toEqual({ kind: 'chooseAction', player: 0 });
  });

  it('wojownicy są wymienni: jedna opcja na pole, nie sześć', () => {
    const s = play(newGame(), act(0, 'summon'));
    const moves = legalMoves(s);
    expect(new Set(moves.map((m) => (m as { to: string }).to)).size).toBe(moves.length);
  });

  it('pusta pula — akcja bez efektu, znacznik przesunięty', () => {
    const s = newGame();
    for (const f of Object.values(s.figures)) if (f.owner === 0 && f.kind === 'warrior') delete s.figures[f.id];
    const s2 = play(s, act(0, 'summon'));
    expect(s2.actionTracks.summon).toBe(s.actionTracks.summon + 1);
    expect(s2.pending).toEqual({ kind: 'chooseAction', player: 0 });
  });
});
