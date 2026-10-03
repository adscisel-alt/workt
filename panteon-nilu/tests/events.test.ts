import { applyMove, legalMoves } from '../src/engine';
import type { GameState } from '../src/engine/types';
import { act, clearBoard, newGame, play } from './helpers';

/** Wyzwala kolejne wydarzenie akcją Wyznawcy aktywnego gracza i rozstrzyga ewentualne decyzje. */
function triggerNext(s: GameState): GameState {
  s = structuredClone(s);
  // przed 4. konfliktem wyprowadzamy bogów z czerwonej strefy, żeby nikt nie został zapomniany
  if (s.rules.eventTrack[s.eventIndex + 1]?.after === 'eliminateRed') {
    for (const p of s.players) p.devotion = Math.max(p.devotion, s.rules.devotion.redMax + 1);
  }
  s.actionTracks.followers = s.rules.actionTracks.followers.length - 2;
  s = play(s, act(s.turn.player, 'followers'));
  while (s.pending && s.pending.kind !== 'chooseAction') s = applyMove(s, legalMoves(s)[0]);
  return s;
}

describe('tor wydarzeń', () => {
  it('wydarzenia idą po kolei wg konfiguracji; 5 konfliktów; po ostatnim — koniec gry', () => {
    let s = newGame();
    const seen: string[] = [];
    while (!s.result) {
      const before = s.eventIndex;
      s = triggerNext(s);
      expect(s.eventIndex).toBe(before + 1);
      seen.push(s.rules.eventTrack[s.eventIndex].type);
    }
    expect(seen).toEqual(s.rules.eventTrack.map((e) => e.type));
    expect(s.conflictsResolved).toBe(5);
    expect(s.eventIndex).toBe(17);
  });

  it('zwycięzca po ostatnim wydarzeniu: najwięcej oddania', () => {
    let s = newGame();
    while (s.eventIndex < s.rules.eventTrack.length - 2) s = triggerNext(s);
    s = clearBoard(structuredClone(s));
    s.players[1].devotion = 25;
    s = triggerNext(s);
    expect(s.result?.winners).toEqual([1]);
    expect(legalMoves(s)).toEqual([]);
  });

  it('remis pola rozstrzyga stos: wygrywa żeton na szczycie', () => {
    let s = newGame();
    while (s.eventIndex < s.rules.eventTrack.length - 2) s = triggerNext(s);
    s = clearBoard(structuredClone(s)); // ostatni konflikt bez figurek — nie zmienia oddania
    s.players[0].devotion = 4;
    s.players[1].devotion = 4;
    s.players[0].devotionSeq = 10;
    s.players[1].devotionSeq = 11;
    s = triggerNext(s);
    expect(s.result?.winners).toEqual([1]);
  });
});
