import { useState } from 'react';
import { BATTLE_CARDS } from '../content/battleCards';
import { GODS } from '../content/gods';
import { godName } from '../engine/util';
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
  const god = { ...GODS[view.players[player].god], name: godName(view, player) };
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
  // Dwie karty (zapowiedź Amuna): ruchy mają pole `second` — zaznaczamy dwie i zatwierdzamy.
  const pair = moves.some((m) => m.second !== undefined);
  const [picked, setPicked] = useState<BattleCardId[]>([]);
  const cards = [...new Set(moves.flatMap((m) => (m.second ? [m.card, m.second] : [m.card])))];
  const pairMove = moves.find((m) => picked.length === 2 && picked.includes(m.card) && picked.includes(m.second!));
  const click = (c: BattleCardId) => {
    if (!pair) return dispatch(moves.find((m) => m.card === c)!);
    setPicked(picked.includes(c) ? picked.filter((x) => x !== c) : picked.length < 2 ? [...picked, c] : picked);
  };
  return (
    <>
      <h2>{god}: {pair ? 'wybierz dwie karty bitwy' : 'wybierz kartę bitwy'}</h2>
      <div className="cards">
        {cards.map((id) => {
          const c = BATTLE_CARDS[id];
          return (
            <button key={id} className={`card${picked.includes(id) ? ' on' : ''}`} onClick={() => click(id)} data-card={id}>
              <span className="card-strength">+{c.strength}</span>
              <b>{c.name}</b>
              <small>{c.text}</small>
            </button>
          );
        })}
      </div>
      {pair && (
        <button disabled={!pairMove} onClick={() => pairMove && dispatch(pairMove)} data-confirm-cards>
          Zagraj obie karty
        </button>
      )}
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
