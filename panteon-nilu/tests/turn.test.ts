import { applyMove, IllegalMoveError, legalMoves } from '../src/engine';
import { act, GODS5, newGame, play } from './helpers';

const end = (player: number) => ({ type: 'endMove', player }) as const;

describe('tura i tory akcji', () => {
  it('pierwsza akcja dowolna; druga musi być w niższym wierszu', () => {
    let s = newGame();
    expect(legalMoves(s).map((m) => (m as { action: string }).action)).toEqual(['move', 'summon', 'followers', 'unlock']);
    s = play(s, act(0, 'summon'));
    // pula ma wojowników, a obok boga są wolne pola — czekamy na wybór przywołania
    const summon = legalMoves(s)[0];
    s = applyMove(s, summon);
    expect(legalMoves(s).map((m) => (m as { action: string }).action)).toEqual(['followers', 'unlock']);
    expect(() => applyMove(s, act(0, 'move'))).toThrow(IllegalMoveError);
    expect(() => applyMove(s, act(0, 'summon'))).toThrow(IllegalMoveError);
  });

  it('po dwóch akcjach tura przechodzi na następnego gracza', () => {
    const s = play(newGame(), act(0, 'followers'), act(0, 'unlock'));
    // Odblokowanie za 1 wyznawcę czeka na wybór mocy
    expect(s.pending).toEqual({ kind: 'unlock', player: 0, level: 1 });
    const s2 = applyMove(s, legalMoves(s)[0]);
    expect(s2.turn.player).toBe(1);
    expect(s2.pending).toEqual({ kind: 'chooseAction', player: 1 });
  });

  it('Odblokowanie jako pierwsza akcja kończy turę (nie ma niższego wiersza)', () => {
    const s = newGame();
    s.players[0].followers = 0; // akcja bez efektu
    const s2 = play(s, act(0, 'unlock'));
    expect(s2.turn.player).toBe(1);
  });

  it('akcję można wybrać, nawet gdy nie da się jej wykonać — znacznik i tak się przesuwa', () => {
    const s = newGame();
    s.players[0].followers = 0;
    const s2 = play(s, act(0, 'followers'));
    expect(s2.actionTracks.followers).toBe(s.actionTracks.followers + 1);
    expect(s2.players[0].followers).toBe(0);
  });

  it.each([
    [2, 3, 2],
    [3, 4, 3],
    [4, 5, 4],
    [5, 6, 5],
  ] as const)('%i graczy: wydarzenie po %i akcjach Wyznawców i po %i Odblokowaniach', (n, followersSteps, unlockSteps) => {
    const countUntilEvent = (action: 'followers' | 'unlock') => {
      let s = newGame({ gods: GODS5.slice(0, n) });
      for (let i = 1; i <= 10; i++) {
        // izolacja: pozostałe tory wracają na start przed każdą turą
        for (const a of s.rules.actionOrder) if (a !== action) s.actionTracks[a] = s.rules.actionTracks[a].start[n];
        s.players.forEach((p) => (p.followers = 0));
        const p = s.turn.player;
        s = play(s, act(p, action));
        if (s.eventIndex === 0) {
          expect(s.actionTracks[action]).toBe(s.rules.actionTracks[action].start[n]); // znacznik wrócił
          return i;
        }
        if (s.turn.player === p) s = play(s, act(p, 'unlock'));
      }
      return -1;
    };
    expect(countUntilEvent('followers')).toBe(followersSteps);
    expect(countUntilEvent('unlock')).toBe(unlockSteps);
  });

  it('wydarzenie wyzwolone pierwszą akcją kończy turę bez drugiej akcji', () => {
    let s = newGame();
    s.actionTracks.followers = s.rules.actionTracks.followers.length - 2;
    s = play(s, act(0, 'followers'));
    expect(s.eventIndex).toBe(0);
    expect(s.turn.player).toBe(1);
    expect(s.actionTracks.followers).toBe(s.rules.actionTracks.followers.start[2]);
  });

  it('wydarzenie może wyzwolić także druga akcja', () => {
    let s = newGame();
    s.actionTracks.unlock = s.rules.actionTracks.unlock.length - 2;
    s.players[0].followers = 0;
    s = play(s, act(0, 'followers'), act(0, 'unlock'));
    expect(s.eventIndex).toBe(0);
    expect(s.turn.player).toBe(1);
  });

  it('ruch innego gracza niż aktywny jest nielegalny', () => {
    expect(() => applyMove(newGame(), act(1, 'move'))).toThrow(IllegalMoveError);
  });

  it('applyMove nie modyfikuje stanu wejściowego', () => {
    const s = newGame();
    const snapshot = JSON.stringify(s);
    play(s, act(0, 'move'), end(0));
    expect(JSON.stringify(s)).toBe(snapshot);
  });
});
