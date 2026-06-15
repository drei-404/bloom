export type AnimalState = 'idle' | 'walking' | 'sleeping';
export type Facing = 'north' | 'east' | 'south' | 'west';

/**
 * Common contract for every animal (rabbits, rare creatures — later). Unlike
 * decorations, animals carry mutable state (lifecycle, facing, age) for future
 * behavior. Framework only: no generation, movement, or rendering yet.
 */
export interface IAnimal {
  id: string;
  species: string;
  tileX: number;
  tileY: number;
  createdAtBloomDay: number;
  state: AnimalState;
  facing: Facing;
  ageDays: number;
}
