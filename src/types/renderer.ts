import type { EntityInstance } from './entity';
import type { WeatherState } from './world';

export interface RenderState {
  timeOfDay: number;
  entities: EntityInstance[];
  weather: WeatherState;
  width: number;
  height: number;
}
