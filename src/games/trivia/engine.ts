/**
 * Trivia rules as a pure reducer. No React, no timers, no randomness that
 * isn't derived from state. Anything time-based takes `now` in the action,
 * so the same actions could later be sent between phones.
 */
import { shuffle, type Team } from '../../core/types';
import { TRIVIA_PACKS, type TriviaPack, type TriviaQuestion } from './packs';

/** Points for a right answer, plus up to SPEED_BONUS more for answering fast when the timer is on. */
export const BASE_POINTS = 100;
export const SPEED_BONUS = 50;

const PACKS_BY_ID = new Map(TRIVIA_PACKS.map((p) => [p.id, p]));

export function getPack(id: string): TriviaPack {
  const pack = PACKS_BY_ID.get(id);
  if (!pack) throw new Error(`Unknown trivia pack: ${id}`);
  return pack;
}

/** Questions are referred to as "<pack id>:<index>" so state stays small and serialisable. */
export function getQuestion(id: string): TriviaQuestion & { packId: string } {
  const [packId, index] = id.split(':');
  const question = getPack(packId).questions[Number(index)];
  if (!question) throw new Error(`Unknown trivia question: ${id}`);
  return { ...question, packId };
}

export function questionIds(packIds: string[]): string[] {
  return packIds.flatMap((id) => getPack(id).questions.map((_, i) => `${id}:${i}`));
}

export interface Question {
  id: string;
  /** The four answers in the order they're shown, the right one among them. */
  options: string[];
}

export interface Answer {
  id: string;
  /** null when the timer ran out. */
  picked: string | null;
  correct: boolean;
  ms: number;
  points: number;
}

export interface TurnRecord {
  teamId: string;
  round: number;
  answers: Answer[];
}

export interface TriviaSettings {
  teams: Team[];
  packIds: string[];
  questionsPerTurn: number;
  /** Seconds to answer each question. 0 means no timer (and no speed bonus). */
  answerSeconds: number;
  rounds: number;
}

export type TriviaPhase = 'handoff' | 'question' | 'reveal' | 'turnOver' | 'gameOver';

export interface TriviaState {
  phase: TriviaPhase;
  settings: TriviaSettings;
  seed: number;
  /** How many questions have been drawn, so each one gets its own reproducible option shuffle. */
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

export type TriviaAction =
  | { type: 'START_TURN'; now: number }
  | { type: 'ANSWER'; option: string; now: number }
  | { type: 'TIME_UP'; now: number }
  /** From reveal: the next question, or the end of the turn. */
  | { type: 'NEXT'; now: number }
  /** From turnOver: the next team, or the final results. */
  | { type: 'NEXT_TURN' }
  | { type: 'PLAY_AGAIN' };

export const DEFAULT_SETTINGS: Omit<TriviaSettings, 'teams'> = {
  packIds: TRIVIA_PACKS.map((p) => p.id),
  questionsPerTurn: 10,
  answerSeconds: 20,
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

export function buildDeck(packIds: string[], seed: number): string[] {
  return shuffle(questionIds(packIds), seededRandom(seed));
}

export function createTriviaGame(settings: TriviaSettings, seed: number): TriviaState {
  return {
    phase: 'handoff',
    settings,
    seed,
    draws: 0,
    deck: buildDeck(settings.packIds, seed),
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

export function currentTeam(state: TriviaState): Team {
  return state.settings.teams[state.teamIndex];
}

/** Show the next question, reshuffling a fresh deck once every question in the chosen packs has been asked. */
function drawQuestion(state: TriviaState, now: number): TriviaState {
  let { deck, seed } = state;
  if (deck.length === 0) {
    seed = seed + 1;
    deck = buildDeck(state.settings.packIds, seed);
  }
  const [id, ...rest] = deck;
  const draws = state.draws + 1;
  const { a, wrong } = getQuestion(id);
  const options = shuffle([a, ...wrong], seededRandom(seed * 1000 + draws));
  const { answerSeconds } = state.settings;
  return {
    ...state,
    phase: 'question',
    deck: rest,
    seed,
    draws,
    question: { id, options },
    shownAt: now,
    endsAt: answerSeconds > 0 ? now + answerSeconds * 1000 : null,
  };
}

/** 100 for a right answer, plus a bonus that shrinks as the timer runs down. */
export function pointsFor(correct: boolean, ms: number, answerSeconds: number): number {
  if (!correct) return 0;
  if (answerSeconds <= 0) return BASE_POINTS;
  const left = Math.max(0, 1 - ms / (answerSeconds * 1000));
  return BASE_POINTS + Math.round(SPEED_BONUS * left);
}

function answer(state: TriviaState, picked: string | null, now: number): TriviaState {
  if (state.phase !== 'question' || !state.question) return state;
  const { id } = state.question;
  const correct = picked === getQuestion(id).a;
  const ms = Math.max(0, now - (state.shownAt ?? now));
  const points = pointsFor(correct, ms, state.settings.answerSeconds);
  const team = currentTeam(state);
  return {
    ...state,
    phase: 'reveal',
    endsAt: null,
    turnAnswers: [...state.turnAnswers, { id, picked, correct, ms, points }],
    scores: { ...state.scores, [team.id]: state.scores[team.id] + points },
  };
}

export function triviaReducer(state: TriviaState, action: TriviaAction): TriviaState {
  switch (action.type) {
    case 'START_TURN':
      if (state.phase !== 'handoff') return state;
      return drawQuestion({ ...state, turnAnswers: [] }, action.now);
    case 'ANSWER':
      return answer(state, action.option, action.now);
    case 'TIME_UP':
      return answer(state, null, action.now);
    case 'NEXT': {
      if (state.phase !== 'reveal') return state;
      if (state.turnAnswers.length < state.settings.questionsPerTurn) return drawQuestion(state, action.now);
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
      return createTriviaGame(state.settings, state.seed + 1);
    default:
      return state;
  }
}

export function isLastTurn(state: TriviaState): boolean {
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
export function standings(state: TriviaState): { team: Team; score: number }[] {
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
  quickest?: { teamId: string; id: string; ms: number };
  /** Questions someone got wrong, once each, in the order they came up. */
  missed: string[];
}

export function matchStats(state: TriviaState): MatchStats {
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
    quickest: quickest && { teamId: quickest.teamId, id: quickest.id, ms: quickest.ms },
    missed: [...new Set(all.filter((a) => !a.correct).map((a) => a.id))],
  };
}

/* ---------- Leaderboard ---------- */

/** One team's (or solo player's) finished game, kept on the phone's leaderboard. */
export interface LeaderboardEntry {
  id: string;
  name: string;
  emoji: string;
  color: string;
  score: number;
  correct: number;
  total: number;
  playedAt: number;
}

export const LEADERBOARD_SIZE = 20;

/** Highest score first; on a tie, better accuracy, then whoever got there first. */
function compareEntries(a: LeaderboardEntry, b: LeaderboardEntry): number {
  return b.score - a.score || b.correct / (b.total || 1) - a.correct / (a.total || 1) || a.playedAt - b.playedAt;
}

export function leaderboardEntries(state: TriviaState, playedAt: number): LeaderboardEntry[] {
  const stats = matchStats(state);
  return state.settings.teams.map((t) => ({
    id: `${playedAt}-${state.seed}-${t.id}`,
    name: t.name,
    emoji: t.emoji,
    color: t.color,
    score: state.scores[t.id] ?? 0,
    correct: stats.perTeam[t.id].correct,
    total: stats.perTeam[t.id].total,
    playedAt,
  }));
}

/** Adds entries and keeps the best LEADERBOARD_SIZE. Games where nobody scored aren't worth a spot. */
export function addToLeaderboard(board: LeaderboardEntry[], entries: LeaderboardEntry[]): LeaderboardEntry[] {
  return [...board, ...entries.filter((e) => e.score > 0)].sort(compareEntries).slice(0, LEADERBOARD_SIZE);
}
