import { useEffect, useMemo, useRef, useState } from 'react';
import { botMove, nextBotSeat, type Controller } from '../bot';
import { GODS } from '../content/gods';
import { SCENARIOS } from '../config/scenarios';
import {
  applyMove, computeRegions, createGame, deserializeGame, legalMoves, serializeGame, viewFor,
} from '../engine';
import { godName } from '../engine/util';
import type { GameState, GodId, Move, PlayerId } from '../engine/types';
import { ActionPanel } from './ActionPanel';
import { BattlePanel } from './BattlePanel';
import { Board } from './Board';
import { EventLog } from './EventLog';
import { defaultSelection, interactionFor, type Selection } from './interaction';
import { PlayerPanel } from './PlayerPanel';
import { SecretDecision } from './SecretDecision';
import { deleteSave, downloadSave, listSaves, storeSave, type StoredSave } from './storage';
import { Tracks } from './Tracks';

/** Opóźnienie ruchu bota (ms), żeby dało się śledzić grę. */
export const BOT_DELAY = 400;

const CONTROLLER_LABEL: Record<Controller, string> = {
  human: 'Człowiek',
  random: 'Bot losowy',
  heuristic: 'Bot heurystyczny',
};

interface Game {
  state: GameState;
  controllers: Controller[];
  name: string;
}

export function App({ initial, controllers }: { initial?: GameState; controllers?: Controller[] }) {
  const [game, setGame] = useState<Game | null>(
    initial ? { state: initial, controllers: controllers ?? initial.players.map(() => 'human'), name: 'Partia' } : null,
  );
  if (!game) return <NewGame onStart={setGame} />;
  return <GameScreen game={game} setState={(state) => setGame({ ...game, state })} onNew={() => setGame(null)} />;
}

function GameScreen({ game, setState, onNew }: { game: Game; setState(s: GameState): void; onNew(): void }) {
  const { state, controllers } = game;
  const legal = useMemo(() => legalMoves(state), [state]);
  const [sel, setSel] = useState<Selection>(() => defaultSelection(legal));
  const [revealedFor, setRevealedFor] = useState<PlayerId | null>(null);
  const [message, setMessage] = useState<string | null>(null);

  const pending = state.pending;
  const botSeat = state.result ? null : nextBotSeat(state, controllers);
  const humans = controllers.filter((c) => c === 'human').length;
  const secretWaiting = pending && 'waiting' in pending ? pending.waiting : [];
  const secretPlayer = botSeat === null ? (secretWaiting.find((p) => controllers[p] === 'human') ?? null) : null;
  // Jeden człowiek przy stole — nie trzeba ekranu przekazania urządzenia.
  const revealed = secretPlayer !== null && (revealedFor === secretPlayer || humans === 1);
  // W trakcie tajnej decyzji pokazujemy tylko widok decydującego (albo nikogo — przed odsłonięciem).
  const view = secretWaiting.length ? viewFor(state, revealed ? secretPlayer : null) : state;
  const humanTurn = botSeat === null && secretWaiting.length === 0;
  const interaction = interactionFor(humanTurn ? legal : [], sel);
  const regionTint = useMemo(() => {
    if (pending?.kind !== 'caravanKeep') return undefined;
    const { landRegion, regions } = computeRegions(state.map);
    const tint = new Map<string, string>();
    pending.regions.forEach((rep, i) => regions[landRegion[rep]].forEach((h) => tint.set(h, i === 0 ? 'a' : 'b')));
    return tint;
  }, [state, pending]);

  const dispatch = (m: Move) => {
    try {
      const next = applyMove(state, m);
      setState(next);
      setSel(defaultSelection(legalMoves(next)));
      setRevealedFor(null);
      setMessage(null);
    } catch (e) {
      setMessage((e as Error).message);
    }
  };

  // Boty grają same, z niewielkim opóźnieniem.
  const dispatchRef = useRef(dispatch);
  dispatchRef.current = dispatch;
  useEffect(() => {
    if (botSeat === null) return;
    const t = setTimeout(() => {
      const kind = controllers[botSeat] as Exclude<Controller, 'human'>;
      const m = botMove(state, botSeat, kind, state.rng ^ state.log.length);
      if (m) dispatchRef.current(m);
    }, BOT_DELAY);
    return () => clearTimeout(t);
  }, [state, botSeat, controllers]);

  const save = (download: boolean) => {
    const savedAt = new Date().toISOString();
    const name = `${game.name} — tura ${state.turnNumber}`;
    const data = serializeGame(state, { name, savedAt, controllers });
    if (download) downloadSave(name, data);
    else setMessage(storeSave({ id: savedAt, name, savedAt, data }) ? 'Zapisano w przeglądarce.' : 'Nie udało się zapisać w przeglądarce — pobierz plik.');
  };

  const activeIds = [...(pending ? ('waiting' in pending ? pending.waiting : [pending.player]) : []), state.turn.player];

  return (
    <div className="app">
      <header className="topbar">
        <h1>Panteon Nilu</h1>
        <span className="muted">Tura {state.turnNumber}</span>
        <span className="topbar-actions">
          <button className="ghost" onClick={() => save(false)} data-save>Zapisz</button>
          <button className="ghost" onClick={() => save(true)} data-download>Pobierz zapis</button>
          <button className="ghost" onClick={onNew}>Nowa gra</button>
        </span>
      </header>
      <main className="layout">
        <div className="board-wrap">
          <Board
            state={view}
            interaction={interaction}
            selectedFigure={sel.figure}
            regionTint={regionTint}
            onFigure={(id) => setSel({ ...sel, figure: id, pushTo: undefined })}
            onHex={(h) => {
              const a = interaction.hexActions.get(h);
              if (a?.kind === 'move') dispatch(a.move);
              else if (a?.kind === 'select') setSel(a.sel);
            }}
            onEdge={(e) => {
              const cur = sel.camels ?? [];
              setSel({ camels: cur.includes(e) ? cur.filter((x) => x !== e) : [...cur, e] });
            }}
            onMonument={(id) => {
              const m = interaction.monumentMoves.get(id);
              if (m) dispatch(m);
            }}
          />
        </div>
        <aside className="side">
          {message && <p className="message" role="status">{message}</p>}
          {botSeat !== null && (
            <section className="decision" data-bot-thinking>
              <h2>{godName(state, botSeat)} ({CONTROLLER_LABEL[controllers[botSeat]]}) myśli…</h2>
            </section>
          )}
          {humanTurn && (
            <ActionPanel state={view} legal={legal} sel={sel} interaction={interaction} setSel={setSel} dispatch={dispatch} />
          )}
          <BattlePanel state={view} />
          <div className="players">
            {view.players.map((p) => (
              <PlayerPanel key={p.id} state={view} player={p.id} active={activeIds.includes(p.id)} controller={CONTROLLER_LABEL[controllers[p.id]]} />
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
              {state.result.winners.length ? state.result.winners.map((w) => GODS[state.players[w].god].name).join(' i ') : 'nikt — przegrywają wszyscy'}
            </p>
            <button onClick={onNew}>Nowa gra</button>
          </div>
        </div>
      )}
    </div>
  );
}

const GOD_IDS = Object.keys(GODS) as GodId[];

function NewGame({ onStart }: { onStart(g: Game): void }) {
  const [count, setCount] = useState(2);
  const [gods, setGods] = useState<GodId[]>(GOD_IDS.slice(0, 5));
  const [ctrls, setCtrls] = useState<Controller[]>(['human', 'human', 'human', 'human', 'human']);
  const scenarios = Object.values(SCENARIOS).filter((s) => s.playerCounts.includes(count));
  const [scenarioPick, setScenario] = useState(scenarios[0]?.id);
  const scenario = scenarios.some((s) => s.id === scenarioPick) ? scenarioPick : scenarios[0]?.id;
  const [seed, setSeed] = useState(() => String(Math.floor(Math.random() * 1e6)));
  const [saves, setSaves] = useState<StoredSave[]>(() => listSaves());
  const [error, setError] = useState<string | null>(null);
  const chosen = gods.slice(0, count);
  const valid = new Set(chosen).size === count && !!scenario;

  const start = () => {
    const state = createGame({ scenario: scenario!, gods: chosen, seed });
    // Kolejność przy stole zaczyna się od losowo wybranego gracza — sterowanie przypisujemy wg boga.
    const controllers = state.players.map((p) => ctrls[chosen.indexOf(p.god)]);
    onStart({ state, controllers, name: chosen.map((g) => GODS[g].name).join(', ') });
  };

  const load = (data: string) => {
    try {
      const file = deserializeGame(data);
      const controllers = (file.controllers as Controller[] | undefined) ?? file.state.players.map(() => 'human' as const);
      onStart({ state: file.state, controllers, name: file.name.replace(/ — tura \d+$/, '') });
    } catch (e) {
      setError((e as Error).message);
    }
  };

  return (
    <div className="newgame">
      <h1>Panteon Nilu</h1>
      <p className="muted">Gra strategiczna dla 2–5 bogów — ludzie przy jednym urządzeniu (hot-seat) i boty.</p>
      <label>
        Liczba graczy
        <select value={count} onChange={(e) => setCount(Number(e.target.value))} data-player-count>
          {[2, 3, 4, 5].map((n) => <option key={n} value={n}>{n}</option>)}
        </select>
      </label>
      {chosen.map((g, i) => (
        <div key={i} className="seat-row">
          <label>
            Gracz {i + 1}
            <select
              value={g}
              onChange={(e) => setGods(gods.map((x, j) => (j === i ? (e.target.value as GodId) : x)))}
              data-god-select={i}
            >
              {GOD_IDS.map((id) => (
                <option key={id} value={id}>{GODS[id].name} — {GODS[id].epithet}</option>
              ))}
            </select>
          </label>
          <label>
            Steruje
            <select
              value={ctrls[i]}
              onChange={(e) => setCtrls(ctrls.map((x, j) => (j === i ? (e.target.value as Controller) : x)))}
              data-controller-select={i}
            >
              {(Object.keys(CONTROLLER_LABEL) as Controller[]).map((c) => (
                <option key={c} value={c}>{CONTROLLER_LABEL[c]}</option>
              ))}
            </select>
          </label>
        </div>
      ))}
      <label>
        Mapa
        <select value={scenario} onChange={(e) => setScenario(e.target.value)}>
          {scenarios.map((s) => <option key={s.id} value={s.id}>{s.name}</option>)}
        </select>
      </label>
      <label>
        Ziarno losowania
        <input value={seed} onChange={(e) => setSeed(e.target.value)} data-seed />
      </label>
      {!valid && <p className="error">Każdy gracz musi mieć innego boga.</p>}
      <button disabled={!valid} onClick={start} data-start>Rozpocznij</button>

      <h2>Wczytaj grę</h2>
      {error && <p className="error" role="alert">{error}</p>}
      {saves.length === 0 && <p className="muted small">Brak zapisów w tej przeglądarce.</p>}
      <ul className="saves">
        {saves.map((s) => (
          <li key={s.id}>
            <button onClick={() => load(s.data)} data-load-save={s.id}>{s.name}</button>
            <span className="muted small">{new Date(s.savedAt).toLocaleString('pl-PL')}</span>
            <button className="ghost" aria-label={`Usuń zapis ${s.name}`} onClick={() => { deleteSave(s.id); setSaves(listSaves()); }}>✕</button>
          </li>
        ))}
      </ul>
      <label>
        Wczytaj z pliku
        <input
          type="file"
          accept="application/json,.json"
          data-load-file
          onChange={async (e) => {
            const f = e.target.files?.[0];
            if (f) load(await f.text());
          }}
        />
      </label>
    </div>
  );
}
