import type { MilestoneDefinition } from '../types/milestone';
import { getMilestones, getMilestone, registerMilestone } from './milestoneRegistry';
import { PersistenceService } from '../persistence/PersistenceService';
import { eventBus } from '../core/EventBus';

/**
 * Centralizes ecosystem unlocks and evolution milestones.
 *
 * Progression is driven by Bloom Days (World Clock). Simulation systems query
 * `isUnlocked(...)` instead of hardcoding day checks. Unlocks are deterministic
 * (`bloomDays >= requiredBloomDay`) and persisted via PersistenceService — this
 * service never runs SQL itself.
 */
class EcosystemProgression {
  private unlocked = new Set<string>();

  /** Load previously persisted unlock records into memory. */
  async hydrate(): Promise<void> {
    const records = await PersistenceService.loadMilestones();
    this.unlocked = new Set(records.map(r => r.milestoneId));
  }

  /** Append a milestone at runtime (future systems). */
  register(def: MilestoneDefinition): void {
    registerMilestone(def);
  }

  /**
   * Evaluate the registry against the current Bloom Day. Any threshold crossed
   * that isn't yet recorded is unlocked: persisted, emitted, remembered.
   * Catches up across closures (deterministic by required day).
   */
  async evaluate(bloomDays: number): Promise<string[]> {
    const newlyUnlocked: string[] = [];

    for (const m of getMilestones()) {
      if (bloomDays < m.requiredBloomDay) break; // sorted — nothing further qualifies
      if (this.unlocked.has(m.id)) continue;

      this.unlocked.add(m.id);
      newlyUnlocked.push(m.id);

      await PersistenceService.saveMilestone({
        milestoneId: m.id,
        unlockedBloomDay: m.requiredBloomDay,
        unlockedAt: Date.now(),
      });
      eventBus.emit('ecosystem:milestone_unlocked', {
        id: m.id,
        bloomDay: m.requiredBloomDay,
      });
    }

    return newlyUnlocked;
  }

  /** Whether a milestone has been unlocked. Simulation systems gate on this. */
  isUnlocked(id: string): boolean {
    return this.unlocked.has(id);
  }

  /** Whether the feature behind a given key is unlocked (e.g. 'flowers'). */
  isFeatureUnlocked(featureKey: string): boolean {
    return getMilestones().some(
      m => m.unlocks === featureKey && this.unlocked.has(m.id),
    );
  }

  /** All currently unlocked milestone ids. */
  unlockedIds(): string[] {
    return [...this.unlocked];
  }

  definition(id: string): MilestoneDefinition | undefined {
    return getMilestone(id);
  }
}

export const ecosystemProgression = new EcosystemProgression();
