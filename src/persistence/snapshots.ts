// IPC data shapes — must match Rust db/types.rs field names (camelCase via serde).

export interface TileSnapshotIPC {
  tileX: number;
  tileY: number;
  grassLevel: number;
}

export interface WorldSnapshotIPC {
  worldUuid: string | null;
  worldName: string;
  createdAt: number;
  runtimeMinutes: number;
  currentDay: number;
  growthPoints: number;
  bloomVersion: string;
  tiles: TileSnapshotIPC[];
}

export interface SettingsSnapshotIPC {
  startupEnabled: boolean;
  alwaysOnTop: boolean;
  lockedPosition: boolean;
  islandScale: number;
  hudEnabled: boolean;
  dayDurationMin: number;
  nightDurationMin: number;
  theme: string;
}

export interface ActivityStatsIPC {
  activeMinutes: number;
  idleMinutes: number;
  keyboardEvents: number;
  mouseEvents: number;
}
