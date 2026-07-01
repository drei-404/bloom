import type { WorldIdentity } from '../types/identity';
import type { EcosystemAffinity, NativeSpecies } from '../types/ecosystem';
import { PersistenceService } from '../persistence/PersistenceService';
import { animalRegistry } from '../animal/AnimalRegistry';
import { eventBus } from '../core/EventBus';
import { selectNativeSpecies, discoveryTarget } from './nativeSelection';

/**
 * Selects and discovers a world's native species.
 *
 * Selection: at world creation, exactly `nativeSpeciesCount` species are chosen
 * from the ecosystem affinity's pool using the world seed — same seed → same
 * natives, forever. Selection is separate from discovery.
 *
 * Discovery: starting at `discoveryStartBloomDay`, one native species is
 * revealed every `discoveryIntervalBloomDays`. This is deterministic and
 * catch-up safe (closing the app never skips a discovery), mirroring
 * EcosystemProgression. Population growth is a separate concern owned by each
 * species' generation service — this service only decides *which* species exist
 * and *when* they become known.
 *
 * Never talks to SQLite directly; all access goes through PersistenceService.
 */
class NativeSpeciesService {
  private species: NativeSpecies[] = [];

  /**
   * Return the four native species, selecting + persisting them the first time.
   * Persisted selection always wins and is never recomputed.
   */
  async ensure(identity: WorldIdentity, affinity: EcosystemAffinity): Promise<NativeSpecies[]> {
    const existing = await PersistenceService.loadNativeSpecies();
    if (existing.length > 0) {
      this.species = existing.slice().sort((a, b) => a.slot - b.slot);
      return this.natives();
    }

    this.species = selectNativeSpecies(identity, affinity, animalRegistry.all());
    await PersistenceService.saveNativeSpecies(this.species);
    return this.natives();
  }

  /**
   * Reveal any native species whose discovery day has arrived. Idempotent and
   * catch-up safe: replays cleanly from any Bloom Day. Returns the newly
   * discovered species.
   */
  async evaluateDiscovery(bloomDays: number): Promise<NativeSpecies[]> {
    const target = discoveryTarget(bloomDays, this.species.length);

    const newly: NativeSpecies[] = [];
    for (const native of this.species) {
      if (native.slot >= target) continue;
      if (native.discovered) continue;
      native.discovered = true;
      native.discoveredBloomDay = bloomDays;
      newly.push(native);
    }

    if (newly.length > 0) {
      await PersistenceService.saveNativeSpecies(this.species);
      for (const n of newly) {
        eventBus.emit('ecosystem:species_discovered', {
          species: n.species,
          slot: n.slot,
          bloomDay: bloomDays,
        });
      }
    }

    return newly;
  }

  /** Whether a species is a discovered native of this world. Generation gates on this. */
  isDiscovered(species: string): boolean {
    return this.species.some(n => n.species === species && n.discovered);
  }

  /** The Bloom Day a species was discovered, or null if not (yet) discovered. */
  discoveredBloomDay(species: string): number | null {
    const native = this.species.find(n => n.species === species);
    return native?.discovered ? native.discoveredBloomDay : null;
  }

  /** All native species (slot order). For UI: "home to foxes, deer, owls…". */
  natives(): NativeSpecies[] {
    return this.species.map(n => ({ ...n }));
  }
}

export const nativeSpeciesService = new NativeSpeciesService();
