import { applyMove, legalMoves } from '../src/engine';
import type { GameState } from '../src/engine/types';
import { act, addMonument, clearBoard, k, newGame, place, play } from './helpers';

/** Wyzwala pierwsze wydarzenie toru (Przejęcie monumentu) akcją Wyznawcy gracza 0. */
function triggerControl(s: GameState): GameState {
  s.actionTracks.followers = s.rules.actionTracks.followers.length - 2;
  return play(s, act(0, 'followers'));
}

describe('wydarzenie Przejęcie monumentu', () => {
  it('pierwsze pole toru to Przejęcie monumentu', () => {
    expect(newGame().rules.eventTrack[0].type).toBe('controlMonument');
  });

  it('przejmuje neutralny monument obok swojej figurki; żeton ankh z puli', () => {
    const s = clearBoard(newGame());
    place(s, 'p0-god', k(1, 1));
    const near = addMonument(s, 'obelisk', k(2, 1), null);
    addMonument(s, 'temple', k(6, 4), null); // daleko
    let s2 = triggerControl(s);
    expect(legalMoves(s2)).toEqual([{ type: 'controlMonument', player: 0, monument: near }]);
    s2 = applyMove(s2, legalMoves(s2)[0]);
    expect(s2.monuments[near].owner).toBe(0);
    expect(s2.players[0].ankhPool).toBe(s.players[0].ankhPool - 1);
    expect(s2.turn.player).toBe(1);
  });

  it('dopóki na planszy jest neutralny monument, cudzego nie można przejąć', () => {
    const s = clearBoard(newGame());
    place(s, 'p0-god', k(1, 1));
    addMonument(s, 'obelisk', k(2, 1), 1); // cudzy, obok
    addMonument(s, 'temple', k(6, 4), null); // neutralny, ale nie obok
    const s2 = triggerControl(s);
    expect(s2.pending).toEqual({ kind: 'chooseAction', player: 1 });
    expect(s2.monuments[Object.keys(s2.monuments)[0]].owner).toBe(1);
  });

  it('brak neutralnych na planszy — przejmuje cudzy sąsiedni; żeton wraca do poprzedniego właściciela', () => {
    const s = clearBoard(newGame());
    place(s, 'p0-god', k(1, 1));
    const theirs = addMonument(s, 'obelisk', k(2, 1), 1);
    addMonument(s, 'temple', k(0, 1), 0); // własnego nie „przejmuje”
    s.players[1].ankhPool = 5;
    let s2 = triggerControl(s);
    expect(legalMoves(s2)).toEqual([{ type: 'controlMonument', player: 0, monument: theirs }]);
    s2 = applyMove(s2, legalMoves(s2)[0]);
    expect(s2.monuments[theirs].owner).toBe(0);
    expect(s2.players[1].ankhPool).toBe(6);
  });

  it('bez żetonów ankh w puli — brak efektu (znacznik wydarzeń i tak idzie)', () => {
    const s = clearBoard(newGame());
    place(s, 'p0-god', k(1, 1));
    addMonument(s, 'obelisk', k(2, 1), null);
    s.players[0].ankhPool = 0;
    const s2 = triggerControl(s);
    expect(s2.eventIndex).toBe(0);
    expect(s2.turn.player).toBe(1);
  });

  it('monument za rzeką nie sąsiaduje — brak efektu', () => {
    const s = clearBoard(newGame());
    place(s, 'p0-god', k(3, 1));
    const m = addMonument(s, 'obelisk', k(4, 1), null);
    const s2 = triggerControl(s);
    expect(s2.monuments[m].owner).toBeNull();
  });
});
