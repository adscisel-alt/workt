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

/** Dostępne modele: nazwa logiczna (np. `god.glb`) → plik w katalogu modeli. */
export type ModelFiles = Map<string, string>;

let manifest: Promise<ModelFiles> | null = null;

/** Bezpieczna nazwa pliku w katalogu modeli: bez schematu (http:, data:), ścieżki bezwzględnej i `..`. */
const isLocalFile = (f: unknown): f is string => typeof f === 'string' && f.length > 0 && !/[:\\]|^\/|\.\./.test(f);

/**
 * Treść manifestu → dostępne modele. `models` to nazwy logiczne `*.glb`; opcjonalne `files` podaje inny plik
 * dla nazwy (np. glTF w JSON dla hostów, które nie serwują `.glb`). Wszystko inne jest pomijane.
 */
export function parseManifest(json: unknown): ModelFiles {
  const j = json as { models?: unknown; files?: unknown } | null;
  const files = j?.files && typeof j.files === 'object' ? (j.files as Record<string, unknown>) : {};
  const out: ModelFiles = new Map();
  if (!Array.isArray(j?.models)) return out;
  for (const m of j.models) {
    if (typeof m !== 'string' || !m.endsWith('.glb') || !isLocalFile(m)) continue;
    const f = files[m];
    out.set(m, isLocalFile(f) ? f : m);
  }
  return out;
}

/** Tylko dla testów: zapomnij wczytany manifest. */
export function resetManifestCache() {
  manifest = null;
}

/**
 * Lista dostępnych modeli z `models/manifest.json` (generuje ją `npm run models` z plików *.glb).
 * Brak manifestu albo błąd → pusta lista, czyli same pionki-zastępniki. Bez sondowania plików (zero 404).
 */
export function loadManifest(fetchImpl: typeof fetch = fetch): Promise<ModelFiles> {
  manifest ??= fetchImpl(`${MODELS_URL}manifest.json`)
    .then((r) => (r.ok ? r.json() : null))
    .then(parseManifest)
    .catch(() => new Map());
  return manifest;
}

/** Adres pierwszego dostępnego modelu z listy kandydatów (null — użyj zastępnika). */
export function pickModel(candidates: string[], available: ModelFiles): string | null {
  const hit = candidates.find((c) => available.has(c));
  return hit ? MODELS_URL + available.get(hit) : null;
}

export async function resolveModel(candidates: string[], fetchImpl?: typeof fetch): Promise<string | null> {
  return pickModel(candidates, await loadManifest(fetchImpl));
}
