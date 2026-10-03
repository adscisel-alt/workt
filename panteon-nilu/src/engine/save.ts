// Zapis i wczytanie gry. Stan jest zwykłym JSON-em, więc zapis to stan + metadane;
// wczytanie sprawdza format, wersję i spójność (silnik musi umieć kontynuować partię).
import { legalMoves } from './legal';
import type { GameState } from './types';

export const SAVE_FORMAT = 'panteon-nilu-save';
export const SAVE_VERSION = 1;

export interface SaveMeta {
  name: string;
  /** Data zapisu (ISO) — podaje wywołujący, by silnik pozostał deterministyczny. */
  savedAt: string;
  /** Kto steruje każdym miejscem: 'human' | 'random' | 'heuristic'. */
  controllers?: string[];
}

export interface SaveFile extends SaveMeta {
  format: typeof SAVE_FORMAT;
  version: number;
  state: GameState;
}

export class SaveError extends Error {}

export function serializeGame(state: GameState, meta: SaveMeta): string {
  const file: SaveFile = { format: SAVE_FORMAT, version: SAVE_VERSION, ...meta, state };
  return JSON.stringify(file);
}

export function deserializeGame(json: string): SaveFile {
  let data: unknown;
  try {
    data = JSON.parse(json);
  } catch {
    throw new SaveError('To nie jest poprawny plik JSON.');
  }
  const file = data as Partial<SaveFile>;
  if (!file || typeof file !== 'object' || file.format !== SAVE_FORMAT) throw new SaveError('To nie jest zapis Panteonu Nilu.');
  if (file.version !== SAVE_VERSION) throw new SaveError(`Nieobsługiwana wersja zapisu: ${String(file.version)}.`);
  const s = file.state as GameState | undefined;
  if (
    !s || s.version !== 1 || !Array.isArray(s.players) || s.players.length < 2 || s.players.length > 5 ||
    typeof s.rng !== 'number' || !s.map?.terrain || !s.figures || !s.monuments || !Array.isArray(s.queue) || !s.rules
  ) {
    throw new SaveError('Zapis jest uszkodzony (brak wymaganych pól stanu).');
  }
  if (s.players.length !== s.playerCount) throw new SaveError('Zapis jest uszkodzony (liczba graczy).');
  if (!s.result && legalMoves(s).length === 0) throw new SaveError('Zapis jest uszkodzony (brak możliwych ruchów).');
  if (file.controllers && file.controllers.length !== s.players.length) {
    throw new SaveError('Zapis jest uszkodzony (ustawienia graczy).');
  }
  return file as SaveFile;
}
