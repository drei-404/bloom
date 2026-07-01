import type { IAnimal, AnimalState, Facing } from '../animal/IAnimal';
import type { TileGrid, TerrainType } from '../types/tile';
import type { TileOccupant } from '../entity/occupancy';
import type { WorldIdentity } from '../types/identity';

/**
 * When a species is active according to the world day/night cycle. `always`
 * keeps an animal awake around the clock (rabbit today). `day` / `night` are the
 * hooks future nocturnal/diurnal species plug into — no behaviour is hardcoded
 * per species.
 */
export type ActivityWindow = 'always' | 'day' | 'night';

/** High-level activity phase derived from a species' schedule + world time. */
export type ActivityPhase = 'active' | 'resting' | 'sleeping';

/**
 * Pure data describing a species. All behaviour is supplied by the shared
 * Wildlife Simulation systems; a species only declares configuration. Adding an
 * animal is: register this config + register the species + provide sprites.
 */
export interface WildlifeSpeciesConfig {
  species: string;
  /** Grouping for future systems (e.g. 'rodent', 'bird'). Data only. */
  family: string;
  /** Render/interpolation hint in tiles per second. Data only for now. */
  movementSpeed: number;
  populationMin: number;
  populationMax: number;
  /** Terrain the species may occupy. Enforced via AnimalRegionService. */
  preferredTerrain: TerrainType[];
  spawn: {
    /** Bias spawns toward tiles near vegetation (trees / decorations). */
    preferNearVegetation: boolean;
    /** Radius (tiles) considered "near" vegetation. */
    preferRadius: number;
  };
  /** When the animal is awake. Drives ScheduleSystem. */
  activityWindow: ActivityWindow;
  /** Chance an idle animal rests instead of wandering (0..1). */
  restChance: number;
  /** Brain states this species may enter. */
  states: AnimalState[];
  /** State durations in seconds (deterministic pick within range, seeded). */
  timers: {
    idleMin: number;
    idleMax: number;
    walkMin: number;
    walkMax: number;
    sleepMin: number;
    sleepMax: number;
  };
}

/** Immutable, deterministic per-animal traits. Future behaviour engines read these. */
export interface Personality {
  curiosity: number;
  energy: number;
  bravery: number;
  wanderTendency: number;
}

/** A single intended one-tile move produced by the Brain, applied by Movement. */
export interface MoveIntent {
  x: number;
  y: number;
  facing: Facing;
}

/**
 * Mutable per-tick working wrapper around a persisted animal. Systems read/write
 * this; only `animal` is persisted. `intent` is cleared each tick after Movement.
 */
export interface AnimalAgent {
  animal: IAnimal;
  config: WildlifeSpeciesConfig;
  intent: MoveIntent | null;
  /** Its timer expired this tick, so downstream systems should act on it. */
  acted: boolean;
}

/** Everything the Wildlife Simulation needs for one tick. No store, no SQL. */
export interface WildlifeContext {
  animals: IAnimal[];
  tileGrid: TileGrid;
  /** Non-animal occupants: flowers + trees + rocks + decorations. */
  staticOccupants: TileOccupant[];
  /** Vegetation reference tiles for spawn preference: trees + decorations. */
  vegetation: TileOccupant[];
  identity: WorldIdentity;
  bloomDays: number;
  nowMs: number;
  /** World time-of-day fraction [0,1) for schedule evaluation. */
  timeOfDay: number;
}
