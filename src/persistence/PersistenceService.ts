import { invoke } from '@tauri-apps/api/core';
import type { WorldState } from '../types/world';
import type { AppSettings } from '../types/settings';
import type { WorldIdentity } from '../types/identity';
import type { Flower } from '../types/flower';
import type { Tree } from '../types/tree';
import type { Rock } from '../types/rock';
import type { PondState } from '../types/pond';
import type { IDecoration } from '../decoration/IDecoration';
import type {
  ActivityStatsIPC,
  WorldSnapshotIPC,
  SettingsSnapshotIPC,
  WorldIdentityIPC,
  MilestoneRecordIPC,
  FlowerIPC,
  TreeIPC,
  RockIPC,
  PondIPC,
  DecorationIPC,
} from './snapshots';
import {
  flowerIPCToFlower,
  flowerToIPC,
  treeIPCToTree,
  treeToIPC,
  rockIPCToRock,
  rockToIPC,
  pondIPCToPond,
  pondToIPC,
} from './mappers';
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

  /** Load the immutable world identity (uuid, name, created_at, version). */
  static async loadIdentity(): Promise<WorldIdentity | null> {
    const snap = await invoke<WorldIdentityIPC | null>('db_load_identity');
    if (!snap) return null;
    this.worldUuid = snap.worldUuid;
    return snap;
  }

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

  static async loadMilestones(): Promise<MilestoneRecordIPC[]> {
    return invoke<MilestoneRecordIPC[]>('db_load_milestones');
  }

  static async saveMilestone(record: MilestoneRecordIPC): Promise<void> {
    await invoke('db_save_milestone', { record });
  }

  static async loadFlowers(): Promise<Flower[]> {
    const rows = await invoke<FlowerIPC[]>('db_load_flowers');
    return rows.map(flowerIPCToFlower);
  }

  static async saveFlowers(flowers: Flower[]): Promise<void> {
    await invoke('db_save_flowers', { flowers: flowers.map(flowerToIPC) });
  }

  static async loadTrees(): Promise<Tree[]> {
    const rows = await invoke<TreeIPC[]>('db_load_trees');
    return rows.map(treeIPCToTree);
  }

  static async saveTrees(trees: Tree[]): Promise<void> {
    await invoke('db_save_trees', { trees: trees.map(treeToIPC) });
  }

  static async loadRocks(): Promise<Rock[]> {
    const rows = await invoke<RockIPC[]>('db_load_rocks');
    return rows.map(rockIPCToRock);
  }

  static async saveRocks(rocks: Rock[]): Promise<void> {
    await invoke('db_save_rocks', { rocks: rocks.map(rockToIPC) });
  }

  static async loadPond(): Promise<PondState | null> {
    const ipc = await invoke<PondIPC | null>('db_load_pond');
    return ipc ? pondIPCToPond(ipc) : null;
  }

  static async savePond(pond: PondState): Promise<void> {
    await invoke('db_save_pond', { pond: pondToIPC(pond) });
  }

  static async loadDecorations(): Promise<IDecoration[]> {
    // DecorationIPC shape is identical to IDecoration — direct passthrough.
    return invoke<DecorationIPC[]>('db_load_decorations');
  }

  static async saveDecorations(decorations: IDecoration[]): Promise<void> {
    await invoke('db_save_decorations', { decorations });
  }
}
