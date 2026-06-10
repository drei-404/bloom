import { invoke } from '@tauri-apps/api/core';

export class AutostartManager {
  static async setEnabled(enabled: boolean): Promise<void> {
    await invoke('set_autostart', { enabled });
  }

  static async isEnabled(): Promise<boolean> {
    return invoke<boolean>('get_autostart');
  }
}
