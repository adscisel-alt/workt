// Kamera: orbitowanie z ograniczeniem kąta i odległości; płynny najazd na region bitwy i powrót.
// Tryb filmowy: podążanie za ruszaną figurką (i powrót po lądowaniu) oraz delikatne kołysanie.
import { CameraControls } from '@react-three/drei';
import { useFrame } from '@react-three/fiber';
import { useEffect, useRef } from 'react';
import { Box3, Vector3 } from 'three';
import type { GameState } from '../engine/types';
import { animNow } from './clock';
import { boardExtent, regionFocus } from './coords';
import { cameraSway, followPoint } from './motion';
import { firstMoving, useMotionBus } from './MotionContext';

/** Po lądowaniu kamera chwilę trzyma ujęcie na figurce, potem wraca. */
const FOLLOW_HOLD = 0.6;

interface Pose {
  pos: Vector3;
  target: Vector3;
}

export function CameraRig({ state, cinematic }: { state: GameState; cinematic: boolean }) {
  const ref = useRef<CameraControls>(null);
  const saved = useRef<Pose | null>(null);
  const bus = useMotionBus();
  const follow = useRef<{ base: Vector3 | null; holdUntil: number; user: boolean; swaying: boolean }>({
    base: null, holdUntil: 0, user: false, swaying: false,
  });
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

  // gracz chwyta kamerę → podążanie oddaje mu sterowanie (bez powrotu do starego ujęcia)
  useEffect(() => {
    const c = ref.current;
    if (!c) return;
    const start = () => {
      follow.current.user = true;
      follow.current.base = null;
    };
    const end = () => void (follow.current.user = false);
    c.addEventListener('controlstart', start);
    c.addEventListener('controlend', end);
    return () => {
      c.removeEventListener('controlstart', start);
      c.removeEventListener('controlend', end);
    };
  }, []);

  useFrame(() => {
    const c = ref.current;
    if (!c) return;
    const fl = follow.current;
    const now = animNow();
    if (cinematic) {
      const [x, y] = cameraSway(now);
      c.setFocalOffset(x, y, 0, false);
      fl.swaying = true;
    } else if (fl.swaying) {
      c.setFocalOffset(0, 0, 0, false);
      fl.swaying = false;
    }
    if (!cinematic || battleRegion !== null || fl.user) {
      fl.base = null;
      return;
    }
    const fig = firstMoving(bus);
    if (fig) {
      fl.base ??= c.getTarget(new Vector3());
      const [x, , z] = followPoint([fl.base.x, fl.base.y, fl.base.z], [fig.x, fig.y, fig.z]);
      c.moveTo(x, fl.base.y, z, true); // przesuwa cel i kamerę razem — jak operator na szynach
      fl.holdUntil = now + FOLLOW_HOLD;
    } else if (fl.base && now > fl.holdUntil) {
      c.moveTo(fl.base.x, fl.base.y, fl.base.z, true);
      fl.base = null;
    }
  });

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
