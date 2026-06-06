/**
 * A progression milestone. Unlock condition is currently a Bloom Day threshold;
 * the shape leaves room for richer predicates later without schema change.
 */
export interface MilestoneDefinition {
  id: string;
  requiredBloomDay: number;
  label: string;
  /** Optional feature key this milestone gates (e.g. 'flowers', 'trees'). */
  unlocks?: string;
}

/** Persisted record of when a milestone was first reached. */
export interface MilestoneRecord {
  milestoneId: string;
  unlockedBloomDay: number;
  unlockedAt: number;
}
