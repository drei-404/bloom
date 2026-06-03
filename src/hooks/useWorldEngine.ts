import { useEffect, useRef } from 'react';
import { getCurrentWindow } from '@tauri-apps/api/window';
import { useBloomStore } from '../core/store';
import { TimeSystem } from '../core/TimeSystem';
import { ActivityTracker } from '../activity/ActivityTracker';
import { processTick } from '../simulation/WorldSimulation';
import { saveWorld, loadWorld } from '../storage/SaveManager';
import { loadSettings, saveSettings } from '../storage/SettingsManager';
import { simulationConfig } from '../config/simulationConfig';
import { WindowManager } from '../systems/WindowManager';
import { AutostartManager } from '../systems/AutostartManager';

export function useWorldEngine(): void {
  const timeSystemRef = useRef<TimeSystem | null>(null);
  const activityTrackerRef = useRef<ActivityTracker | null>(null);

  useEffect(() => {
    const { setWorldState, setRunning, setWindowPrefs, setSettings, pushActivityScore } =
      useBloomStore.getState();

    activityTrackerRef.current = new ActivityTracker(simulationConfig.idleThresholdMs);
    const detachActivity = activityTrackerRef.current.attach();

    timeSystemRef.current = new TimeSystem(simulationConfig.tickIntervalMs, (tick, _delta) => {
      void activityTrackerRef.current!
        .flush()
        .then(snapshot => {
          const store = useBloomStore.getState();
          const { dayDurationMinutes, nightDurationMinutes } = store.settings;
          const dayLengthTicks =
            Math.round(dayDurationMinutes * 60) + Math.round(nightDurationMinutes * 60);
          const newState = processTick(store.worldState, tick, snapshot, dayLengthTicks);
          setWorldState(newState);
          pushActivityScore(snapshot.score);

          if (tick % simulationConfig.autoSaveIntervalTicks === 0) {
            saveWorld(newState).catch(console.error);
          }
        })
        .catch(console.error);
    });

    let unlistenClose: (() => void) | undefined;

    Promise.all([loadWorld(), loadSettings(), WindowManager.loadPrefs()])
      .then(async ([savedWorld, savedSettings, savedPrefs]) => {
        if (savedWorld) setWorldState(savedWorld);

        if (savedSettings) {
          setSettings(savedSettings);
          await WindowManager.setAlwaysOnTop(savedSettings.alwaysOnTop);
          if (savedSettings.startWithWindows) {
            AutostartManager.isEnabled()
              .then(enabled => {
                if (!enabled) AutostartManager.setEnabled(true).catch(console.error);
              })
              .catch(console.error);
          }
        }

        if (savedPrefs) {
          setWindowPrefs(savedPrefs);
          await WindowManager.restorePosition(savedPrefs);
        }

        timeSystemRef.current!.start();
        setRunning(true);
      })
      .catch(console.error);

    getCurrentWindow()
      .onCloseRequested(async event => {
        event.preventDefault();
        const store = useBloomStore.getState();
        await saveWorld(store.worldState);
        await saveSettings(store.settings);
        const pos = await WindowManager.capturePosition();
        await WindowManager.savePrefs({ ...store.windowPrefs, ...(pos ?? {}) });
        await getCurrentWindow().destroy();
      })
      .then(fn => { unlistenClose = fn; })
      .catch(console.error);

    return () => {
      timeSystemRef.current?.stop();
      detachActivity();
      setRunning(false);
      unlistenClose?.();
    };
  }, []);
}
