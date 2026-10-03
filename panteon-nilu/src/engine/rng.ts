import type { GameState } from './types';

/** mulberry32 — jeden krok; zwraca [liczba z [0,1), nowy stan]. */
export function rngStep(seed: number): [number, number] {
  const next = (seed + 0x6d2b79f5) >>> 0;
  let t = next;
  t = Math.imul(t ^ (t >>> 15), t | 1);
  t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
  const value = ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  return [value, next];
}

/** Losuje liczbę całkowitą z [0, n) i zapisuje nowy stan RNG w stanie gry. */
export function randomInt(state: GameState, n: number): number {
  const [v, next] = rngStep(state.rng);
  state.rng = next;
  return Math.floor(v * n);
}

export function seedFrom(input: number | string): number {
  if (typeof input === 'number') return input >>> 0;
  let h = 2166136261;
  for (let i = 0; i < input.length; i++) {
    h ^= input.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return h >>> 0;
}
