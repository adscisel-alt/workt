// Scena 3D: stylizowana makieta planszówki na stole. Czyta stan, wysyła akcje przez te same callbacki co plansza 2D.
import { Environment, PerformanceMonitor } from '@react-three/drei';
import { Canvas, useFrame, useThree } from '@react-three/fiber';
import { Suspense, useEffect, useLayoutEffect, useMemo, useState, type RefObject } from 'react';
import { PCFShadowMap } from 'three';
import type { EdgeKey, GameState, HexKey } from '../engine/types';
import type { Interaction } from '../ui/interaction';
import { Board3D } from './Board3D';
import { CameraRig } from './CameraRig';
import { boardExtent, hexAnchor } from './coords';
import { Effects } from './Effects';
import { frameMaterial, woodMaterial } from './materials';
import { SandProvider } from './Particles';
import { Pieces3D } from './Pieces3D';
import { SafeBoundary } from './SafeBoundary';
import { effectiveSettings, type Settings3D } from './settings';

export interface Scene3DProps {
  state: GameState;
  interaction: Interaction;
  selectedFigure?: string;
  regionTint?: Map<HexKey, string>;
  settings: Settings3D;
  /** Szerokość panelu HUD po prawej (px) — środek kadru przesuwa się w lewo o połowę. */
  hudInset?: number;
  fpsRef?: RefObject<HTMLSpanElement | null>;
  onHex(h: HexKey): void;
  onFigure(id: string): void;
  onMonument(id: string): void;
  onEdge(e: EdgeKey): void;
}

/**
 * Opcje kamery i renderera jako stałe: R3F tworzy NOWĄ kamerę, gdy obiekt `camera` przekazany do <Canvas>
 * się zmieni — nowy obiekt przy każdym renderze resetowałby widok (i sterowanie kamerą).
 */
// `manual`: R3F nie zmienia proporcji kamery — robi to wyłącznie <ViewOffset> (razem z przesunięciem kadru),
// inaczej automatyczne `aspect = szerokość/wysokość` rozjeżdżałoby się z przesunięciem i psuło raycasting.
const CAMERA = { fov: 36, near: 0.1, far: 300, position: [0, 20, 20] as [number, number, number], manual: true };
const GL_AA = { antialias: true, powerPreference: 'high-performance', preserveDrawingBuffer: true } as const;
const GL_NO_AA = { ...GL_AA, antialias: false } as const;

export default function Scene3D(props: Scene3DProps) {
  const s = effectiveSettings(props.settings);
  const [dpr, setDpr] = useState(Math.min(window.devicePixelRatio || 1, s.maxDpr));
  useEffect(() => setDpr(Math.min(window.devicePixelRatio || 1, s.maxDpr)), [s.maxDpr]);
  const [hdri, setHdri] = useState<string | null>(null);
  // Gdy HDRI się nie wczyta (np. host blokuje adresy data:), scena zostaje z samym światłem półsferycznym.
  const [envFailed, setEnvFailed] = useState(false);
  const env = hdri !== null && !envFailed;
  useEffect(() => {
    let live = true;
    // HDRI (CC0, Poly Haven) dołączone do paczki — bez pobierania z sieci.
    import('@pmndrs/assets/hdri/apartment.exr')
      .then((m) => live && setHdri(m.default))
      .catch(() => live && setEnvFailed(true));
    return () => {
      live = false;
    };
  }, []);
  const [cursor, setCursor] = useState(false);
  useEffect(() => {
    document.body.style.cursor = cursor ? 'pointer' : '';
    return () => {
      document.body.style.cursor = '';
    };
  }, [cursor]);

  return (
    <Canvas
      className="scene3d"
      shadows={s.shadows ? { type: PCFShadowMap } : false}
      dpr={dpr}
      gl={s.postprocessing ? GL_NO_AA : GL_AA}
      camera={CAMERA}
      data-testid="scene3d"
    >
      {s.adaptiveDpr && (
        <PerformanceMonitor
          bounds={() => [50, 58]}
          flipflops={4}
          onDecline={() => setDpr((d) => Math.max(0.6, +(d - 0.2).toFixed(2)))}
          onIncline={() => setDpr((d) => Math.min(Math.min(window.devicePixelRatio || 1, s.maxDpr), +(d + 0.2).toFixed(2)))}
        />
      )}
      <color attach="background" args={['#1e1611']} />
      <fog attach="fog" args={['#1e1611', 40, 90]} />
      {env && (
        <SafeBoundary fallback={null} onError={() => setEnvFailed(true)}>
          <Suspense fallback={null}>
            <Environment files={hdri} environmentIntensity={0.42} />
          </Suspense>
        </SafeBoundary>
      )}
      <hemisphereLight args={['#fff1d6', '#3a2a1c', env ? 0.25 : 0.8]} />
      <SunLight state={props.state} shadows={s.shadows} />
      <Table state={props.state} />
      <SandProvider enabled={s.particles} dustAreas={useDustAreas(props.state)}>
        <Board3D
          state={props.state}
          interaction={props.interaction}
          regionTint={props.regionTint}
          animatedWater
          onHex={props.onHex}
          onEdge={props.onEdge}
          onHover={() => {}}
        />
        <Pieces3D
          state={props.state}
          interaction={props.interaction}
          selectedFigure={props.selectedFigure}
          onFigure={props.onFigure}
          onMonument={props.onMonument}
          onHoverActionable={setCursor}
        />
      </SandProvider>
      <CameraRig state={props.state} />
      <ViewOffset inset={props.hudInset ?? 0} />
      {s.postprocessing && <Effects s={s} />}
      {props.fpsRef && <FpsProbe target={props.fpsRef} />}
      {import.meta.env.DEV && <DevHandle />}
    </Canvas>
  );
}

/** Jedno światło kierunkowe („słońce” z okna) z miękkimi cieniami obejmującymi planszę. */
function SunLight({ state, shadows }: { state: GameState; shadows: boolean }) {
  const { center, radius } = boardExtent(state.map);
  return (
    <directionalLight
      position={[center[0] - radius * 0.6, radius * 1.4, center[1] - radius * 0.5]}
      intensity={3.1}
      color="#fff0d8"
      castShadow={shadows}
      shadow-mapSize={[2048, 2048]}
      shadow-bias={-0.0004}
      shadow-normalBias={0.02}
      shadow-radius={4}
      shadow-camera-left={-radius}
      shadow-camera-right={radius}
      shadow-camera-top={radius}
      shadow-camera-bottom={-radius}
      shadow-camera-near={1}
      shadow-camera-far={radius * 4}
    >
      <object3D attach="target" position={[center[0], 0, center[1]]} />
    </directionalLight>
  );
}

/** Stół i rama planszy (makieta). */
function Table({ state }: { state: GameState }) {
  const { center, radius } = boardExtent(state.map);
  const wood = useMemo(() => woodMaterial(), []);
  const frame = useMemo(() => frameMaterial(), []);
  const w = radius * 2 + 0.6;
  return (
    <group>
      <mesh position={[center[0], -0.12, center[1]]} castShadow receiveShadow material={frame} raycast={() => null}>
        <boxGeometry args={[w, 0.24, w]} />
      </mesh>
      <mesh position={[center[0], -0.245, center[1]]} rotation={[-Math.PI / 2, 0, 0]} receiveShadow material={wood} raycast={() => null}>
        <planeGeometry args={[radius * 9, radius * 9]} />
      </mesh>
    </group>
  );
}

function useDustAreas(state: GameState) {
  return useMemo(
    () => Object.keys(state.map.terrain).filter((h) => state.map.terrain[h] === 'desert').filter((_, i) => i % 3 === 0).map((h) => hexAnchor(state.map, h)),
    [state.map],
  );
}

/** Licznik FPS i statystyk renderera (pisze wprost do elementu HTML, bez re-renderów Reacta). */
function FpsProbe({ target }: { target: RefObject<HTMLSpanElement | null> }) {
  const gl = useThree((t) => t.gl);
  const acc = useMemo(() => ({ frames: 0, time: 0 }), []);
  const last = useMemo(() => ({ calls: 0, triangles: 0 }), []);
  // Postprocessing renderuje kilka przebiegów — liczniki sumujemy przez całą klatkę i odczytujemy
  // na początku następnej (przed wyzerowaniem).
  useEffect(() => {
    gl.info.autoReset = false;
    return () => {
      gl.info.autoReset = true;
    };
  }, [gl]);
  useFrame((_, dt) => {
    last.calls = gl.info.render.calls;
    last.triangles = gl.info.render.triangles;
    gl.info.reset();
    acc.frames++;
    acc.time += dt;
    if (acc.time >= 0.5 && target.current) {
      const fps = Math.round(acc.frames / acc.time);
      target.current.textContent = `${fps} FPS · ${last.calls} wywołań · ${Math.round(last.triangles / 1000)}k trójkątów · DPR ${gl.getPixelRatio().toFixed(2)}`;
      acc.frames = 0;
      acc.time = 0;
    }
  }, -1000);
  return null;
}

/**
 * Proporcje kamery i przesunięcie środka projekcji (plansza wyśrodkowana w części kanwy niezasłoniętej
 * przez HUD). Jedyne miejsce, które ustawia `aspect` — kamera jest w trybie `manual`.
 */
function ViewOffset({ inset }: { inset: number }) {
  const camera = useThree((t) => t.camera);
  const size = useThree((t) => t.size);
  useLayoutEffect(() => {
    if (!('setViewOffset' in camera)) return;
    const cam = camera as import('three').PerspectiveCamera;
    if (inset > 0 && size.width > inset * 1.8) {
      cam.setViewOffset(size.width + inset, size.height, inset, 0, size.width, size.height); // ustawia też aspect
    } else {
      cam.clearViewOffset();
      cam.aspect = size.width / Math.max(1, size.height);
    }
    cam.updateProjectionMatrix();
  }, [camera, size.width, size.height, inset]);
  return null;
}

/** Tylko w trybie deweloperskim: dostęp do sceny dla testów w przeglądarce (window.__three). */
function DevHandle() {
  const { scene, camera, gl, pointer, raycaster } = useThree();
  useEffect(() => {
    (window as unknown as { __three: unknown }).__three = { scene, camera, gl, pointer, raycaster };
  }, [scene, camera, gl, pointer, raycaster]);
  return null;
}
