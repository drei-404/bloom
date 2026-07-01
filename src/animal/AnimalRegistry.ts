import type { EcosystemAffinity } from '../types/ecosystem';

export interface AnimalSpeciesDescriptor {
  species: string;
  label: string;
  /** Ecosystems this species can belong to. A species may span several. */
  affinities: EcosystemAffinity[];
}

/**
 * Registry of animal species. Open for extension, closed for modification:
 * future animals self-register at module init without touching existing
 * entries.
 */
class AnimalRegistry {
  private readonly species = new Map<string, AnimalSpeciesDescriptor>();

  /** Register a species. No-op if already registered. */
  register(descriptor: AnimalSpeciesDescriptor): void {
    if (this.species.has(descriptor.species)) return;
    this.species.set(descriptor.species, descriptor);
  }

  get(species: string): AnimalSpeciesDescriptor | undefined {
    return this.species.get(species);
  }

  has(species: string): boolean {
    return this.species.has(species);
  }

  all(): AnimalSpeciesDescriptor[] {
    return [...this.species.values()];
  }
}

export const animalRegistry = new AnimalRegistry();
