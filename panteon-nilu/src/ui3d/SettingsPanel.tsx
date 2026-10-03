// Panel ustawień grafiki 3D (HTML nad kanwą).
import type { Settings3D } from './settings';

const TOGGLES: { key: keyof Settings3D; label: string }[] = [
  { key: 'shadows', label: 'Miękkie cienie' },
  { key: 'ao', label: 'Okluzja otoczenia (AO)' },
  { key: 'bloom', label: 'Poświata (bloom)' },
  { key: 'tiltShift', label: 'Tilt-shift' },
  { key: 'vignette', label: 'Winieta' },
  { key: 'particles', label: 'Cząsteczki piasku' },
  { key: 'adaptiveDpr', label: 'Adaptacyjna rozdzielczość' },
  { key: 'showFps', label: 'Licznik FPS' },
];

export function SettingsPanel({ settings, onChange }: { settings: Settings3D; onChange(s: Settings3D): void }) {
  const low = settings.quality === 'low';
  return (
    <div className="settings3d" data-settings3d>
      <div className="seg">
        <button className={!low ? 'on' : ''} onClick={() => onChange({ ...settings, quality: 'high' })} data-quality="high">
          Wysoka jakość
        </button>
        <button className={low ? 'on' : ''} onClick={() => onChange({ ...settings, quality: 'low' })} data-quality="low">
          Niska jakość
        </button>
      </div>
      {low && <p className="small muted">Niska jakość: bez postprocessingu, cieni i cząsteczek, DPR 1.</p>}
      {TOGGLES.map(({ key, label }) => {
        const forcedOff = low && !['adaptiveDpr', 'showFps'].includes(key);
        return (
          <label key={key} className={`toggle${forcedOff ? ' muted' : ''}`}>
            <input
              type="checkbox"
              checked={!!settings[key] && !forcedOff}
              disabled={forcedOff}
              onChange={(e) => onChange({ ...settings, [key]: e.target.checked })}
              data-toggle={key}
            />
            {label}
          </label>
        );
      })}
    </div>
  );
}
