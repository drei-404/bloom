import { getCurrentWindow, LogicalPosition } from '@tauri-apps/api/window';
import { saveToFile, loadFromFile } from '../storage/TauriStorageAdapter';
import type { WindowPreferences } from '../types/window';

const PREFS_FILE = 'prefs.json';

export class WindowManager {
  static async savePrefs(prefs: WindowPreferences): Promise<void> {
    await saveToFile(PREFS_FILE, JSON.stringify(prefs));
  }

  static async loadPrefs(): Promise<WindowPreferences | null> {
    const raw = await loadFromFile(PREFS_FILE);
    if (!raw) return null;
    try {
      return JSON.parse(raw) as WindowPreferences;
    } catch {
      return null;
    }
  }

  static async restorePosition(prefs: WindowPreferences): Promise<void> {
    if (prefs.x === null || prefs.y === null) return;
    try {
      await getCurrentWindow().setPosition(new LogicalPosition(prefs.x, prefs.y));
    } catch (err) {
      console.warn('setPosition failed:', err);
    }
  }

  static async capturePosition(): Promise<{ x: number; y: number } | null> {
    try {
      const pos = await getCurrentWindow().outerPosition();
      const scaleFactor = await getCurrentWindow().scaleFactor();
      return { x: pos.x / scaleFactor, y: pos.y / scaleFactor };
    } catch {
      return null;
    }
  }

  static async setAlwaysOnTop(value: boolean): Promise<void> {
    await getCurrentWindow().setAlwaysOnTop(value);
  }
}
