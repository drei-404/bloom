import { create } from 'zustand';
import type { WorldState } from '../types/world';
import { createInitialWorldState } from '../simulation/initialState';

interface BloomStore {
  worldState: WorldState;
  isRunning: boolean;
  setWorldState: (state: WorldState) => void;
  setRunning: (running: boolean) => void;
}

export const useBloomStore = create<BloomStore>()(set => ({
  worldState: createInitialWorldState(),
  isRunning: false,
  setWorldState: state => set({ worldState: state }),
  setRunning: running => set({ isRunning: running }),
}));
