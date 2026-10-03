import type { ScenarioDef } from './types';

// Własny scenariusz (nie odwzorowuje planszy wydawcy): Delta na północy (1),
// Zachód (2) i Wschód (3) rozdzielone Nilem. TODO: rozstawienia dla 3–5 graczy (etap 5).
export const TRZY_KRAINY: ScenarioDef = {
  id: 'trzy-krainy',
  name: 'Trzy Krainy',
  playerCounts: [2],
  grid: [
    'W  W  W  F1 F1 D1 D1 W  W',
    'W  F1 F1 F1 W  F1 D1 D1 W',
    'F1 F1 D1 F1 F1 F1 F1 D1 D1',
    'D2 F2 F2 F2 W  F3 F3 F3 D3',
    'D2 D2 F2 F2 W  F3 F3 D3 D3',
    'D2 D2 D2 F2 F2 W  F3 D3 D3',
    'D2 D2 F2 F2 W  F3 F3 D3 D3',
    'W  D2 D2 F2 W  F3 D3 D3 W',
    'W  W  D2 F2 F2 W  F3 D3 W',
  ],
  conflictTokens: { 1: [4, 2], 2: [1, 5], 3: [7, 4] },
  monuments: [
    { type: 'obelisk', at: [3, 0] },
    { type: 'temple', at: [5, 1] },
    { type: 'pyramid', at: [2, 2] },
    { type: 'pyramid', at: [7, 2] },
    { type: 'obelisk', at: [1, 4] },
    { type: 'pyramid', at: [3, 6] },
    { type: 'temple', at: [6, 4] },
    { type: 'obelisk', at: [7, 6] },
  ],
  starts: {
    2: [
      { god: [2, 5], warriors: [[1, 6]], monuments: [{ type: 'temple', at: [2, 3] }] },
      { god: [6, 5], warriors: [[7, 5]], monuments: [{ type: 'pyramid', at: [6, 7] }] },
    ],
  },
};
