// @vitest-environment jsdom
import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import { legalMoves } from '../src/engine';
import { App } from '../src/ui/App';
import { interactionFor } from '../src/ui/interaction';
import { hexCenter } from '../src/ui/layout';
import { act as action, clearBoard, conflictNow, newGame, place, play, R1 } from './helpers';

afterEach(cleanup);

const q = (sel: string) => document.querySelector(sel) as Element;
const qa = (sel: string) => document.querySelectorAll(sel);

describe('UI: mapowanie legalnych ruchów na planszę', () => {
  it('pola docelowe = dokładnie ruchy zaznaczonej figurki z silnika', () => {
    const s = play(newGame(), action(0, 'move'));
    const legal = legalMoves(s);
    const i = interactionFor(legal, { figure: 'p0-god' });
    const expected = legal.filter((m) => m.type === 'moveFigure' && m.figure === 'p0-god').map((m) => (m as { to: string }).to);
    expect([...i.hexActions.keys()].sort()).toEqual(expected.sort());
    expect(i.selectableFigures).toEqual(new Set(['p0-god']));
  });
});

describe('UI: hot-seat', () => {
  it('nowa gra: plansza i przyciski akcji zgodne z legalnymi ruchami', () => {
    render(<App />);
    fireEvent.click(q('[data-start]'));
    expect(qa('[data-hex]').length).toBe(81);
    for (const a of ['move', 'summon', 'followers', 'unlock']) expect((q(`[data-action="${a}"]`) as HTMLButtonElement).disabled).toBe(false);
  });

  it('ruch: klik figurki podświetla jej pola, klik pola wykonuje ruch', () => {
    render(<App initial={newGame()} />);
    fireEvent.click(q('[data-action="move"]'));
    fireEvent.click(q('[data-figure="p0-god"]'));
    const dots = qa('[data-target-dot]');
    expect(dots.length).toBeGreaterThan(0);
    const to = dots[0].getAttribute('data-target-dot')!;
    fireEvent.click(dots[0]);
    const c = hexCenter(to);
    expect(q('[data-figure="p0-god"]').getAttribute('transform')).toBe(`translate(${c.x},${c.y})`);
    // druga akcja: Ruch już niedostępny (wyższy wiersz)
    expect((q('[data-action="move"]') as HTMLButtonElement).disabled).toBe(true);
  });

  it('tajny wybór kart: ekran przekazania, karty niewidoczne dla drugiego gracza', () => {
    const s = clearBoard(newGame());
    place(s, 'p0-god', R1.fertile[0]);
    place(s, 'p1-god', R1.fertile[1]);
    render(<App initial={conflictNow(s)} />);
    expect(screen.getByText(/Przekaż urządzenie: Amun/)).toBeTruthy();
    expect(qa('[data-card]').length).toBe(0);
    fireEvent.click(q('[data-reveal]'));
    expect(qa('[data-card]').length).toBe(7);
    fireEvent.click(q('[data-card="chariots"]'));
    // teraz Ra — przed odsłonięciem nic nie zdradza wyboru Amuna
    expect(screen.getByText(/Przekaż urządzenie: Ra/)).toBeTruthy();
    expect(document.body.textContent).not.toMatch(/Rydwany/);
    expect(document.body.textContent).toMatch(/karta zakryta/);
    fireEvent.click(q('[data-reveal]'));
    fireEvent.click(q('[data-card="maat"]'));
    // po odkryciu: wynik w dzienniku, karty jawne
    expect(document.body.textContent).toMatch(/Amun odkrywa: Rydwany/);
    expect(document.body.textContent).toMatch(/Amun wygrywa bitwę/);
  });

  it('licytacja plagi: tajna oferta z ograniczeniem do posiadanych wyznawców', () => {
    const s = clearBoard(newGame());
    place(s, 'p0-god', R1.fertile[0]);
    place(s, 'p0-w1', R1.fertile[2]);
    place(s, 'p1-god', R1.fertile[1]);
    place(s, 'p1-w1', R1.fertile[3]);
    s.players[0].followers = 2;
    s.players[1].followers = 1;
    const st = play(conflictNow(s), { type: 'selectCard', player: 0, card: 'plague' }, { type: 'selectCard', player: 1, card: 'maat' });
    render(<App initial={st} />);
    fireEvent.click(q('[data-reveal]'));
    fireEvent.click(screen.getByLabelText('więcej'));
    fireEvent.click(screen.getByLabelText('więcej'));
    fireEvent.click(screen.getByLabelText('więcej')); // ponad limit — bez efektu
    expect(q('[data-bid-amount]').textContent).toBe('2');
    fireEvent.click(q('[data-confirm-bid]'));
    expect(screen.getByText(/Przekaż urządzenie: Ra/)).toBeTruthy();
    expect(document.body.textContent).not.toMatch(/Amun 2/);
    fireEvent.click(q('[data-reveal]'));
    fireEvent.click(q('[data-confirm-bid]'));
    expect(document.body.textContent).toMatch(/Plaga — oferty: Amun 2, Ra 0/);
  });

  it('żeton remisu: posiadacz decyduje przyciskiem', () => {
    const s = clearBoard(newGame());
    place(s, 'p0-god', R1.fertile[0]);
    place(s, 'p1-god', R1.fertile[1]);
    const st = play(conflictNow(s, 1), { type: 'selectCard', player: 0, card: 'maat' }, { type: 'selectCard', player: 1, card: 'maat' });
    render(<App initial={st} />);
    fireEvent.click(screen.getByText('Użyj żetonu'));
    expect(document.body.textContent).toMatch(/Ra wygrywa bitwę/);
  });

  it('koniec gry: ekran z wynikiem', () => {
    const s = newGame();
    s.result = { winners: [1], reason: 'Test zakończenia.' };
    s.pending = null;
    render(<App initial={s} />);
    expect(screen.getByText('Koniec gry')).toBeTruthy();
    expect(screen.getByText(/Zwycięzca: Ra/)).toBeTruthy();
  });
});
