import { useCallback } from 'react';
import { getCurrentWindow } from '@tauri-apps/api/window';
import { useBloomStore } from '../core/store';

export function useDragWindow() {
  const onMouseDown = useCallback(async (e: React.MouseEvent) => {
    if (e.button !== 0) return;
    if (useBloomStore.getState().windowPrefs.locked) return;
    if ((e.target as HTMLElement).closest('[data-no-drag]')) return;
    e.preventDefault();
    try {
      await getCurrentWindow().startDragging();
    } catch (err) {
      console.warn('startDragging failed:', err);
    }
  }, []);

  return { onMouseDown };
}
