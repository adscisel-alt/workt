import { applyMove, legalMoves } from '../src/engine';
import { activeEffects } from '../src/engine/hooks';
import { forgetGods, mergeGods } from '../src/engine/merge';
import { changeDevotion } from '../src/engine/devotion';
import type { GameState, GodId } from '../src/engine/types';
import { act, addGuardian, addMonument, card, clearBoard, conflictNow, k, newGame, place, play, R1, R2 } from './helpers';

/** 3 bogów; oddanie: gracz 0 = 5, gracz 1 = 3, gracz 2 = 1 → łączą się 1 (wyższy) i 2 (niższy). */
function three(gods: GodId[] = ['amun', 'ra', 'isis']): GameState {
  const s = newGame({ gods });
  s.players[0].devotion = 5;
  s.players[1].devotion = 3;
  s.players[2].devotion = 1;
  return s;
}

describe('łączenie bogów (po 3. konflikcie, 3+ graczy)', () => {
  it('łączą się dwaj ostatni na torze; byt połączony stoi na polu niższego, z obiema zdolnościami', () => {
    const s = three();
    s.players[2].followers = 4;
    s.players[1].followers = 1;
    mergeGods(s);
    expect(s.players[2].mergedInto).toBe(1);
    expect(s.players[1].mergedWith).toBe(2);
    expect(s.players[1].devotion).toBe(1);
    expect(s.players[1].followers).toBe(5);
    expect(s.players[1].extraGods).toEqual(['isis']);
    expect(activeEffects(s, 1).map((e) => e.id)).toEqual(expect.arrayContaining(['ra', 'isis']));
    expect(activeEffects(s, 2)).toEqual([]);
  });

  it('niższy traci boga, wojowników, monumenty (do zapasu), karty i żetony ankh', () => {
    const s = three();
    const m = addMonument(s, 'obelisk', R2.desert[0], 2);
    const supply = s.monumentSupply.obelisk;
    mergeGods(s);
    expect(Object.values(s.figures).some((f) => f.owner === 2)).toBe(false);
    expect(s.monuments[m]).toBeUndefined();
    expect(s.monumentSupply.obelisk).toBe(supply + 1);
    expect(s.players[2].hand).toEqual([]);
    expect(s.players[2].ankhPool).toBe(0);
  });

  it('strażnicy niższego przechodzą do wyższego, jeśli ma podstawki; wyższy zachowuje swoich (FAQ)', () => {
    const s = three();
    const own = addGuardian(s, 1, 'satet', null);
    s.players[1].bases.small = 1;
    const g1 = addGuardian(s, 2, 'mummy', R1.fertile[0]);
    mergeGods(s);
    expect(s.figures[own].owner).toBe(1);
    expect(s.figures[g1]).toMatchObject({ owner: 1, pos: R1.fertile[0] }); // zostaje tam, gdzie stał
    expect(s.players[1].bases.small).toBe(0);
  });

  it('za mało podstawek: wyższy wybiera, których strażników zatrzymać; reszta opuszcza grę', () => {
    let s = three();
    s.players[1].bases.small = 1;
    const a = addGuardian(s, 2, 'mummy', null);
    const b = addGuardian(s, 2, 'satet', null);
    mergeGods(s);
    expect(s.pending).toEqual({ kind: 'mergeGuardians', player: 1, candidates: [a, b] });
    s = applyMove(s, { type: 'mergeGuardian', player: 1, figure: b });
    expect(s.figures[b].owner).toBe(1);
    expect(s.figures[a]).toBeUndefined();
  });

  it('2 graczy: łączenia nie ma', () => {
    const s = newGame();
    s.eventIndex = 10; // następne: 3. konflikt (łączenie)
    s.actionTracks.followers = s.rules.actionTracks.followers.length - 2;
    const after = play(s, act(0, 'followers'));
    expect(after.players.some((p) => p.mergedInto !== undefined)).toBe(false);
  });

  it('po 3. konflikcie z toru wydarzeń następuje łączenie', () => {
    let s = clearBoard(three());
    s.eventIndex = 10;
    s.conflictsResolved = 2;
    s.actionTracks.followers = s.rules.actionTracks.followers.length - 2;
    s = play(s, act(0, 'followers'));
    expect(s.conflictsResolved).toBe(3);
    expect(s.players[2].mergedInto).toBe(1);
  });

  it('połączeni: każde miejsce ma 1 akcję w turze i steruje wspólnymi figurkami', () => {
    let s = three();
    mergeGods(s);
    s.turn = { player: 2, actions: [], triggered: null };
    s.pending = { kind: 'chooseAction', player: 2 };
    s = play(s, act(2, 'summon'));
    expect(s.pending).toMatchObject({ kind: 'summon', player: 1 }); // decyzja należy do boga połączonego
    s = applyMove(s, legalMoves(s)[0]);
    expect(s.turn.player).toBe(0); // tylko 1 akcja — tura przechodzi dalej
    s = play(s, act(0, 'followers'), act(0, 'unlock'), { type: 'unlockPower', player: 0, power: 'revered' });
    expect(s.turn.player).toBe(1);
    s = play(s, act(1, 'followers'));
    expect(s.turn.player).toBe(2);
  });

  it('w bitwie połączony bóg gra kartami wyższego boga', () => {
    let s = clearBoard(three());
    mergeGods(s);
    place(s, 'p0-god', R1.fertile[0]);
    place(s, 'p1-god', R1.fertile[1]);
    s = conflictNow(s);
    expect(s.pending).toEqual({ kind: 'selectCards', waiting: [0, 1] });
    s = play(s, card(0, 'maat'), card(1, 'chariots'));
    expect(s.players[1].used).toEqual(['chariots']);
  });

  it('wygrywają razem: szczyt toru = wygrana obu miejsc', () => {
    const s = three();
    mergeGods(s);
    changeDevotion(s, 1, 100, 'test');
    expect(s.result?.winners).toEqual([1, 2]);
  });

  it('klątwa kociej mumii: połączony bóg traci 1 oddania tylko raz (FAQ)', () => {
    let s = clearBoard(three());
    mergeGods(s);
    s.players[1].devotion = 4;
    const cat = addGuardian(s, 0, 'catMummy', R1.fertile[2]);
    place(s, 'p0-god', R1.fertile[0]);
    place(s, 'p1-god', R1.fertile[1]);
    s.players[0].followers = 0;
    s.players[1].followers = 1;
    s = play(conflictNow(s), card(0, 'maat'), card(1, 'plague'), { type: 'plagueBid', player: 1, amount: 1 });
    expect(s.figures[cat].pos).toBeNull();
    // 4 − 1 (klątwa, raz) + 1 (wygrana: bóg + Plaga = 2 vs bóg Amuna = 1)
    expect(s.players[1].devotion).toBe(4);
    expect(s.log.filter((e) => /klątwa kociej mumii/.test(e.text) && e.player === 1)).toHaveLength(1);
  });

  it('Anubis wchłonięty: uwięzieni wojownicy wyższego wracają do jego puli, inni zostają w pułapce', () => {
    const s = three(['amun', 'ra', 'anubis']);
    s.figures['p1-w1'].trappedBy = 2;
    s.figures['p0-w1'].trappedBy = 2;
    mergeGods(s);
    expect(s.figures['p1-w1'].trappedBy).toBeUndefined();
    expect(s.figures['p0-w1'].trappedBy).toBe(1);
  });
});

describe('zapomniani bogowie (po 4. konflikcie)', () => {
  it('bogowie w czerwonej strefie odpadają: figurki z gry, monumenty do zapasu, wyznawcy przepadają', () => {
    const s = three();
    s.players[0].devotion = 25;
    s.players[1].devotion = 22;
    const m = addMonument(s, 'temple', R2.desert[0], 2);
    forgetGods(s);
    expect(s.players[2].eliminated).toBe(true);
    expect(Object.values(s.figures).some((f) => f.owner === 2)).toBe(false);
    expect(s.monuments[m]).toBeUndefined();
    expect(s.result).toBeNull(); // zostało dwóch
  });

  it('zapomniani nie mają tur', () => {
    let s = three();
    s.players[0].devotion = 25;
    s.players[1].devotion = 22;
    forgetGods(s);
    s = play(s, act(0, 'followers'), act(0, 'unlock'), { type: 'unlockPower', player: 0, power: 'revered' });
    s = play(s, act(1, 'followers'), act(1, 'unlock'), { type: 'unlockPower', player: 1, power: 'revered' });
    expect(s.turn.player).toBe(0); // gracz 2 pominięty
  });

  it('został jeden bóg — wygrywa; połączony w czerwieni — odpadają oba miejsca', () => {
    const s = three();
    mergeGods(s); // byt 1 (z 2) ma oddanie 1 — w czerwieni
    s.players[0].devotion = 25;
    forgetGods(s);
    expect(s.players[1].eliminated && s.players[2].eliminated).toBe(true);
    expect(s.result?.winners).toEqual([0]);
  });

  it('wszyscy zapomniani — przegrywają wszyscy', () => {
    const s = three();
    forgetGods(s);
    expect(s.result).toEqual({ winners: [], reason: expect.stringMatching(/Przegrywają wszyscy/) });
  });

  it('Ozyrys zapomniany: wrota znikają; Anubis zapomniany: uwięzieni wracają do pul', () => {
    const s = three(['ra', 'osiris', 'anubis']);
    s.players[0].devotion = 25;
    s.abilities.underworld = [k(0, 0)];
    s.figures['p0-w1'].trappedBy = 2;
    forgetGods(s);
    expect(s.abilities.underworld).toEqual([]);
    expect(s.figures['p0-w1'].trappedBy).toBeUndefined();
    expect(s.result?.winners).toEqual([0]);
  });
});
