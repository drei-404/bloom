/**
 * Every activity state the Wildlife Simulation FSM can express. Individual
 * species enable only the subset their config declares (e.g. rabbit uses
 * idle/walking/sleeping); `eating` and `looking` exist for future behaviours and
 * are never entered until a species opts into them.
 */
export type AnimalState = 'idle' | 'walking' | 'eating' | 'looking' | 'sleeping';
export type Facing = 'north' | 'east' | 'south' | 'west';

/**
 * Common contract for every animal. Unlike decorations, animals carry mutable
 * state (lifecycle, facing, age) driven by the Wildlife Simulation Layer. The
 * persisted shape stays species-agnostic — all behaviour lives in the reusable
 * simulation systems, never on this record.
 */
export interface IAnimal {
  id: string;
  species: string;
  tileX: number;
  tileY: number;
  /**
   * Immutable home territory centre, assigned once at spawn and persisted. The
   * animal wanders around it and drifts back rather than roaming the whole
   * island. Never changes for the life of the animal.
   */
  homeTileX: number;
  homeTileY: number;
  createdAtBloomDay: number;
  state: AnimalState;
  facing: Facing;
  ageDays: number;
}
