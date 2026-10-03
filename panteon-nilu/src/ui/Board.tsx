import { GODS } from '../content/gods';
import { GUARDIANS } from '../content/guardians';
import { computeRegions, regionsInConflictOrder } from '../engine/map';
import type { Figure, GameState, HexKey, Monument } from '../engine/types';
import type { Interaction } from './interaction';
import { boardBounds, edgeSegment, HEX_R, hexCenter, hexCorners, pointsAttr } from './layout';
import { MONUMENT_LABEL } from './labels';

interface Props {
  state: GameState;
  interaction: Interaction;
  selectedFigure?: string;
  onHex(h: HexKey): void;
  onFigure(id: string): void;
  onMonument(id: string): void;
}

const TERRAIN_FILL = { fertile: 'var(--fertile)', desert: 'var(--desert)', water: 'var(--water)' };

export function Board({ state, interaction, selectedFigure, onHex, onFigure, onMonument }: Props) {
  const hexes = Object.keys(state.map.terrain);
  const b = boardBounds(hexes);
  const figures = Object.values(state.figures).filter((f) => f.pos !== null);
  const monuments = Object.values(state.monuments);
  const color = (p: number | null) => (p === null ? 'var(--neutral)' : GODS[state.players[p].god].color);
  const battleRegion = state.battle?.region;
  const { landRegion } = computeRegions(state.map);

  return (
    <svg
      className="board"
      viewBox={`${b.minX} ${b.minY} ${b.width} ${b.height}`}
      role="img"
      aria-label="Plansza"
    >
      <g>
        {hexes.map((h) => {
          const target = interaction.hexMoves.has(h);
          const inBattle = battleRegion !== undefined && landRegion[h] === battleRegion;
          return (
            <polygon
              key={h}
              data-hex={h}
              data-target={target || undefined}
              points={pointsAttr(hexCorners(h, HEX_R - 0.5))}
              fill={TERRAIN_FILL[state.map.terrain[h]]}
              className={`hex${target ? ' hex-target' : ''}${inBattle ? ' hex-battle' : ''}`}
              onClick={() => target && onHex(h)}
            />
          );
        })}
      </g>
      <g className="rivers">
        {state.map.rivers.map((e) => {
          const [p, q] = edgeSegment(e);
          return <line key={e} x1={p.x} y1={p.y} x2={q.x} y2={q.y} className="river" />;
        })}
        {state.map.camels.map((e) => {
          const [p, q] = edgeSegment(e);
          return <line key={e} x1={p.x} y1={p.y} x2={q.x} y2={q.y} className="camel" />;
        })}
      </g>
      <g className="tokens">
        {regionsInConflictOrder(state).map(({ token, region }) => {
          const c = regionBadgePoint(state, region);
          return (
            <g key={token} transform={`translate(${c.x},${c.y})`} className="region-token">
              <rect x={-11} y={-11} width={22} height={22} rx={4} />
              <text y={5}>{token}</text>
            </g>
          );
        })}
      </g>
      <g>
        {monuments.map((m) => (
          <MonumentShape
            key={m.id}
            m={m}
            color={color(m.owner)}
            selectable={interaction.monumentMoves.has(m.id)}
            onClick={() => interaction.monumentMoves.has(m.id) && onMonument(m.id)}
          />
        ))}
      </g>
      <g>
        {figures.map((f) => (
          <FigureShape
            key={f.id}
            f={f}
            color={color(f.owner)}
            selected={selectedFigure === f.id}
            selectable={interaction.selectableFigures.has(f.id)}
            onClick={() => interaction.selectableFigures.has(f.id) && onFigure(f.id)}
          />
        ))}
      </g>
      {/* pola docelowe nad figurkami, by dało się je kliknąć */}
      <g>
        {[...interaction.hexMoves.keys()].map((h) => {
          const c = hexCenter(h);
          return (
            <circle key={h} cx={c.x} cy={c.y} r={7} className="target-dot" onClick={() => onHex(h)} data-target-dot={h} />
          );
        })}
      </g>
    </svg>
  );
}

/** Miejsce na żeton regionu: wolne pole lądowe regionu najbliżej jego środka ciężkości. */
function regionBadgePoint(state: GameState, region: number) {
  const all = computeRegions(state.map).regions[region];
  const taken = new Set([
    ...Object.values(state.figures).map((f) => f.pos),
    ...Object.values(state.monuments).map((m) => m.pos),
  ]);
  const free = all.filter((h) => !taken.has(h));
  const cs = (free.length ? free : all).map(hexCenter);
  const cx = cs.reduce((s, c) => s + c.x, 0) / cs.length;
  const cy = cs.reduce((s, c) => s + c.y, 0) / cs.length;
  const best = cs.reduce((a, c) => (Math.hypot(c.x - cx, c.y - cy) < Math.hypot(a.x - cx, a.y - cy) ? c : a));
  return best;
}

function MonumentShape({ m, color, selectable, onClick }: { m: Monument; color: string; selectable: boolean; onClick(): void }) {
  const c = hexCenter(m.pos);
  const shape =
    m.type === 'obelisk' ? (
      <polygon points="-5,14 5,14 3.5,-10 0,-16 -3.5,-10" />
    ) : m.type === 'temple' ? (
      <g>
        <polygon points="-15,-4 0,-14 15,-4" />
        <rect x={-13} y={-4} width={26} height={4} />
        <rect x={-11} y={0} width={4} height={10} />
        <rect x={-2} y={0} width={4} height={10} />
        <rect x={7} y={0} width={4} height={10} />
        <rect x={-14} y={10} width={28} height={4} />
      </g>
    ) : (
      <polygon points="-16,13 16,13 0,-14" />
    );
  return (
    <g
      transform={`translate(${c.x},${c.y})`}
      className={`monument${selectable ? ' monument-selectable' : ''}`}
      style={{ stroke: color }}
      onClick={onClick}
      data-monument={m.id}
    >
      <title>{`${MONUMENT_LABEL[m.type]}${m.owner === null ? ' (neutralny)' : ''}`}</title>
      {shape}
      {m.owner !== null && <circle cx={11} cy={-11} r={5} fill={color} className="owner-dot" />}
    </g>
  );
}

function FigureShape({
  f, color, selected, selectable, onClick,
}: { f: Figure; color: string; selected: boolean; selectable: boolean; onClick(): void }) {
  const c = hexCenter(f.pos!);
  const cls = `figure${selectable ? ' figure-selectable' : ''}${selected ? ' figure-selected' : ''}`;
  const label = f.kind === 'guardian' ? GUARDIANS[f.guardian!].name : f.kind === 'god' ? 'Bóg' : 'Wojownik';
  return (
    <g transform={`translate(${c.x},${c.y})`} className={cls} onClick={onClick} data-figure={f.id}>
      <title>{label}</title>
      {f.kind === 'god' && (
        <>
          <circle r={16} fill={color} />
          <path d="M0,-9 a4,4 0 1,1 0.1,0 M0,-5 v14 M-6,-1 h12" className="ankh" />
        </>
      )}
      {f.kind === 'warrior' && <circle r={9} fill={color} />}
      {f.kind === 'guardian' && (
        <>
          <rect x={-11} y={-11} width={22} height={22} rx={3} transform="rotate(45)" fill={color} />
          <text y={4} className="guardian-letter">{GUARDIANS[f.guardian!].name[0]}</text>
        </>
      )}
    </g>
  );
}
