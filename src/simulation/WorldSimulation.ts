import type { WorldState } from '../types/world';
import type { ActivitySnapshot } from '../types/activity';
import type { SimulationContext } from '../types/simulation';
import { tickTileGrowth } from './TileSimulation';
import { tickDayNight } from '../systems/DayNightSystem';
import { getWorldClock } from '../systems/WorldClock';
import { simulationConfig } from '../config/simulationConfig';
import { eventBus } from '../core/EventBus';

export function processTick(
  worldState: WorldState,
  _localTick: number,
  snapshot: ActivitySnapshot,
  dayLengthTicks = simulationConfig.dayLengthTicks,
): WorldState {
  // World Clock: runtime-based progression, independent of the visual cycle.
  const prevClock = getWorldClock(worldState.totalTicks);

  let state: WorldState = {
    ...worldState,
    totalTicks: worldState.totalTicks + 1,
    totalActivityScore: worldState.totalActivityScore + snapshot.score,
  };

  const clock = getWorldClock(state.totalTicks);
  const ctx: SimulationContext = {
    activityScore: snapshot.score,
    timeOfDay: state.timeOfDay,
    clock,
  };

  state = {
    ...state,
    tileGrid: tickTileGrowth(state.tileGrid, ctx),
  };

  if (clock.bloomDays !== prevClock.bloomDays) {
    eventBus.emit('world:bloom_day_changed', { bloomDay: clock.bloomDays });
  }

  // Visual day/night cycle (20 min day / 20 min night). Separate system.
  const prevDay = state.dayCount;
  state = tickDayNight(state, state.totalTicks, dayLengthTicks);
  if (state.dayCount !== prevDay) {
    eventBus.emit('world:day_changed', { day: state.dayCount });
  }

  return state;
}
