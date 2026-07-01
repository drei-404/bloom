import { describe, it, expect, beforeEach, vi } from 'vitest';

// Mock the SQLite gateway so the service runs without Tauri.
vi.mock('../../persistence/PersistenceService', () => ({
  PersistenceService: {
    loadNativeSpecies: vi.fn(async () => []),
    saveNativeSpecies: vi.fn(async () => {}),
  },
}));

import type { WorldIdentity } from '../../types/identity';
import '../../animal/speciesCatalog';
import { nativeSpeciesService } from '../NativeSpeciesService';
import { selectAffinity } from '../nativeSelection';

const identity: WorldIdentity = {
  worldUuid: 'BLOOM-WLD-0000ABCD',
  worldName: 'Test World',
  worldSeed: 424242,
  createdAt: 0,
  bloomVersion: '0.1.0',
};

describe('NativeSpeciesService discovery', () => {
  beforeEach(async () => {
    await nativeSpeciesService.ensure(identity, selectAffinity(identity));
  });

  it('discovers one native every two Bloom Days from day 15', async () => {
    expect((await nativeSpeciesService.evaluateDiscovery(14)).length).toBe(0);
    expect(nativeSpeciesService.natives().filter(n => n.discovered)).toHaveLength(0);

    await nativeSpeciesService.evaluateDiscovery(15);
    expect(nativeSpeciesService.natives().filter(n => n.discovered)).toHaveLength(1);

    await nativeSpeciesService.evaluateDiscovery(17);
    expect(nativeSpeciesService.natives().filter(n => n.discovered)).toHaveLength(2);

    await nativeSpeciesService.evaluateDiscovery(21);
    expect(nativeSpeciesService.natives().filter(n => n.discovered)).toHaveLength(4);
  });

  it('is idempotent: re-evaluating the same day discovers nothing new', async () => {
    await nativeSpeciesService.evaluateDiscovery(17);
    const again = await nativeSpeciesService.evaluateDiscovery(17);
    expect(again).toHaveLength(0);
  });

  it('records the Bloom Day a species was discovered', async () => {
    await nativeSpeciesService.evaluateDiscovery(15);
    const first = nativeSpeciesService.natives().find(n => n.slot === 0);
    expect(first?.discovered).toBe(true);
    expect(first?.discoveredBloomDay).toBe(15);
    expect(nativeSpeciesService.discoveredBloomDay(first!.species)).toBe(15);
  });

  it('catches up in one call when the world was closed for many days', async () => {
    const newly = await nativeSpeciesService.evaluateDiscovery(100);
    expect(newly).toHaveLength(4);
    expect(nativeSpeciesService.natives().every(n => n.discovered)).toBe(true);
  });
});
