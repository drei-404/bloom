import type {
  SpeciesDefinition,
  FamilyBehavior,
  ResolvedSpecies,
  SpeciesFamily,
} from '../types';

const SPECIES_ID = /^[a-z][a-z0-9_]*$/;

/**
 * The single registry for every simulatable species and the family behaviours
 * they dispatch through. Open for extension, closed for modification:
 *
 *   • register a {@link FamilyBehavior} once per behavioural family
 *   • register a {@link SpeciesDefinition} per animal (pure identity/metadata)
 *   • the simulation reads `resolve(species)` — a definition with its family
 *     behaviour merged in — and never branches on the species name.
 *
 * Adding a new species within an existing family is config only. A genuinely new
 * behaviour is a new family. No wildlife system changes either way.
 */
class SpeciesRegistry {
  private readonly species = new Map<string, SpeciesDefinition>();
  private readonly families = new Map<SpeciesFamily, FamilyBehavior>();

  isValidId(id: string): boolean {
    return SPECIES_ID.test(id);
  }

  registerFamily(behavior: FamilyBehavior): void {
    this.families.set(behavior.family, behavior);
  }

  getFamily(family: SpeciesFamily): FamilyBehavior | undefined {
    return this.families.get(family);
  }

  register(definition: SpeciesDefinition): void {
    if (!this.isValidId(definition.species)) {
      throw new Error(`invalid species id: "${definition.species}"`);
    }
    this.species.set(definition.species, definition);
  }

  get(species: string): SpeciesDefinition | undefined {
    return this.species.get(species);
  }

  has(species: string): boolean {
    return this.species.has(species);
  }

  all(): SpeciesDefinition[] {
    return [...this.species.values()];
  }

  /** A species with its family behaviour merged in, or undefined if either is missing. */
  resolve(species: string): ResolvedSpecies | undefined {
    const def = this.species.get(species);
    if (!def) return undefined;
    const behavior = this.families.get(def.family);
    if (!behavior) return undefined;
    return { ...def, behavior };
  }

  /** Every registered species resolved. Species whose family is missing are skipped. */
  allResolved(): ResolvedSpecies[] {
    return this.all()
      .map(d => this.resolve(d.species))
      .filter((r): r is ResolvedSpecies => r !== undefined);
  }

  /** Test/reset hook. */
  clear(): void {
    this.species.clear();
    this.families.clear();
  }
}

export const speciesRegistry = new SpeciesRegistry();
