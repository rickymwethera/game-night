/**
 * Charades rules as a pure reducer. No React, no timers, no randomness that
 * isn't derived from state. Anything time-based takes `now` in the action,
 * so the same actions could later be sent between phones to keep everyone
 * in sync.
 */
import { shuffle, type Team } from '../../core/types';
import { CHARADES_CATEGORIES } from './words';

export interface Card {
  word: string;
  categoryId: string;
}

export interface TurnResult {
  card: Card;
  correct: boolean;
  /** How long the card was on screen before Got it / Pass, in ms (pauses excluded). */
  ms: number;
}

export interface TurnRecord {
  teamId: string;
  actor: string;
  round: number;
  results: TurnResult[];
}

export interface CharadesSettings {
  teams: Team[];
  categoryIds: string[];
  roundSeconds: number;
  /** The game ends after the round in which a team reaches this score. */
  targetPoints: number;
  /** Safety stop so a low-scoring game still ends. */
  maxRounds: number;
  /** Each pass costs a point. */
  skipPenalty: boolean;
}

export type CharadesPhase = 'handoff' | 'playing' | 'turnSummary' | 'roundOver' | 'gameOver';

export interface CharadesState {
  phase: CharadesPhase;
  settings: CharadesSettings;
  seed: number;
  deck: Card[];
  round: number;
  teamIndex: number;
  /** Which player acts next, per team. */
  actorIndex: Record<string, number>;
  currentCard: Card | null;
  cardShownAt: number | null;
  turnEndsAt: number | null;
  /** Set while paused: time left on the clock, and when the pause began. */
  paused: { remainingMs: number; at: number } | null;
  turnResults: TurnResult[];
  history: TurnRecord[];
  scores: Record<string, number>;
}

export type CharadesAction =
  | { type: 'START_TURN'; now: number }
  | { type: 'GOT_IT'; now: number }
  | { type: 'SKIP'; now: number }
  | { type: 'PAUSE'; now: number }
  | { type: 'RESUME'; now: number }
  | { type: 'TIME_UP' }
  | { type: 'TOGGLE_RESULT'; index: number }
  | { type: 'NEXT_TURN' }
  /** From roundOver: every team plays one more turn. */
  | { type: 'NEXT_ROUND' }
  /** From roundOver: stop here and show the final results. */
  | { type: 'END_GAME' }
  | { type: 'PLAY_AGAIN' };

export const DEFAULT_SETTINGS: Omit<CharadesSettings, 'teams' | 'categoryIds'> = {
  roundSeconds: 60,
  targetPoints: 15,
  maxRounds: 10,
  skipPenalty: false,
};

// Small seeded RNG (mulberry32) so reshuffles stay reproducible from state.
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

export function buildDeck(categoryIds: string[], seed: number): Card[] {
  const cards = CHARADES_CATEGORIES.filter((c) => categoryIds.includes(c.id)).flatMap((c) =>
    c.words.map((word) => ({ word, categoryId: c.id })),
  );
  return shuffle(cards, seededRandom(seed));
}

export function createCharadesGame(settings: CharadesSettings, seed: number): CharadesState {
  return {
    phase: 'handoff',
    settings,
    seed,
    deck: buildDeck(settings.categoryIds, seed),
    round: 1,
    teamIndex: 0,
    actorIndex: Object.fromEntries(settings.teams.map((t) => [t.id, 0])),
    currentCard: null,
    cardShownAt: null,
    turnEndsAt: null,
    paused: null,
    turnResults: [],
    history: [],
    scores: Object.fromEntries(settings.teams.map((t) => [t.id, 0])),
  };
}

export function currentTeam(state: CharadesState): Team {
  return state.settings.teams[state.teamIndex];
}

/** The player acting this turn, or a generic name when the team has no players listed. */
export function actorFor(team: Team, index: number): string {
  if (team.players.length === 0) return `${team.name}'s actor`;
  return team.players[index % team.players.length];
}

export function currentActor(state: CharadesState): string {
  const team = currentTeam(state);
  return actorFor(team, state.actorIndex[team.id] ?? 0);
}

export function turnScore(results: TurnResult[], skipPenalty: boolean): number {
  const correct = results.filter((r) => r.correct).length;
  const skipped = results.length - correct;
  return correct - (skipPenalty ? skipped : 0);
}

/** Take the next card, reshuffling a fresh deck when the current one runs out. */
function drawCard(state: CharadesState, now: number): CharadesState {
  let { deck, seed } = state;
  if (deck.length === 0) {
    seed = seed + 1;
    deck = buildDeck(state.settings.categoryIds, seed);
  }
  const [next, ...rest] = deck;
  return { ...state, deck: rest, seed, currentCard: next ?? null, cardShownAt: now };
}

function recordCard(state: CharadesState, correct: boolean, now: number): CharadesState {
  if (state.phase !== 'playing' || state.paused || !state.currentCard) return state;
  const ms = Math.max(0, now - (state.cardShownAt ?? now));
  const withResult = {
    ...state,
    turnResults: [...state.turnResults, { card: state.currentCard, correct, ms }],
  };
  return drawCard(withResult, now);
}

export function charadesReducer(state: CharadesState, action: CharadesAction): CharadesState {
  switch (action.type) {
    case 'START_TURN': {
      if (state.phase !== 'handoff') return state;
      return drawCard(
        {
          ...state,
          phase: 'playing',
          paused: null,
          turnResults: [],
          turnEndsAt: action.now + state.settings.roundSeconds * 1000,
        },
        action.now,
      );
    }
    case 'GOT_IT':
      return recordCard(state, true, action.now);
    case 'SKIP':
      return recordCard(state, false, action.now);
    case 'PAUSE': {
      if (state.phase !== 'playing' || state.paused || state.turnEndsAt == null) return state;
      const remainingMs = Math.max(0, state.turnEndsAt - action.now);
      return { ...state, paused: { remainingMs, at: action.now }, turnEndsAt: null };
    }
    case 'RESUME': {
      if (state.phase !== 'playing' || !state.paused) return state;
      const pausedFor = action.now - state.paused.at;
      return {
        ...state,
        turnEndsAt: action.now + state.paused.remainingMs,
        cardShownAt: state.cardShownAt == null ? null : state.cardShownAt + pausedFor,
        paused: null,
      };
    }
    case 'TIME_UP': {
      if (state.phase !== 'playing') return state;
      // The word on screen when time ran out goes back to the deck unplayed.
      const deck = state.currentCard ? [...state.deck, state.currentCard] : state.deck;
      return {
        ...state,
        phase: 'turnSummary',
        deck,
        currentCard: null,
        cardShownAt: null,
        turnEndsAt: null,
        paused: null,
      };
    }
    case 'TOGGLE_RESULT': {
      if (state.phase !== 'turnSummary') return state;
      const turnResults = state.turnResults.map((r, i) =>
        i === action.index ? { ...r, correct: !r.correct } : r,
      );
      return { ...state, turnResults };
    }
    case 'NEXT_TURN': {
      if (state.phase !== 'turnSummary') return state;
      const { teams, skipPenalty } = state.settings;
      const team = currentTeam(state);
      const actorIdx = state.actorIndex[team.id] ?? 0;
      const scores = { ...state.scores, [team.id]: state.scores[team.id] + turnScore(state.turnResults, skipPenalty) };
      const history = [
        ...state.history,
        { teamId: team.id, actor: actorFor(team, actorIdx), round: state.round, results: state.turnResults },
      ];
      const actorIndex = { ...state.actorIndex, [team.id]: actorIdx + 1 };
      const lastTeam = state.teamIndex === teams.length - 1;
      return {
        ...state,
        scores,
        history,
        actorIndex,
        turnResults: [],
        // Everyone gets the same number of turns, so the round is only scored once the last team has played.
        teamIndex: lastTeam ? state.teamIndex : state.teamIndex + 1,
        phase: lastTeam ? 'roundOver' : 'handoff',
      };
    }
    case 'NEXT_ROUND': {
      if (state.phase !== 'roundOver' || matchDecided(state)) return state;
      return { ...state, round: state.round + 1, teamIndex: 0, phase: 'handoff' };
    }
    case 'END_GAME': {
      if (state.phase !== 'roundOver') return state;
      return { ...state, phase: 'gameOver' };
    }
    case 'PLAY_AGAIN':
      return createCharadesGame(state.settings, state.seed + 1);
    default:
      return state;
  }
}

/** True once a team has hit the target or the round limit is reached, so no further round is offered. */
export function matchDecided(state: CharadesState): boolean {
  const { targetPoints, maxRounds } = state.settings;
  return Object.values(state.scores).some((s) => s >= targetPoints) || state.round >= maxRounds;
}

/** Points each team scored in one round, in team order. */
export function roundScores(state: CharadesState, round: number): { team: Team; score: number }[] {
  const { teams, skipPenalty } = state.settings;
  return teams.map((team) => ({
    team,
    score: state.history
      .filter((t) => t.round === round && t.teamId === team.id)
      .reduce((n, t) => n + turnScore(t.results, skipPenalty), 0),
  }));
}

/** The team or teams with the most points in a round. More than one means the round was tied. */
export function roundWinners(state: CharadesState, round: number): Team[] {
  const scores = roundScores(state, round);
  const best = Math.max(...scores.map((s) => s.score));
  return scores.filter((s) => s.score === best).map((s) => s.team);
}

/** Teams sorted by score, highest first. */
export function standings(state: CharadesState): { team: Team; score: number }[] {
  return state.settings.teams
    .map((team) => ({ team, score: state.scores[team.id] ?? 0 }))
    .sort((a, b) => b.score - a.score);
}

export interface MatchStats {
  correct: number;
  skipped: number;
  /** Best actor per team: most words guessed while they were acting. */
  mvp: Record<string, { actor: string; correct: number } | undefined>;
  quickest?: { actor: string; word: string; ms: number };
  toughest?: { actor: string; word: string };
  words: (TurnResult & { actor: string; teamId: string })[];
}

export function matchStats(state: CharadesState): MatchStats {
  const words = state.history.flatMap((t) => t.results.map((r) => ({ ...r, actor: t.actor, teamId: t.teamId })));
  const correctWords = words.filter((w) => w.correct);
  const skippedWords = words.filter((w) => !w.correct);

  const mvp: MatchStats['mvp'] = {};
  for (const team of state.settings.teams) {
    const tally = new Map<string, number>();
    for (const w of correctWords) if (w.teamId === team.id) tally.set(w.actor, (tally.get(w.actor) ?? 0) + 1);
    const best = [...tally.entries()].sort((a, b) => b[1] - a[1])[0];
    mvp[team.id] = best ? { actor: best[0], correct: best[1] } : undefined;
  }

  const quickestWord = [...correctWords].sort((a, b) => a.ms - b.ms)[0];
  const toughestWord = [...skippedWords].sort((a, b) => b.ms - a.ms)[0];

  return {
    correct: correctWords.length,
    skipped: skippedWords.length,
    mvp,
    quickest: quickestWord && { actor: quickestWord.actor, word: quickestWord.card.word, ms: quickestWord.ms },
    toughest: toughestWord && { actor: toughestWord.actor, word: toughestWord.card.word },
    words,
  };
}
