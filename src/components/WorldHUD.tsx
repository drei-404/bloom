import { useBloomStore } from '../core/store';
import { getWorldClock } from '../systems/WorldClock';

function getTimeLabel(t: number): string {
  if (t < 0.2) return 'Night';
  if (t < 0.35) return 'Dawn';
  if (t < 0.65) return 'Day';
  if (t < 0.8) return 'Dusk';
  return 'Night';
}

export function WorldHUD() {
  const { tileGrid, totalTicks, timeOfDay } = useBloomStore(s => s.worldState);

  // Bloom Day = runtime progression (24 runtime hours each). 0-based → +1 for display.
  const { bloomDays } = getWorldClock(totalTicks);

  const avg =
    tileGrid.tiles.reduce((s, t) => s + t.grassLevel, 0) / tileGrid.tiles.length;
  const pct = Math.round(avg * 100);

  return (
    <div className="world-hud">
      <span>Day {bloomDays + 1} · {getTimeLabel(timeOfDay)}</span>
      <div className="world-hud-divider" />
      <span>{pct}% green</span>
    </div>
  );
}
