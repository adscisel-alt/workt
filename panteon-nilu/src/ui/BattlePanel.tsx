import { BATTLE_CARDS } from '../content/battleCards';
import { GODS } from '../content/gods';
import type { GameState } from '../engine/types';

/** Jawne informacje o trwającej bitwie (odkryte karty, siła). */
export function BattlePanel({ state }: { state: GameState }) {
  const b = state.battle;
  const tb = state.conflict?.tiebreaker;
  if (!state.conflict) return null;
  return (
    <section className="battle">
      <h3>Konflikt{b ? ` — bitwa w regionie ${b.token}` : ''}</h3>
      {tb && (
        <p className="small">
          Żeton remisu: {GODS[state.players[tb.holder].god].name} ({tb.faceUp ? 'dostępny' : 'zużyty'})
        </p>
      )}
      {b && (
        <ul>
          {b.participants.map((p) => {
            const cards = b.revealed[p];
            const waiting = state.pending && 'waiting' in state.pending && state.pending.waiting.includes(p);
            return (
              <li key={p}>
                <span className="swatch" style={{ background: GODS[state.players[p].god].color }} />
                {GODS[state.players[p].god].name}:{' '}
                {cards ? cards.map((c) => BATTLE_CARDS[c].name).join(' + ') : waiting ? 'wybiera…' : 'karta zakryta'}
                {b.strengths[p] !== undefined && <b> · siła {b.strengths[p]}</b>}
              </li>
            );
          })}
        </ul>
      )}
    </section>
  );
}
