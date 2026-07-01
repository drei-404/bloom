import type { WorldIdentity } from '../types/identity';
import type { EcosystemAffinity, NativeSpecies } from '../types/ecosystem';
import { ECOSYSTEM_AFFINITIES } from '../types/ecosystem';
import type { AnimalSpeciesDescriptor } from '../animal/AnimalRegistry';
import { WorldIdentityService } from '../identity/WorldIdentityService';
import { ecosystemConfig } from '../config/ecosystemConfig';

/**
 * Pure, I/O-free core of the Ecosystem Identity system. Given a world identity
 * these functions are fully deterministic — same seed → same affinity → same
 * native species → same discovery schedule. Kept separate from the services so
 * it can be tested without touching persistence.
 */

/** Deterministically choose a world's ecosystem affinity from its seed. */
export function selectAffinity(identity: WorldIdentity): EcosystemAffinity {
  return WorldIdentityService.rng(identity, 'ecosystem-affinity').pick(ECOSYSTEM_AFFINITIES);
}

/**
 * Deterministically select the world's native species from an affinity's pool.
 * Candidates are sorted by name (stable, registration-order independent), then
 * seed-shuffled; the first N become natives in slot order, undiscovered.
 */
export function selectNativeSpecies(
  identity: WorldIdentity,
  affinity: EcosystemAffinity,
  catalog: readonly AnimalSpeciesDescriptor[],
): NativeSpecies[] {
  const candidates = catalog
    .filter(d => d.affinities.includes(affinity))
    .slice()
    .sort((a, b) => a.species.localeCompare(b.species));

  const rng = WorldIdentityService.rng(identity, 'native-species');
  return candidates
    .map(d => ({ d, key: rng.next() }))
    .sort((a, b) => a.key - b.key)
    .slice(0, Math.min(ecosystemConfig.nativeSpeciesCount, candidates.length))
    .map<NativeSpecies>((e, slot) => ({
      species: e.d.species,
      slot,
      discovered: false,
      discoveredBloomDay: null,
    }));
}

/**
 * How many native species should be discovered by a given Bloom Day: none before
 * the start day, then one more every interval, capped at `count`.
 */
export function discoveryTarget(bloomDays: number, count: number): number {
  const { discoveryStartBloomDay, discoveryIntervalBloomDays } = ecosystemConfig;
  if (bloomDays < discoveryStartBloomDay) return 0;
  const revealed = Math.floor((bloomDays - discoveryStartBloomDay) / discoveryIntervalBloomDays) + 1;
  return Math.min(count, revealed);
}
