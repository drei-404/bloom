import { useBloomStore } from '../core/store';

function getTimeLabel(t: number): string {
  if (t < 0.2) return 'Night';
  if (t < 0.35) return 'Dawn';
  if (t < 0.65) return 'Day';
  if (t < 0.8) return 'Dusk';
  return 'Night';
}

export function WorldHUD() {
  const { tileGrid, dayCount, timeOfDay } = useBloomStore(s => s.worldState);

  const avg =
    tileGrid.tiles.reduce((s, t) => s + t.grassLevel, 0) / tileGrid.tiles.length;
  const pct = Math.round(avg * 100);

  return (
    <div className="world-hud">
      <span>Day {dayCount} · {getTimeLabel(timeOfDay)}</span>
      <div className="world-hud-divider" />
      <span>{pct}% green</span>
    </div>
  );
}
