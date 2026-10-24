// Bitwa: reszta planszy płynnie ciemnieje, region bitwy zostaje w pełnym świetle.
import { useFrame, useThree } from '@react-three/fiber';
import { useEffect, useRef } from 'react';
import type { Material, Mesh } from 'three';
import { isHexInRegion } from '../engine/map';
import type { GameState } from '../engine/types';
import { buildDimMask, DIM, patchDim, setDimMask } from './dim';

export function BattleDim({ state, enabled }: { state: GameState; enabled: boolean }) {
  const scene = useThree((t) => t.scene);
  const region = state.battle?.region ?? null;
  const frame = useRef(0);

  useEffect(() => {
    if (region === null) return;
    // jasne zostają pola regionu i woda, która z nim graniczy (wg zasad należy do regionu)
    setDimMask(buildDimMask(state.map, Object.keys(state.map.terrain).filter((h) => isHexInRegion(state.map, h, region))));
  }, [state.map, region]);
  useEffect(() => () => void (DIM.uDim.value = 0), []);

  useFrame((_, dt) => {
    const want = enabled && region !== null ? 1 : 0;
    // nowe materiały (figurki, monumenty) dostają łatkę od razu w bitwie, poza nią co pół sekundy wystarczy
    if (want > 0 || DIM.uDim.value > 0 || frame.current++ % 30 === 0) {
      scene.traverse((o) => {
        const m = (o as Mesh).material as Material | Material[] | undefined;
        if (m) (Array.isArray(m) ? m : [m]).forEach(patchDim);
      });
    }
    const v = DIM.uDim.value + (want - DIM.uDim.value) * (1 - Math.exp(-Math.min(dt, 0.1) * 4));
    DIM.uDim.value = Math.abs(v - want) < 0.002 ? want : v;
  });
  return null;
}
