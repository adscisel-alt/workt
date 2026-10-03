import type { MonumentType } from '../../engine/types';

/** Współrzędne „odd-r”: [kolumna, wiersz]. */
export type Cell = [number, number];

export interface PlayerStartDef {
  god: Cell;
  warriors: Cell[];
  monuments: { type: MonumentType; at: Cell }[];
}

export interface ScenarioDef {
  id: string;
  name: string;
  playerCounts: number[];
  /**
   * Wiersze planszy, pola rozdzielone spacjami: `W` woda, `F<n>` pole żyzne, `D<n>` pustynia,
   * gdzie <n> to etykieta regionu startowego. Rzeki powstają automatycznie na każdej krawędzi
   * między polami lądowymi o różnych etykietach.
   */
  grid: string[];
  /** Żeton kolejności konfliktu -> pole-kotwica w jego regionie. */
  conflictTokens: Record<number, Cell>;
  /** Monumenty neutralne. */
  monuments: { type: MonumentType; at: Cell }[];
  /** Pozycje startowe wg liczby graczy; indeks = gracz #1, #2… w kolejności tury. */
  starts: Record<number, PlayerStartDef[]>;
}
