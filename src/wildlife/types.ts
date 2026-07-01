import type { IAnimal, AnimalState, Facing } from '../animal/IAnimal';
import type { TileGrid, TerrainType } from '../types/tile';
import type { TileOccupant } from '../entity/occupancy';
import type { WorldIdentity } from '../types/identity';
import type { EcosystemAffinity } from '../types/ecosystem';

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
 * Behavioural grouping. The Wildlife Simulation dispatches on family, never on
 * species — every `ground_herbivore` (rabbit today, deer/hedgehog later) shares
 * one FSM + movement/timing profile. New families unlock genuinely new behaviour
 * (flying, wetland, predator); new species within a family need config only.
 */
export type SpeciesFamily = 'ground_herbivore' | 'flying' | 'wetland' | 'predator';

/** How a species traverses the world. Only `walk` (land) is implemented today. */
export type MovementType = 'walk' | 'fly' | 'swim';

/**
 * Behaviour shared by every species in a family: the FSM states it may enter,
 * how long it stays in them, its rest tendency, and spawn preference. Owned by
 * the family so species definitions stay pure identity/metadata.
 */
export interface FamilyBehavior {
  family: SpeciesFamily;
  /** Brain states members may enter. */
  states: AnimalState[];
  /** Chance an idle animal rests instead of wandering (0..1). */
  restChance: number;
  spawn: {
    /** Bias spawns toward tiles near vegetation (trees / decorations). */
    preferNearVegetation: boolean;
    /** Radius (tiles) considered "near" vegetation. */
    preferRadius: number;
  };
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

/**
 * Immutable identity/metadata for one species. Contains NO behaviour — behaviour
 * comes from its {@link FamilyBehavior}. This is the entire surface a new animal
 * declares (plus its family + asset). Registered in the SpeciesRegistry.
 */
export interface SpeciesDefinition {
  species: string;
  /** Human-readable name. */
  label: string;
  family: SpeciesFamily;
  movementType: MovementType;
  /** AssetRegistry id for this species' sprite (e.g. `animal.rabbit`). */
  assetId: string;
  /** Ecosystems this species can be native to (ecosystem/native-selection layer). */
  affinities: EcosystemAffinity[];
  /** Territory radius (Chebyshev tiles) around the home tile. */
  homeRadius: number;
  /** Population bounds once discovered. */
  population: { min: number; max: number };
  /** Terrain the species may occupy. */
  preferredTerrain: TerrainType[];
  /** When the animal is awake. Drives ScheduleSystem. */
  activityWindow: ActivityWindow;
}

/** A species definition with its family behaviour resolved in. Systems read this. */
export interface ResolvedSpecies extends SpeciesDefinition {
  behavior: FamilyBehavior;
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
  config: ResolvedSpecies;
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
