/**
 * Guess the Flag rules as a pure reducer. No React, no timers, no randomness
 * that isn't derived from state. Anything time-based takes `now` in the
 * action, so the same actions could later be sent between phones.
 */
import { shuffle, type Team } from '../../core/types';
import { COUNTRIES, type ContinentId, type Country } from './countries';

export type RegionId = 'world' | ContinentId;

export const REGIONS: { id: RegionId; title: string; emoji: string; tag: string }[] = [
  { id: 'world', title: 'Whole World', emoji: '🌍', tag: 'Every flag, anywhere' },
  { id: 'africa', title: 'Africa', emoji: '🦁', tag: 'Home turf' },
  { id: 'europe', title: 'Europe', emoji: '🏰', tag: 'Stripes galore' },
  { id: 'asia', title: 'Asia', emoji: '🏯', tag: 'Biggest continent' },
  { id: 'north-america', title: 'North America', emoji: '🌴', tag: 'With the Caribbean' },
  { id: 'south-america', title: 'South America', emoji: '🦜', tag: 'Small but tricky' },
  { id: 'oceania', title: 'Oceania', emoji: '🏝️', tag: 'Stars & islands' },
];

export function getRegion(id: RegionId) {
  return REGIONS.find((r) => r.id === id) ?? REGIONS[0];
}

export function countriesIn(region: RegionId): Country[] {
  return region === 'world' ? COUNTRIES : COUNTRIES.filter((c) => c.continent === region);
}

const BY_CODE = new Map(COUNTRIES.map((c) => [c.code, c]));

export function getCountry(code: string): Country {
  const country = BY_CODE.get(code);
  if (!country) throw new Error(`Unknown country: ${code}`);
  return country;
}

export interface Question {
  /** The flag on screen. */
  code: string;
  /** Four country codes, the answer among them. */
  options: string[];
}

export interface Answer {
  code: string;
  /** null when the timer ran out. */
  picked: string | null;
  correct: boolean;
  ms: number;
}

export interface TurnRecord {
  teamId: string;
  round: number;
  answers: Answer[];
}

export interface FlagsSettings {
  teams: Team[];
  region: RegionId;
  flagsPerTurn: number;
  /** Seconds to answer each flag. 0 means no timer. */
  answerSeconds: number;
  rounds: number;
}

export type FlagsPhase = 'handoff' | 'question' | 'reveal' | 'turnOver' | 'gameOver';

export interface FlagsState {
  phase: FlagsPhase;
  settings: FlagsSettings;
  seed: number;
  /** How many flags have been drawn, so each question gets its own reproducible shuffle. */
  draws: number;
  deck: string[];
  round: number;
  teamIndex: number;
  question: Question | null;
  shownAt: number | null;
  endsAt: number | null;
  turnAnswers: Answer[];
  history: TurnRecord[];
  scores: Record<string, number>;
}

export type FlagsAction =
  | { type: 'START_TURN'; now: number }
  | { type: 'ANSWER'; code: string; now: number }
  | { type: 'TIME_UP'; now: number }
  /** From reveal: the next flag, or the end of the turn. */
  | { type: 'NEXT'; now: number }
  /** From turnOver: the next team, or the final results. */
  | { type: 'NEXT_TURN' }
  | { type: 'PLAY_AGAIN' };

export const DEFAULT_SETTINGS: Omit<FlagsSettings, 'teams'> = {
  region: 'world',
  flagsPerTurn: 10,
  answerSeconds: 15,
  rounds: 1,
};

// Small seeded RNG (mulberry32) so shuffles stay reproducible from state.
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

export function buildDeck(region: RegionId, seed: number): string[] {
  return shuffle(
    countriesIn(region).map((c) => c.code),
    seededRandom(seed),
  );
}

/**
 * The answer plus three wrong options from the same continent, so a World game
 * still asks "Kenya or Tanzania?" rather than "Kenya or Canada?".
 */
export function buildOptions(code: string, random: () => number): string[] {
  const { continent } = getCountry(code);
  const neighbours = COUNTRIES.filter((c) => c.continent === continent && c.code !== code).map((c) => c.code);
  return shuffle([code, ...shuffle(neighbours, random).slice(0, 3)], random);
}

export function createFlagsGame(settings: FlagsSettings, seed: number): FlagsState {
  return {
    phase: 'handoff',
    settings,
    seed,
    draws: 0,
    deck: buildDeck(settings.region, seed),
    round: 1,
    teamIndex: 0,
    question: null,
    shownAt: null,
    endsAt: null,
    turnAnswers: [],
    history: [],
    scores: Object.fromEntries(settings.teams.map((t) => [t.id, 0])),
  };
}

export function currentTeam(state: FlagsState): Team {
  return state.settings.teams[state.teamIndex];
}

/** Show the next flag, reshuffling a fresh deck when every flag in the region has been seen. */
function drawQuestion(state: FlagsState, now: number): FlagsState {
  let { deck, seed } = state;
  if (deck.length === 0) {
    seed = seed + 1;
    deck = buildDeck(state.settings.region, seed);
  }
  const [code, ...rest] = deck;
  const draws = state.draws + 1;
  const options = buildOptions(code, seededRandom(seed * 1000 + draws));
  const { answerSeconds } = state.settings;
  return {
    ...state,
    phase: 'question',
    deck: rest,
    seed,
    draws,
    question: { code, options },
    shownAt: now,
    endsAt: answerSeconds > 0 ? now + answerSeconds * 1000 : null,
  };
}

function answer(state: FlagsState, picked: string | null, now: number): FlagsState {
  if (state.phase !== 'question' || !state.question) return state;
  const { code } = state.question;
  const correct = picked === code;
  const team = currentTeam(state);
  return {
    ...state,
    phase: 'reveal',
    endsAt: null,
    turnAnswers: [...state.turnAnswers, { code, picked, correct, ms: Math.max(0, now - (state.shownAt ?? now)) }],
    scores: correct ? { ...state.scores, [team.id]: state.scores[team.id] + 1 } : state.scores,
  };
}

export function flagsReducer(state: FlagsState, action: FlagsAction): FlagsState {
  switch (action.type) {
    case 'START_TURN':
      if (state.phase !== 'handoff') return state;
      return drawQuestion({ ...state, turnAnswers: [] }, action.now);
    case 'ANSWER':
      return answer(state, action.code, action.now);
    case 'TIME_UP':
      return answer(state, null, action.now);
    case 'NEXT': {
      if (state.phase !== 'reveal') return state;
      if (state.turnAnswers.length < state.settings.flagsPerTurn) return drawQuestion(state, action.now);
      const team = currentTeam(state);
      return {
        ...state,
        phase: 'turnOver',
        question: null,
        shownAt: null,
        history: [...state.history, { teamId: team.id, round: state.round, answers: state.turnAnswers }],
      };
    }
    case 'NEXT_TURN': {
      if (state.phase !== 'turnOver') return state;
      const { teams, rounds } = state.settings;
      const lastTeam = state.teamIndex === teams.length - 1;
      if (!lastTeam) return { ...state, phase: 'handoff', teamIndex: state.teamIndex + 1, turnAnswers: [] };
      if (state.round >= rounds) return { ...state, phase: 'gameOver' };
      return { ...state, phase: 'handoff', round: state.round + 1, teamIndex: 0, turnAnswers: [] };
    }
    case 'PLAY_AGAIN':
      return createFlagsGame(state.settings, state.seed + 1);
    default:
      return state;
  }
}

export function isLastTurn(state: FlagsState): boolean {
  return state.teamIndex === state.settings.teams.length - 1 && state.round >= state.settings.rounds;
}

/** Correct answers in a row at the end of a list of answers. */
export function currentStreak(answers: Answer[]): number {
  let n = 0;
  for (let i = answers.length - 1; i >= 0 && answers[i].correct; i--) n++;
  return n;
}

function bestStreak(answers: Answer[]): number {
  let best = 0;
  let run = 0;
  for (const a of answers) {
    run = a.correct ? run + 1 : 0;
    best = Math.max(best, run);
  }
  return best;
}

/** Teams sorted by score, highest first. */
export function standings(state: FlagsState): { team: Team; score: number }[] {
  return state.settings.teams
    .map((team) => ({ team, score: state.scores[team.id] ?? 0 }))
    .sort((a, b) => b.score - a.score);
}

export interface TeamStats {
  correct: number;
  total: number;
  bestStreak: number;
}

export interface MatchStats {
  correct: number;
  total: number;
  perTeam: Record<string, TeamStats>;
  /** Fastest correct answer of the game. */
  quickest?: { teamId: string; code: string; ms: number };
  /** Flags someone got wrong, once each, in the order they came up. */
  missed: string[];
}

export function matchStats(state: FlagsState): MatchStats {
  const all = state.history.flatMap((t) => t.answers.map((a) => ({ ...a, teamId: t.teamId })));
  const perTeam: Record<string, TeamStats> = {};
  for (const team of state.settings.teams) {
    // Streaks don't carry between a team's turns, since other teams play in between.
    const turns = state.history.filter((t) => t.teamId === team.id);
    const answers = turns.flatMap((t) => t.answers);
    perTeam[team.id] = {
      correct: answers.filter((a) => a.correct).length,
      total: answers.length,
      bestStreak: Math.max(0, ...turns.map((t) => bestStreak(t.answers))),
    };
  }
  const quickest = all.filter((a) => a.correct).sort((a, b) => a.ms - b.ms)[0];
  return {
    correct: all.filter((a) => a.correct).length,
    total: all.length,
    perTeam,
    quickest: quickest && { teamId: quickest.teamId, code: quickest.code, ms: quickest.ms },
    missed: [...new Set(all.filter((a) => !a.correct).map((a) => a.code))],
  };
}
