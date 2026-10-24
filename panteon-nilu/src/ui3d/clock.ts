// Zegar animacji (sekundy). Animacje liczą postęp od niego, nie od sumy klatek.
// Tylko w trybie deweloperskim test może go spowolnić albo zatrzymać (zrzuty ekranu w trakcie lotu
// lub przywołania przy programowym WebGL, który daje ~1 klatkę na sekundę):
//   window.__panteonClock = { scale: 0.05 }   — „zwolnione tempo” od tej chwili
//   window.__panteonClock = { frozen: 12.3 }  — czas stoi

interface DevClock {
  frozen?: number;
  scale?: number;
  r0?: number;
  a0?: number;
}

let lastAnim = 0;

export function animNow(): number {
  const real = performance.now() / 1000;
  if (import.meta.env.DEV && typeof window !== 'undefined') {
    const c = (window as unknown as { __panteonClock?: DevClock }).__panteonClock;
    if (c && typeof c.frozen === 'number') return (lastAnim = c.frozen);
    if (c && typeof c.scale === 'number') {
      if (c.r0 === undefined || c.a0 === undefined) {
        c.r0 = real;
        c.a0 = lastAnim || real;
      }
      return (lastAnim = c.a0 + (real - c.r0) * c.scale);
    }
  }
  return (lastAnim = real);
}

/** Krok czasu między klatkami wg zegara animacji (0 przy zatrzymanym zegarze), z górnym limitem. */
export function makeTicker(max = 0.05) {
  let last = animNow();
  return () => {
    const now = animNow();
    const dt = Math.min(max, Math.max(0, now - last));
    last = now;
    return dt;
  };
}
