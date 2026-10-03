import { ANKH_POWERS } from '../content/ankhPowers';
import { BATTLE_CARDS } from '../content/battleCards';
import { GODS } from '../content/gods';
import { GUARDIANS } from '../content/guardians';
import { isInRed } from '../engine/devotion';
import type { GameState, PlayerId } from '../engine/types';

export function PlayerPanel({ state, player, active }: { state: GameState; player: PlayerId; active: boolean }) {
  const p = state.players[player];
  const god = GODS[p.god];
  const figs = Object.values(state.figures).filter((f) => f.owner === player);
  const pool = figs.filter((f) => f.pos === null);
  const monuments = Object.values(state.monuments).filter((m) => m.owner === player).length;
  return (
    <section className={`player${active ? ' player-active' : ''}`} style={{ borderColor: god.color }} data-player={player}>
      <header>
        <span className="swatch" style={{ background: god.color }} />
        <strong>{god.name}</strong> <span className="muted">{god.epithet}</span>
        {active && <span className="badge">tura</span>}
      </header>
      <div className="stats">
        <span title="Oddanie">
          Oddanie <b className={isInRed(state, player) ? 'red' : ''}>{p.devotion}</b>
        </span>
        <span title="Wyznawcy">Wyznawcy <b>{p.followers}</b></span>
        <span title="Żetony ankh w puli">Ankh <b>{p.ankhPool}</b></span>
        <span title="Kontrolowane monumenty">Monumenty <b>{monuments}</b></span>
      </div>
      <p className="ability">{god.ability}</p>
      <div className="row">
        <span className="muted">Pula:</span>{' '}
        {pool.length === 0 ? '—' : summarizePool(pool.map((f) => (f.kind === 'guardian' ? GUARDIANS[f.guardian!].name : f.kind === 'god' ? 'bóg' : 'wojownik')))}
      </div>
      <div className="row">
        <span className="muted">Moce:</span>{' '}
        {p.unlocked.length === 0 ? '—' : p.unlocked.map((id) => (
          <span key={id} className="chip" title={ANKH_POWERS[id].text}>{ANKH_POWERS[id].name}</span>
        ))}
      </div>
      <div className="row">
        <span className="muted">Zagrane karty:</span>{' '}
        {p.used.length === 0 ? '—' : p.used.map((c) => (
          <span key={c} className="chip chip-card" title={BATTLE_CARDS[c].text}>{BATTLE_CARDS[c].name}</span>
        ))}
      </div>
    </section>
  );
}

function summarizePool(names: string[]): string {
  const counts = new Map<string, number>();
  for (const n of names) counts.set(n, (counts.get(n) ?? 0) + 1);
  return [...counts].map(([n, c]) => (c > 1 ? `${n} ×${c}` : n)).join(', ');
}
