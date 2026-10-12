/**
 * Five-Second Challenge rules as a pure reducer. No React, no timers, no
 * randomness that isn't derived from the seed in state. The clock is stored as
 * an end timestamp taken from the action, so the same actions could later be
 * sent between phones to keep everyone in sync.
 *
 * A turn goes: the phone is passed to the next player (handoff), the prompt
 * appears and the clock runs while they answer out loud (playing), the group
 * says whether they named three (judge), then the result shows (verdict). If
 * the player missed, the next player in line can try to steal the point with
 * a fresh clock.
 */
import { shuffle } from '../../core/types';
import { FIVE_PACKS } from './packs';

export interface FivePlayer {
  id: string;
  name: string;
  color: string;
  emoji: string;
}

export interface FiveSettings {
  players: FivePlayer[];
  packIds: string[];
  /** Length of the clock. Five is the classic; longer is kinder to kids. */
  seconds: number;
  /** Every player gets one turn per round. */
  rounds: number;
  /** When a player misses, the next player can steal the point. */
  steals: boolean;
}

export interface Prompt {
  text: string;
  packId: string;
}

export interface Attempt {
  playerId: string;
  /** The group agreed they named three in time. */
  success: boolean;
  steal: boolean;
}

export interface TurnRecord {
  round: number;
  playerId: string;
  prompt: Prompt;
  /** The turn player's attempt, then the steal attempt if there was one. */
  attempts: Attempt[];
}

export type FivePhase = 'handoff' | 'playing' | 'judge' | 'verdict' | 'gameOver';

export interface FiveState {
  phase: FivePhase;
  settings: FiveSettings;
  seed: number;
  deck: Prompt[];
  round: number;
  /** Whose turn it is, as an index into settings.players. */
  playerIndex: number;
  prompt: Prompt | null;
  /** True while the next player is trying to steal. */
  stealing: boolean;
  endsAt: number | null;
  /** Finished attempts in the current turn. */
  attempts: Attempt[];
  scores: Record<string, number>;
  history: TurnRecord[];
}

export type FiveAction =
  | { type: 'START_TURN'; now: number }
  | { type: 'TIME_UP' }
  /** From judge: the group's call on whoever just answered. From verdict: change that call. */
  | { type: 'JUDGE'; success: boolean }
  /** From verdict, after a miss: the next player tries the same prompt. */
  | { type: 'STEAL'; now: number }
  | { type: 'NEXT_TURN' }
  /** From handoff: stop after the turns played so far. */
  | { type: 'END_GAME' }
  | { type: 'PLAY_AGAIN' };

export const ANSWERS_NEEDED = 3;
export const MIN_PLAYERS = 2;
export const MAX_PLAYERS = 12;

export const DEFAULT_SETTINGS: Omit<FiveSettings, 'players' | 'packIds'> = {
  seconds: 5,
  rounds: 3,
  steals: true,
};

// Small seeded RNG (mulberry32), same as Charades, so every draw is reproducible from state.
function seededRandom(seed: number): () => number {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

export function buildDeck(packIds: string[], seed: number): Prompt[] {
  const prompts = FIVE_PACKS.filter((p) => packIds.includes(p.id)).flatMap((p) =>
    p.prompts.map((text) => ({ text, packId: p.id })),
  );
  return shuffle(prompts, seededRandom(seed));
}

export function createFiveGame(settings: FiveSettings, seed: number): FiveState {
  return {
    phase: 'handoff',
    settings,
    seed,
    deck: buildDeck(settings.packIds, seed),
    round: 1,
    playerIndex: 0,
    prompt: null,
    stealing: false,
    endsAt: null,
    attempts: [],
    scores: Object.fromEntries(settings.players.map((p) => [p.id, 0])),
    history: [],
  };
}

export function getPlayer(state: FiveState, id: string): FivePlayer | undefined {
  return state.settings.players.find((p) => p.id === id);
}

export function turnPlayer(state: FiveState): FivePlayer {
  return state.settings.players[state.playerIndex];
}

/** The player who would steal: next in line after the turn player. */
export function stealer(state: FiveState): FivePlayer {
  const { players } = state.settings;
  return players[(state.playerIndex + 1) % players.length];
}

/** Whoever is answering right now. */
export function responder(state: FiveState): FivePlayer {
  return state.stealing ? stealer(state) : turnPlayer(state);
}

/** True when the turn on the verdict screen can still be stolen. */
export function canSteal(state: FiveState): boolean {
  return (
    state.phase === 'verdict' &&
    state.settings.steals &&
    state.settings.players.length > 1 &&
    state.attempts.length === 1 &&
    !state.attempts[0].success
  );
}

/** Who plays after this turn, or null when this was the last turn of the game. */
export function nextUp(state: FiveState): FivePlayer | null {
  const { players, rounds } = state.settings;
  const lastInRound = state.playerIndex === players.length - 1;
  if (lastInRound && state.round >= rounds) return null;
  return players[lastInRound ? 0 : state.playerIndex + 1];
}

function startClock(state: FiveState, now: number): FiveState {
  return { ...state, phase: 'playing', endsAt: now + state.settings.seconds * 1000 };
}

/** Take the next prompt, reshuffling a fresh deck when the current one runs out. */
function drawPrompt(state: FiveState): FiveState {
  let { deck, seed } = state;
  if (deck.length === 0) {
    seed = seed + 1;
    deck = buildDeck(state.settings.packIds, seed);
  }
  const [next, ...rest] = deck;
  return { ...state, deck: rest, seed, prompt: next ?? null };
}

export function fiveReducer(state: FiveState, action: FiveAction): FiveState {
  switch (action.type) {
    case 'START_TURN': {
      if (state.phase !== 'handoff') return state;
      return startClock(drawPrompt({ ...state, stealing: false, attempts: [] }), action.now);
    }
    case 'TIME_UP': {
      if (state.phase !== 'playing') return state;
      return { ...state, phase: 'judge', endsAt: null };
    }
    case 'JUDGE': {
      if (state.phase === 'judge') {
        const attempt: Attempt = { playerId: responder(state).id, success: action.success, steal: state.stealing };
        return { ...state, phase: 'verdict', attempts: [...state.attempts, attempt] };
      }
      if (state.phase !== 'verdict' || state.attempts.length === 0) return state;
      const attempts = state.attempts.map((a, i) =>
        i === state.attempts.length - 1 ? { ...a, success: action.success } : a,
      );
      return { ...state, attempts };
    }
    case 'STEAL': {
      if (!canSteal(state)) return state;
      return startClock({ ...state, stealing: true }, action.now);
    }
    case 'NEXT_TURN': {
      if (state.phase !== 'verdict' || !state.prompt) return state;
      const scores = { ...state.scores };
      for (const a of state.attempts) if (a.success) scores[a.playerId] = (scores[a.playerId] ?? 0) + 1;
      const history = [
        ...state.history,
        { round: state.round, playerId: turnPlayer(state).id, prompt: state.prompt, attempts: state.attempts },
      ];
      const next = nextUp(state);
      const lastInRound = state.playerIndex === state.settings.players.length - 1;
      return {
        ...state,
        scores,
        history,
        prompt: null,
        stealing: false,
        attempts: [],
        phase: next ? 'handoff' : 'gameOver',
        round: next && lastInRound ? state.round + 1 : state.round,
        playerIndex: next && lastInRound ? 0 : next ? state.playerIndex + 1 : state.playerIndex,
      };
    }
    case 'END_GAME': {
      if (state.phase !== 'handoff' || state.history.length === 0) return state;
      return { ...state, phase: 'gameOver' };
    }
    case 'PLAY_AGAIN':
      return createFiveGame(state.settings, state.seed + 1);
    default:
      return state;
  }
}

/** Players sorted by score, highest first. Ties keep seating order. */
export function standings(state: FiveState): { player: FivePlayer; score: number }[] {
  return state.settings.players
    .map((player) => ({ player, score: state.scores[player.id] ?? 0 }))
    .sort((a, b) => b.score - a.score);
}

export interface MatchStats {
  /** Attempts the group called a success, steals included. */
  nailed: number;
  attempts: number;
  steals: number;
}

export function matchStats(state: FiveState): MatchStats {
  const all = state.history.flatMap((t) => t.attempts);
  return {
    nailed: all.filter((a) => a.success).length,
    attempts: all.length,
    steals: all.filter((a) => a.steal && a.success).length,
  };
}
