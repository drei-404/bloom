import type { MilestoneDefinition } from '../types/milestone';

/**
 * Data-driven milestone registry.
 *
 * Open for extension, closed for modification: future systems append their own
 * milestones via `registerMilestone(...)` at init time — existing entries and
 * code stay untouched.
 */
const registry: MilestoneDefinition[] = [
  { id: 'DAY_0_SOIL', requiredBloomDay: 0, label: 'Bare Soil' },
  { id: 'DAY_3_GRASS_COMPLETE', requiredBloomDay: 3, label: 'Grass Complete', unlocks: 'grass' },
  { id: 'DAY_4_FLOWERS_UNLOCKED', requiredBloomDay: 4, label: 'Flowers', unlocks: 'flowers' },
  { id: 'DAY_5_TREES_UNLOCKED', requiredBloomDay: 5, label: 'Trees', unlocks: 'trees' },
  { id: 'DAY_9_ROCKS_UNLOCKED', requiredBloomDay: 9, label: 'Rocks', unlocks: 'rocks' },
  { id: 'DAY_12_RAIN_UNLOCKED', requiredBloomDay: 12, label: 'Rain', unlocks: 'rain' },
  { id: 'DAY_13_POND_UNLOCKED', requiredBloomDay: 13, label: 'Pond', unlocks: 'pond' },
  { id: 'DAY_14_LILYPADS_UNLOCKED', requiredBloomDay: 14, label: 'Lily Pads', unlocks: 'lilypads' },
  { id: 'DAY_15_ANIMALS_UNLOCKED', requiredBloomDay: 15, label: 'Animals', unlocks: 'animals' },
];

/** Register a new milestone. No-op if the id already exists. */
export function registerMilestone(def: MilestoneDefinition): void {
  if (registry.some(m => m.id === def.id)) return;
  registry.push(def);
}

/** All milestones, sorted by unlock threshold. */
export function getMilestones(): MilestoneDefinition[] {
  return [...registry].sort((a, b) => a.requiredBloomDay - b.requiredBloomDay);
}

export function getMilestone(id: string): MilestoneDefinition | undefined {
  return registry.find(m => m.id === id);
}
