import { GODS } from '../content/gods';
import type { GameState } from '../engine/types';

export function EventLog({ state }: { state: GameState }) {
  const entries = state.log.slice(-80).reverse();
  return (
    <section className="log">
      <h3>Dziennik</h3>
      <ol>
        {entries.map((e) => (
          <li key={e.n} style={e.player !== undefined ? { borderLeftColor: GODS[state.players[e.player].god].color } : undefined}>
            {e.text}
          </li>
        ))}
      </ol>
    </section>
  );
}
