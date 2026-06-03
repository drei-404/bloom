export function AboutSection() {
  return (
    <div>
      <div className="cp-section-title">About</div>

      <div className="about-name">Bloom</div>
      <div className="about-version">Version 0.1.0</div>
      <div className="about-desc">
        A living desktop companion. Your computer activity grows a tiny isometric ecosystem
        that lives on your desktop.
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
