import { changeDevotion, changeDevotionSimultaneous, devotionAscending, isInRed } from '../src/engine/devotion';
import { GODS5, newGame } from './helpers';

describe('tor oddania', () => {
  it('żeton wchodzący na zajęte pole ląduje na szczycie stosu', () => {
    const s = newGame({ gods: GODS5.slice(0, 3) }); // stos startowy: 0 na górze
    changeDevotion(s, 2, 2, 'test');
    changeDevotion(s, 1, 2, 'test');
    expect(devotionAscending(s)).toEqual([0, 2, 1]);
  });

  it('jednoczesne zyski rozliczane od najmniejszego oddania rosnąco (stos decyduje o kolejności)', () => {
    const s = newGame({ gods: GODS5.slice(0, 3) });
    // wszyscy na 0; kolejność rosnąca: 2, 1, 0 — każdy dostaje +1 i trafia na szczyt stosu pola 1
    changeDevotionSimultaneous(s, { 0: 1, 1: 1, 2: 1 }, 'test');
    expect(devotionAscending(s)).toEqual([2, 1, 0]);
    const order = s.log.slice(-3).map((e) => e.player);
    expect(order).toEqual([2, 1, 0]);
  });

  it('oddanie nie spada poniżej 0', () => {
    const s = newGame();
    changeDevotion(s, 0, -3, 'test');
    expect(s.players[0].devotion).toBe(0);
  });

  it('dotarcie na szczyt toru = natychmiastowa wygrana', () => {
    const s = newGame();
    changeDevotion(s, 1, 100, 'test');
    expect(s.players[1].devotion).toBe(s.rules.devotion.top);
    expect(s.result?.winners).toEqual([1]);
    expect(s.pending).toBeNull();
  });

  it('czerwona strefa: pola 0..redMax', () => {
    const s = newGame();
    s.players[0].devotion = s.rules.devotion.redMax;
    expect(isInRed(s, 0)).toBe(true);
    s.players[0].devotion = s.rules.devotion.redMax + 1;
    expect(isInRed(s, 0)).toBe(false);
  });
});
