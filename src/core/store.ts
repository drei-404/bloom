import { create } from 'zustand';
import type { WorldState } from '../types/world';
import type { WindowPreferences } from '../types/window';
import type { AppSettings } from '../types/settings';
import type { ActivitySnapshot } from '../types/activity';
import type { WorldIdentity } from '../types/identity';
import type { ActivityStatsIPC } from '../persistence/snapshots';
import { createInitialWorldState } from '../simulation/initialState';
import { defaultSettings } from '../types/settings';

interface CumulativeActivity {
  activeSeconds: number;
  idleSeconds: number;
  keyboardEvents: number;
  mouseEvents: number;
}

interface BloomStore {
  worldState: WorldState;
  isRunning: boolean;
  windowPrefs: WindowPreferences;
  settings: AppSettings;
  identity: WorldIdentity | null;
  corruptionDetected: boolean;
  activityHistory: number[];
  cumulativeActivity: CumulativeActivity;
  setWorldState: (state: WorldState) => void;
  setIdentity: (identity: WorldIdentity) => void;
  setCorruption: (v: boolean) => void;
  setRunning: (running: boolean) => void;
  setWindowPrefs: (prefs: Partial<WindowPreferences>) => void;
  setSettings: (settings: Partial<AppSettings>) => void;
  pushActivityScore: (score: number) => void;
  addActivityTick: (snap: ActivitySnapshot, isIdle: boolean) => void;
  loadCumulativeActivity: (stats: ActivityStatsIPC) => void;
}

export const useBloomStore = create<BloomStore>()(set => ({
  worldState: createInitialWorldState(),
  isRunning: false,
  windowPrefs: { x: null, y: null, locked: false, alwaysOnTop: false },
  settings: defaultSettings(),
  identity: null,
  corruptionDetected: false,
  activityHistory: [],
  cumulativeActivity: {
    activeSeconds: 0,
    idleSeconds: 0,
    keyboardEvents: 0,
    mouseEvents: 0,
  },
  setWorldState: state => set({ worldState: state }),
  setIdentity: identity => set({ identity }),
  setCorruption: v => set({ corruptionDetected: v }),
  setRunning: running => set({ isRunning: running }),
  setWindowPrefs: prefs => set(s => ({ windowPrefs: { ...s.windowPrefs, ...prefs } })),
  setSettings: settings => set(s => ({ settings: { ...s.settings, ...settings } })),
  pushActivityScore: score =>
    set(s => ({ activityHistory: [...s.activityHistory.slice(-19), score] })),
  addActivityTick: (snap, isIdle) =>
    set(s => ({
      cumulativeActivity: {
        activeSeconds: s.cumulativeActivity.activeSeconds + (isIdle ? 0 : 1),
        idleSeconds: s.cumulativeActivity.idleSeconds + (isIdle ? 1 : 0),
        keyboardEvents: s.cumulativeActivity.keyboardEvents + snap.keyEvents,
        mouseEvents: s.cumulativeActivity.mouseEvents + snap.mouseEvents,
      },
    })),
  loadCumulativeActivity: stats =>
    set({
      cumulativeActivity: {
        activeSeconds: stats.activeMinutes * 60,
        idleSeconds: stats.idleMinutes * 60,
        keyboardEvents: stats.keyboardEvents,
        mouseEvents: stats.mouseEvents,
      },
    }),
}));

export function cumulativeToStatsIPC(c: CumulativeActivity): ActivityStatsIPC {
  return {
    activeMinutes: Math.floor(c.activeSeconds / 60),
    idleMinutes: Math.floor(c.idleSeconds / 60),
    keyboardEvents: c.keyboardEvents,
    mouseEvents: c.mouseEvents,
  };
}
