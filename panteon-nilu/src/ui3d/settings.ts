// Ustawienia grafiki 3D: preset jakości + przełączniki efektów. Zapamiętywane w przeglądarce (try/catch).

export interface Settings3D {
  quality: 'high' | 'low';
  shadows: boolean;
  ao: boolean;
  bloom: boolean;
  tiltShift: boolean;
  vignette: boolean;
  particles: boolean;
  adaptiveDpr: boolean;
  showFps: boolean;
}

export const DEFAULT_SETTINGS: Settings3D = {
  quality: 'high',
  shadows: true,
  ao: true,
  bloom: true,
  tiltShift: true,
  vignette: true,
  particles: true,
  adaptiveDpr: true,
  showFps: false,
};

/** Ustawienia faktycznie użyte: „niska jakość” wyłącza postprocessing, cienie i cząsteczki. */
export function effectiveSettings(s: Settings3D): Settings3D & { postprocessing: boolean; maxDpr: number } {
  if (s.quality === 'low') {
    return { ...s, shadows: false, ao: false, bloom: false, tiltShift: false, vignette: false, particles: false, postprocessing: false, maxDpr: 1 };
  }
  return { ...s, postprocessing: s.ao || s.bloom || s.tiltShift || s.vignette, maxDpr: 2 };
}

const KEY = 'panteon-nilu:grafika3d';

export function loadSettings(): Settings3D {
  try {
    const raw = localStorage.getItem(KEY);
    return raw ? { ...DEFAULT_SETTINGS, ...(JSON.parse(raw) as Partial<Settings3D>) } : DEFAULT_SETTINGS;
  } catch {
    return DEFAULT_SETTINGS;
  }
}

export function saveSettings(s: Settings3D): void {
  try {
    localStorage.setItem(KEY, JSON.stringify(s));
  } catch {
    /* brak dostępu do pamięci — ustawienia działają do końca sesji */
  }
}
