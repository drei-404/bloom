import { invoke } from '@tauri-apps/api/core';

export async function saveToFile(filename: string, data: string): Promise<void> {
  await invoke('save_data', { filename, data });
}

export async function loadFromFile(filename: string): Promise<string | null> {
  try {
    return await invoke<string>('load_data', { filename });
  } catch {
    return null;
  }
}
