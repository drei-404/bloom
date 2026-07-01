/**
 * Ecosystem Identity — the hidden, immutable character of a world.
 *
 * Chosen once at world creation (deterministically from the world seed) and
 * never changed. Drives which animals a world can naturally host, so two
 * players' worlds diverge while both stay fully deterministic and reproducible.
 */
export type EcosystemAffinity = 'meadow' | 'forest' | 'wetland';

export const ECOSYSTEM_AFFINITIES: readonly EcosystemAffinity[] = [
  'meadow',
  'forest',
  'wetland',
] as const;

/**
 * A native species belonging to a world. Exactly four are selected at creation
 * from the ecosystem's affinity pool; they are then discovered one at a time
 * over Bloom Days. `slot` is the stable selection + discovery order (0..3).
 */
export interface NativeSpecies {
  species: string;
  slot: number;
  discovered: boolean;
  discoveredBloomDay: number | null;
}
