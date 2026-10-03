// Plansza 3D: kafle (InstancedMesh na teren), woda, rzeki, wielbłądy, żetony, podświetlenia i wybór pól.
import { Line } from '@react-three/drei';
import { useFrame, type ThreeEvent } from '@react-three/fiber';
import { useEffect, useLayoutEffect, useMemo, useRef, useState } from 'react';
import {
  CanvasTexture, Color, DoubleSide, InstancedMesh, MeshBasicMaterial, MeshStandardMaterial, Object3D, SRGBColorSpace,
} from 'three';
import { regionsInConflictOrder } from '../engine/map';
import type { EdgeKey, GameState, HexKey, Terrain } from '../engine/types';
import type { Interaction } from '../ui/interaction';
import { edgeWorld, hexAnchor, hexToWorld, regionBadgeHex, regionOutline, TILE_TOP, WATER_LEVEL } from './coords';
import { camelGeometry, flatRing, hexCap, hexPrism } from './geometry';
import { desertMaterial, fertileMaterial, waterBedMaterial, waterMaterial } from './materials';
import type { BufferGeometry, Material } from 'three';

const TILE_RADIUS = 0.965;
const tmp = new Object3D();
const tmpColor = new Color();

/** Deterministyczny „szum” z klucza pola — drobne różnice odcienia kafli. */
function hash01(s: string): number {
  let h = 2166136261;
  for (let i = 0; i < s.length; i++) h = Math.imul(h ^ s.charCodeAt(i), 16777619);
  return ((h >>> 0) % 1000) / 1000;
}

interface Props {
  state: GameState;
  interaction: Interaction;
  regionTint?: Map<HexKey, string>;
  animatedWater: boolean;
  onHex(h: HexKey): void;
  onEdge(e: EdgeKey): void;
  onHover(h: HexKey | null): void;
}

export function Board3D({ state, interaction, regionTint, animatedWater, onHex, onEdge, onHover }: Props) {
  const hexes = useMemo(() => Object.keys(state.map.terrain).sort(), [state.map]);
  const byTerrain = useMemo(() => {
    const out: Record<Terrain, HexKey[]> = { fertile: [], desert: [], water: [] };
    for (const h of hexes) out[state.map.terrain[h]].push(h);
    return out;
  }, [hexes, state.map]);

  const geo = useMemo(
    () => ({
      fertile: hexPrism(TILE_RADIUS, TILE_TOP.fertile),
      desert: hexPrism(TILE_RADIUS, TILE_TOP.desert),
      bed: hexPrism(TILE_RADIUS, TILE_TOP.water),
      cap: hexCap(1.0),
      glow: hexCap(0.8),
      ring: flatRing(0.8, 0.028),
      camel: camelGeometry(),
    }),
    [],
  );
  const mats = useMemo(
    () => ({
      fertile: fertileMaterial(),
      desert: desertMaterial(),
      bed: waterBedMaterial(),
      water: waterMaterial(animatedWater),
      glow: new MeshBasicMaterial({ color: '#ffcf4a', transparent: true, opacity: 0.35, depthWrite: false, toneMapped: false }),
      ring: new MeshBasicMaterial({ color: '#ffd75e', toneMapped: false }),
      edgeChoice: new MeshBasicMaterial({ color: '#ffcf4a', transparent: true, opacity: 0.85, toneMapped: false }),
      edgeChosen: new MeshStandardMaterial({ color: '#8a5a2b', roughness: 0.6 }),
      camel: new MeshStandardMaterial({ color: '#b98a52', roughness: 0.75 }),
      pick: new MeshBasicMaterial({ transparent: true, opacity: 0, depthWrite: false, colorWrite: false }),
    }),
    [animatedWater],
  );
  useEffect(() => () => Object.values(mats).forEach((m) => m.dispose()), [mats]);

  // Animacja wody i pulsowanie podświetleń.
  useFrame((_, dt) => {
    mats.water.userData.time.value += dt;
    const t = mats.water.userData.time.value;
    mats.glow.opacity = 0.1 + 0.1 * (0.5 + 0.5 * Math.sin(t * 3.2));
  });

  const battleRegion = state.battle?.region ?? null;
  const battleOutline = useMemo(
    () => (battleRegion === null ? null : regionOutline(state, battleRegion)),
    [state.map, battleRegion], // eslint-disable-line react-hooks/exhaustive-deps
  );

  const targets = [...interaction.hexActions.keys()];
  const [hover, setHover] = useState<HexKey | null>(null);
  const hoverAction = hover !== null && interaction.hexActions.has(hover);

  const pick = (e: ThreeEvent<PointerEvent | MouseEvent>) => (e.instanceId === undefined ? null : hexes[e.instanceId]);

  return (
    <group>
      <Tiles hexes={byTerrain.fertile} map={state.map} geometry={geo.fertile} material={mats.fertile} tint={regionTint} top={TILE_TOP.fertile} />
      <Tiles hexes={byTerrain.desert} map={state.map} geometry={geo.desert} material={mats.desert} tint={regionTint} top={TILE_TOP.desert} />
      <Tiles hexes={byTerrain.water} map={state.map} geometry={geo.bed} material={mats.bed} top={TILE_TOP.water} />
      {/* lustro wody: na polach wody i nad rzekami */}
      <Placed hexes={byTerrain.water} map={state.map} geometry={geo.cap} material={mats.water} y={WATER_LEVEL} receiveShadow />
      <Rivers edges={state.map.rivers} material={mats.water} />
      <Camels edges={state.map.camels} geometry={geo.camel} material={mats.camel} />

      {/* legalne pola: pulsująca poświata + pierścień */}
      <Placed hexes={targets} map={state.map} geometry={geo.glow} material={mats.glow} lift={0.012} />
      <Placed hexes={targets} map={state.map} geometry={geo.ring} material={mats.ring} lift={0.02} />

      {/* krawędzie karawany do wyboru */}
      <EdgeBars edges={[...interaction.edgeChoices]} material={mats.edgeChoice} onEdge={onEdge} height={0.06} />
      <EdgeBars edges={[...interaction.selectedEdges]} material={mats.edgeChosen} onEdge={onEdge} height={0.1} />

      {/* granica regionu, w którym toczy się bitwa */}
      {battleOutline && (
        <Line segments points={battleOutline} color="#d9452f" lineWidth={3.5} toneMapped={false} raycast={() => null} />
      )}

      <RegionTokens state={state} />
      <Portals state={state} />

      {/* niewidoczna warstwa do raycastingu: jeden heks na pole, na wysokości wierzchu */}
      <Placed
        name="pick"
        hexes={hexes}
        map={state.map}
        geometry={geo.cap}
        material={mats.pick}
        lift={0.03}
        onPointerMove={(e) => {
          e.stopPropagation();
          const h = pick(e);
          if (h !== hover) {
            setHover(h);
            onHover(h);
          }
        }}
        onPointerOut={() => {
          setHover(null);
          onHover(null);
        }}
        onClick={(e) => {
          e.stopPropagation();
          const h = pick(e);
          if (h) onHex(h);
        }}
      />

      {/* obrys pola pod kursorem (złoty, gdy pole jest akcją) */}
      {hover && (
        <Line
          points={hexOutline(state.map, hover)}
          color={hoverAction ? '#ffd75e' : '#fff6dc'}
          lineWidth={hoverAction ? 4 : 2.5}
          toneMapped={false}
          raycast={() => null}
        />
      )}
    </group>
  );
}

/** Zamknięty obrys heksu tuż nad wierzchem kafla. */
function hexOutline(map: GameState['map'], h: HexKey): [number, number, number][] {
  const [x, top, z] = hexAnchor(map, h);
  const pts: [number, number, number][] = [];
  for (let i = 0; i <= 6; i++) {
    const a = (Math.PI / 180) * (60 * i - 30);
    pts.push([x + TILE_RADIUS * 0.98 * Math.cos(a), top + 0.02, z + TILE_RADIUS * 0.98 * Math.sin(a)]);
  }
  return pts;
}

/** Kafle jednego terenu: InstancedMesh z drobnym zróżnicowaniem odcienia i podświetleniem regionów. */
function Tiles({ hexes, map, geometry, material, tint }: {
  hexes: HexKey[]; map: GameState['map']; geometry: BufferGeometry; material: Material; tint?: Map<HexKey, string>; top: number;
}) {
  const ref = useRef<InstancedMesh>(null);
  useLayoutEffect(() => {
    const mesh = ref.current!;
    hexes.forEach((h, i) => {
      const [x, z] = hexToWorld(h);
      tmp.position.set(x, 0, z);
      tmp.rotation.set(0, 0, 0);
      tmp.scale.set(1, 1, 1);
      tmp.updateMatrix();
      mesh.setMatrixAt(i, tmp.matrix);
      const v = 0.92 + hash01(h) * 0.16;
      tmpColor.setRGB(v, v, v);
      const t = tint?.get(h);
      if (t === 'a') tmpColor.multiply(new Color('#ff9a7a'));
      if (t === 'b') tmpColor.multiply(new Color('#8fb6ff'));
      mesh.setColorAt(i, tmpColor);
    });
    mesh.count = hexes.length;
    mesh.instanceMatrix.needsUpdate = true;
    if (mesh.instanceColor) mesh.instanceColor.needsUpdate = true;
    mesh.computeBoundingSphere();
  }, [hexes, map, tint]);
  return (
    <instancedMesh ref={ref} args={[geometry, material, Math.max(1, hexes.length)]} castShadow receiveShadow raycast={() => null} />
  );
}

/** Ten sam element postawiony na wielu polach (na wierzchu kafla + `lift`, albo na stałej wysokości `y`). */
function Placed({ hexes, map, geometry, material, lift = 0, y, receiveShadow, name, ...events }: {
  hexes: HexKey[]; map: GameState['map']; geometry: BufferGeometry; material: Material; lift?: number; y?: number; name?: string;
  receiveShadow?: boolean;
  onPointerMove?: (e: ThreeEvent<PointerEvent>) => void;
  onPointerOut?: (e: ThreeEvent<PointerEvent>) => void;
  onClick?: (e: ThreeEvent<MouseEvent>) => void;
}) {
  const ref = useRef<InstancedMesh>(null);
  useLayoutEffect(() => {
    const mesh = ref.current!;
    hexes.forEach((h, i) => {
      const [x, top, z] = hexAnchor(map, h);
      tmp.position.set(x, (y ?? top) + lift, z);
      tmp.rotation.set(0, 0, 0);
      tmp.scale.set(1, 1, 1);
      tmp.updateMatrix();
      mesh.setMatrixAt(i, tmp.matrix);
    });
    mesh.count = hexes.length;
    mesh.instanceMatrix.needsUpdate = true;
    mesh.computeBoundingSphere();
  }, [hexes, map, lift, y]);
  const interactive = !!(events.onClick || events.onPointerMove);
  return (
    <instancedMesh
      ref={ref}
      name={name}
      args={[geometry, material, Math.max(1, hexes.length)]}
      receiveShadow={receiveShadow}
      visible={hexes.length > 0}
      raycast={interactive ? undefined : () => null}
      {...events}
    />
  );
}

/** Rzeki: wstęgi wody wzdłuż krawędzi między regionami. */
function Rivers({ edges, material }: { edges: EdgeKey[]; material: Material }) {
  const ref = useRef<InstancedMesh>(null);
  useLayoutEffect(() => {
    const mesh = ref.current!;
    edges.forEach((e, i) => {
      const w = edgeWorld(e);
      tmp.position.set(w.mid[0], Math.max(TILE_TOP.fertile, TILE_TOP.desert) + 0.004, w.mid[1]);
      tmp.rotation.set(0, w.angle, 0);
      tmp.scale.set(w.length + 0.12, 1, 1);
      tmp.updateMatrix();
      mesh.setMatrixAt(i, tmp.matrix);
    });
    mesh.count = edges.length;
    mesh.instanceMatrix.needsUpdate = true;
    mesh.computeBoundingSphere();
  }, [edges]);
  return (
    <instancedMesh ref={ref} args={[undefined, material, Math.max(1, edges.length)]} receiveShadow raycast={() => null}>
      <boxGeometry args={[1, 0.02, 0.17]} />
    </instancedMesh>
  );
}

/** Wielbłądy karawan: po jednym na krawędź, ustawione wzdłuż linii. */
function Camels({ edges, geometry, material }: { edges: EdgeKey[]; geometry: BufferGeometry; material: Material }) {
  const ref = useRef<InstancedMesh>(null);
  useLayoutEffect(() => {
    const mesh = ref.current!;
    edges.forEach((e, i) => {
      const w = edgeWorld(e);
      tmp.position.set(w.mid[0], Math.max(TILE_TOP.fertile, TILE_TOP.desert), w.mid[1]);
      tmp.rotation.set(0, w.angle, 0);
      tmp.scale.set(1.6, 1.6, 1.6);
      tmp.updateMatrix();
      mesh.setMatrixAt(i, tmp.matrix);
    });
    mesh.count = edges.length;
    mesh.instanceMatrix.needsUpdate = true;
    mesh.computeBoundingSphere();
  }, [edges]);
  return <instancedMesh ref={ref} args={[geometry, material, Math.max(1, edges.length)]} castShadow visible={edges.length > 0} raycast={() => null} />;
}

/** Klikalne belki na krawędziach (wybór linii karawany). */
function EdgeBars({ edges, material, onEdge, height }: { edges: EdgeKey[]; material: Material; onEdge(e: EdgeKey): void; height: number }) {
  const ref = useRef<InstancedMesh>(null);
  useLayoutEffect(() => {
    const mesh = ref.current!;
    edges.forEach((e, i) => {
      const w = edgeWorld(e);
      tmp.position.set(w.mid[0], Math.max(TILE_TOP.fertile, TILE_TOP.desert) + height / 2, w.mid[1]);
      tmp.rotation.set(0, w.angle, 0);
      tmp.scale.set(w.length * 0.82, height, 1);
      tmp.updateMatrix();
      mesh.setMatrixAt(i, tmp.matrix);
    });
    mesh.count = edges.length;
    mesh.instanceMatrix.needsUpdate = true;
    mesh.computeBoundingSphere();
  }, [edges, height]);
  return (
    <instancedMesh
      ref={ref}
      args={[undefined, material, Math.max(1, edges.length)]}
      visible={edges.length > 0}
      onClick={(e) => {
        e.stopPropagation();
        if (e.instanceId !== undefined) onEdge(edges[e.instanceId]);
      }}
    >
      <boxGeometry args={[1, 1, 0.12]} />
    </instancedMesh>
  );
}

/** Tekstura z numerem żetonu (kanwa — bez plików czcionek). */
function numberTexture(n: number): CanvasTexture {
  const c = document.createElement('canvas');
  c.width = c.height = 128;
  const ctx = c.getContext('2d')!;
  ctx.fillStyle = '#f4e6c4';
  ctx.fillRect(0, 0, 128, 128);
  ctx.strokeStyle = '#7a5a2a';
  ctx.lineWidth = 8;
  ctx.strokeRect(8, 8, 112, 112);
  ctx.fillStyle = '#3a2a1a';
  ctx.font = 'bold 76px Georgia, serif';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillText(String(n), 64, 70);
  const t = new CanvasTexture(c);
  t.colorSpace = SRGBColorSpace;
  return t;
}

function RegionTokens({ state }: { state: GameState }) {
  const tokens = regionsInConflictOrder(state)
    .map(({ token, region }) => ({ token, hex: regionBadgeHex(state, region) }))
    .filter((t): t is { token: number; hex: HexKey } => t.hex !== null);
  return (
    <group>
      {tokens.map(({ token, hex }) => (
        <RegionToken key={token} n={token} position={hexAnchor(state.map, hex)} />
      ))}
    </group>
  );
}

function RegionToken({ n, position }: { n: number; position: [number, number, number] }) {
  const tex = useMemo(() => numberTexture(n), [n]);
  useEffect(() => () => tex.dispose(), [tex]);
  return (
    <group position={position}>
      <mesh position={[0, 0.03, 0]} castShadow receiveShadow raycast={() => null}>
        <boxGeometry args={[0.5, 0.06, 0.5]} />
        <meshStandardMaterial color="#c9a46a" roughness={0.6} />
      </mesh>
      <mesh position={[0, 0.061, 0]} rotation={[-Math.PI / 2, 0, 0]} raycast={() => null}>
        <planeGeometry args={[0.44, 0.44]} />
        <meshStandardMaterial map={tex} roughness={0.7} />
      </mesh>
    </group>
  );
}

/** Wrota zaświatów Ozyrysa: ciemna tafla z fioletowym pierścieniem. */
function Portals({ state }: { state: GameState }) {
  const ring = useMemo(() => flatRing(0.55, 0.05), []);
  return (
    <group>
      {state.abilities.underworld.map((h) => {
        const [x, y, z] = hexAnchor(state.map, h);
        return (
          <group key={h} position={[x, y + 0.01, z]}>
            <mesh rotation={[-Math.PI / 2, 0, 0]} raycast={() => null}>
              <circleGeometry args={[0.55, 40]} />
              <meshStandardMaterial color="#1c0d2a" roughness={0.3} side={DoubleSide} />
            </mesh>
            <mesh geometry={ring} position={[0, 0.02, 0]} raycast={() => null}>
              <meshStandardMaterial color="#9b5cf0" emissive="#7a3bd6" emissiveIntensity={1.4} toneMapped={false} />
            </mesh>
          </group>
        );
      })}
    </group>
  );
}
