// @vitest-environment jsdom
import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import { mergeGods, forgetGods } from '../src/engine/merge';
import { App } from '../src/ui/App';
import { addGuardian, newGame } from './helpers';

afterEach(cleanup);
const q = (sel: string) => document.querySelector(sel) as Element;

function three() {
  const s = newGame({ gods: ['amun', 'ra', 'isis'] });
  s.players[0].devotion = 5;
  s.players[1].devotion = 3;
  s.players[2].devotion = 1;
  return s;
}

describe('UI etapu 5', () => {
  it('nowa gra dla 4 graczy na Trzech Krainach', () => {
    render(<App />);
    fireEvent.change(q('[data-player-count]'), { target: { value: '4' } });
    expect(document.querySelectorAll('[data-god-select]')).toHaveLength(4);
    fireEvent.click(q('[data-start]'));
    expect(document.querySelectorAll('[data-player]')).toHaveLength(4);
    expect(document.querySelectorAll('[data-figure]')).toHaveLength(8); // bóg + wojownik × 4
  });

  it('po połączeniu: nazwa „Ra-Izyda”, panel wchłoniętego miejsca, 1 akcja na turę', () => {
    const s = three();
    mergeGods(s);
    s.turn = { player: 2, actions: [], triggered: null };
    s.pending = { kind: 'chooseAction', player: 2 };
    render(<App initial={s} />);
    expect(screen.getByText(/Izyda \(gra jako Ra-Izyda\): wybierz akcję/)).toBeTruthy();
    expect(screen.getByText(/Połączony: gra jako Ra-Izyda/)).toBeTruthy();
    fireEvent.click(q('[data-action="followers"]'));
    expect(screen.getByText(/Amun: wybierz akcję/)).toBeTruthy();
  });

  it('za mało podstawek przy łączeniu: wybór strażników', () => {
    const s = three();
    s.players[1].bases.small = 1;
    addGuardian(s, 2, 'mummy', null);
    addGuardian(s, 2, 'satet', null);
    mergeGods(s);
    render(<App initial={s} />);
    fireEvent.click(screen.getByText('Zatrzymaj: Satet'));
    expect(screen.queryByText(/strażnicy wchłoniętego boga/)).toBeNull(); // brak podstawek na Mumię — odchodzi
  });

  it('wszyscy zapomniani: ekran końca bez zwycięzcy', () => {
    const s = three();
    forgetGods(s);
    render(<App initial={s} />);
    expect(screen.getByText(/Zwycięzca: nikt — przegrywają wszyscy/)).toBeTruthy();
  });
});
