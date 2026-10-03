import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { createGame, legalMoves } from './engine';

// Etap 1: tylko silnik. Plansza SVG i hot-seat — etap 3.
function App() {
  const state = createGame({ scenario: 'trzy-krainy', gods: ['amun', 'ra'], seed: Date.now() });
  return (
    <main style={{ fontFamily: 'system-ui', padding: 16 }}>
      <h1>Panteon Nilu</h1>
      <p>Silnik gotowy (etap 1). Legalne ruchy na starcie: {legalMoves(state).length}.</p>
    </main>
  );
}

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>,
);
