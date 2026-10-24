// Modele figurek z /public/models (*.glb, Draco lub meshopt). Brak pliku → pionek-zastępnik.
import { useGLTF } from '@react-three/drei';
import { Suspense, useEffect, useMemo, useState, type ReactNode } from 'react';
import { Box3, Group, Mesh, type MeshStandardMaterial } from 'three';
import { DRACO_URL, fitScale, MODEL_YAW, resolveModel, tintMaterial } from './modelFiles';
import { SafeBoundary } from './SafeBoundary';

export { FIGURE_HEIGHT, modelCandidates } from './modelFiles';

export function useModelUrl(candidates: string[]): string | null | undefined {
  const key = candidates.join('|');
  const [url, setUrl] = useState<string | null | undefined>(undefined);
  useEffect(() => {
    let live = true;
    resolveModel(key.split('|')).then((u) => live && setUrl(u));
    return () => {
      live = false;
    };
  }, [key]);
  return url;
}

/**
 * Model GLB stopami na y = 0, przeskalowany do wysokości figurki (i nie szerszy niż pole), obrócony do widoku 3/4.
 * Materiały barwione wg nazw (`tintMaterial`).
 */
function GltfFigure({ url, height, color }: { url: string; height: number; color: string }) {
  const gltf = useGLTF(url, DRACO_URL, true);
  const scene = useMemo(() => {
    const model = gltf.scene.clone(true) as Group;
    model.traverse((o) => {
      if (o instanceof Mesh) {
        o.castShadow = true;
        o.receiveShadow = true;
        o.material = (o.material as MeshStandardMaterial).clone();
        tintMaterial(o.material as MeshStandardMaterial, color);
      }
    });
    const box = new Box3().setFromObject(model);
    const radius = Math.max(...[box.min.x, box.max.x].flatMap((x) => [box.min.z, box.max.z].map((z) => Math.hypot(x, z))));
    const k = fitScale({ height: box.max.y - box.min.y, radius }, height);
    model.scale.setScalar(k);
    model.position.y = -box.min.y * k;
    const holder = new Group();
    holder.rotation.y = MODEL_YAW;
    holder.add(model);
    return holder;
  }, [gltf, height, color]);
  return <primitive object={scene} />;
}

export function FigureModel({ candidates, height, color, fallback }: { candidates: string[]; height: number; color: string; fallback: ReactNode }) {
  const url = useModelUrl(candidates);
  if (!url) return <>{fallback}</>;
  return (
    <SafeBoundary fallback={fallback}>
      <Suspense fallback={fallback}>
        <GltfFigure url={url} height={height} color={color} />
      </Suspense>
    </SafeBoundary>
  );
}
