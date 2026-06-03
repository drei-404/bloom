import { useBloomStore } from '../core/store';
import type { EntityType } from '../types/entity';

function countByType(entities: Array<{ type: EntityType }>, type: EntityType): number {
  return entities.filter(e => e.type === type).length;
}

function getTimeLabel(timeOfDay: number): string {
  if (timeOfDay < 0.2) return 'Night';
  if (timeOfDay < 0.35) return 'Dawn';
  if (timeOfDay < 0.65) return 'Day';
  if (timeOfDay < 0.8) return 'Dusk';
  return 'Night';
}

export function WorldHUD() {
  const { entities, dayCount, timeOfDay, weather } = useBloomStore(s => s.worldState);

  const grass = countByType(entities, 'grass');
  const flowers = countByType(entities, 'flower');
  const trees = countByType(entities, 'tree');

  return (
    <div className="world-hud">
      <span>Day {dayCount} &middot; {getTimeLabel(timeOfDay)}</span>
      <div className="world-hud-divider" />
      <span>Grass {grass}</span>
      <span>Flowers {flowers}</span>
      <span>Trees {trees}</span>
      <div className="world-hud-divider" />
      <span>{weather.type}</span>
    </div>
  );
}
