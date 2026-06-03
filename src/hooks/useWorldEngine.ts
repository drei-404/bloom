import { useEffect, useRef } from 'react';
import { getCurrentWindow } from '@tauri-apps/api/window';
import { useBloomStore } from '../core/store';
import { TimeSystem } from '../core/TimeSystem';
import { ActivityTracker } from '../activity/ActivityTracker';
import { processTick } from '../simulation/WorldSimulation';
import { saveWorld, loadWorld } from '../storage/SaveManager';
import { simulationConfig } from '../config/simulationConfig';

export function useWorldEngine(): void {
  const timeSystemRef = useRef<TimeSystem | null>(null);
  const activityTrackerRef = useRef<ActivityTracker | null>(null);

  useEffect(() => {
    const { setWorldState, setRunning } = useBloomStore.getState();

    activityTrackerRef.current = new ActivityTracker(simulationConfig.idleThresholdMs);
    const detachActivity = activityTrackerRef.current.attach();

    timeSystemRef.current = new TimeSystem(simulationConfig.tickIntervalMs, (tick, _delta) => {
      const snapshot = activityTrackerRef.current!.flush();
      const currentState = useBloomStore.getState().worldState;
      const newState = processTick(currentState, tick, snapshot);
      setWorldState(newState);

      if (tick % simulationConfig.autoSaveIntervalTicks === 0) {
        saveWorld(newState).catch(console.error);
      }
    });

    let unlistenClose: (() => void) | undefined;

    loadWorld()
      .then(saved => {
        if (saved) setWorldState(saved);
        timeSystemRef.current!.start();
        setRunning(true);
      })
      .catch(console.error);

    getCurrentWindow()
      .onCloseRequested(async event => {
        event.preventDefault();
        await saveWorld(useBloomStore.getState().worldState);
        await getCurrentWindow().destroy();
      })
      .then(fn => {
        unlistenClose = fn;
      })
      .catch(console.error);

    return () => {
      timeSystemRef.current?.stop();
      detachActivity();
      setRunning(false);
      unlistenClose?.();
    };
  }, []);
}
