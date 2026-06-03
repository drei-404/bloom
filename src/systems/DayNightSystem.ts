import type { WorldState } from '../types/world';

export function tickDayNight(
  state: WorldState,
  totalTicks: number,
  dayLengthTicks: number,
): WorldState {
  const timeOfDay = (totalTicks % dayLengthTicks) / dayLengthTicks;
  const dayCount = Math.floor(totalTicks / dayLengthTicks) + 1;
  return { ...state, timeOfDay, dayCount };
}
