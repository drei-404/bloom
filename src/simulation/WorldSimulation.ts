import type { WorldState } from '../types/world';
import type { ActivitySnapshot } from '../types/activity';
import { tickGrowth, tickEntityAging } from './GrowthSystem';
import { tickDayNight } from '../systems/DayNightSystem';
import { tickWeather } from '../systems/WeatherSystem';
import { simulationConfig } from '../config/simulationConfig';
import { eventBus } from '../core/EventBus';

export function processTick(
  worldState: WorldState,
  _localTick: number,
  snapshot: ActivitySnapshot,
): WorldState {
  let state: WorldState = {
    ...worldState,
    totalTicks: worldState.totalTicks + 1,
  };

  state = { ...state, entities: tickEntityAging(state.entities) };
  state = { ...state, totalActivityScore: state.totalActivityScore + snapshot.score };

  const spawned = tickGrowth(state.entities, snapshot.score);
  if (spawned.length > 0) {
    state = { ...state, entities: [...state.entities, ...spawned] };
    spawned.forEach(e => eventBus.emit('simulation:entity_spawned', e));
  }

  const prevDay = state.dayCount;
  state = tickDayNight(state, state.totalTicks, simulationConfig.dayLengthTicks);
  if (state.dayCount !== prevDay) {
    eventBus.emit('world:day_changed', { day: state.dayCount });
  }

  state = tickWeather(state);

  return state;
}
