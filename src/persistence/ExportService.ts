import { invoke } from '@tauri-apps/api/core';
import { save } from '@tauri-apps/plugin-dialog';

const BLOOM_FILTER = { name: 'Bloom World', extensions: ['bloom'] };

export class ExportService {
  /** Prompt for a destination and write the current world to a .bloom file. */
  static async exportWorld(suggestedName = 'myisland'): Promise<boolean> {
    const safe = suggestedName.replace(/[^a-z0-9-_]+/gi, '-').toLowerCase() || 'myisland';
    const path = await save({
      defaultPath: `${safe}.bloom`,
      filters: [BLOOM_FILTER],
    });
    if (!path) return false;
    await invoke('db_export_world', { path });
    return true;
  }
}
