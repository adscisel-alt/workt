import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import type { GameState } from './engine/types';
import { App } from './ui/App';
import './ui/styles.css';

const root = createRoot(document.getElementById('root')!);
let loads = 0;
// każde wczytanie stanu to nowa partia (świeży klucz — stan z innej gry nie może trafić do starej)
const render = (initial?: GameState) =>
  root.render(
    <StrictMode>
      <App key={initial ? `load-${++loads}` : 'new'} initial={initial} />
    </StrictMode>,
  );
render();

// Tylko w trybie deweloperskim: wczytanie dowolnego stanu (testy dymne w przeglądarce).
if (import.meta.env.DEV) (window as unknown as { __panteonLoad: typeof render }).__panteonLoad = render;
