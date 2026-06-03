import { create } from 'zustand';
import type { WorldState } from '../types/world';
import type { WindowPreferences } from '../types/window';
import type { AppSettings } from '../types/settings';
import { createInitialWorldState } from '../simulation/initialState';
import { defaultSettings } from '../types/settings';

interface BloomStore {
  worldState: WorldState;
  isRunning: boolean;
  windowPrefs: WindowPreferences;
  settings: AppSettings;
  activityHistory: number[];
  setWorldState: (state: WorldState) => void;
  setRunning: (running: boolean) => void;
  setWindowPrefs: (prefs: Partial<WindowPreferences>) => void;
  setSettings: (settings: Partial<AppSettings>) => void;
  pushActivityScore: (score: number) => void;
}

export const useBloomStore = create<BloomStore>()(set => ({
  worldState: createInitialWorldState(),
  isRunning: false,
  windowPrefs: { x: null, y: null, locked: false, alwaysOnTop: false },
  settings: defaultSettings(),
  activityHistory: [],
  setWorldState: state => set({ worldState: state }),
  setRunning: running => set({ isRunning: running }),
  setWindowPrefs: prefs => set(s => ({ windowPrefs: { ...s.windowPrefs, ...prefs } })),
  setSettings: settings => set(s => ({ settings: { ...s.settings, ...settings } })),
  pushActivityScore: score =>
    set(s => ({ activityHistory: [...s.activityHistory.slice(-19), score] })),
}));
