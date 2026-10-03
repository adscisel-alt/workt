import { ANKH_POWERS } from '../content/ankhPowers';
import { GODS } from '../content/gods';
import { GUARDIANS } from '../content/guardians';
import type { ActionType } from '../config/rules';
import type { GameState, MonumentType, Move } from '../engine/types';
import type { Selection } from './interaction';
import { ACTION_HINT, ACTION_LABEL, MONUMENT_LABEL } from './labels';

interface Props {
  state: GameState;
  legal: Move[];
  sel: Selection;
  setSel(s: Selection): void;
  dispatch(m: Move): void;
}

/** Panel decyzji jawnych (jednego gracza). Wszystkie przyciski pochodzą z listy legalnych ruchów. */
export function ActionPanel({ state, legal, sel, setSel, dispatch }: Props) {
  const pending = state.pending;
  if (!pending || 'waiting' in pending) return null;
  const who = GODS[state.players[pending.player].god].name;
  const of = <T extends Move['type']>(t: T) => legal.filter((m): m is Extract<Move, { type: T }> => m.type === t);

  switch (pending.kind) {
    case 'chooseAction': {
      const allowed = new Set(of('chooseAction').map((m) => m.action));
      const second = state.turn.actions.length > 0;
      return (
        <Box title={`${who}: ${second ? 'druga akcja (niżej na liście)' : 'wybierz akcję'}`}>
          <div className="actions">
            {state.rules.actionOrder.map((a: ActionType) => (
              <button
                key={a}
                disabled={!allowed.has(a)}
                onClick={() => dispatch({ type: 'chooseAction', player: pending.player, action: a })}
                data-action={a}
              >
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
          <p>Kliknij swoją figurkę (podświetloną), a potem pole docelowe. Każda figurka rusza się raz.</p>
          <button onClick={() => dispatch({ type: 'endMove', player: pending.player })} data-end-move>
            Zakończ ruch
          </button>
        </Box>
      );
    case 'summon': {
      const figs = [...new Map(of('summon').map((m) => [m.figure, m])).keys()];
      return (
        <Box title={`${who}: przywołanie`}>
          <p>Wybierz figurkę z puli, potem podświetlone pole.</p>
          <div className="choices">
            {figs.map((id) => {
              const f = state.figures[id];
              return (
                <button key={id} className={sel.figure === id ? 'on' : ''} onClick={() => setSel({ figure: id })}>
                  {f.kind === 'guardian' ? GUARDIANS[f.guardian!].name : f.kind === 'god' ? 'Bóg' : 'Wojownik'}
                </button>
              );
            })}
          </div>
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
      return (
        <Box title={`${who}: przejęcie monumentu`}>
          <p>Kliknij podświetlony monument, który przejmujesz.</p>
        </Box>
      );
    case 'build': {
      const types = [...new Set(of('build').map((m) => m.monument))] as MonumentType[];
      return (
        <Box title={`${who}: budowa monumentu (3 wyznawców)`}>
          <div className="choices">
            {types.map((t) => (
              <button key={t} className={sel.monumentType === t ? 'on' : ''} onClick={() => setSel({ monumentType: t })}>
                {MONUMENT_LABEL[t]}
              </button>
            ))}
          </div>
          <p>Kliknij podświetlone pole w regionie bitwy.</p>
          <button onClick={() => dispatch({ type: 'skipBuild', player: pending.player })}>Nie buduję</button>
        </Box>
      );
    }
    case 'tiebreaker':
      return (
        <Box title={`${who}: remis!`}>
          <p>Masz żeton rozstrzygający. Użyć go teraz i wygrać tę bitwę? (Działa raz na konflikt.)</p>
          <div className="choices">
            <button onClick={() => dispatch({ type: 'useTiebreaker', player: pending.player, use: true })}>Użyj żetonu</button>
            <button onClick={() => dispatch({ type: 'useTiebreaker', player: pending.player, use: false })}>Zachowaj</button>
          </div>
        </Box>
      );
  }
}

function Box({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section className="decision" aria-live="polite">
      <h2>{title}</h2>
      {children}
    </section>
  );
}
