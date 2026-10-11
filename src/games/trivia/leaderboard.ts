/**
 * The Trivia leaderboard, saved on the phone with AsyncStorage. No account
 * or internet needed. The ranking rules live in engine.ts.
 */
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useSyncExternalStore } from 'react';
import { addToLeaderboard, type LeaderboardEntry } from './engine';

const KEY = 'game-night/trivia-leaderboard/v1';
let board: LeaderboardEntry[] = [];
const listeners = new Set<() => void>();

function set(next: LeaderboardEntry[]) {
  board = next;
  listeners.forEach((l) => l());
  AsyncStorage.setItem(KEY, JSON.stringify(board)).catch(() => {});
}

AsyncStorage.getItem(KEY)
  .then((raw) => {
    if (!raw) return;
    // Anything saved during this launch, before the saved list loaded, still counts.
    board = addToLeaderboard(JSON.parse(raw), board);
    listeners.forEach((l) => l());
  })
  .catch(() => {});

function subscribe(listener: () => void) {
  listeners.add(listener);
  return () => listeners.delete(listener);
}

export function useLeaderboard(): LeaderboardEntry[] {
  return useSyncExternalStore(subscribe, () => board, () => board);
}

export const leaderboardActions = {
  add(entries: LeaderboardEntry[]) {
    set(addToLeaderboard(board, entries));
  },
  clear() {
    set([]);
  },
};
