// Kamera: orbitowanie z ograniczeniem kąta i odległości; płynny najazd na region bitwy i powrót.
import { CameraControls } from '@react-three/drei';
import { useEffect, useRef } from 'react';
import { Box3, Vector3 } from 'three';
import type { GameState } from '../engine/types';
import { boardExtent, regionFocus } from './coords';

interface Pose {
  pos: Vector3;
  target: Vector3;
}

export function CameraRig({ state }: { state: GameState }) {
  const ref = useRef<CameraControls>(null);
  const saved = useRef<Pose | null>(null);
  const { center, radius } = boardExtent(state.map);

  // ustawienie startowe + granice celu (kamera nie „ucieka” z planszy)
  useEffect(() => {
    const c = ref.current;
    if (!c) return;
    c.setLookAt(center[0], radius * 1.25, center[1] + radius * 1.35, center[0], 0, center[1] + radius * 0.05, false);
    c.setBoundary(new Box3(new Vector3(center[0] - radius, 0, center[1] - radius), new Vector3(center[0] + radius, 1, center[1] + radius)));
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  // najazd na region bitwy; po bitwie powrót do poprzedniego ujęcia
  const battleRegion = state.battle?.region ?? null;
  useEffect(() => {
    const c = ref.current;
    if (!c) return;
    if (battleRegion !== null) {
      if (!saved.current) saved.current = { pos: c.getPosition(new Vector3()), target: c.getTarget(new Vector3()) };
      const f = regionFocus(state, battleRegion);
      const d = Math.max(5.5, f.radius * 1.9);
      // bardziej z góry niż ujęcie ogólne — region w całości, mniej pustego stołu za nim
      c.setLookAt(f.center[0], d * 0.98, f.center[1] + d * 0.62, f.center[0], 0.3, f.center[1], true);
    } else if (saved.current) {
      const { pos, target } = saved.current;
      saved.current = null;
      c.setLookAt(pos.x, pos.y, pos.z, target.x, target.y, target.z, true);
    }
  }, [battleRegion]); // eslint-disable-line react-hooks/exhaustive-deps

  return (
    <CameraControls
      ref={ref}
      makeDefault
      minPolarAngle={0.22}
      maxPolarAngle={1.18}
      minDistance={4}
      maxDistance={radius * 3}
      smoothTime={0.55}
      draggingSmoothTime={0.12}
    />
  );
}
