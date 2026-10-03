import { useMemo, useState } from 'react';
import { GODS } from '../content/gods';
import { SCENARIOS } from '../config/scenarios';
import { applyMove, createGame, legalMoves, viewFor } from '../engine';
import type { GameState, GodId, Move, PlayerId } from '../engine/types';
import { ActionPanel } from './ActionPanel';
import { BattlePanel } from './BattlePanel';
import { Board } from './Board';
import { EventLog } from './EventLog';
import { defaultSelection, interactionFor, type Selection } from './interaction';
import { PlayerPanel } from './PlayerPanel';
import { SecretDecision } from './SecretDecision';
import { Tracks } from './Tracks';

export function App({ initial }: { initial?: GameState }) {
  const [state, setState] = useState<GameState | null>(initial ?? null);
  if (!state) return <NewGame onStart={setState} />;
  return <GameScreen state={state} setState={setState} onNew={() => setState(null)} />;
}

function GameScreen({ state, setState, onNew }: { state: GameState; setState(s: GameState): void; onNew(): void }) {
  const legal = useMemo(() => legalMoves(state), [state]);
  const [sel, setSel] = useState<Selection>(() => defaultSelection(legal));
  const [revealedFor, setRevealedFor] = useState<PlayerId | null>(null);
  const [error, setError] = useState<string | null>(null);

  const pending = state.pending;
  const secretPlayer = pending && 'waiting' in pending ? pending.waiting[0] : null;
  const revealed = secretPlayer !== null && revealedFor === secretPlayer;
  // W trakcie tajnej decyzji pokazujemy tylko widok decydującego (albo nikogo — przed odsłonięciem).
  const view = secretPlayer !== null ? viewFor(state, revealed ? secretPlayer : null) : state;
  const interaction = interactionFor(secretPlayer !== null ? [] : legal, sel);

  const dispatch = (m: Move) => {
    try {
      const next = applyMove(state, m);
      setState(next);
      setSel(defaultSelection(legalMoves(next)));
      setRevealedFor(null);
      setError(null);
    } catch (e) {
      setError((e as Error).message);
    }
  };

  const activeIds = pending ? ('waiting' in pending ? pending.waiting : [pending.player]) : [];

  return (
    <div className="app">
      <header className="topbar">
        <h1>Panteon Nilu</h1>
        <span className="muted">Tura {state.turnNumber}</span>
        <button className="ghost" onClick={onNew}>Nowa gra</button>
      </header>
      <main className="layout">
        <div className="board-wrap">
          <Board
            state={view}
            interaction={interaction}
            selectedFigure={sel.figure}
            onFigure={(id) => setSel({ figure: id })}
            onHex={(h) => {
              const m = interaction.hexMoves.get(h);
              if (m) dispatch(m);
            }}
            onMonument={(id) => {
              const m = interaction.monumentMoves.get(id);
              if (m) dispatch(m);
            }}
          />
        </div>
        <aside className="side">
          {error && <p className="error" role="alert">{error}</p>}
          <ActionPanel state={view} legal={legal} sel={sel} setSel={setSel} dispatch={dispatch} />
          <BattlePanel state={view} />
          <div className="players">
            {view.players.map((p) => (
              <PlayerPanel key={p.id} state={view} player={p.id} active={activeIds.includes(p.id)} />
            ))}
          </div>
          <Tracks state={view} />
          <EventLog state={view} />
        </aside>
      </main>
      {secretPlayer !== null && (
        <SecretDecision
          view={view}
          player={secretPlayer}
          legal={legal}
          revealed={revealed}
          onReveal={() => setRevealedFor(secretPlayer)}
          dispatch={dispatch}
        />
      )}
      {state.result && (
        <div className="handoff" role="dialog" aria-label="Koniec gry">
          <div className="handoff-box">
            <h2>Koniec gry</h2>
            <p>{state.result.reason}</p>
            <p>
              Zwycięzca:{' '}
              {state.result.winners.length ? state.result.winners.map((w) => GODS[state.players[w].god].name).join(' i ') : 'nikt'}
            </p>
            <button onClick={onNew}>Nowa gra</button>
          </div>
        </div>
      )}
    </div>
  );
}

const GOD_IDS = Object.keys(GODS) as GodId[];

function NewGame({ onStart }: { onStart(s: GameState): void }) {
  const scenarios = Object.values(SCENARIOS).filter((s) => s.playerCounts.includes(2));
  const [gods, setGods] = useState<GodId[]>(['amun', 'ra']);
  const [scenario, setScenario] = useState(scenarios[0].id);
  const [seed, setSeed] = useState(() => String(Math.floor(Math.random() * 1e6)));
  const valid = gods[0] !== gods[1];
  return (
    <div className="newgame">
      <h1>Panteon Nilu</h1>
      <p className="muted">Gra strategiczna dla 2 bogów przy jednym urządzeniu (hot-seat).</p>
      {[0, 1].map((i) => (
        <label key={i}>
          Gracz {i + 1}
          <select
            value={gods[i]}
            onChange={(e) => setGods(i === 0 ? [e.target.value as GodId, gods[1]] : [gods[0], e.target.value as GodId])}
            data-god-select={i}
          >
            {GOD_IDS.map((g) => (
              <option key={g} value={g}>{GODS[g].name} — {GODS[g].epithet}</option>
            ))}
          </select>
        </label>
      ))}
      <label>
        Mapa
        <select value={scenario} onChange={(e) => setScenario(e.target.value)}>
          {scenarios.map((s) => <option key={s.id} value={s.id}>{s.name}</option>)}
        </select>
      </label>
      <label>
        Ziarno losowania
        <input value={seed} onChange={(e) => setSeed(e.target.value)} />
      </label>
      {!valid && <p className="error">Każdy gracz musi mieć innego boga.</p>}
      <button disabled={!valid} onClick={() => onStart(createGame({ scenario, gods, seed }))} data-start>
        Rozpocznij
      </button>
    </div>
  );
}
