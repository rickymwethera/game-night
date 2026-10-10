/**
 * Small app-wide store for things that outlive a single game: finished game
 * history and a couple of preferences. Saved to the phone with AsyncStorage.
 */
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useSyncExternalStore } from 'react';
import type { GameId } from './types';

export interface GameRecord {
  id: string;
  gameId: GameId;
  playedAt: number;
  rounds: number;
  teams: { name: string; color: string; emoji: string; score: number }[];
}

interface AppState {
  history: GameRecord[];
  soundOn: boolean;
  adultContent: boolean;
}

const KEY = 'game-night/app-state/v1';
let state: AppState = { history: [], soundOn: true, adultContent: false };
const listeners = new Set<() => void>();

function set(next: Partial<AppState>) {
  state = { ...state, ...next };
  listeners.forEach((l) => l());
  AsyncStorage.setItem(KEY, JSON.stringify(state)).catch(() => {});
}

AsyncStorage.getItem(KEY)
  .then((raw) => {
    if (!raw) return;
    state = { ...state, ...JSON.parse(raw) };
    listeners.forEach((l) => l());
  })
  .catch(() => {});

function subscribe(listener: () => void) {
  listeners.add(listener);
  return () => listeners.delete(listener);
}

export function useAppState<T>(select: (s: AppState) => T): T {
  return useSyncExternalStore(subscribe, () => select(state), () => select(state));
}

export const appActions = {
  addGame(record: GameRecord) {
    set({ history: [record, ...state.history].slice(0, 50) });
  },
  clearHistory() {
    set({ history: [] });
  },
  setSoundOn(soundOn: boolean) {
    set({ soundOn });
  },
  setAdultContent(adultContent: boolean) {
    set({ adultContent });
  },
};

export function getSoundOn() {
  return state.soundOn;
}
