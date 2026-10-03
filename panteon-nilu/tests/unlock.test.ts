import { applyMove, legalMoves, nextUnlock } from '../src/engine';
import type { AnkhPowerId } from '../src/engine/types';
import { act, newGame, play } from './helpers';

const unlock = (power: AnkhPowerId) => ({ type: 'unlockPower', player: 0, power }) as const;

/** Odblokowuje moc w pierwszej akcji tury gracza 0 i przekazuje turę z powrotem do gracza 0. */
function unlockAsP0(s: ReturnType<typeof newGame>, power: AnkhPowerId) {
  s = play(s, act(0, 'unlock'), unlock(power));
  s = structuredClone(s);
  s.turn = { player: 0, actions: [], triggered: null };
  s.pending = { kind: 'chooseAction', player: 0 };
  s.actionTracks.unlock = s.rules.actionTracks.unlock.start[2];
  return s;
}

describe('akcja Odblokowanie mocy ankh', () => {
  it('poziomy po kolei: 2× poziom 1 (koszt 1), 2× poziom 2 (koszt 2), 2× poziom 3 (koszt 3)', () => {
    let s = newGame();
    s.players[0].followers = 12;
    const plan: [AnkhPowerId, number, number][] = [
      ['revered', 1, 1],
      ['omnipresent', 1, 1],
      ['templeAttuned', 2, 2],
      ['resplendent', 2, 2],
      ['glorious', 3, 3],
      ['bountiful', 3, 3],
    ];
    for (const [power, level, cost] of plan) {
      expect(nextUnlock(s, 0)).toMatchObject({ level, cost });
      const before = s.players[0].followers;
      s = unlockAsP0(s, power);
      expect(s.players[0].followers).toBe(before - cost);
    }
    expect(s.players[0].unlocked).toEqual(plan.map((p) => p[0]));
    expect(nextUnlock(s, 0)).toBeNull();
  });

  it('wybór tylko spośród mocy bieżącego poziomu, bez już odblokowanych', () => {
    let s = newGame();
    s.players[0].followers = 5;
    s = unlockAsP0(s, 'revered');
    s = play(s, act(0, 'unlock'));
    const options = legalMoves(s).map((m) => (m as { power: string }).power).sort();
    expect(options).toEqual(['commanding', 'inspiring', 'omnipresent']);
    expect(() => applyMove(s, unlock('resplendent'))).toThrow();
  });

  it('za mało wyznawców — akcja bez efektu, nic nie jest poświęcane', () => {
    let s = newGame();
    s.players[0].followers = 4;
    s = unlockAsP0(s, 'revered');
    s = unlockAsP0(s, 'inspiring');
    expect(s.players[0].followers).toBe(2);
    s.players[0].followers = 1; // poziom 2 kosztuje 2
    const s2 = play(s, act(0, 'unlock'));
    expect(s2.players[0].followers).toBe(1);
    expect(s2.players[0].unlocked).toHaveLength(2);
    expect(s2.actionTracks.unlock).toBe(s.actionTracks.unlock + 1);
    expect(s2.turn.player).toBe(1);
  });

  it('drugi żeton kolumny odsłania symbol strażnika danego poziomu', () => {
    let s = newGame();
    s.players[0].followers = 10;
    s = unlockAsP0(s, 'revered');
    expect(Object.values(s.figures).filter((f) => f.kind === 'guardian')).toHaveLength(0);
    s = unlockAsP0(s, 'inspiring');
    const g = Object.values(s.figures).filter((f) => f.kind === 'guardian');
    expect(g).toEqual([{ id: 'catMummy-1', owner: 0, kind: 'guardian', guardian: 'catMummy', pos: null }]);
    expect(s.players[0].bases.small).toBe(1);
    expect(s.guardianSupply.catMummy).toBe(0);
    s = unlockAsP0(s, 'resplendent');
    s = unlockAsP0(s, 'templeAttuned');
    expect(s.figures['mummy-1']?.owner).toBe(0);
  });

  it('brak figurek na karcie strażnika — nic nie zyskujesz', () => {
    let s = newGame();
    s.players[0].followers = 2;
    s.guardianSupply.catMummy = 0;
    s = unlockAsP0(s, 'revered');
    s = unlockAsP0(s, 'inspiring');
    expect(Object.values(s.figures).some((f) => f.kind === 'guardian')).toBe(false);
  });

  it('brak wolnej podstawki odpowiedniego rozmiaru — strażnik nie dołącza', () => {
    let s = newGame();
    s.players[0].followers = 2;
    s.players[0].bases.small = 0;
    s = unlockAsP0(s, 'revered');
    s = unlockAsP0(s, 'inspiring');
    expect(Object.values(s.figures).some((f) => f.kind === 'guardian')).toBe(false);
    expect(s.guardianSupply.catMummy).toBe(1);
  });
});
