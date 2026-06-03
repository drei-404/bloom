import { useSettings } from '../../hooks/useSettings';

export function VisualsSection() {
  const { settings, updateSetting } = useSettings();

  return (
    <div>
      <div className="cp-section-title">Visuals</div>

      <div className="cp-row">
        <span className="cp-row-label">Island scale</span>
        <span className="cp-value">{Math.round(settings.islandScale * 100)}%</span>
      </div>
      <input
        type="range"
        className="cp-slider"
        min={50}
        max={100}
        value={Math.round(settings.islandScale * 100)}
        onChange={e => void updateSetting('islandScale', Number(e.target.value) / 100)}
      />

      <div className="cp-row" style={{ marginTop: 16 }}>
        <span className="cp-row-label">Theme</span>
        <select className="cp-select" value={settings.theme} disabled>
          <option value="default">Default</option>
        </select>
      </div>

      <div className="cp-hint">Scale applies on next launch. More themes coming soon.</div>
    </div>
  );
}
