// IPC data shapes — must match Rust db/types.rs field names (camelCase via serde).

export interface WorldIdentityIPC {
  worldUuid: string;
  worldName: string;
  worldSeed: number;
  createdAt: number;
  bloomVersion: string;
}

export interface ImportPreviewIPC {
  worldName: string;
  worldUuid: string;
  createdAt: number;
  currentDay: number;
}

export interface TileSnapshotIPC {
  tileX: number;
  tileY: number;
  grassLevel: number;
  terrainType: string;
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

export interface MilestoneRecordIPC {
  milestoneId: string;
  unlockedBloomDay: number;
  unlockedAt: number;
}

export interface FlowerIPC {
  id: string;
  tileX: number;
  tileY: number;
  offsetX: number;
  offsetY: number;
  flowerType: string;
  createdAt: number;
}

export interface TreeIPC {
  id: string;
  tileX: number;
  tileY: number;
  offsetX: number;
  offsetY: number;
  species: string;
  stage: string;
  createdAtBloomDay: number;
}

export interface RockIPC {
  id: string;
  tileX: number;
  tileY: number;
  offsetX: number;
  offsetY: number;
  rockType: string;
  createdAtBloomDay: number;
}

export interface PondIPC {
  footprint: string; // JSON [{x,y},...]
  finalSize: number;
  revealedCount: number;
  createdAtBloomDay: number;
}

export interface DecorationIPC {
  id: string;
  decorationType: string;
  tileX: number;
  tileY: number;
}

export interface AnimalIPC {
  id: string;
  species: string;
  tileX: number;
  tileY: number;
  createdAtBloomDay: number;
  state: string;
  facing: string;
  ageDays: number;
}
