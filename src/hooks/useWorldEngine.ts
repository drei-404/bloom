import { useEffect, useRef } from 'react';
import { getCurrentWindow } from '@tauri-apps/api/window';
import { useBloomStore, cumulativeToStatsIPC } from '../core/store';
import { TimeSystem } from '../core/TimeSystem';
import { ActivityTracker } from '../activity/ActivityTracker';
import { processTick } from '../simulation/WorldSimulation';
import { PersistenceService } from '../persistence/PersistenceService';
import { simulationConfig } from '../config/simulationConfig';
import { WindowManager } from '../systems/WindowManager';
import { AutostartManager } from '../systems/AutostartManager';

function dayLengthFrom(dayMin: number, nightMin: number): number {
  return Math.round(dayMin * 60) + Math.round(nightMin * 60);
}

export function useWorldEngine(): void {
  const timeSystemRef = useRef<TimeSystem | null>(null);
  const activityTrackerRef = useRef<ActivityTracker | null>(null);

  useEffect(() => {
    const {
      setWorldState,
      setRunning,
      setWindowPrefs,
      setSettings,
      setIdentity,
      setCorruption,
      pushActivityScore,
      addActivityTick,
      loadCumulativeActivity,
    } = useBloomStore.getState();

    activityTrackerRef.current = new ActivityTracker(simulationConfig.idleThresholdMs);
    const detachActivity = activityTrackerRef.current.attach();

    timeSystemRef.current = new TimeSystem(simulationConfig.tickIntervalMs, (tick, _delta) => {
      void activityTrackerRef.current!
        .flush()
        .then(snapshot => {
          const store = useBloomStore.getState();
          const { dayDurationMinutes, nightDurationMinutes } = store.settings;
          const dayLengthTicks = dayLengthFrom(dayDurationMinutes, nightDurationMinutes);

          const prevDay = store.worldState.dayCount;
          const newState = processTick(store.worldState, tick, snapshot, dayLengthTicks);
          setWorldState(newState);
          pushActivityScore(snapshot.score);

          const isIdle = snapshot.idleMs >= simulationConfig.idleThresholdMs;
          addActivityTick(snapshot, isIdle);

          // Autosave every 30 ticks (30 s).
          if (tick % simulationConfig.autoSaveIntervalTicks === 0) {
            PersistenceService.saveWorld(newState).catch(console.error);
            PersistenceService.saveActivity(
              cumulativeToStatsIPC(useBloomStore.getState().cumulativeActivity),
            ).catch(console.error);
          }

          // Milestone save: new day reached.
          if (newState.dayCount !== prevDay) {
            PersistenceService.saveWorld(newState).catch(console.error);
          }
        })
        .catch(console.error);
    });

    let unlistenClose: (() => void) | undefined;

    // Compute initial dayLength from default settings; refined after settings load.
    const initialDayLength = dayLengthFrom(
      useBloomStore.getState().settings.dayDurationMinutes,
      useBloomStore.getState().settings.nightDurationMinutes,
    );

    Promise.all([
      PersistenceService.loadIdentity(),
      PersistenceService.loadSettings(),
      PersistenceService.loadActivity(),
      WindowManager.loadPrefs(),
    ])
      .then(async ([savedIdentity, savedSettings, savedActivity, savedPrefs]) => {
        if (savedIdentity) setIdentity(savedIdentity);

        // Settings first — needed for correct dayLength when reconstructing world time.
        let dayLengthTicks = initialDayLength;
        if (savedSettings) {
          setSettings(savedSettings);
          dayLengthTicks = dayLengthFrom(
            savedSettings.dayDurationMinutes,
            savedSettings.nightDurationMinutes,
          );
          await WindowManager.setAlwaysOnTop(savedSettings.alwaysOnTop);
          if (savedSettings.startWithWindows) {
            AutostartManager.isEnabled()
              .then(enabled => {
                if (!enabled) AutostartManager.setEnabled(true).catch(console.error);
              })
              .catch(console.error);
          }
        }

        try {
          const savedWorld = await PersistenceService.loadWorld(dayLengthTicks);
          if (savedWorld) setWorldState(savedWorld);
        } catch (err) {
          // Integrity verification failed — reject the load, keep fresh state,
          // and surface a corruption warning. Save is not auto-loaded.
          if (String(err).includes('INTEGRITY')) {
            setCorruption(true);
          } else {
            console.error(err);
          }
        }

        if (savedActivity) loadCumulativeActivity(savedActivity);

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
        await PersistenceService.saveWorld(store.worldState);
        await PersistenceService.saveSettings(store.settings);
        await PersistenceService.saveActivity(cumulativeToStatsIPC(store.cumulativeActivity));
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
