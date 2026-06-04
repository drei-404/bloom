import { useState, useCallback } from 'react';
import { useWorldEngine } from './hooks/useWorldEngine';
import { useDragWindow } from './hooks/useDragWindow';
import { BloomCanvas } from './components/BloomCanvas';
import { WorldHUD } from './components/WorldHUD';
import { ContextMenu } from './components/ContextMenu';
import { ControlPanel } from './components/panel/ControlPanel';
import { useBloomStore } from './core/store';
import './App.css';

function IslandApp() {
  useWorldEngine();
  const { onMouseDown } = useDragWindow();
  const corruptionDetected = useBloomStore(s => s.corruptionDetected);
  const [contextMenu, setContextMenu] = useState<{ x: number; y: number } | null>(null);

  const handleContextMenu = useCallback((e: React.MouseEvent) => {
    e.preventDefault();
    setContextMenu({ x: e.clientX, y: e.clientY });
  }, []);

  const handleClick = useCallback(() => setContextMenu(null), []);

  const handleKeyDown = useCallback((e: React.KeyboardEvent) => {
    if (e.key === 'Escape') setContextMenu(null);
  }, []);

  return (
    <div
      className="bloom-app"
      onMouseDown={onMouseDown}
      onContextMenu={handleContextMenu}
      onClick={handleClick}
      onKeyDown={handleKeyDown}
      tabIndex={-1}
    >
      <BloomCanvas />
      <WorldHUD />
      {corruptionDetected && (
        <div className="corruption-warning" data-no-drag="">
          ⚠ Save integrity check failed. This world could not be verified and was not loaded.
        </div>
      )}
      {contextMenu && (
        <ContextMenu
          x={contextMenu.x}
          y={contextMenu.y}
          onClose={() => setContextMenu(null)}
        />
      )}
    </div>
  );
}

function ControlPanelApp() {
  return (
    <div className="cp-window">
      <ControlPanel />
    </div>
  );
}

function AboutApp() {
  return (
    <div className="about-window">
      <div className="about-name">Bloom</div>
      <div className="about-version">Version 0.1.0</div>
      <div className="about-desc">
        A living desktop companion.
        <br />
        Your activity grows a tiny isometric ecosystem.
      </div>
      <div className="about-stack">Tauri · React · PixiJS · Rust</div>
    </div>
  );
}

export default function App() {
  const hash = window.location.hash;
  if (hash === '#/control-panel') return <ControlPanelApp />;
  if (hash === '#/about') return <AboutApp />;
  return <IslandApp />;
}
