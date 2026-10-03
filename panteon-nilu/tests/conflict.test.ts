import { addMonument, card, clearBoard, conflictNow, k, newGame, place, play, R1, R2 } from './helpers';

describe('konflikt: kolejność regionów i dominacja', () => {
  it('regiony rozstrzygane wg rosnących numerów żetonów; puste regiony pomijane', () => {
    const s = clearBoard(newGame());
    place(s, 'p0-god', R1.fertile[0]);
    place(s, 'p1-god', R2.desert[0]);
    let after = conflictNow(s);
    const order = (st: typeof after) =>
      st.log.filter((e) => /dominuje/.test(e.text)).map((e) => e.player);
    expect(order(after)).toEqual([0, 1]);
    // zamiana numerów żetonów odwraca kolejność
    s.conflictTokens = { 1: s.conflictTokens['2'], 2: s.conflictTokens['1'] };
    after = conflictNow(s);
    expect(order(after)).toEqual([1, 0]);
    // region bez figurek
    s.figures['p1-god'].pos = null;
    after = conflictNow(s);
    expect(after.log.some((e) => /brak figurek/.test(e.text))).toBe(true);
  });

  it('dominacja: +1 za przewagi (jedno zdarzenie), potem +1 za dominację', () => {
    // przykład z instrukcji (s. 22): 2 obeliski i piramida vs piramida rywala; świątynia rywala bez jego figurek
    const s = clearBoard(newGame());
    place(s, 'p0-god', R1.fertile[0]);
    addMonument(s, 'obelisk', R1.fertile[2], 0);
    addMonument(s, 'obelisk', R1.fertile[3], 0);
    addMonument(s, 'pyramid', R1.desert[0], 0);
    addMonument(s, 'pyramid', R1.desert[1], 1);
    addMonument(s, 'temple', R1.desert[2], 1);
    const after = conflictNow(s);
    expect(after.players[0].devotion).toBe(2);
    expect(after.players[1].devotion).toBe(0); // przewaga świątyń bez figurek nic nie daje
    const gains = after.log.filter((e) => e.player === 0 && /oddania/.test(e.text)).map((e) => e.text);
    expect(gains[0]).toMatch(/przewagi monumentów/);
    expect(gains[1]).toMatch(/dominacja/);
  });

  it('dominacja bez przewag: tylko +1', () => {
    const s = clearBoard(newGame());
    place(s, 'p0-god', R1.fertile[0]);
    expect(conflictNow(s).players[0].devotion).toBe(1);
  });

  it('wyzwalający bierze żeton rozstrzygający; po konflikcie żeton wraca, licznik konfliktów rośnie', () => {
    const s = clearBoard(newGame());
    place(s, 'p0-god', R1.fertile[0]);
    place(s, 'p1-god', R1.fertile[1]);
    let c = conflictNow(s, 1);
    expect(c.conflict?.tiebreaker).toEqual({ holder: 1, faceUp: true });
    c = play(c, card(0, 'chariots'), card(1, 'miracle'));
    expect(c.conflict).toBeNull();
    expect(c.battle).toBeNull();
    expect(c.conflictsResolved).toBe(1);
  });

  it('cały konflikt w grze: wyzwolony z toru wydarzeń, po nim tura przechodzi dalej', () => {
    let s = clearBoard(newGame());
    place(s, 'p0-god', R1.fertile[0]);
    place(s, 'p1-god', R1.fertile[1]);
    s.eventIndex = 2; // następne pole: Konflikt
    s.actionTracks.followers = s.rules.actionTracks.followers.length - 2;
    s = play(s, { type: 'chooseAction', player: 0, action: 'followers' });
    expect(s.pending).toEqual({ kind: 'selectCards', waiting: [0, 1] });
    s = play(s, card(1, 'chariots'), card(0, 'flood'));
    expect(s.players[1].devotion).toBe(1);
    expect(s.pending).toEqual({ kind: 'chooseAction', player: 1 });
    expect(s.figures['p0-god'].pos).toBe(k(0, 0)); // bóg nie ginie
  });
});
