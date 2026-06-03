import type { WorldState } from '../types/world';
import type { ActivitySnapshot } from '../types/activity';
import { tickTileGrowth } from './TileSimulation';
import { tickDayNight } from '../systems/DayNightSystem';
import { simulationConfig } from '../config/simulationConfig';
import { eventBus } from '../core/EventBus';

export function processTick(
  worldState: WorldState,
  _localTick: number,
  snapshot: ActivitySnapshot,
  dayLengthTicks = simulationConfig.dayLengthTicks,
): WorldState {
  let state: WorldState = {
    ...worldState,
    totalTicks: worldState.totalTicks + 1,
    totalActivityScore: worldState.totalActivityScore + snapshot.score,
  };

  state = {
    ...state,
    tileGrid: tickTileGrowth(state.tileGrid, snapshot.score, state.timeOfDay),
  };

  const prevDay = state.dayCount;
  state = tickDayNight(state, state.totalTicks, dayLengthTicks);
  if (state.dayCount !== prevDay) {
    eventBus.emit('world:day_changed', { day: state.dayCount });
  }

  return state;
}
