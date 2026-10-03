// Postprocessing: AO, bloom, tilt-shift, winieta — każdy z przełącznikiem; ACES na końcu łańcucha.
import { Bloom, EffectComposer, N8AO, SMAA, TiltShift2, ToneMapping, Vignette } from '@react-three/postprocessing';
import { ToneMappingMode } from 'postprocessing';
import type { ReactElement } from 'react';
import type { Settings3D } from './settings';

export function Effects({ s }: { s: Settings3D }) {
  const effects: ReactElement[] = [];
  if (s.ao) effects.push(<N8AO key="ao" aoRadius={0.9} intensity={2.4} distanceFalloff={0.6} halfRes quality="performance" />);
  if (s.bloom) effects.push(<Bloom key="bloom" intensity={0.4} luminanceThreshold={0.9} luminanceSmoothing={0.15} mipmapBlur />);
  if (s.tiltShift) effects.push(<TiltShift2 key="tilt" blur={0.06} />);
  if (s.vignette) effects.push(<Vignette key="vig" offset={0.3} darkness={0.55} />);
  effects.push(<ToneMapping key="tm" mode={ToneMappingMode.ACES_FILMIC} />);
  effects.push(<SMAA key="smaa" />); // wygładzanie krawędzi (kompozytor renderuje bez MSAA)
  return <EffectComposer multisampling={0}>{effects}</EffectComposer>;
}
