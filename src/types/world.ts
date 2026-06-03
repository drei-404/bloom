import type { EntityInstance } from './entity';

export type WeatherType = 'clear' | 'cloudy' | 'rainy';

export interface WeatherState {
  type: WeatherType;
  intensity: number;
  cloudCoverage: number;
}

export interface WorldState {
  version: number;
  dayCount: number;
  timeOfDay: number;
  totalTicks: number;
  entities: EntityInstance[];
  weather: WeatherState;
  totalActivityScore: number;
  lastSavedAt: number;
  createdAt: number;
}
