import type { WildlifeSpeciesConfig } from './types';

/**
 * Registry of species configuration for the Wildlife Simulation Layer. Open for
 * extension, closed for modification: a new animal registers its config here at
 * module init; the simulation systems iterate the registry and never reference a
 * species by name.
 */
class WildlifeConfigRegistry {
  private readonly configs = new Map<string, WildlifeSpeciesConfig>();

  register(config: WildlifeSpeciesConfig): void {
    if (this.configs.has(config.species)) return;
    this.configs.set(config.species, config);
  }

  get(species: string): WildlifeSpeciesConfig | undefined {
    return this.configs.get(species);
  }

  has(species: string): boolean {
    return this.configs.has(species);
  }

  all(): WildlifeSpeciesConfig[] {
    return [...this.configs.values()];
  }
}

export const wildlifeConfigRegistry = new WildlifeConfigRegistry();
