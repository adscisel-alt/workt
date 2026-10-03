// @vitest-environment jsdom
import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import { App } from '../src/ui/App';
import type { ScenarioDef } from '../src/config/scenarios';
import { act as action, addGuardian, card, clearBoard, conflictNow, newGame, place, play, R1 } from './helpers';

afterEach(cleanup);
const q = (sel: string) => document.querySelector(sel) as Element;
const qa = (sel: string) => document.querySelectorAll(sel);

describe('UI etapu 4', () => {
  it('Satet: klik pola wroga, potem pola, na które go spycha', () => {
    const s = clearBoard(newGame());
    place(s, 'p0-god', R1.desert[3]);
    const satet = addGuardian(s, 0, 'satet', R1.fertile[0]);
    place(s, 'p1-w1', R1.fertile[2]);
    render(<App initial={play(s, action(0, 'move'))} />);
    fireEvent.click(q(`[data-figure="${satet}"]`));
    fireEvent.click(q(`[data-target-dot="${R1.fertile[2]}"]`));
    expect(screen.getByText(/zepchniesz wroga/)).toBeTruthy();
    const pushDot = qa('[data-target-dot]')[0];
    const pushTo = pushDot.getAttribute('data-target-dot');
    fireEvent.click(pushDot);
    expect(document.body.textContent).toMatch(new RegExp(`spycha p1-w1 na ${pushTo}`));
  });

  it('Karawana: klikanie krawędzi zawęża opcje; zatwierdzenie dzieli region', () => {
    const row12: ScenarioDef = {
      id: 'row12', name: 'Rząd', playerCounts: [2], grid: [Array(12).fill('F1').join(' ')],
      conflictTokens: { 1: [0, 0] }, monuments: [],
      starts: { 2: [{ god: [0, 0], warriors: [], monuments: [] }, { god: [11, 0], warriors: [], monuments: [] }] },
    };
    const s = newGame({ scenario: row12 });
    s.eventIndex = 3;
    s.actionTracks.followers = s.rules.actionTracks.followers.length - 2;
    render(<App initial={play(s, action(0, 'followers'))} />);
    expect((q('[data-caravan-confirm]') as HTMLButtonElement).disabled).toBe(true);
    expect(qa('[data-edge]').length).toBe(1);
    fireEvent.click(q('[data-edge]'));
    fireEvent.click(q('[data-caravan-confirm]'));
    expect(screen.getByText(/który region zachowa żeton 1/)).toBeTruthy();
    fireEvent.click(qa('[data-keep]')[0]);
    fireEvent.click(screen.getByText('Bez zamiany'));
    expect(document.body.textContent).toMatch(/prowadzi karawanę/);
  });

  it('Amun: zapowiedź i wybór dwóch kart w tajnym oknie', () => {
    const s = clearBoard(newGame({}, true));
    place(s, 'p0-god', R1.fertile[0]);
    place(s, 'p1-god', R1.fertile[1]);
    render(<App initial={conflictNow(s)} />);
    fireEvent.click(screen.getByText('Zagram dwie karty'));
    fireEvent.click(q('[data-reveal]'));
    expect((q('[data-confirm-cards]') as HTMLButtonElement).disabled).toBe(true);
    fireEvent.click(q('[data-card="chariots"]'));
    fireEvent.click(q('[data-card="drought"]'));
    fireEvent.click(q('[data-confirm-cards]'));
    fireEvent.click(q('[data-reveal]'));
    fireEvent.click(q('[data-card="maat"]'));
    expect(document.body.textContent).toMatch(/Amun odkrywa: Rydwany \+ Susza|Amun odkrywa: Susza \+ Rydwany/);
  });

  it('Ra: przełącznik słońca przy przywołaniu', () => {
    const s = clearBoard(newGame({ gods: ['ra', 'amun'] }));
    place(s, 'p0-god', R1.fertile[0]);
    render(<App initial={play(s, action(0, 'summon'))} />);
    fireEvent.click(q('[data-radiant]'));
    fireEvent.click(qa('[data-target-dot]')[0]);
    expect(document.body.textContent).toMatch(/staje się promienny/);
    expect(document.body.textContent).toMatch(/Wolne słońca: 2\/3/);
  });

  it('decyzje z listy: Uwielbienie po bitwie', () => {
    const s = clearBoard(newGame());
    place(s, 'p0-god', R1.fertile[0]);
    place(s, 'p1-god', R1.fertile[1]);
    s.players[0].unlocked = ['worshipful'];
    s.players[0].followers = 3;
    render(<App initial={play(conflictNow(s), card(0, 'maat'), card(1, 'chariots'))} />);
    fireEvent.click(screen.getByText('Poświęć 2 wyznawców za 1 oddania'));
    expect(document.body.textContent).toMatch(/Uwielbienie — poświęca 2 wyznawców/);
  });
});
