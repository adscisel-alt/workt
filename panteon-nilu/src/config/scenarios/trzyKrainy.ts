import type { ScenarioDef } from './types';

// Własny scenariusz (nie odwzorowuje planszy wydawcy): Delta na północy (1),
// Zachód (2) i Wschód (3) rozdzielone Nilem. Rozstawienia dla 2–5 graczy.
export const TRZY_KRAINY: ScenarioDef = {
  id: 'trzy-krainy',
  name: 'Trzy Krainy',
  playerCounts: [2, 3, 4, 5],
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
    3: [
      { god: [2, 5], warriors: [[1, 6]], monuments: [{ type: 'temple', at: [2, 3] }] },
      { god: [6, 5], warriors: [[7, 5]], monuments: [{ type: 'pyramid', at: [6, 7] }] },
      { god: [6, 1], warriors: [[6, 0]], monuments: [{ type: 'temple', at: [1, 1] }] },
    ],
    4: [
      { god: [2, 7], warriors: [[3, 8]], monuments: [{ type: 'temple', at: [2, 6] }] },
      { god: [6, 6], warriors: [[7, 7]], monuments: [{ type: 'pyramid', at: [6, 8] }] },
      { god: [6, 1], warriors: [[6, 0]], monuments: [{ type: 'temple', at: [7, 1] }] },
      { god: [1, 2], warriors: [[0, 2]], monuments: [{ type: 'obelisk', at: [2, 1] }] },
    ],
    5: [
      { god: [2, 7], warriors: [[3, 8]], monuments: [{ type: 'temple', at: [2, 6] }] },
      { god: [6, 6], warriors: [[7, 7]], monuments: [{ type: 'pyramid', at: [6, 8] }] },
      { god: [6, 1], warriors: [[6, 0]], monuments: [{ type: 'temple', at: [7, 1] }] },
      { god: [1, 2], warriors: [[0, 2]], monuments: [{ type: 'obelisk', at: [2, 1] }] },
      { god: [1, 3], warriors: [[2, 4]], monuments: [{ type: 'pyramid', at: [0, 4] }] },
    ],
  },
};
