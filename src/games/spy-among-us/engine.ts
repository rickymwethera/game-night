/**
 * Spy Among Us rules as a pure reducer. No React, no timers, no randomness
 * that isn't derived from the seed in state. The discussion clock is stored
 * as an end timestamp taken from the action, so the same actions could later
 * be sent between phones to keep everyone in sync.
 *
 * A round goes: everyone peeks at their role in turn (reveal), the group
 * questions each other (discuss), then votes someone out (vote, verdict).
 * If the spy is caught they get one last guess at the word (spyGuess).
 */
import { shuffle } from '../../core/types';
import { SPY_PACKS, getPack } from './words';

export interface SpyPlayer {
  id: string;
  name: string;
  color: string;
  emoji: string;
}

/** 'secret': the phone goes round for private ballots. 'group': everyone points, one tap records who was voted out. */
export type VotingMode = 'secret' | 'group';

export interface SpySettings {
  players: SpyPlayer[];
  packIds: string[];
  discussSeconds: number;
  /** The spy is told which pack the word comes from. */
  spyHint: boolean;
  voting: VotingMode;
  rounds: number;
}

export type SpyPhase = 'reveal' | 'discuss' | 'vote' | 'verdict' | 'spyGuess' | 'roundOver' | 'gameOver';

export type SpyOutcome =
  /** The group voted out an innocent player, or couldn't agree. */
  | 'spy-escaped'
  /** The spy was voted out and guessed the word wrong. */
  | 'spy-caught'
  /** The spy was voted out but named the word. */
  | 'spy-stole'
  /** The spy owned up during the discussion and named the word. */
  | 'spy-guessed'
  /** The spy owned up during the discussion and guessed wrong. */
  | 'spy-blundered';

export interface SpyRoundRecord {
  round: number;
  spyId: string;
  word: string;
  packId: string;
  /** Who the group voted out, or null for a tied vote. */
  accusedId: string | null;
  spyGuess: string | null;
  outcome: SpyOutcome;
  /** Points each player won this round. */
  points: Record<string, number>;
}

export interface SpyState {
  phase: SpyPhase;
  settings: SpySettings;
  seed: number;
  round: number;
  spyId: string;
  word: string;
  packId: string;
  /** Who asks the first question. */
  starterId: string;
  /** Words already played, so a word doesn't come back until the packs run out. */
  usedWords: string[];
  /** Whose turn it is to peek at the phone, and whether their role is on screen. */
  revealIndex: number;
  roleShown: boolean;
  discussEndsAt: number | null;
  /** Secret ballots: voter id -> accused id. */
  votes: Record<string, string>;
  voterIndex: number;
  /** Who can be voted for. Narrows to the tied players for a runoff. */
  candidates: string[];
  runoff: boolean;
  accusedId: string | null;
  /** Shuffled words from the same pack, shown to the spy for their guess. Includes the real word. */
  guessOptions: string[];
  /** True when the spy owned up during the discussion instead of being voted out. */
  guessEarly: boolean;
  scores: Record<string, number>;
  history: SpyRoundRecord[];
}

export type SpyAction =
  | { type: 'SHOW_ROLE' }
  /** Hide the role and pass on. After the last player, the discussion starts. */
  | { type: 'HIDE_ROLE'; now: number }
  /** From discuss: start the secret ballot. */
  | { type: 'CALL_VOTE' }
  /** From discuss, for group voting: everyone pointed and this player was voted out. */
  | { type: 'ACCUSE'; playerId: string }
  /** From discuss: the spy owns up and tries to name the word. */
  | { type: 'SPY_OWNS_UP' }
  | { type: 'CAST_VOTE'; targetId: string }
  /** From verdict: reveal whether the accused player is the spy. */
  | { type: 'REVEAL' }
  | { type: 'SPY_GUESS'; word: string }
  /** Each new round brings its own random seed, made with newSeed(). */
  | { type: 'NEXT_ROUND'; seed: number }
  | { type: 'END_GAME' }
  | { type: 'PLAY_AGAIN'; seed: number };

export const MIN_PLAYERS = 3;
export const MAX_PLAYERS = 10;
export const GUESS_OPTIONS = 8;

/** Points per outcome. The spy scores for fooling the group; everyone else scores for catching them. */
export const POINTS = {
  spyEscaped: 2,
  spyStole: 2,
  spyGuessed: 3,
  caught: 1,
};

export const DEFAULT_SETTINGS: Omit<SpySettings, 'players' | 'packIds'> = {
  discussSeconds: 300,
  spyHint: true,
  voting: 'secret',
  rounds: 5,
};

// Small seeded RNG (mulberry32), so every draw is reproducible from the seed in state.
// The seed is scrambled first: mulberry32's first outputs for nearby seeds are related,
// which made the spy walk through the players in order from round to round.
function seededRandom(seed: number): () => number {
  let a = Math.imul((seed >>> 0) ^ 0x9e3779b9, 0x85ebca6b);
  a = Math.imul(a ^ (a >>> 13), 0xc2b2ae35);
  a = (a ^ (a >>> 16)) >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

function pick<T>(items: readonly T[], random: () => number): T {
  return items[Math.floor(random() * items.length)];
}

/** Random seed for a new round or game. The screen makes one and passes it in the action. */
export function newSeed(): number {
  return Math.floor(Math.random() * 2 ** 32);
}

/** Deal a fresh round from its own seed: a new spy, word and first questioner. */
function dealRound(state: SpyState, round: number, seed: number): SpyState {
  const { players, packIds } = state.settings;
  const random = seededRandom(seed);

  // Anyone can be the spy, including last round's spy, so the pick can't be guessed.
  const spyId = pick(players, random).id;
  const starterId = pick(players, random).id;

  const all = SPY_PACKS.filter((p) => packIds.includes(p.id)).flatMap((p) => p.words.map((word) => ({ word, packId: p.id })));
  let fresh = all.filter((w) => !state.usedWords.includes(w.word));
  let usedWords = state.usedWords;
  if (fresh.length === 0) {
    fresh = all;
    usedWords = [];
  }
  const { word, packId } = pick(fresh, random);

  const decoys = shuffle(
    (getPack(packId)?.words ?? []).filter((w) => w !== word),
    random,
  ).slice(0, GUESS_OPTIONS - 1);
  const guessOptions = shuffle([word, ...decoys], random);

  return {
    ...state,
    phase: 'reveal',
    seed,
    round,
    spyId,
    word,
    packId,
    starterId,
    usedWords: [...usedWords, word],
    revealIndex: 0,
    roleShown: false,
    discussEndsAt: null,
    votes: {},
    voterIndex: 0,
    candidates: players.map((p) => p.id),
    runoff: false,
    accusedId: null,
    guessOptions,
    guessEarly: false,
  };
}

export function createSpyGame(settings: SpySettings, seed: number): SpyState {
  const blank: SpyState = {
    phase: 'reveal',
    settings,
    seed,
    round: 1,
    spyId: '',
    word: '',
    packId: '',
    starterId: '',
    usedWords: [],
    revealIndex: 0,
    roleShown: false,
    discussEndsAt: null,
    votes: {},
    voterIndex: 0,
    candidates: [],
    runoff: false,
    accusedId: null,
    guessOptions: [],
    guessEarly: false,
    scores: Object.fromEntries(settings.players.map((p) => [p.id, 0])),
    history: [],
  };
  return dealRound(blank, 1, seed);
}

export function getPlayer(state: SpyState, id: string | null): SpyPlayer | undefined {
  return state.settings.players.find((p) => p.id === id);
}

export function revealPlayer(state: SpyState): SpyPlayer {
  return state.settings.players[state.revealIndex];
}

export function currentVoter(state: SpyState): SpyPlayer {
  return state.settings.players[state.voterIndex];
}

/** Votes per candidate in the current ballot, most votes first. */
export function tally(state: SpyState): { player: SpyPlayer; votes: number }[] {
  return state.candidates
    .map((id) => ({
      player: getPlayer(state, id)!,
      votes: Object.values(state.votes).filter((t) => t === id).length,
    }))
    .sort((a, b) => b.votes - a.votes);
}

function finishRound(state: SpyState, outcome: SpyOutcome, spyGuess: string | null): SpyState {
  const points: Record<string, number> = Object.fromEntries(state.settings.players.map((p) => [p.id, 0]));
  if (outcome === 'spy-escaped') points[state.spyId] = POINTS.spyEscaped;
  else if (outcome === 'spy-stole') points[state.spyId] = POINTS.spyStole;
  else if (outcome === 'spy-guessed') points[state.spyId] = POINTS.spyGuessed;
  else for (const p of state.settings.players) if (p.id !== state.spyId) points[p.id] = POINTS.caught;

  const scores = Object.fromEntries(
    state.settings.players.map((p) => [p.id, (state.scores[p.id] ?? 0) + points[p.id]]),
  );
  const record: SpyRoundRecord = {
    round: state.round,
    spyId: state.spyId,
    word: state.word,
    packId: state.packId,
    accusedId: state.accusedId,
    spyGuess,
    outcome,
    points,
  };
  return { ...state, phase: 'roundOver', scores, history: [...state.history, record] };
}

/** Count the ballots: a clear top pick is accused, a first tie goes to a runoff, a second tie lets the spy off. */
function closeBallot(state: SpyState): SpyState {
  const counts = tally(state);
  const top = counts[0]?.votes ?? 0;
  const leaders = counts.filter((c) => c.votes === top).map((c) => c.player.id);
  if (leaders.length === 1) return { ...state, phase: 'verdict', accusedId: leaders[0] };
  if (!state.runoff) {
    return { ...state, phase: 'vote', votes: {}, voterIndex: 0, candidates: leaders, runoff: true };
  }
  return { ...state, phase: 'verdict', accusedId: null };
}

export function spyReducer(state: SpyState, action: SpyAction): SpyState {
  switch (action.type) {
    case 'SHOW_ROLE': {
      if (state.phase !== 'reveal' || state.roleShown) return state;
      return { ...state, roleShown: true };
    }
    case 'HIDE_ROLE': {
      if (state.phase !== 'reveal' || !state.roleShown) return state;
      const last = state.revealIndex >= state.settings.players.length - 1;
      if (!last) return { ...state, revealIndex: state.revealIndex + 1, roleShown: false };
      return {
        ...state,
        roleShown: false,
        phase: 'discuss',
        discussEndsAt: action.now + state.settings.discussSeconds * 1000,
      };
    }
    case 'CALL_VOTE': {
      if (state.phase !== 'discuss') return state;
      return { ...state, phase: 'vote', votes: {}, voterIndex: 0, discussEndsAt: null };
    }
    case 'ACCUSE': {
      if (state.phase !== 'discuss' || !getPlayer(state, action.playerId)) return state;
      return { ...state, phase: 'verdict', accusedId: action.playerId, discussEndsAt: null };
    }
    case 'SPY_OWNS_UP': {
      if (state.phase !== 'discuss') return state;
      return { ...state, phase: 'spyGuess', guessEarly: true, accusedId: state.spyId, discussEndsAt: null };
    }
    case 'CAST_VOTE': {
      if (state.phase !== 'vote' || !state.candidates.includes(action.targetId)) return state;
      const voter = currentVoter(state);
      // You can't vote for yourself, unless a runoff left you with no one else to pick.
      if (action.targetId === voter.id && state.candidates.some((c) => c !== voter.id)) return state;
      const votes = { ...state.votes, [voter.id]: action.targetId };
      const next = { ...state, votes, voterIndex: state.voterIndex + 1 };
      return next.voterIndex >= state.settings.players.length ? closeBallot(next) : next;
    }
    case 'REVEAL': {
      if (state.phase !== 'verdict') return state;
      if (state.accusedId === state.spyId) return { ...state, phase: 'spyGuess' };
      return finishRound(state, 'spy-escaped', null);
    }
    case 'SPY_GUESS': {
      if (state.phase !== 'spyGuess') return state;
      const right = action.word === state.word;
      const outcome: SpyOutcome = state.guessEarly
        ? right
          ? 'spy-guessed'
          : 'spy-blundered'
        : right
          ? 'spy-stole'
          : 'spy-caught';
      return finishRound(state, outcome, action.word);
    }
    case 'NEXT_ROUND': {
      if (state.phase !== 'roundOver' || matchDecided(state)) return state;
      return dealRound(state, state.round + 1, action.seed);
    }
    case 'END_GAME': {
      if (state.phase !== 'roundOver') return state;
      return { ...state, phase: 'gameOver' };
    }
    case 'PLAY_AGAIN':
      return createSpyGame(state.settings, action.seed);
    default:
      return state;
  }
}

/** True once the planned number of rounds has been played. */
export function matchDecided(state: SpyState): boolean {
  return state.round >= state.settings.rounds;
}

/** True when the spy came out ahead this round. */
export function spyWon(outcome: SpyOutcome): boolean {
  return outcome === 'spy-escaped' || outcome === 'spy-stole' || outcome === 'spy-guessed';
}

/** Players sorted by score, highest first. */
export function standings(state: SpyState): { player: SpyPlayer; score: number }[] {
  return state.settings.players
    .map((player) => ({ player, score: state.scores[player.id] ?? 0 }))
    .sort((a, b) => b.score - a.score);
}

export interface SpyStats {
  spyWins: number;
  groupWins: number;
  /** The player who won most rounds as the spy. */
  masterSpy?: { player: SpyPlayer; wins: number };
  /** The player who was spy most often. */
  usualSuspect?: { player: SpyPlayer; times: number };
}

export function matchStats(state: SpyState): SpyStats {
  const spyWins = state.history.filter((r) => spyWon(r.outcome)).length;
  const winsBy = new Map<string, number>();
  const timesBy = new Map<string, number>();
  for (const r of state.history) {
    timesBy.set(r.spyId, (timesBy.get(r.spyId) ?? 0) + 1);
    if (spyWon(r.outcome)) winsBy.set(r.spyId, (winsBy.get(r.spyId) ?? 0) + 1);
  }
  const best = [...winsBy.entries()].sort((a, b) => b[1] - a[1])[0];
  const most = [...timesBy.entries()].sort((a, b) => b[1] - a[1])[0];
  return {
    spyWins,
    groupWins: state.history.length - spyWins,
    masterSpy: best && { player: getPlayer(state, best[0])!, wins: best[1] },
    usualSuspect: most && most[1] > 1 ? { player: getPlayer(state, most[0])!, times: most[1] } : undefined,
  };
}
