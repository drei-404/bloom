import { useBloomStore } from '../../core/store';

function ActivityBar({ score }: { score: number }) {
  const pct = Math.round((score / 20) * 100);
  return (
    <div className="act-bar-wrap">
      <div className="act-bar-fill" style={{ height: `${pct}%` }} />
    </div>
  );
}

function getLevel(score: number): string {
  if (score < 2) return 'Idle';
  if (score < 8) return 'Low';
  if (score < 15) return 'Medium';
  return 'High';
}

export function ActivitySection() {
  const history = useBloomStore(s => s.activityHistory);
  const latest = history[history.length - 1] ?? 0;

  return (
    <div>
      <div className="cp-section-title">Activity</div>

      <div className="cp-row">
        <span className="cp-row-label">Current level</span>
        <span className="cp-value">{getLevel(latest)}</span>
      </div>

      <div className="cp-row">
        <span className="cp-row-label">Growth boost</span>
        <span className="cp-value">
          {Math.round((0.3 + latest * 0.035) * 100)}%
        </span>
      </div>

      <div className="cp-section-sub">Recent activity (last 20 ticks)</div>
      <div className="act-chart">
        {Array.from({ length: 20 }, (_, i) => (
          <ActivityBar key={i} score={history[i] ?? 0} />
        ))}
        <div className="act-chart-labels">
          <span>Low</span>
          <span>High</span>
        </div>
      </div>

      <div className="cp-hint">
        Tracks keyboard, mouse, and active window changes.
        More activity = faster grass growth.
      </div>
    </div>
  );
}
