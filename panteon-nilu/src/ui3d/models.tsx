// Modele figurek z /public/models (*.glb, Draco lub meshopt). Brak pliku → pionek-zastępnik.
import { useGLTF } from '@react-three/drei';
import { Component, Suspense, useEffect, useMemo, useState, type ReactNode } from 'react';
import { Box3, Color, Mesh, type Group, type MeshStandardMaterial } from 'three';
import { DRACO_URL, resolveModel } from './modelFiles';

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

class ModelBoundary extends Component<{ fallback: ReactNode; children: ReactNode }, { failed: boolean }> {
  state = { failed: false };
  static getDerivedStateFromError() {
    return { failed: true };
  }
  render() {
    return this.state.failed ? this.props.fallback : this.props.children;
  }
}

/** Model GLB przeskalowany do zadanej wysokości, stopami na y = 0; materiały „team*” w kolorze gracza. */
function GltfFigure({ url, height, color }: { url: string; height: number; color: string }) {
  const gltf = useGLTF(url, DRACO_URL, true);
  const scene = useMemo(() => {
    const s = gltf.scene.clone(true) as Group;
    s.traverse((o) => {
      if (o instanceof Mesh) {
        o.castShadow = true;
        o.receiveShadow = true;
        const m = o.material as MeshStandardMaterial;
        o.material = m.clone();
        const mat = o.material as MeshStandardMaterial;
        // „team*” w pełnym kolorze gracza; reszta (kamień) lekko w jego odcieniu — czytelna przynależność z daleka
        if (m.name.toLowerCase().startsWith('team')) mat.color = new Color(color);
        else mat.color = mat.color.clone().lerp(new Color(color), 0.35);
      }
    });
    const box = new Box3().setFromObject(s);
    const k = height / Math.max(1e-6, box.max.y - box.min.y);
    s.scale.setScalar(k);
    s.position.y = -box.min.y * k;
    return s;
  }, [gltf, height, color]);
  return <primitive object={scene} />;
}

export function FigureModel({ candidates, height, color, fallback }: { candidates: string[]; height: number; color: string; fallback: ReactNode }) {
  const url = useModelUrl(candidates);
  if (!url) return <>{fallback}</>;
  return (
    <ModelBoundary fallback={fallback}>
      <Suspense fallback={fallback}>
        <GltfFigure url={url} height={height} color={color} />
      </Suspense>
    </ModelBoundary>
  );
}
