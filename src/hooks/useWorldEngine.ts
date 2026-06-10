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
import { pondGeneration } from '../ecosystem/PondGenerationService';
import { buildOccupancy } from '../entity/occupancy';
import { terrainService } from '../terrain/TerrainService';
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
      setPond,
      setDecorations,
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
          pushActivityScore(snapshot.score);

          const isIdle = snapshot.idleMs >= simulationConfig.idleThresholdMs;
          addActivityTick(snapshot, isIdle);

          // workingState may gain water terrain from the pond this tick.
          let workingState = newState;

          const sNow = useBloomStore.getState();
          if (sNow.identity) {
            const { bloomDays } = getWorldClock(newState.totalTicks);

            let flowers = sNow.flowers;
            let trees = sNow.trees;
            let rocks = sNow.rocks;

            // Pond — terrain evolution runs first so entities respect new water.
            const pondResult = pondGeneration.tick(sNow.identity, bloomDays, sNow.pond);
            if (pondResult.changed) {
              if (pondResult.newWaterTiles.length > 0) {
                let grid = workingState.tileGrid;
                const waterKeys = new Set<string>();
                for (const t of pondResult.newWaterTiles) {
                  grid = terrainService.setTerrain(grid, t.x, t.y, 'water');
                  terrainService.reserve(t.x, t.y);
                  waterKeys.add(`${t.x},${t.y}`);
                }
                workingState = { ...workingState, tileGrid: grid };

                // No entity may occupy water — remove any on the new water tiles.
                const fFlowers = flowers.filter(f => !waterKeys.has(`${f.tileX},${f.tileY}`));
                const fTrees = trees.filter(t => !waterKeys.has(`${t.tileX},${t.tileY}`));
                const fRocks = rocks.filter(r => !waterKeys.has(`${r.tileX},${r.tileY}`));
                if (fFlowers.length !== flowers.length) {
                  flowers = fFlowers;
                  setFlowers(flowers);
                  PersistenceService.saveFlowers(flowers).catch(console.error);
                }
                if (fTrees.length !== trees.length) {
                  trees = fTrees;
                  setTrees(trees);
                  PersistenceService.saveTrees(trees).catch(console.error);
                }
                if (fRocks.length !== rocks.length) {
                  rocks = fRocks;
                  setRocks(rocks);
                  PersistenceService.saveRocks(rocks).catch(console.error);
                }
                PersistenceService.saveWorld(workingState).catch(console.error);
              }
              setPond(pondResult.pond);
              if (pondResult.pond) {
                PersistenceService.savePond(pondResult.pond).catch(console.error);
              }
            }

            const grid = workingState.tileGrid;

            // Flowers — grass only; never overlap trees or rocks.
            const nextFlowers = flowerGeneration.generate({
              tileGrid: grid,
              flowers,
              identity: sNow.identity,
              bloomDays,
              occupied: buildOccupancy([...trees, ...rocks]),
            });
            if (nextFlowers.length !== flowers.length) {
              setFlowers(nextFlowers);
              PersistenceService.saveFlowers(nextFlowers).catch(console.error);
            }

            // Trees — placement + lifecycle; never overlap flowers/trees/rocks.
            const treeResult = treeGeneration.tick({
              tileGrid: grid,
              trees,
              flowers: nextFlowers,
              identity: sNow.identity,
              bloomDays,
              occupied: buildOccupancy(rocks),
            });
            if (treeResult.changed) {
              setTrees(treeResult.trees);
              PersistenceService.saveTrees(treeResult.trees).catch(console.error);
            }

            // Rocks — grass only; never overlap flowers/trees/rocks.
            const nextRocks = rockGeneration.generate({
              tileGrid: grid,
              rocks,
              flowers: nextFlowers,
              trees: treeResult.trees,
              identity: sNow.identity,
              bloomDays,
            });
            if (nextRocks.length !== rocks.length) {
              setRocks(nextRocks);
              PersistenceService.saveRocks(nextRocks).catch(console.error);
            }
          }

          setWorldState(workingState);

          // Autosave every 30 ticks (30 s).
          if (tick % simulationConfig.autoSaveIntervalTicks === 0) {
            PersistenceService.saveWorld(workingState).catch(console.error);
            PersistenceService.saveActivity(
              cumulativeToStatsIPC(useBloomStore.getState().cumulativeActivity),
            ).catch(console.error);
          }

          // Milestone save: new day reached.
          if (workingState.dayCount !== prevDay) {
            PersistenceService.saveWorld(workingState).catch(console.error);
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
        const savedPond = await PersistenceService.loadPond();
        setPond(savedPond);
        const savedDecorations = await PersistenceService.loadDecorations();
        setDecorations(savedDecorations);

        // Re-reserve already-water tiles (reservations live in memory only).
        for (const tile of useBloomStore.getState().worldState.tileGrid.tiles) {
          if (tile.terrainType === 'water') terrainService.reserve(tile.col, tile.row);
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
