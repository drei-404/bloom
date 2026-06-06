import type { WorldClock } from '../types/clock';
import {
  TICKS_PER_RUNTIME_MINUTE,
  TICKS_PER_RUNTIME_HOUR,
  TICKS_PER_BLOOM_DAY,
} from '../config/worldClockConfig';

/**
 * Derive the World Clock from accumulated runtime ticks.
 *
 * `totalTicks` is the single source of truth: it advances one step per second
 * only while Bloom is running, and stops when Bloom is closed or the computer
 * is off. Bloom Days are progression-only and fully independent of the visual
 * day/night cycle.
 */
export function getWorldClock(totalTicks: number): WorldClock {
  return {
    runtimeMinutes: Math.floor(totalTicks / TICKS_PER_RUNTIME_MINUTE),
    runtimeHours: Math.floor(totalTicks / TICKS_PER_RUNTIME_HOUR),
    bloomDays: Math.floor(totalTicks / TICKS_PER_BLOOM_DAY),
  };
}
