import { useBloomStore } from '../../core/store';

function formatDate(ms: number): string {
  if (!ms) return '—';
  return new Date(ms).toLocaleDateString(undefined, {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
  });
}

export function AboutSection() {
  const identity = useBloomStore(s => s.identity);

  return (
    <div>
      <div className="cp-section-title">About</div>

      <div className="about-name">Bloom</div>
      <div className="about-version">Version 0.1.0</div>
      <div className="about-desc">
        A living desktop companion. Your computer activity grows a tiny isometric ecosystem
        that lives on your desktop.
      </div>

      <div className="cp-section-sub">World Identity</div>
      <div className="cp-row">
        <span className="cp-row-label">Name</span>
        <span className="cp-value">{identity?.worldName ?? '—'}</span>
      </div>
      <div className="cp-row">
        <span className="cp-row-label">World UUID</span>
        <span className="cp-value cp-mono">{identity?.worldUuid ?? '—'}</span>
      </div>
      <div className="cp-row">
        <span className="cp-row-label">World Seed</span>
        <span className="cp-value cp-mono">{identity?.worldSeed ?? '—'}</span>
      </div>
      <div className="cp-row">
        <span className="cp-row-label">Created</span>
        <span className="cp-value">{identity ? formatDate(identity.createdAt) : '—'}</span>
      </div>
      <div className="cp-row">
        <span className="cp-row-label">Version</span>
        <span className="cp-value">{identity?.bloomVersion ?? '0.1.0'}</span>
      </div>

      <div className="about-stack">
        <span>Tauri</span>
        <span>·</span>
        <span>React</span>
        <span>·</span>
        <span>PixiJS</span>
        <span>·</span>
        <span>Rust</span>
      </div>
    </div>
  );
}
