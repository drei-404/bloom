import { useSettings } from '../../hooks/useSettings';

const DURATIONS = [5, 10, 20, 30, 60];

export function EcosystemSection() {
  const { settings, updateSetting } = useSettings();

  return (
    <div>
      <div className="cp-section-title">Ecosystem</div>

      <div className="cp-row">
        <span className="cp-row-label">Day duration</span>
        <select
          className="cp-select"
          value={settings.dayDurationMinutes}
          onChange={e => void updateSetting('dayDurationMinutes', Number(e.target.value))}
        >
          {DURATIONS.map(d => (
            <option key={d} value={d}>{d} min</option>
          ))}
        </select>
      </div>

      <div className="cp-row">
        <span className="cp-row-label">Night duration</span>
        <select
          className="cp-select"
          value={settings.nightDurationMinutes}
          onChange={e => void updateSetting('nightDurationMinutes', Number(e.target.value))}
        >
          {DURATIONS.map(d => (
            <option key={d} value={d}>{d} min</option>
          ))}
        </select>
      </div>

      <div className="cp-hint">
        Day/night duration changes apply on next launch.
      </div>
    </div>
  );
}
