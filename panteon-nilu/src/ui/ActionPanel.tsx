import { ANKH_POWERS } from '../content/ankhPowers';
import type { ActionType } from '../config/rules';
import { DIRECTIONS, parseHex } from '../engine/hex';
import type { GameState, HexKey, MonumentType, Move } from '../engine/types';
import type { Interaction, Selection } from './interaction';
import { godName } from '../engine/util';
import { ACTION_HINT, ACTION_LABEL, MONUMENT_LABEL, figureLabel, seatLabel } from './labels';

interface Props {
  state: GameState;
  legal: Move[];
  sel: Selection;
  interaction: Interaction;
  setSel(s: Selection): void;
  dispatch(m: Move): void;
}

const ARROWS = ['→ wschód', '↗ płn.-wsch.', '↖ płn.-zach.', '← zachód', '↙ płd.-zach.', '↘ płd.-wsch.'];

function direction(from: HexKey, to: HexKey): string {
  const a = parseHex(from);
  const b = parseHex(to);
  const i = DIRECTIONS.findIndex((d) => d.q === b.q - a.q && d.r === b.r - a.r);
  return ARROWS[i] ?? to;
}

/** Panel decyzji jawnych (jednego gracza). Wszystkie przyciski pochodzą z listy legalnych ruchów. */
export function ActionPanel({ state, legal, sel, interaction, setSel, dispatch }: Props) {
  const pending = state.pending;
  if (!pending || 'waiting' in pending) return null;
  const who = pending.kind === 'chooseAction' ? seatLabel(state, pending.player) : godName(state, pending.player);
  const player = pending.player;
  const of = <T extends Move['type']>(t: T) => legal.filter((m): m is Extract<Move, { type: T }> => m.type === t);
  const radiantToggle = (moves: { radiant: boolean }[]) =>
    moves.some((m) => m.radiant) && (
      <label className="toggle">
        <input type="checkbox" checked={!!sel.radiant} onChange={(e) => setSel({ ...sel, radiant: e.target.checked })} data-radiant />
        Nadaj słońce (promienna figurka)
      </label>
    );

  switch (pending.kind) {
    case 'chooseAction': {
      const allowed = new Set(of('chooseAction').map((m) => m.action));
      const second = state.turn.actions.length > 0;
      return (
        <Box title={`${who}: ${second ? 'druga akcja (niżej na liście)' : 'wybierz akcję'}`}>
          <div className="actions">
            {state.rules.actionOrder.map((a: ActionType) => (
              <button key={a} disabled={!allowed.has(a)} onClick={() => dispatch({ type: 'chooseAction', player, action: a })} data-action={a}>
                <b>{ACTION_LABEL[a]}</b>
                <small>{ACTION_HINT[a]}</small>
              </button>
            ))}
          </div>
        </Box>
      );
    }
    case 'move':
      return (
        <Box title={`${who}: ruch`}>
          <p>
            Kliknij swoją figurkę, potem pole docelowe. Każda figurka rusza się raz.
            {sel.pushTo && ' Wybierz pole, na które zepchniesz wroga.'}
          </p>
          {sel.pushTo && <button onClick={() => setSel({ figure: sel.figure })}>Anuluj spychanie</button>}
          <button onClick={() => dispatch({ type: 'endMove', player })} data-end-move>Zakończ ruch</button>
        </Box>
      );
    case 'summon': {
      const moves = of('summon');
      const figs = [...new Set(moves.map((m) => m.figure))];
      const extras = new Set(moves.filter((m) => m.source !== 'regular').map((m) => m.source));
      const end = of('endSummon')[0];
      return (
        <Box title={`${who}: przywołanie`}>
          <p>Wybierz figurkę, potem podświetlone pole.{extras.size > 0 && ` Dodatkowe przywołania: ${extras.size}.`}</p>
          <div className="choices">
            {figs.map((id) => (
              <button key={id} className={sel.figure === id ? 'on' : ''} onClick={() => setSel({ ...sel, figure: id })} data-summon-figure={id}>
                {figureLabel(state, id)}
              </button>
            ))}
          </div>
          {radiantToggle(moves)}
          {end && <button onClick={() => dispatch(end)} data-end-summon>Zakończ przywoływanie</button>}
        </Box>
      );
    }
    case 'unlock':
      return (
        <Box title={`${who}: odblokuj moc poziomu ${pending.level}`}>
          <div className="choices column">
            {of('unlockPower').map((m) => (
              <button key={m.power} onClick={() => dispatch(m)} data-power={m.power}>
                <b>{ANKH_POWERS[m.power].name}</b> <small>{ANKH_POWERS[m.power].text}</small>
              </button>
            ))}
          </div>
        </Box>
      );
    case 'controlMonument':
      return <Box title={`${who}: przejęcie monumentu`}><p>Kliknij podświetlony monument, który przejmujesz.</p></Box>;
    case 'build': {
      const types = [...new Set(of('build').map((m) => m.monument))] as MonumentType[];
      return (
        <Box title={`${who}: budowa monumentu`}>
          <div className="choices">
            {types.map((t) => (
              <button key={t} className={sel.monumentType === t ? 'on' : ''} onClick={() => setSel({ monumentType: t })}>
                {MONUMENT_LABEL[t]}
              </button>
            ))}
          </div>
          <p>Kliknij podświetlone pole w regionie bitwy.</p>
          <button onClick={() => dispatch({ type: 'skipBuild', player })}>Nie buduję</button>
        </Box>
      );
    }
    case 'tiebreaker':
      return (
        <Box title={`${who}: remis!`}>
          <p>Masz żeton rozstrzygający. Użyć go teraz i wygrać tę bitwę? (Działa raz na konflikt.)</p>
          <Choices legal={legal} dispatch={dispatch} label={(m) => ((m as { use: boolean }).use ? 'Użyj żetonu' : 'Zachowaj')} />
        </Box>
      );
    case 'aimScorpion': {
      const pos = state.figures[pending.figure].pos!;
      return (
        <Box title={`${who}: wyceluj szczypce skorpiona`}>
          <p>Skorpion na początku konfliktu niszczy sąsiednie monumenty na wskazanych polach.</p>
          <Choices
            legal={legal}
            dispatch={dispatch}
            label={(m) => (m as { aim: [HexKey, HexKey] }).aim.map((h) => direction(pos, h)).join(' + ')}
          />
        </Box>
      );
    }
    case 'caravan':
      return (
        <Box title={`${who}: karawana`}>
          <p>
            Klikaj krawędzie heksów, by ułożyć linię do 6 wielbłądów, która dzieli region na dwa (każdy ≥ 6 pól).
            Wybrane: {interaction.selectedEdges.size}.
          </p>
          <div className="choices">
            <button disabled={!interaction.caravanMove} onClick={() => interaction.caravanMove && dispatch(interaction.caravanMove)} data-caravan-confirm>
              Zatwierdź linię
            </button>
            <button className="ghost" onClick={() => setSel({ camels: [] })}>Wyczyść</button>
          </div>
        </Box>
      );
    case 'caravanKeep':
      return (
        <Box title={`${who}: który region zachowa żeton ${pending.token}?`}>
          <p>Drugi region dostanie najniższy żeton z zapasu.</p>
          <div className="choices">
            {of('caravanKeep').map((m, i) => (
              <button key={m.region} onClick={() => dispatch(m)} className={`tint-${i === 0 ? 'a' : 'b'}`} data-keep={m.region}>
                Region {i === 0 ? 'A (czerwonawy)' : 'B (niebieskawy)'}
              </button>
            ))}
          </div>
        </Box>
      );
    case 'caravanSwap':
      return (
        <Box title={`${who}: zamiana żetonów kolejności`}>
          <Choices
            legal={legal}
            dispatch={dispatch}
            label={(m) => {
              const swap = (m as { swap: [number, number] | null }).swap;
              return swap ? `Zamień ${swap[0]} ↔ ${swap[1]}` : 'Bez zamiany';
            }}
          />
        </Box>
      );
    case 'obeliskMove':
      return (
        <Box title={`${who}: Zew obelisków`}>
          <p>Możesz przestawić swoją figurkę na wolne pole obok swojego obelisku w regionie bitwy (po jednej, na zmianę).</p>
          <button onClick={() => dispatch({ type: 'obeliskDone', player })} data-obelisk-done>Koniec przestawiania</button>
        </Box>
      );
    case 'amunAnnounce':
      return (
        <Box title={`${who}: dwie karty w tej bitwie?`}>
          <p>Raz na konflikt możesz zagrać dwie karty naraz. Zapowiedź jest jawna — rywale wiedzą o niej przed wyborem.</p>
          <Choices legal={legal} dispatch={dispatch} label={(m) => ((m as { use: boolean }).use ? 'Zagram dwie karty' : 'Jedna karta')} />
        </Box>
      );
    case 'anubisTrap':
      return (
        <Box title={`${who}: uwięzić poległego wojownika?`}>
          <Choices legal={legal} dispatch={dispatch} label={(m) => {
            const f = (m as { figure: string | null }).figure;
            return f ? `Uwięź: ${figureLabel(state, f)}` : 'Nie więź';
          }} />
        </Box>
      );
    case 'isisProtect':
      return (
        <Box title={`${who}: ocal chronione figurki`}>
          <p>Te figurki stoją obok wroga — możesz je ocalić w rozstrzygnięciu.</p>
          <Choices legal={legal} dispatch={dispatch} label={(m) => {
            const f = (m as { figure: string | null }).figure;
            return f ? `Ocal: ${figureLabel(state, f)}` : 'Gotowe';
          }} />
        </Box>
      );
    case 'underworld': {
      const moves = of('underworld').filter((m) => m.to !== null);
      const froms = [...new Set(moves.map((m) => m.from))];
      return (
        <Box title={`${who}: wrota zaświatów`}>
          <div className="choices">
            {froms.map((f) => (
              <button key={String(f)} className={(sel.underworldFrom ?? null) === f ? 'on' : ''} onClick={() => setSel({ underworldFrom: f })}>
                {f === null ? 'Nowe wrota' : `Przenieś z ${f}`}
              </button>
            ))}
          </div>
          <p>Kliknij wolne pole w regionie bitwy.</p>
          <button onClick={() => dispatch({ type: 'underworld', player, from: null, to: null })}>Pomiń</button>
        </Box>
      );
    }
    case 'worshipful':
      return (
        <Box title={`${who}: Uwielbienie`}>
          <Choices legal={legal} dispatch={dispatch} label={(m) => ((m as { use: boolean }).use ? 'Poświęć 2 wyznawców za 1 oddania' : 'Nie')} />
        </Box>
      );
    case 'mergeGuardians':
      return (
        <Box title={`${who}: strażnicy wchłoniętego boga`}>
          <p>Brakuje podstawek na wszystkich. Wybierz, których zatrzymać — pozostali opuszczą grę.</p>
          <Choices legal={legal} dispatch={dispatch} label={(m) => {
            const f = (m as { figure: string | null }).figure;
            return f ? `Zatrzymaj: ${figureLabel(state, f)}` : 'Koniec wyboru';
          }} />
        </Box>
      );
    case 'mummyReturn':
      return (
        <Box title={`${who}: mumia powstaje`}>
          <p>Kliknij pole obok swojego boga.</p>
          {radiantToggle(of('mummyReturn'))}
        </Box>
      );
  }
}

function Choices({ legal, dispatch, label }: { legal: Move[]; dispatch(m: Move): void; label(m: Move): string }) {
  return (
    <div className="choices">
      {legal.map((m, i) => (
        <button key={i} onClick={() => dispatch(m)} data-choice={i}>
          {label(m)}
        </button>
      ))}
    </div>
  );
}

function Box({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section className="decision" aria-live="polite">
      <h2>{title}</h2>
      {children}
    </section>
  );
}
