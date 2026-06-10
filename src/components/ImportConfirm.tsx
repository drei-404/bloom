import { useCallback, useState } from 'react';
import { useBloomStore } from '../core/store';
import { ImportService } from '../persistence/ImportService';
import { PersistenceService } from '../persistence/PersistenceService';

function formatDate(ms: number): string {
  if (!ms) return '—';
  return new Date(ms).toLocaleDateString(undefined, {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
  });
}

function dayLengthTicks(dayMin: number, nightMin: number): number {
  return Math.round(dayMin * 60) + Math.round(nightMin * 60);
}

export function ImportConfirm() {
  const importRequest = useBloomStore(s => s.importRequest);
  const setImportRequest = useBloomStore(s => s.setImportRequest);
  const setWorldState = useBloomStore(s => s.setWorldState);
  const setSettings = useBloomStore(s => s.setSettings);
  const setIdentity = useBloomStore(s => s.setIdentity);
  const setCorruption = useBloomStore(s => s.setCorruption);
  const [busy, setBusy] = useState(false);

  const cancel = useCallback(() => setImportRequest(null), [setImportRequest]);

  const confirm = useCallback(async () => {
    if (!importRequest) return;
    setBusy(true);
    try {
      await ImportService.commit(importRequest.path);

      // Refresh store from the now-active world.
      const settings = await PersistenceService.loadSettings();
      if (settings) setSettings(settings);

      const len = settings
        ? dayLengthTicks(settings.dayDurationMinutes, settings.nightDurationMinutes)
        : dayLengthTicks(20, 20);
      const world = await PersistenceService.loadWorld(len);
      if (world) setWorldState(world);

      const identity = await PersistenceService.loadIdentity();
      if (identity) setIdentity(identity);

      setCorruption(false);
      setImportRequest(null);
    } catch (err) {
      console.error('Import failed:', err);
      window.alert('Import failed. Your previous world was preserved (a backup was made).');
      setBusy(false);
    }
  }, [importRequest, setSettings, setWorldState, setIdentity, setCorruption, setImportRequest]);

  if (!importRequest) return null;
  const { preview } = importRequest;

  return (
    <div className="import-overlay" data-no-drag="" onClick={e => e.stopPropagation()}>
      <div className="import-dialog">
        <div className="import-title">Import World</div>
        <div className="import-warn">
          This replaces your current world. A backup is created automatically.
        </div>

        <div className="import-field">
          <span className="import-label">Name</span>
          <span className="import-value">{preview.worldName}</span>
        </div>
        <div className="import-field">
          <span className="import-label">World ID</span>
          <span className="import-value import-mono">{preview.worldUuid.slice(0, 8)}</span>
        </div>
        <div className="import-field">
          <span className="import-label">Created</span>
          <span className="import-value">{formatDate(preview.createdAt)}</span>
        </div>
        <div className="import-field">
          <span className="import-label">Runtime days</span>
          <span className="import-value">{preview.currentDay}</span>
        </div>

        <div className="import-actions">
          <button className="import-btn" onClick={cancel} disabled={busy}>
            Cancel
          </button>
          <button className="import-btn import-btn-primary" onClick={confirm} disabled={busy}>
            {busy ? 'Importing…' : 'Replace World'}
          </button>
        </div>
      </div>
    </div>
  );
}
