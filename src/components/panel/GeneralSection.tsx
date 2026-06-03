import { useSettings } from '../../hooks/useSettings';

function Toggle({
  label,
  checked,
  onChange,
}: {
  label: string;
  checked: boolean;
  onChange: (v: boolean) => void;
}) {
  return (
    <div className="cp-row">
      <span className="cp-row-label">{label}</span>
      <label className="cp-toggle">
        <input type="checkbox" checked={checked} onChange={e => onChange(e.target.checked)} />
        <span className="cp-toggle-track" />
        <span className="cp-toggle-thumb" />
      </label>
    </div>
  );
}

export function GeneralSection() {
  const { settings, updateSetting } = useSettings();

  return (
    <div>
      <div className="cp-section-title">General</div>
      <Toggle
        label="Run at Windows startup"
        checked={settings.startWithWindows}
        onChange={v => void updateSetting('startWithWindows', v)}
      />
      <Toggle
        label="Always on Top"
        checked={settings.alwaysOnTop}
        onChange={v => void updateSetting('alwaysOnTop', v)}
      />
      <Toggle
        label="Lock Position"
        checked={settings.lockPosition}
        onChange={v => void updateSetting('lockPosition', v)}
      />
    </div>
  );
}
