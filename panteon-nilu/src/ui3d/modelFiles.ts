// Pliki modeli figurek: kandydaci, manifest, wybór pliku. Bez Reacta i WebGL — testowalne w Node.
import type { Figure, GodId } from '../engine/types';

const BASE = import.meta.env.BASE_URL ?? './';
export const MODELS_URL = `${BASE}models/`;
export const DRACO_URL = `${BASE}draco/`;

/** Kandydaci na plik modelu, od najbardziej szczegółowego. */
export function modelCandidates(f: Pick<Figure, 'kind' | 'guardian'>, god: GodId): string[] {
  if (f.kind === 'guardian') return [`guardian-${f.guardian}.glb`, 'guardian.glb'];
  if (f.kind === 'god') return [`god-${god}.glb`, 'god.glb'];
  return [`warrior-${god}.glb`, 'warrior.glb'];
}

/** Wysokość figurki w świecie — model jest skalowany do niej. */
export const FIGURE_HEIGHT = { god: 1.25, guardian: 0.95, warrior: 0.7 } as const;

let manifest: Promise<Set<string>> | null = null;

/** Lista nazw plików z treści manifestu; wszystko inne niż tablica napisów jest pomijane. */
export function parseManifest(json: unknown): Set<string> {
  const models = (json as { models?: unknown } | null)?.models;
  return new Set(Array.isArray(models) ? models.filter((m): m is string => typeof m === 'string' && m.endsWith('.glb')) : []);
}

/** Tylko dla testów: zapomnij wczytany manifest. */
export function resetManifestCache() {
  manifest = null;
}

/**
 * Lista dostępnych modeli z `models/manifest.json` (generuje ją `npm run models` z plików *.glb).
 * Brak manifestu albo błąd → pusta lista, czyli same pionki-zastępniki. Bez sondowania plików (zero 404).
 */
export function loadManifest(fetchImpl: typeof fetch = fetch): Promise<Set<string>> {
  manifest ??= fetchImpl(`${MODELS_URL}manifest.json`)
    .then((r) => (r.ok ? r.json() : null))
    .then(parseManifest)
    .catch(() => new Set<string>());
  return manifest;
}

/** Pierwszy dostępny model z listy kandydatów (null — użyj zastępnika). */
export function pickModel(candidates: string[], available: Set<string>): string | null {
  const hit = candidates.find((c) => available.has(c));
  return hit ? MODELS_URL + hit : null;
}

export async function resolveModel(candidates: string[], fetchImpl?: typeof fetch): Promise<string | null> {
  return pickModel(candidates, await loadManifest(fetchImpl));
}
