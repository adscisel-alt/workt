import { applyMove, viewFor } from '../src/engine';
import { bid, card, clearBoard, conflictNow, newGame, place, play, R1 } from './helpers';

function battle() {
  const s = clearBoard(newGame());
  place(s, 'p0-god', R1.fertile[0]);
  place(s, 'p1-god', R1.fertile[1]);
  s.players[0].followers = 3;
  s.players[1].followers = 3;
  return conflictNow(s);
}

describe('widok gracza (ukryte informacje)', () => {
  it('zakryta karta jest widoczna tylko dla wybierającego', () => {
    const s = applyMove(battle(), card(0, 'plague'));
    expect(viewFor(s, 0).battle!.selected).toEqual({ 0: ['plague'] });
    expect(viewFor(s, 1).battle!.selected).toEqual({});
    expect(viewFor(s, null).battle!.selected).toEqual({});
  });

  it('oferta w licytacji plagi jest widoczna tylko dla licytującego', () => {
    const s = play(battle(), card(0, 'plague'), card(1, 'maat'), bid(0, 2));
    expect(viewFor(s, 0).battle!.bids).toEqual({ 0: 2 });
    expect(viewFor(s, 1).battle!.bids).toEqual({});
  });

  it('widok nie modyfikuje stanu i poza bitwą jest tożsamy ze stanem', () => {
    const s = applyMove(battle(), card(0, 'plague'));
    const snap = JSON.stringify(s);
    viewFor(s, 1);
    expect(JSON.stringify(s)).toBe(snap);
    const calm = newGame();
    expect(viewFor(calm, 0)).toBe(calm);
  });
});
