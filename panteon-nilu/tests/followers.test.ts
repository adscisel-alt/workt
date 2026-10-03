import { followersGain } from '../src/engine';
import { act, addMonument, clearBoard, k, newGame, place, play } from './helpers';

describe('akcja Wyznawcy', () => {
  it('+1 za każdy własny lub neutralny monument z sąsiednią figurką gracza', () => {
    const s = clearBoard(newGame());
    place(s, 'p0-w1', k(1, 1));
    place(s, 'p0-w2', k(1, 4));
    addMonument(s, 'obelisk', k(2, 1), null); // neutralny, obok w1 → +1
    addMonument(s, 'temple', k(0, 1), 0); // własny, obok w1 → +1
    addMonument(s, 'pyramid', k(1, 0), 1); // cudzy, obok w1 → 0
    addMonument(s, 'pyramid', k(6, 0), 0); // własny, bez figurki obok → 0
    addMonument(s, 'obelisk', k(2, 4), null); // neutralny obok w2 → +1
    expect(followersGain(s, 0)).toBe(3);
    const s2 = play(s, act(0, 'followers'));
    expect(s2.players[0].followers).toBe(1 + 3);
  });

  it('monument liczy się raz, nawet gdy sąsiaduje z nim kilka figurek', () => {
    const s = clearBoard(newGame());
    addMonument(s, 'obelisk', k(1, 1), null);
    place(s, 'p0-w1', k(0, 1));
    place(s, 'p0-w2', k(2, 1));
    expect(followersGain(s, 0)).toBe(1);
  });

  it('monument za rzeką się nie liczy (brak sąsiedztwa)', () => {
    const s = clearBoard(newGame());
    place(s, 'p0-w1', k(3, 1));
    addMonument(s, 'obelisk', k(4, 1), null);
    expect(followersGain(s, 0)).toBe(0);
  });

  it('moc Czczony daje +1 wyznawcę (hook z danych mocy)', () => {
    const s = clearBoard(newGame());
    s.players[0].unlocked = ['revered'];
    expect(followersGain(s, 0)).toBe(1);
  });
});
