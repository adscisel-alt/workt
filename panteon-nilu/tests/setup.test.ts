import { RULES } from '../src/config/rules';
import { createGame, devotionAscending } from '../src/engine';
import { GODS5, newGame, TEST_SCENARIO } from './helpers';

describe('przygotowanie gry', () => {
  it('każdy gracz: bóg + 6 wojowników, 1 wyznawca, 7 kart, 6 żetonów ankh na panelu', () => {
    const s = newGame();
    for (const p of s.players) {
      const figs = Object.values(s.figures).filter((f) => f.owner === p.id);
      expect(figs.filter((f) => f.kind === 'god')).toHaveLength(1);
      expect(figs.filter((f) => f.kind === 'warrior')).toHaveLength(6);
      expect(p.followers).toBe(1);
      expect(p.hand).toHaveLength(7);
      expect(p.ankhPool).toBe(RULES.ankhTokensPerGod - RULES.dashboardSlots);
      expect(p.devotion).toBe(0);
    }
  });

  it('monument startowy zużywa żeton ankh z puli', () => {
    const s = newGame({ scenario: 'trzy-krainy' });
    const owned = Object.values(s.monuments).filter((m) => m.owner === 0);
    expect(owned).toHaveLength(1);
    expect(s.players[0].ankhPool).toBe(15 - 6 - 1);
    expect(s.monumentSupply.temple).toBe(10 - 2 - 1);
  });

  it('stos na torze oddania: pierwszy gracz na szczycie, reszta pod nim w kolejności', () => {
    const s = newGame({ gods: GODS5 });
    expect(devotionAscending(s)).toEqual([4, 3, 2, 1, 0]);
  });

  it('gracz rozpoczynający zostaje graczem #1 (kolejność siedzenia zachowana)', () => {
    const s = newGame({ gods: ['amun', 'ra', 'isis'], firstPlayer: 1 });
    expect(s.players.map((p) => p.god)).toEqual(['ra', 'isis', 'amun']);
  });

  it.each([2, 3, 4, 5] as const)('znaczniki akcji startują na polu dla %i graczy', (n) => {
    const s = newGame({ gods: GODS5.slice(0, n) });
    const expected = { 5: 0, 4: 1, 3: 2, 2: 3 }[n];
    expect(s.actionTracks).toEqual({ move: expected, summon: expected, followers: expected, unlock: expected });
    expect(s.eventIndex).toBe(-1);
  });

  it.each([
    [2, { catMummy: 1, mummy: 1, androsphinx: 1 }],
    [3, { catMummy: 2, mummy: 2, androsphinx: 2 }],
    [4, { catMummy: 3, mummy: 3, androsphinx: 2 }],
    [5, { catMummy: 3, mummy: 3, androsphinx: 2 }],
  ] as const)('liczba figurek strażników dla %i graczy', (n, supply) => {
    expect(newGame({ gods: GODS5.slice(0, n) }).guardianSupply).toEqual(supply);
  });

  it('karty strażników losowane po jednej na poziom, deterministycznie wg ziarna', () => {
    const a = createGame({ scenario: TEST_SCENARIO, gods: ['amun', 'ra'], seed: 'x' });
    const b = createGame({ scenario: TEST_SCENARIO, gods: ['amun', 'ra'], seed: 'x' });
    expect(a).toEqual(b);
    expect(Object.keys(a.guardianCards)).toEqual(['1', '2', '3']);
  });

  it('stan jest w pełni serializowalny do JSON', () => {
    const s = newGame({ scenario: 'trzy-krainy' });
    expect(JSON.parse(JSON.stringify(s))).toEqual(s);
  });

  it('odrzuca złą liczbę graczy, powtórzonego boga i nieobsługiwany scenariusz', () => {
    expect(() => newGame({ gods: ['amun'] })).toThrow();
    expect(() => newGame({ gods: ['amun', 'amun'] })).toThrow();
    expect(() => newGame({ scenario: 'trzy-krainy', gods: ['amun', 'ra', 'isis'] })).toThrow();
  });
});
