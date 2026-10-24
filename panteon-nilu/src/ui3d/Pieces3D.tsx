// Monumenty i figurki 3D. Tylko odczyt stanu; kliknięcia przekazywane dalej.
import { useFrame } from '@react-three/fiber';
import { useEffect, useMemo, useRef, useState } from 'react';
import { Color, type Group, MeshBasicMaterial, MeshStandardMaterial, Quaternion, Vector3 } from 'three';
import { GODS } from '../content/gods';
import type { Figure, GameState, Monument } from '../engine/types';
import type { Interaction } from '../ui/interaction';
import { animNow } from './clock';
import { easeOutBack, hexAnchor, hexToWorld, type Vec3 } from './coords';
import { useFx } from './Fx';
import {
  baseRingGeometry, flatRing, godPawnGeometry, guardianPawnGeometry, obeliskCapGeometry, obeliskGeometry, pyramidCapGeometry,
  pyramidGeometry, templeGeometry, warriorPawnGeometry,
} from './geometry';
import { goldMaterial, sandstoneMaterial } from './materials';
import { FIGURE_HEIGHT, FigureModel, modelCandidates } from './models';
import { useMotionBus } from './MotionContext';
import { landingTime, movePose, summonPose } from './motion';
import { useSand } from './Particles';

/** Pojawienie się bez przywołania (start gry, wczytanie): szybkie „wyskoczenie”. */
const APPEAR_TIME = 0.55;
const DEATH_TIME = 0.7;
/** Więcej nowych figurek naraz to rozstawienie / wczytanie, a nie przywołanie — bez kolumn światła. */
const MAX_SUMMONS_AT_ONCE = 3;
/** Promień podstawki (pył przy lądowaniu wylatuje spod jej krawędzi). */
const BASE_RADIUS = 0.34;
/** Pionki-zastępniki w skali figurek GLB (FIGURE_HEIGHT). */
const PAWN_SCALE = 1.35;

interface Props {
  state: GameState;
  interaction: Interaction;
  selectedFigure?: string;
  onFigure(id: string): void;
  onMonument(id: string): void;
  onHoverActionable(on: boolean): void;
}

const shared = {
  geo: {
    obelisk: obeliskGeometry(),
    temple: templeGeometry(),
    pyramid: pyramidGeometry(),
    obeliskCap: obeliskCapGeometry(),
    pyramidCap: pyramidCapGeometry(),
    god: godPawnGeometry(),
    warrior: warriorPawnGeometry(),
    guardian: guardianPawnGeometry(),
    base: baseRingGeometry(0.34),
    baseBig: baseRingGeometry(0.41),
    ring: flatRing(0.48, 0.035),
    sun: flatRing(0.42, 0.04),
  },
};

export function Pieces3D({ state, interaction, selectedFigure, onFigure, onMonument, onHoverActionable }: Props) {
  const stone = useMemo(() => sandstoneMaterial(), []);
  const gold = useMemo(() => goldMaterial(), []);
  const glow = useMemo(() => new MeshBasicMaterial({ color: '#ffd75e', toneMapped: false }), []);
  const colorOf = (p: number | null) => (p === null ? '#8a8072' : GODS[state.players[p].god].color);
  const figures = Object.values(state.figures).filter((f) => f.pos !== null);
  const ghosts = useGhosts(state);
  // Figurki, które pojawiły się od poprzedniego renderu: pojedyncze — przywołanie; pierwsze wyświetlenie
  // albo hurtem (wczytanie stanu) — zwykłe pojawienie się.
  const shownBefore = useRef<Set<string> | null>(null);
  const fresh = figures.filter((f) => shownBefore.current !== null && !shownBefore.current.has(f.id));
  const summoned = new Set(fresh.length <= MAX_SUMMONS_AT_ONCE ? fresh.map((f) => f.id) : []);
  useEffect(() => {
    shownBefore.current = new Set(figures.map((f) => f.id));
  });

  return (
    <group>
      {Object.values(state.monuments).map((m) => (
        <Monument3D
          key={m.id}
          m={m}
          state={state}
          material={stone}
          gold={gold}
          glow={glow}
          color={colorOf(m.owner)}
          selectable={interaction.monumentMoves.has(m.id)}
          onClick={() => onMonument(m.id)}
          onHover={onHoverActionable}
        />
      ))}
      {figures.map((f) => {
        const owner = state.players[f.owner];
        const partner = f.kind === 'god' && owner.mergedWith !== undefined ? colorOf(owner.mergedWith) : undefined;
        return (
          <Figure3D
            key={f.id}
            f={f}
            state={state}
            color={colorOf(f.owner)}
            partnerColor={partner}
            selectable={interaction.selectableFigures.has(f.id)}
            selected={selectedFigure === f.id}
            radiant={state.abilities.radiant.includes(f.id)}
            entrance={summoned.has(f.id) ? 'summon' : 'appear'}
            glow={glow}
            onClick={() => onFigure(f.id)}
            onHover={onHoverActionable}
          />
        );
      })}
      {ghosts.map((g) => (
        <Ghost key={g.key} ghost={g} />
      ))}
    </group>
  );
}

// ---------- monumenty ----------

const GOLD_CAP: Partial<Record<Monument['type'], 'obeliskCap' | 'pyramidCap'>> = { obelisk: 'obeliskCap', pyramid: 'pyramidCap' };

function Monument3D({ m, state, material, gold, glow, color, selectable, onClick, onHover }: {
  m: Monument; state: GameState; material: MeshStandardMaterial; gold: MeshStandardMaterial; glow: MeshBasicMaterial; color: string;
  selectable: boolean;
  onClick(): void; onHover(on: boolean): void;
}) {
  const pos = hexAnchor(state.map, m.pos);
  const rot = (hashAngle(m.id) * Math.PI) / 3;
  return (
    <group
      position={pos}
      onClick={(e) => {
        if (!selectable) return;
        e.stopPropagation();
        onClick();
      }}
      onPointerOver={() => selectable && onHover(true)}
      onPointerOut={() => onHover(false)}
    >
      <mesh geometry={shared.geo[m.type]} material={material} rotation={[0, rot, 0]} castShadow receiveShadow />
      {GOLD_CAP[m.type] && (
        <mesh geometry={shared.geo[GOLD_CAP[m.type]!]} material={gold} rotation={[0, rot, 0]} castShadow raycast={() => null} />
      )}
      {m.owner !== null && (
        // żeton ankh właściciela przy podstawie
        <mesh position={[0.33, 0.035, 0.33]} castShadow>
          <cylinderGeometry args={[0.11, 0.11, 0.05, 24]} />
          <meshStandardMaterial color={color} roughness={0.35} metalness={0.1} />
        </mesh>
      )}
      {selectable && <PulseRing glow={glow} radius={1.25} />}
    </group>
  );
}

const hashAngle = (id: string) => [...id].reduce((s, c) => s + c.charCodeAt(0), 0) % 6;

/** Pulsujący pierścień (akcja możliwa). */
function PulseRing({ glow, radius }: { glow: MeshBasicMaterial; radius: number }) {
  const ref = useRef<Group>(null);
  useFrame(({ clock }) => {
    const s = radius * (1 + 0.06 * Math.sin(clock.elapsedTime * 4));
    ref.current?.scale.set(s, 1, s);
  });
  return (
    <group ref={ref}>
      <mesh geometry={shared.geo.ring} material={glow} position={[0, 0.03, 0]} raycast={() => null} />
    </group>
  );
}

// ---------- figurki ----------

function Pawn({ kind, color }: { kind: Figure['kind']; color: string }) {
  const mat = useMemo(() => new MeshStandardMaterial({ color: new Color(color).multiplyScalar(0.95), roughness: 0.42, metalness: 0.05 }), [color]);
  return <mesh geometry={shared.geo[kind]} material={mat} castShadow receiveShadow position={[0, 0.05, 0]} scale={PAWN_SCALE} />;
}

interface Anim {
  kind: 'move' | 'appear' | 'summon' | null;
  from: Vec3;
  to: Vec3;
  start: number;
  landed: boolean;
  surfaced: boolean;
}

const tmpAxis = new Vector3();
const tmpQuat = new Quaternion();

function Figure3D({ f, state, color, partnerColor, selectable, selected, radiant, entrance, glow, onClick, onHover }: {
  f: Figure; state: GameState; color: string; partnerColor?: string; selectable: boolean; selected: boolean; radiant: boolean;
  entrance: 'summon' | 'appear'; glow: MeshBasicMaterial; onClick(): void; onHover(on: boolean): void;
}) {
  const sand = useSand();
  const fx = useFx();
  const bus = useMotionBus();
  const group = useRef<Group>(null);
  const target = hexAnchor(state.map, f.pos!);
  const key = target.join(',');
  const height = FIGURE_HEIGHT[f.kind];
  // Animacje liczone od zegara (start + czas trwania), nie od sumy klatek — kończą się po zadanym czasie
  // nawet przy rzadkich klatkach.
  const anim = useRef<Anim>({ kind: entrance, from: target, to: target, start: animNow(), landed: false, surfaced: false });
  const lastKey = useRef(key);
  const entered = useRef(false);
  const live = useMemo(() => new Vector3(...target), []); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    if (!entered.current) {
      entered.current = true;
      if (entrance === 'summon') {
        fx.summon(target);
        sand.burst(target, 16, 0.55);
      } else sand.burst(target, 18, 0.8);
    }
    if (lastKey.current === key) return; // to samo pole (np. podwójny efekt w StrictMode) — bez ruchu
    lastKey.current = key;
    const g = group.current!;
    anim.current = { kind: 'move', from: [g.position.x, g.position.y, g.position.z], to: target, start: animNow(), landed: false, surfaced: false };
    live.copy(g.position);
    bus.moving.set(f.id, live);
  }, [key]); // eslint-disable-line react-hooks/exhaustive-deps
  useEffect(() => () => void bus.moving.delete(f.id), []); // eslint-disable-line react-hooks/exhaustive-deps

  useFrame(() => {
    const g = group.current;
    if (!g) return;
    const a = anim.current;
    const t = animNow() - a.start;
    if (a.kind === 'move') {
      // uniesienie → lot łukiem (0,6–0,9 s) → przysiad i lekkie odbicie; pył spod podstawki przy zetknięciu
      const p = movePose(a.from, a.to, t);
      g.position.set(p.pos[0], p.pos[1], p.pos[2]);
      const side = 1 / Math.sqrt(p.squash);
      g.scale.set(side, p.squash, side);
      const dx = a.to[0] - a.from[0];
      const dz = a.to[2] - a.from[2];
      const len = Math.hypot(dx, dz);
      if (len > 1e-6) g.quaternion.copy(tmpQuat.setFromAxisAngle(tmpAxis.set(dz / len, 0, -dx / len), p.lean));
      live.copy(g.position);
      if (!a.landed && t >= landingTime(a.from, a.to)) {
        a.landed = true;
        sand.dust(a.to, BASE_RADIUS);
      }
      if (p.phase === 'done') {
        a.kind = null;
        g.quaternion.identity();
        g.scale.set(1, 1, 1);
        bus.moving.delete(f.id);
      }
    } else if (a.kind === 'summon') {
      // figurka wyrasta z piasku (pod powierzchnią pola jest zasłonięta przez sam kafel)
      const p = summonPose(t, height);
      g.position.set(a.to[0], a.to[1] + p.y, a.to[2]);
      g.scale.set(p.scale, p.scale, p.scale);
      if (!a.surfaced && p.y > -height * 0.5) {
        a.surfaced = true;
        sand.burst(a.to, 22, 0.6);
      }
      if (p.done) a.kind = null;
    } else if (a.kind === 'appear') {
      const k = Math.min(1, t / APPEAR_TIME);
      const s = Math.max(0.001, easeOutBack(k));
      g.position.set(a.to[0], a.to[1], a.to[2]);
      g.scale.set(s, s, s);
      if (k >= 1) {
        a.kind = null;
        g.scale.set(1, 1, 1);
      }
    } else {
      g.position.set(target[0], target[1], target[2]);
    }
  });

  const kind = f.kind;
  const owner = state.players[f.owner];
  return (
    <group
      ref={group}
      name={`figure:${f.id}`}
      onClick={(e) => {
        if (!selectable) return;
        e.stopPropagation();
        onClick();
      }}
      onPointerOver={() => selectable && onHover(true)}
      onPointerOut={() => onHover(false)}
    >
      {/* kolorowa podstawka (połączony bóg: druga, większa podstawka partnera) */}
      {partnerColor && (
        <mesh geometry={shared.geo.baseBig} castShadow receiveShadow position={[0, -0.005, 0]}>
          <meshStandardMaterial color={partnerColor} roughness={0.4} />
        </mesh>
      )}
      <mesh geometry={shared.geo.base} castShadow receiveShadow>
        <meshStandardMaterial color={color} roughness={0.4} />
      </mesh>
      <FigureModel
        candidates={modelCandidates(f, owner.god)}
        height={height}
        color={color}
        fallback={<Pawn kind={kind} color={color} />}
      />
      {radiant && (
        <mesh geometry={shared.geo.sun} position={[0, 0.07, 0]} raycast={() => null}>
          <meshStandardMaterial color="#ffc23a" emissive="#ffb000" emissiveIntensity={2.2} toneMapped={false} />
        </mesh>
      )}
      {(selectable || selected) && (
        <mesh geometry={shared.geo.ring} material={glow} position={[0, 0.02, 0]} scale={selected ? 1.18 : 1} raycast={() => null} />
      )}
      {f.aim && <Claws from={target} aim={f.aim} color={color} state={state} />}
    </group>
  );
}

/** Szczypce skorpiona: dwa kolce wskazujące pola, w które celuje. */
function Claws({ from, aim, color, state }: { from: Vec3; aim: [string, string]; color: string; state: GameState }) {
  return (
    <group>
      {aim.map((h) => {
        const [x, z] = hexToWorld(h);
        void state;
        const ang = Math.atan2(x - from[0], z - from[2]);
        return (
          <mesh key={h} position={[Math.sin(ang) * 0.45, 0.25, Math.cos(ang) * 0.45]} rotation={[Math.PI / 2, 0, -ang]} raycast={() => null}>
            <coneGeometry args={[0.05, 0.28, 8]} />
            <meshStandardMaterial color={color} emissive={color} emissiveIntensity={0.6} />
          </mesh>
        );
      })}
    </group>
  );
}

// ---------- polegli: zapadają się w piasek ----------

interface GhostData {
  key: string;
  pos: Vec3;
  kind: Figure['kind'];
  color: string;
  born: number;
}

/** Figurki, które właśnie zniknęły z planszy (śmierć/usunięcie) — animowane przez chwilę. */
function useGhosts(state: GameState): GhostData[] {
  const prev = useRef<Map<string, { pos: Vec3; kind: Figure['kind']; color: string }>>(new Map());
  const [ghosts, setGhosts] = useState<GhostData[]>([]);
  useEffect(() => {
    const now = animNow();
    const current = new Map<string, { pos: Vec3; kind: Figure['kind']; color: string }>();
    for (const f of Object.values(state.figures)) {
      if (f.pos) current.set(f.id, { pos: hexAnchor(state.map, f.pos), kind: f.kind, color: GODS[state.players[f.owner].god].color });
    }
    const gone: GhostData[] = [];
    for (const [id, v] of prev.current) if (!current.has(id)) gone.push({ key: `${id}-${now}`, ...v, born: now });
    prev.current = current;
    if (gone.length) setGhosts((g) => [...g.filter((x) => now - x.born < DEATH_TIME), ...gone]);
  }, [state]);
  return ghosts;
}

function Ghost({ ghost }: { ghost: GhostData }) {
  const sand = useSand();
  const ref = useRef<Group>(null);
  const mat = useMemo(() => new MeshStandardMaterial({ color: ghost.color, transparent: true, roughness: 0.5 }), [ghost.color]);
  useEffect(() => sand.burst(ghost.pos, 26, 1), []); // eslint-disable-line react-hooks/exhaustive-deps
  useFrame(() => {
    const t = Math.min(1, (animNow() - ghost.born) / DEATH_TIME);
    if (!ref.current) return;
    ref.current.position.set(ghost.pos[0], ghost.pos[1] - t * 0.5, ghost.pos[2]);
    ref.current.visible = t < 1;
    mat.opacity = 1 - t;
  });
  return (
    <group ref={ref}>
      <mesh geometry={shared.geo[ghost.kind]} material={mat} scale={PAWN_SCALE} raycast={() => null} />
    </group>
  );
}
