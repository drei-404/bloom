import type { WorldState, WeatherType } from '../types/world';

const WEATHER_SEQUENCE: WeatherType[] = ['clear', 'cloudy', 'rainy'];
const TRANSITION_CHANCE = 0.004;

export function tickWeather(state: WorldState): WorldState {
  if (Math.random() > TRANSITION_CHANCE) return state;

  const idx = WEATHER_SEQUENCE.indexOf(state.weather.type);
  const delta = Math.random() > 0.5 ? 1 : -1;
  const next = WEATHER_SEQUENCE[(idx + delta + WEATHER_SEQUENCE.length) % WEATHER_SEQUENCE.length];

  return {
    ...state,
    weather: {
      type: next,
      intensity: Math.random(),
      cloudCoverage: next === 'clear'
        ? 0.05 + Math.random() * 0.2
        : 0.4 + Math.random() * 0.5,
    },
  };
}
