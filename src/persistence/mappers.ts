import type { WorldState } from '../types/world';
import type { TileGrid } from '../types/tile';
import type { AppSettings } from '../types/settings';
import { defaultSettings } from '../types/settings';
import { islandConfig } from '../config/islandConfig';
import type {
  WorldSnapshotIPC,
  SettingsSnapshotIPC,
} from './snapshots';

const BLOOM_VERSION = '0.1.0';

// ── World ──────────────────────────────────────────────

export function worldSnapshotToState(
  snap: WorldSnapshotIPC,
  dayLengthTicks: number,
): WorldState {
  const totalTicks = snap.runtimeMinutes * 60;
  const timeOfDay =
    dayLengthTicks > 0 ? (totalTicks % dayLengthTicks) / dayLengthTicks : 0.25;

  const size = islandConfig.grid.size;
  const tiles = [];
  // Build full grid, fill grass levels from snapshot, default 0.
  const lookup = new Map<string, number>();
  for (const t of snap.tiles) {
    lookup.set(`${t.tileX},${t.tileY}`, t.grassLevel);
  }
  for (let col = 0; col < size; col++) {
    for (let row = 0; row < size; row++) {
      tiles.push({
        col,
        row,
        grassLevel: lookup.get(`${col},${row}`) ?? 0.0,
      });
    }
  }
  const tileGrid: TileGrid = { size, tiles };

  return {
    version: 3,
    dayCount: snap.currentDay,
    timeOfDay,
    totalTicks,
    tileGrid,
    totalActivityScore: snap.growthPoints,
    lastSavedAt: Date.now(),
    createdAt: snap.createdAt,
  };
}

export function worldStateToSnapshot(
  state: WorldState,
  worldUuid: string | null,
): WorldSnapshotIPC {
  return {
    worldUuid,
    worldName: 'My Island',
    createdAt: state.createdAt,
    runtimeMinutes: Math.floor(state.totalTicks / 60),
    currentDay: state.dayCount,
    growthPoints: state.totalActivityScore,
    bloomVersion: BLOOM_VERSION,
    tiles: state.tileGrid.tiles.map(t => ({
      tileX: t.col,
      tileY: t.row,
      grassLevel: t.grassLevel,
    })),
  };
}

// ── Settings ───────────────────────────────────────────

export function settingsSnapshotToAppSettings(snap: SettingsSnapshotIPC): AppSettings {
  return {
    version: 1,
    startWithWindows: snap.startupEnabled,
    alwaysOnTop: snap.alwaysOnTop,
    lockPosition: snap.lockedPosition,
    dayDurationMinutes: snap.dayDurationMin,
    nightDurationMinutes: snap.nightDurationMin,
    islandScale: snap.islandScale,
    theme: snap.theme === 'default' ? 'default' : 'default',
  };
}

export function appSettingsToSnapshot(
  settings: AppSettings,
  hudEnabled = true,
): SettingsSnapshotIPC {
  return {
    startupEnabled: settings.startWithWindows,
    alwaysOnTop: settings.alwaysOnTop,
    lockedPosition: settings.lockPosition,
    islandScale: settings.islandScale,
    hudEnabled,
    dayDurationMin: settings.dayDurationMinutes,
    nightDurationMin: settings.nightDurationMinutes,
    theme: settings.theme,
  };
}

export { defaultSettings };
