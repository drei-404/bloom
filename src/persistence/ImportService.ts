import { invoke } from '@tauri-apps/api/core';
import { open } from '@tauri-apps/plugin-dialog';
import type { ImportPreviewIPC } from './snapshots';

const BLOOM_FILTER = { name: 'Bloom World', extensions: ['bloom'] };

export class ImportService {
  /** Open a file picker; returns selected .bloom path or null. */
  static async pickFile(): Promise<string | null> {
    const selected = await open({ multiple: false, filters: [BLOOM_FILTER] });
    return typeof selected === 'string' ? selected : null;
  }

  /** Validate + read preview without modifying the current world. Throws if invalid. */
  static preview(path: string): Promise<ImportPreviewIPC> {
    return invoke<ImportPreviewIPC>('db_import_preview', { path });
  }

  /** Back up current world, replace it with the imported one, re-sign locally. */
  static commit(path: string): Promise<ImportPreviewIPC> {
    return invoke<ImportPreviewIPC>('db_import_world', { path });
  }
}
