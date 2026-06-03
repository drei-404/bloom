import { useCallback } from 'react';
import { useBloomStore } from '../core/store';
import { saveSettings } from '../storage/SettingsManager';
import { AutostartManager } from '../systems/AutostartManager';
import { WindowManager } from '../systems/WindowManager';
import type { AppSettings } from '../types/settings';

export function useSettings() {
  const settings = useBloomStore(s => s.settings);
  const setSettings = useBloomStore(s => s.setSettings);

  const updateSetting = useCallback(
    async <K extends keyof AppSettings>(key: K, value: AppSettings[K]) => {
      const next = { ...settings, [key]: value };
      setSettings({ [key]: value });
      await saveSettings(next);

      if (key === 'startWithWindows') {
        await AutostartManager.setEnabled(value as boolean);
      }
      if (key === 'alwaysOnTop') {
        await WindowManager.setAlwaysOnTop(value as boolean);
      }
    },
    [settings, setSettings],
  );

  return { settings, updateSetting };
}
