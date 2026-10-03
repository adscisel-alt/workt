import { GODS } from '../content/gods';
import { devotionAscending } from '../engine/devotion';
import type { GameState } from '../engine/types';
import { ACTION_LABEL, EVENT_LABEL } from './labels';

export function Tracks({ state }: { state: GameState }) {
  const { rules } = state;
  return (
    <section className="tracks">
      <h3>Tory akcji</h3>
      {rules.actionOrder.map((a) => {
        const def = rules.actionTracks[a];
        const start = def.start[state.playerCount];
        return (
          <div key={a} className="track" data-track={a}>
            <span className="track-label">{ACTION_LABEL[a]}</span>
            <span className="track-cells">
              {Array.from({ length: def.length }, (_, i) => (
                <span
                  key={i}
                  className={[
                    'cell',
                    i < start ? 'cell-off' : '',
                    i === def.length - 1 ? 'cell-event' : '',
                    i === state.actionTracks[a] ? 'cell-marker' : '',
                  ].join(' ')}
                />
              ))}
            </span>
          </div>
        );
      })}
      <h3>Wydarzenia</h3>
      <div className="events">
        {rules.eventTrack.map((e, i) => (
          <span
            key={i}
            title={EVENT_LABEL[e.type]}
            className={['ev', `ev-${e.type}`, i <= state.eventIndex ? 'ev-done' : '', i === state.eventIndex + 1 ? 'ev-next' : ''].join(' ')}
          >
            {e.type === 'conflict' ? '⚔' : e.type === 'caravan' ? '≈' : '▲'}
          </span>
        ))}
      </div>
      <p className="muted small">
        Następne: {state.eventIndex + 1 < rules.eventTrack.length ? EVENT_LABEL[rules.eventTrack[state.eventIndex + 1].type] : '—'}
        {' · '}konflikty: {state.conflictsResolved}/5
      </p>
      <h3>Oddanie</h3>
      <div className="devotion">
        <div className="devotion-bar">
          <span className="devotion-red" style={{ width: `${((rules.devotion.redMax + 1) / (rules.devotion.top + 1)) * 100}%` }} />
          {devotionAscending(state).map((p, i) => (
            <span
              key={p}
              className="devotion-token"
              title={`${GODS[state.players[p].god].name}: ${state.players[p].devotion}`}
              style={{
                left: `${(state.players[p].devotion / rules.devotion.top) * 100}%`,
                background: GODS[state.players[p].god].color,
                bottom: `${i * 6}px`,
              }}
            />
          ))}
        </div>
        <div className="muted small">czerwona strefa 0–{rules.devotion.redMax} · szczyt {rules.devotion.top}</div>
      </div>
    </section>
  );
}
