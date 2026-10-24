// Postprocessing: AO, głębia ostrości, bloom, tilt-shift, winieta — każdy z przełącznikiem; ACES na końcu łańcucha.
import { Bloom, DepthOfField, EffectComposer, N8AO, SMAA, TiltShift2, ToneMapping, Vignette } from '@react-three/postprocessing';
import { useFrame, useThree } from '@react-three/fiber';
import type { CameraControls } from '@react-three/drei';
import { type DepthOfFieldEffect, ToneMappingMode } from 'postprocessing';
import { useMemo, useRef, type ReactElement } from 'react';
import { Vector3 } from 'three';
import { firstMoving, useMotionBus } from './MotionContext';
import type { Settings3D } from './settings';

const DOF = { restBokeh: 1.1, flightBokeh: 2.6, restRange: 8, flightRange: 4 } as const;

/** Ostrość: na lecącej figurce (nieco nad podstawką), a gdy nic nie leci — na środku kadru. */
function FocusedDof() {
  const ref = useRef<DepthOfFieldEffect>(null);
  const bus = useMotionBus();
  const controls = useThree((t) => t.controls) as unknown as CameraControls | null;
  const focus = useMemo(() => new Vector3(), []);
  const want = useMemo(() => new Vector3(), []);
  const ready = useRef(false);
  const shallow = useRef(0);
  useFrame((_, dt) => {
    const fig = firstMoving(bus);
    if (fig) want.copy(fig).setY(fig.y + 0.45);
    else if (controls) controls.getTarget(want);
    else return;
    if (!ready.current) {
      focus.copy(want);
      ready.current = true;
    }
    // płynne przeostrzenie (jak ręka operatora), szybsze przy lecącej figurce
    const k = 1 - Math.exp(-Math.min(dt, 0.1) * (fig ? 9 : 4));
    focus.lerp(want, k);
    const e = ref.current;
    if (!e) return;
    e.target?.copy(focus);
    // w locie płytka głębia ostrości (jak w zwiastunie), w spoczynku łagodna — plansza ma być czytelna
    shallow.current += ((fig ? 1 : 0) - shallow.current) * (1 - Math.exp(-Math.min(dt, 0.1) * 5));
    e.bokehScale = DOF.restBokeh + (DOF.flightBokeh - DOF.restBokeh) * shallow.current;
    e.cocMaterial.focusRange = DOF.restRange + (DOF.flightRange - DOF.restRange) * shallow.current;
  });
  return <DepthOfField ref={ref} target={[0, 0, 0]} worldFocusRange={DOF.restRange} bokehScale={DOF.restBokeh} />;
}

export function Effects({ s }: { s: Settings3D }) {
  const effects: ReactElement[] = [];
  if (s.ao) effects.push(<N8AO key="ao" aoRadius={0.9} intensity={2.4} distanceFalloff={0.6} halfRes quality="performance" />);
  if (s.dof) effects.push(<FocusedDof key="dof" />);
  // próg ponad jasnością oświetlonego piasku: świeci złoto (odbłyski), kolumny światła i iskry
  if (s.bloom) effects.push(<Bloom key="bloom" intensity={0.6} luminanceThreshold={1.05} luminanceSmoothing={0.2} mipmapBlur />);
  if (s.tiltShift) effects.push(<TiltShift2 key="tilt" blur={0.06} />);
  if (s.vignette) effects.push(<Vignette key="vig" offset={0.3} darkness={0.55} />);
  effects.push(<ToneMapping key="tm" mode={ToneMappingMode.ACES_FILMIC} />);
  effects.push(<SMAA key="smaa" />); // wygładzanie krawędzi (kompozytor renderuje bez MSAA)
  return <EffectComposer multisampling={0}>{effects}</EffectComposer>;
}
