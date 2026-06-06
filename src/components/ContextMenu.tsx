import { useCallback } from 'react';
import { getCurrentWindow } from '@tauri-apps/api/window';
import { WebviewWindow } from '@tauri-apps/api/webviewWindow';
import { useBloomStore } from '../core/store';
import { WindowManager } from '../systems/WindowManager';
import { ScreenshotManager } from '../systems/ScreenshotManager';
import { ExportService } from '../persistence/ExportService';
import { ImportService } from '../persistence/ImportService';
import { rendererInstance } from './BloomCanvas';
import { islandConfig } from '../config/islandConfig';

interface Props {
  x: number;
  y: number;
  onClose: () => void;
}

export function ContextMenu({ x, y, onClose }: Props) {
  const windowPrefs = useBloomStore(s => s.windowPrefs);
  const settings = useBloomStore(s => s.settings);
  const identity = useBloomStore(s => s.identity);
  const setWindowPrefs = useBloomStore(s => s.setWindowPrefs);
  const setSettings = useBloomStore(s => s.setSettings);
  const setImportRequest = useBloomStore(s => s.setImportRequest);

  const openControlPanel = useCallback(() => {
    const w = new WebviewWindow('control-panel', {
      url: 'index.html#/control-panel',
      title: 'Bloom — Control Panel',
      width: 420,
      height: 560,
      decorations: true,
      transparent: false,
      resizable: false,
      center: true,
    });
    w.once('tauri://error', (e: unknown) => console.error('Control panel error:', e));
    onClose();
  }, [onClose]);

  const toggleLock = useCallback(() => {
    setWindowPrefs({ locked: !windowPrefs.locked });
    onClose();
  }, [windowPrefs.locked, setWindowPrefs, onClose]);

  const toggleAlwaysOnTop = useCallback(async () => {
    const next = !settings.alwaysOnTop;
    await WindowManager.setAlwaysOnTop(next);
    setSettings({ alwaysOnTop: next });
    onClose();
  }, [settings.alwaysOnTop, setSettings, onClose]);

  const saveScreenshot = useCallback(() => {
    ScreenshotManager.capture(rendererInstance);
    onClose();
  }, [onClose]);

  const exportWorld = useCallback(async () => {
    onClose();
    try {
      await ExportService.exportWorld(identity?.worldName ?? 'myisland');
    } catch (err) {
      console.error('Export failed:', err);
    }
  }, [identity, onClose]);

  const importWorld = useCallback(async () => {
    onClose();
    try {
      const path = await ImportService.pickFile();
      if (!path) return;
      const preview = await ImportService.preview(path);
      setImportRequest({ path, preview });
    } catch (err) {
      console.error('Import preview failed:', err);
      window.alert('This file could not be verified as a valid Bloom world.');
    }
  }, [setImportRequest, onClose]);

  const openAbout = useCallback(() => {
    const w = new WebviewWindow('about', {
      url: 'index.html#/about',
      title: 'About Bloom',
      width: 320,
      height: 240,
      decorations: true,
      transparent: false,
      resizable: false,
      center: true,
    });
    w.once('tauri://error', (e: unknown) => console.error('About window error:', e));
    onClose();
  }, [onClose]);

  const handleQuit = useCallback(async () => {
    await getCurrentWindow().close();
  }, []);

  const cx = Math.min(x, islandConfig.canvas.width - 162);
  const cy = Math.min(y, islandConfig.canvas.height - 290);

  return (
    <div
      className="context-menu"
      style={{ left: cx, top: cy }}
      data-no-drag=""
      onClick={e => e.stopPropagation()}
    >
      <div className="context-menu-item" onClick={openControlPanel}>
        Control Panel
      </div>
      <div className="context-menu-item" onClick={toggleLock}>
        {windowPrefs.locked ? '✓ ' : ''}Lock Position
      </div>
      <div className="context-menu-item" onClick={toggleAlwaysOnTop}>
        {settings.alwaysOnTop ? '✓ ' : ''}Always on Top
      </div>
      <div className="context-menu-item" onClick={saveScreenshot}>
        Save Screenshot
      </div>
      <div className="context-menu-separator" />
      <div className="context-menu-item" onClick={exportWorld}>
        Export World…
      </div>
      <div className="context-menu-item" onClick={importWorld}>
        Import World…
      </div>
      <div className="context-menu-separator" />
      <div className="context-menu-item" onClick={openAbout}>
        About
      </div>
      <div className="context-menu-separator" />
      <div className="context-menu-item context-menu-danger" onClick={handleQuit}>
        Quit
      </div>
    </div>
  );
}
