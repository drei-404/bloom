import { describe, it, expect } from 'vitest';
import type { WorldIdentity } from '../../types/identity';
import type { AnimalAgent, WildlifeSpeciesConfig } from '../types';
import type { IAnimal } from '../../animal/IAnimal';
import { scheduleSystem } from '../ScheduleSystem';

const identity: WorldIdentity = {
  worldUuid: 'BLOOM-WLD-0000AAAA',
  worldName: 'Test',
  worldSeed: 555,
  createdAt: 0,
  bloomVersion: '0.1.0',
};

function config(over: Partial<WildlifeSpeciesConfig> = {}): WildlifeSpeciesConfig {
  return {
    species: 'tester',
    family: 'test',
    movementSpeed: 1,
    populationMin: 1,
    populationMax: 1,
    preferredTerrain: ['grass'],
    spawn: { preferNearVegetation: false, preferRadius: 1 },
    activityWindow: 'always',
    restChance: 0.3,
    states: ['idle', 'walking', 'sleeping'],
    timers: { idleMin: 120, idleMax: 300, walkMin: 5, walkMax: 15, sleepMin: 60, sleepMax: 180 },
    ...over,
  };
}

function agent(id: string, cfg: WildlifeSpeciesConfig): AnimalAgent {
  const animal: IAnimal = {
    id,
    species: cfg.species,
    tileX: 0,
    tileY: 0,
    createdAtBloomDay: 0,
    state: 'idle',
    facing: 'south',
    ageDays: 0,
  };
  return { animal, config: cfg, intent: null, acted: false };
}

describe('ScheduleSystem timers', () => {
  it('schedules a future expiry and reports expiry only once time passes', () => {
    const a = agent('t-1', config());
    scheduleSystem.ensure(a, identity, 1000);
    expect(scheduleSystem.isExpired('t-1', 1000)).toBe(false);
    // idle range is 120–300s → expiry well before 1000 + 400_000ms.
    expect(scheduleSystem.isExpired('t-1', 1000 + 400_000)).toBe(true);
  });

  it('prunes timers for animals that no longer exist', () => {
    const a = agent('t-2', config());
    scheduleSystem.ensure(a, identity, 0);
    scheduleSystem.prune(new Set());
    expect(() => scheduleSystem.rngFor('t-2')).toThrow();
  });
});

describe('ScheduleSystem activity phase', () => {
  it('keeps "always" species active around the clock', () => {
    const c = config({ activityWindow: 'always' });
    expect(scheduleSystem.activityPhase(c, 0.1)).toBe('active');
    expect(scheduleSystem.activityPhase(c, 0.5)).toBe('active');
    expect(scheduleSystem.activityPhase(c, 0.95)).toBe('active');
  });

  it('gates day and night species on the cycle', () => {
    const day = config({ activityWindow: 'day' });
    const night = config({ activityWindow: 'night' });
    expect(scheduleSystem.activityPhase(day, 0.5)).toBe('active');
    expect(scheduleSystem.activityPhase(day, 0.9)).toBe('sleeping');
    expect(scheduleSystem.activityPhase(night, 0.5)).toBe('sleeping');
    expect(scheduleSystem.activityPhase(night, 0.9)).toBe('active');
  });
});
