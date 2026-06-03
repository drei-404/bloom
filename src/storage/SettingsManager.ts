import type { AppSettings } from '../types/settings';
import { defaultSettings } from '../types/settings';
import { saveToFile, loadFromFile } from './TauriStorageAdapter';

const SETTINGS_FILE = 'settings.json';

export async function saveSettings(settings: AppSettings): Promise<void> {
  await saveToFile(SETTINGS_FILE, JSON.stringify(settings));
}

export async function loadSettings(): Promise<AppSettings | null> {
  const raw = await loadFromFile(SETTINGS_FILE);
  if (!raw) return null;
  try {
    const parsed = JSON.parse(raw) as AppSettings;
    if (parsed.version !== 1) return defaultSettings();
    return parsed;
  } catch {
    return null;
  }
}
