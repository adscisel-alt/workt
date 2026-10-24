// Ustawienia grafiki 3D: preset jakości + przełączniki efektów. Zapamiętywane w przeglądarce (try/catch).

export interface Settings3D {
  quality: 'high' | 'low';
  shadows: boolean;
  ao: boolean;
  bloom: boolean;
  tiltShift: boolean;
  vignette: boolean;
  particles: boolean;
  /** Głębia ostrości ustawiana na ruszaną figurkę (postprocessing). */
  dof: boolean;
  /** Kamera filmowa: podążanie za ruszaną figurką i delikatne kołysanie. */
  cinematicCamera: boolean;
  /** Przywołanie: kolumna światła i złote iskry. */
  summonFx: boolean;
  /** Bitwa: przyciemnienie planszy poza regionem (tanie — działa też w niskiej jakości). */
  battleDim: boolean;
  adaptiveDpr: boolean;
  showFps: boolean;
}

export const DEFAULT_SETTINGS: Settings3D = {
  quality: 'high',
  shadows: true,
  ao: true,
  bloom: true,
  tiltShift: false,
  vignette: true,
  particles: true,
  dof: true,
  cinematicCamera: true,
  summonFx: true,
  battleDim: true,
  adaptiveDpr: true,
  showFps: false,
};

/** Ustawienia faktycznie użyte: „niska jakość” wyłącza postprocessing, cienie, cząsteczki i efekty filmowe. */
export function effectiveSettings(
  s: Settings3D,
  env: { reducedMotion?: boolean } = {},
): Settings3D & { postprocessing: boolean; maxDpr: number } {
  // „Ogranicz ruch” w systemie: bez podążania i kołysania kamery (animacje figurek zostają — niosą informację).
  const camera = s.cinematicCamera && !env.reducedMotion;
  if (s.quality === 'low') {
    return {
      ...s, shadows: false, ao: false, bloom: false, tiltShift: false, vignette: false, particles: false, dof: false,
      cinematicCamera: false, summonFx: false, postprocessing: false, maxDpr: 1,
    };
  }
  return { ...s, cinematicCamera: camera, postprocessing: s.ao || s.bloom || s.tiltShift || s.vignette || s.dof, maxDpr: 2 };
}

const KEY = 'panteon-nilu:grafika3d';

export function loadSettings(): Settings3D {
  try {
    const raw = localStorage.getItem(KEY);
    return raw ? migrate(JSON.parse(raw) as Partial<Settings3D>) : DEFAULT_SETTINGS;
  } catch {
    return DEFAULT_SETTINGS;
  }
}

/**
 * Zapis sprzed etapu „styl ruchu” (bez głębi ostrości): tilt-shift wraca do nowej wartości domyślnej,
 * bo głębia ostrości przejęła jego rolę.
 */
export function migrate(stored: Partial<Settings3D>): Settings3D {
  const s = { ...stored };
  if (!('dof' in s)) delete s.tiltShift;
  return { ...DEFAULT_SETTINGS, ...s };
}

export function saveSettings(s: Settings3D): void {
  try {
    localStorage.setItem(KEY, JSON.stringify(s));
  } catch {
    /* brak dostępu do pamięci — ustawienia działają do końca sesji */
  }
}
