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
import { getWorldClock } from '../systems/WorldClock';
import { ecosystemProgression } from '../ecosystem/EcosystemProgressionService';
import { flowerGeneration } from '../ecosystem/FlowerGenerationService';
import { treeGeneration } from '../ecosystem/TreeGenerationService';
import { rockGeneration } from '../ecosystem/RockGenerationService';
import { buildOccupancy } from '../entity/occupancy';
import { eventBus } from '../core/EventBus';

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
      setUnlockedMilestones,
      setFlowers,
      setTrees,
      setRocks,
      pushActivityScore,
      addActivityTick,
      loadCumulativeActivity,
    } = useBloomStore.getState();

    // Re-evaluate ecosystem progression whenever a new Bloom Day is reached.
    const unsubscribeBloomDay = eventBus.on('world:bloom_day_changed', ({ bloomDay }) => {
      void ecosystemProgression
        .evaluate(bloomDay)
        .then(() => setUnlockedMilestones(ecosystemProgression.unlockedIds()))
        .catch(console.error);
    });

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

          // Entity lifecycles: deterministic, seed-driven, gated on milestones.
          const sNow = useBloomStore.getState();
          if (sNow.identity) {
            const { bloomDays } = getWorldClock(newState.totalTicks);

            // Flowers — never overlap trees or rocks.
            const nextFlowers = flowerGeneration.generate({
              tileGrid: newState.tileGrid,
              flowers: sNow.flowers,
              identity: sNow.identity,
              bloomDays,
              occupied: buildOccupancy([...sNow.trees, ...sNow.rocks]),
            });
            if (nextFlowers.length !== sNow.flowers.length) {
              setFlowers(nextFlowers);
              PersistenceService.saveFlowers(nextFlowers).catch(console.error);
            }

            // Trees — placement + lifecycle; never overlap flowers/trees/rocks.
            const treeResult = treeGeneration.tick({
              tileGrid: newState.tileGrid,
              trees: sNow.trees,
              flowers: nextFlowers,
              identity: sNow.identity,
              bloomDays,
              occupied: buildOccupancy(sNow.rocks),
            });
            if (treeResult.changed) {
              setTrees(treeResult.trees);
              PersistenceService.saveTrees(treeResult.trees).catch(console.error);
            }

            // Rocks — never overlap flowers/trees/rocks.
            const nextRocks = rockGeneration.generate({
              tileGrid: newState.tileGrid,
              rocks: sNow.rocks,
              flowers: nextFlowers,
              trees: treeResult.trees,
              identity: sNow.identity,
              bloomDays,
            });
            if (nextRocks.length !== sNow.rocks.length) {
              setRocks(nextRocks);
              PersistenceService.saveRocks(nextRocks).catch(console.error);
            }
          }

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

        // Ecosystem progression: load persisted unlocks, then catch up to the
        // current Bloom Day (records any threshold crossed while closed).
        await ecosystemProgression.hydrate();
        const { bloomDays } = getWorldClock(useBloomStore.getState().worldState.totalTicks);
        await ecosystemProgression.evaluate(bloomDays);
        setUnlockedMilestones(ecosystemProgression.unlockedIds());

        // Restore persisted entities so they survive restart.
        const savedFlowers = await PersistenceService.loadFlowers();
        setFlowers(savedFlowers);
        const savedTrees = await PersistenceService.loadTrees();
        setTrees(savedTrees);
        const savedRocks = await PersistenceService.loadRocks();
        setRocks(savedRocks);

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
      unsubscribeBloomDay();
      unlistenClose?.();
    };
  }, []);
}
