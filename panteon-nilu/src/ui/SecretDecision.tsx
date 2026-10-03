import { useState } from 'react';
import { BATTLE_CARDS } from '../content/battleCards';
import { GODS } from '../content/gods';
import type { BattleCardId, GameState, Move, PlayerId } from '../engine/types';

interface Props {
  /** Widok stanu dla gracza, który właśnie decyduje (bez tajemnic innych). */
  view: GameState;
  player: PlayerId;
  legal: Move[];
  revealed: boolean;
  onReveal(): void;
  dispatch(m: Move): void;
}

/**
 * Tajna decyzja w trybie hot-seat: najpierw ekran przekazania urządzenia,
 * potem wybór widoczny tylko dla decydującego gracza.
 */
export function SecretDecision({ view, player, legal, revealed, onReveal, dispatch }: Props) {
  const god = GODS[view.players[player].god];
  const kind = view.pending?.kind;
  if (!revealed) {
    return (
      <div className="handoff" role="dialog" aria-label="Przekazanie urządzenia">
        <div className="handoff-box" style={{ borderColor: god.color }}>
          <h2>Przekaż urządzenie: {god.name}</h2>
          <p>{kind === 'selectCards' ? 'Tajny wybór karty bitwy.' : 'Tajna oferta wyznawców (plaga).'} Pozostali gracze nie patrzą.</p>
          <button onClick={onReveal} data-reveal>Jestem {god.name} — pokaż</button>
        </div>
      </div>
    );
  }
  const mine = legal.filter((m) => m.player === player);
  return (
    <div className="handoff" role="dialog" aria-label="Tajna decyzja">
      <div className="handoff-box" style={{ borderColor: god.color }}>
        {kind === 'selectCards' ? (
          <CardPicker god={god.name} moves={mine as Extract<Move, { type: 'selectCard' }>[]} used={view.players[player].used} dispatch={dispatch} />
        ) : (
          <BidPicker god={god.name} max={view.players[player].followers} player={player} dispatch={dispatch} />
        )}
      </div>
    </div>
  );
}

function CardPicker({ god, moves, used, dispatch }: {
  god: string; moves: Extract<Move, { type: 'selectCard' }>[]; used: BattleCardId[]; dispatch(m: Move): void;
}) {
  return (
    <>
      <h2>{god}: wybierz kartę bitwy</h2>
      <div className="cards">
        {moves.map((m) => {
          const c = BATTLE_CARDS[m.card];
          return (
            <button key={m.card} className="card" onClick={() => dispatch(m)} data-card={m.card}>
              <span className="card-strength">+{c.strength}</span>
              <b>{c.name}</b>
              <small>{c.text}</small>
            </button>
          );
        })}
      </div>
      {used.length > 0 && (
        <p className="muted small">Zagrane wcześniej: {used.map((c) => BATTLE_CARDS[c].name).join(', ')}</p>
      )}
    </>
  );
}

function BidPicker({ god, max, player, dispatch }: { god: string; max: number; player: PlayerId; dispatch(m: Move): void }) {
  const [amount, setAmount] = useState(0);
  return (
    <>
      <h2>{god}: ilu wyznawców poświęcasz?</h2>
      <p className="muted">Wszystkie oferty przepadają. Przeżyją tylko figurki gracza z najwyższą ofertą (remis — nikt).</p>
      <div className="bid">
        <button onClick={() => setAmount(Math.max(0, amount - 1))} aria-label="mniej">−</button>
        <output data-bid-amount>{amount}</output>
        <button onClick={() => setAmount(Math.min(max, amount + 1))} aria-label="więcej">+</button>
        <span className="muted">/ {max}</span>
      </div>
      <button onClick={() => dispatch({ type: 'plagueBid', player, amount })} data-confirm-bid>Zatwierdź ofertę</button>
    </>
  );
}
