import type { WorldState } from '../types/world';
import { saveToFile, loadFromFile } from './TauriStorageAdapter';

const SAVE_FILE = 'world.json';
const CURRENT_VERSION = 1;

export async function saveWorld(state: WorldState): Promise<void> {
  const payload: WorldState = { ...state, lastSavedAt: Date.now() };
  await saveToFile(SAVE_FILE, JSON.stringify(payload));
}

export async function loadWorld(): Promise<WorldState | null> {
  const raw = await loadFromFile(SAVE_FILE);
  if (!raw) return null;
  try {
    const parsed = JSON.parse(raw) as WorldState;
    if (parsed.version !== CURRENT_VERSION) return null;
    return parsed;
  } catch {
    return null;
  }
}
