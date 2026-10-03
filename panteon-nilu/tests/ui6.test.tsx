// @vitest-environment jsdom
import { act, cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react';
import { App, BOT_DELAY } from '../src/ui/App';
import { clearBoard, conflictNow, newGame, place, R1 } from './helpers';

const q = (sel: string) => document.querySelector(sel) as Element;

beforeEach(() => {
  vi.useFakeTimers();
  localStorage.clear();
});
afterEach(() => {
  cleanup();
  vi.useRealTimers();
});

const tick = (n = 1) => act(() => { for (let i = 0; i < n; i++) vi.advanceTimersByTime(BOT_DELAY + 1); });

describe('UI etapu 6: boty', () => {
  it('bot rusza się sam, gdy przychodzi jego decyzja; potem tura wraca do człowieka', () => {
    render(<App initial={newGame()} controllers={['human', 'heuristic']} />);
    fireEvent.click(q('[data-action="followers"]'));
    fireEvent.click(q('[data-action="unlock"]'));
    fireEvent.click(q('[data-power]'));
    expect(q('[data-bot-thinking]')).toBeTruthy();
    expect(q('[data-action]')).toBeNull(); // panel decyzji człowieka ukryty
    for (let i = 0; i < 100 && q('[data-bot-thinking]'); i++) tick();
    expect(q('[data-bot-thinking]')).toBeNull();
    expect(screen.getByText(/Amun: wybierz akcję/)).toBeTruthy();
    expect(document.body.textContent).toMatch(/— Tura 3 —/);
  });

  it('jeden człowiek przy stole: tajny wybór karty bez ekranu przekazania; bot wybiera sam', () => {
    const s = clearBoard(newGame());
    place(s, 'p0-god', R1.fertile[0]);
    place(s, 'p1-god', R1.fertile[1]);
    render(<App initial={conflictNow(s)} controllers={['human', 'random']} />);
    tick(); // bot wybiera pierwszy
    expect(q('[data-reveal]')).toBeNull();
    fireEvent.click(q('[data-card="chariots"]'));
    expect(document.body.textContent).toMatch(/Amun odkrywa: Rydwany/);
  });
});

describe('UI etapu 6: zapis i wczytanie', () => {
  it('zapis w przeglądarce pojawia się na liście i wczytuje się z ustawieniami graczy', () => {
    render(<App initial={newGame()} controllers={['human', 'heuristic']} />);
    fireEvent.click(q('[data-action="followers"]'));
    fireEvent.click(q('[data-save]'));
    expect(screen.getByText('Zapisano w przeglądarce.')).toBeTruthy();
    fireEvent.click(screen.getByText('Nowa gra'));
    const entry = q('[data-load-save]');
    expect(entry.textContent).toMatch(/Partia — tura 1/);
    fireEvent.click(entry);
    expect(screen.getByText(/druga akcja/)).toBeTruthy(); // stan sprzed zapisu: po pierwszej akcji
    expect(document.body.textContent).toMatch(/Bot heurystyczny/);
  });

  it('błędny plik: czytelny komunikat', async () => {
    vi.useRealTimers();
    render(<App />);
    const file = new File(['{"format":"cos"}'], 'zly.json', { type: 'application/json' });
    fireEvent.change(q('[data-load-file]'), { target: { files: [file] } });
    await waitFor(() => expect(screen.getByRole('alert').textContent).toMatch(/nie jest zapis Panteonu/));
  });
});
