import type { ScenarioDef } from '../src/config/scenarios';
import { applyMove, legalMoves, moveDestinations } from '../src/engine';
import { act, addMonument, clearBoard, k, newGame, place, play } from './helpers';

/** Jeden rząd pól: L W L L L L — jedyna ścieżka biegnie wzdłuż rzędu. */
const ROW: ScenarioDef = {
  id: 'row', name: 'Rząd', playerCounts: [2],
  grid: ['F1 W F1 F1 F1 F1'],
  conflictTokens: { 1: [0, 0] },
  monuments: [],
  starts: { 2: [{ god: [0, 0], warriors: [], monuments: [] }, { god: [5, 0], warriors: [], monuments: [] }] },
};

describe('akcja Ruch', () => {
  it('figurka idzie do 3 pól; dalej nie', () => {
    const s = newGame({ scenario: ROW });
    const d = moveDestinations(s, 'p0-god');
    expect(d).toContain(k(3, 0));
    expect(d).not.toContain(k(4, 0));
  });

  it('przechodzi przez wodę, figurki i monumenty, ale kończy tylko na pustym polu lądowym', () => {
    const s = newGame({ scenario: ROW });
    place(s, 'p1-w1', k(2, 0)); // wroga figurka na trasie
    addMonument(s, 'obelisk', k(3, 0), null);
    s.figures['p1-god'].pos = null;
    // trasa: (1,0) woda -> (2,0) wróg -> (3,0) monument — żadne z nich nie jest celem
    expect(moveDestinations(s, 'p0-god')).toEqual([]);
    s.monuments = {};
    expect(moveDestinations(s, 'p0-god')).toEqual([k(3, 0)]);
  });

  it('przekracza rzekę (ruch ignoruje granice regionów)', () => {
    const s = clearBoard(newGame());
    place(s, 'p0-god', k(3, 1));
    expect(moveDestinations(s, 'p0-god')).toContain(k(5, 1));
  });

  it('każda figurka rusza się najwyżej raz; gracz może zakończyć ruch w dowolnej chwili', () => {
    let s = clearBoard(newGame());
    place(s, 'p0-god', k(0, 0));
    place(s, 'p0-w1', k(0, 3));
    s = play(s, act(0, 'move'), { type: 'moveFigure', player: 0, figure: 'p0-god', to: k(1, 0), push: null });
    const figs = legalMoves(s).filter((m) => m.type === 'moveFigure').map((m) => (m as { figure: string }).figure);
    expect(new Set(figs)).toEqual(new Set(['p0-w1']));
    s = applyMove(s, { type: 'endMove', player: 0 });
    expect(s.figures['p0-w1'].pos).toBe(k(0, 3));
    expect(s.pending).toEqual({ kind: 'chooseAction', player: 0 });
  });

  it('ruch kończy się sam, gdy ruszyły wszystkie figurki na planszy', () => {
    const s = play(newGame(), act(0, 'move'), { type: 'moveFigure', player: 0, figure: 'p0-god', to: k(0, 4), push: null });
    expect(s.pending).toEqual({ kind: 'chooseAction', player: 0 });
  });

  it('ruch bez żadnej figurki na planszy — znacznik przesunięty, bez decyzji', () => {
    const s = clearBoard(newGame());
    const s2 = play(s, act(0, 'move'));
    expect(s2.actionTracks.move).toBe(s.actionTracks.move + 1);
    expect(s2.pending).toEqual({ kind: 'chooseAction', player: 0 });
  });
});
