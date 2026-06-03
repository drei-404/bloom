import { invoke } from '@tauri-apps/api/core';
import type { WorldState } from '../types/world';
import type { AppSettings } from '../types/settings';
import type { ActivityStatsIPC, WorldSnapshotIPC, SettingsSnapshotIPC } from './snapshots';
import {
  worldSnapshotToState,
  worldStateToSnapshot,
  settingsSnapshotToAppSettings,
  appSettingsToSnapshot,
} from './mappers';

/**
 * Single TS entry point for all SQLite persistence.
 * Only this service talks to the db_* Tauri commands.
 * Simulation and renderer never call invoke directly for persistence.
 */
export class PersistenceService {
  private static worldUuid: string | null = null;

  static async loadWorld(dayLengthTicks: number): Promise<WorldState | null> {
    const snap = await invoke<WorldSnapshotIPC | null>('db_load_world');
    if (!snap) return null;
    this.worldUuid = snap.worldUuid;
    return worldSnapshotToState(snap, dayLengthTicks);
  }

  static async saveWorld(state: WorldState): Promise<void> {
    const snapshot = worldStateToSnapshot(state, this.worldUuid);
    await invoke('db_save_world', { snapshot });
  }

  static async loadSettings(): Promise<AppSettings | null> {
    const snap = await invoke<SettingsSnapshotIPC | null>('db_load_settings');
    if (!snap) return null;
    return settingsSnapshotToAppSettings(snap);
  }

  static async saveSettings(settings: AppSettings): Promise<void> {
    const snapshot = appSettingsToSnapshot(settings);
    await invoke('db_save_settings', { snapshot });
  }

  static async loadActivity(): Promise<ActivityStatsIPC | null> {
    return invoke<ActivityStatsIPC | null>('db_load_activity');
  }

  static async saveActivity(stats: ActivityStatsIPC): Promise<void> {
    await invoke('db_save_activity', { snapshot: stats });
  }
}
