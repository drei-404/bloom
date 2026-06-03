export interface AppSettings {
  version: number;
  startWithWindows: boolean;
  alwaysOnTop: boolean;
  lockPosition: boolean;
  dayDurationMinutes: number;
  nightDurationMinutes: number;
  islandScale: number;
  theme: 'default';
}

export function defaultSettings(): AppSettings {
  return {
    version: 1,
    startWithWindows: false,
    alwaysOnTop: false,
    lockPosition: false,
    dayDurationMinutes: 20,
    nightDurationMinutes: 20,
    islandScale: 1.0,
    theme: 'default',
  };
}
