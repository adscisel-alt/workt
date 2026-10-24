// Wspólna wiedza sceny o ruchu: które figurki właśnie lecą (i gdzie są) — czyta ją kamera i głębia ostrości.
import { createContext, useContext, useMemo, type ReactNode } from 'react';
import type { Vector3 } from 'three';

export interface MotionBus {
  /** Figurki w trakcie ruchu: id → bieżąca pozycja (aktualizowana co klatkę). */
  moving: Map<string, Vector3>;
}

const MotionContext = createContext<MotionBus>({ moving: new Map() });

export function MotionProvider({ children }: { children: ReactNode }) {
  const bus = useMemo<MotionBus>(() => ({ moving: new Map() }), []);
  return <MotionContext.Provider value={bus}>{children}</MotionContext.Provider>;
}

export const useMotionBus = () => useContext(MotionContext);

/** Pierwsza lecąca figurka (kamera podąża za jedną). */
export function firstMoving(bus: MotionBus): Vector3 | null {
  for (const v of bus.moving.values()) return v;
  return null;
}
