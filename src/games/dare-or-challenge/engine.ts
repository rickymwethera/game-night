/**
 * Dare or Challenge rules as a pure reducer. No React, no timers, no
 * randomness that isn't derived from a seed. Every spin carries its own fresh
 * seed from the screen (made with newSeed()), so where the wheel lands can't
 * be predicted from earlier spins.
 *
 * A turn goes: the player spins the wheel (spin), it lands on a category and a
 * card is drawn (spinning), the card is shown (task), then the group says
 * whether they did it (result). Doing it scores a point. Chickening out scores
 * nothing and earns a forfeit.
 */
import { shuffle } from '../../core/types';
import { CATEGORIES, FORFEITS, type CardText, type CategoryId } from './cards';

export interface DarePlayer {
  id: string;
  name: string;
  color: string;
  emoji: string;
}

export interface DareSettings {
  players: DarePlayer[];
  /** The categories on the wheel, in wheel order. */
  categoryIds: CategoryId[];
  /** Every player gets one spin per round. */
  rounds: number;
  /** Mix in 18+ cards. Taken from Profile > Settings when the game starts. */
  adult: boolean;
}

export interface Card extends CardText {
  category: CategoryId;
}

export type DareOutcome = 'done' | 'refused';

export interface TurnRecord {
  round: number;
  playerId: string;
  card: Card;
  outcome: DareOutcome;
}

export type DarePhase = 'spin' | 'spinning' | 'task' | 'result' | 'gameOver';

export interface DareState {
  phase: DarePhase;
  settings: DareSettings;
  seed: number;
  /** Cards still to draw, per category. */
  decks: Partial<Record<CategoryId, CardText[]>>;
  forfeits: CardText[];
  round: number;
  /** Whose turn it is, as an index into settings.players. */
  playerIndex: number;
  /** Where the wheel stopped this turn, as an index into settings.categoryIds. */
  landed: number | null;
  card: Card | null;
  outcome: DareOutcome | null;
  /** Shown when the player chickens out. */
  forfeit: CardText | null;
  scores: Record<string, number>;
  history: TurnRecord[];
}

export type DareAction =
  /** Each spin brings its own random seed, made with newSeed(). */
  | { type: 'SPIN'; seed: number }
  /** The wheel has stopped: show the card. */
  | { type: 'REVEAL' }
  /** From task: the group's call. From result: change that call. */
  | { type: 'JUDGE'; outcome: DareOutcome }
  | { type: 'NEXT_TURN' }
  /** From spin: stop after the turns played so far. */
  | { type: 'END_GAME' }
  | { type: 'PLAY_AGAIN'; seed: number };

export const MIN_PLAYERS = 2;
export const MAX_PLAYERS = 12;

export const DEFAULT_SETTINGS: Pick<DareSettings, 'rounds'> = { rounds: 3 };

// Mulberry32 with a scrambled seed, as in Spy Among Us: nearby seeds would
// otherwise give related first draws, and the wheel would drift in a pattern.
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

/** A fresh seed for a spin or a new game. */
export function newSeed(): number {
  return Math.floor(Math.random() * 2 ** 32);
}

function allowed(cards: CardText[], adult: boolean): CardText[] {
  return adult ? cards : cards.filter((c) => !c.adult);
}

/** Every card the wheel could deal for these settings, by category. */
export function cardsFor(categoryId: CategoryId, adult: boolean): CardText[] {
  const category = CATEGORIES.find((c) => c.id === categoryId);
  return category ? allowed(category.cards, adult) : [];
}

function buildDeck(categoryId: CategoryId, adult: boolean, random: () => number): CardText[] {
  return shuffle(cardsFor(categoryId, adult), random);
}

export function createDareGame(settings: DareSettings, seed: number): DareState {
  const random = seededRandom(seed);
  const decks: DareState['decks'] = {};
  for (const id of settings.categoryIds) decks[id] = buildDeck(id, settings.adult, random);
  return {
    phase: 'spin',
    settings,
    seed,
    decks,
    forfeits: shuffle(allowed(FORFEITS, settings.adult), random),
    round: 1,
    playerIndex: 0,
    landed: null,
    card: null,
    outcome: null,
    forfeit: null,
    scores: Object.fromEntries(settings.players.map((p) => [p.id, 0])),
    history: [],
  };
}

export function getPlayer(state: DareState, id: string): DarePlayer | undefined {
  return state.settings.players.find((p) => p.id === id);
}

export function turnPlayer(state: DareState): DarePlayer {
  return state.settings.players[state.playerIndex];
}

/** Who plays after this turn, or null when this was the last turn of the game. */
export function nextUp(state: DareState): DarePlayer | null {
  const { players, rounds } = state.settings;
  const lastInRound = state.playerIndex === players.length - 1;
  if (lastInRound && state.round >= rounds) return null;
  return players[lastInRound ? 0 : state.playerIndex + 1];
}

/** Take the top card, reshuffling a fresh deck when one runs out. */
function draw(deck: CardText[] | undefined, fresh: () => CardText[]): [CardText | undefined, CardText[]] {
  const pile = deck && deck.length > 0 ? deck : fresh();
  const [top, ...rest] = pile;
  return [top, rest];
}

export function dareReducer(state: DareState, action: DareAction): DareState {
  switch (action.type) {
    case 'SPIN': {
      if (state.phase !== 'spin') return state;
      const { categoryIds, adult } = state.settings;
      if (categoryIds.length === 0) return state;
      const random = seededRandom(action.seed);
      // Every segment is the same size, so every category is equally likely on every spin.
      const landed = Math.floor(random() * categoryIds.length);
      const category = categoryIds[landed];
      const [text, rest] = draw(state.decks[category], () => buildDeck(category, adult, random));
      if (!text) return state;
      return {
        ...state,
        phase: 'spinning',
        landed,
        card: { ...text, category },
        decks: { ...state.decks, [category]: rest },
        outcome: null,
        forfeit: null,
      };
    }
    case 'REVEAL': {
      if (state.phase !== 'spinning') return state;
      return { ...state, phase: 'task' };
    }
    case 'JUDGE': {
      if (state.phase !== 'task' && state.phase !== 'result') return state;
      if (state.phase === 'result' && state.outcome === action.outcome) return state;
      let { forfeit, forfeits } = state;
      if (action.outcome === 'refused' && !forfeit) {
        const [next, rest] = draw(forfeits, () =>
          shuffle(allowed(FORFEITS, state.settings.adult), seededRandom(state.seed + state.history.length + 1)),
        );
        forfeit = next ?? null;
        forfeits = rest;
      }
      return { ...state, phase: 'result', outcome: action.outcome, forfeit, forfeits };
    }
    case 'NEXT_TURN': {
      if (state.phase !== 'result' || !state.card || !state.outcome) return state;
      const player = turnPlayer(state);
      const scores = { ...state.scores };
      if (state.outcome === 'done') scores[player.id] = (scores[player.id] ?? 0) + 1;
      const history = [
        ...state.history,
        { round: state.round, playerId: player.id, card: state.card, outcome: state.outcome },
      ];
      const next = nextUp(state);
      const lastInRound = state.playerIndex === state.settings.players.length - 1;
      return {
        ...state,
        scores,
        history,
        landed: null,
        card: null,
        outcome: null,
        forfeit: null,
        phase: next ? 'spin' : 'gameOver',
        round: next && lastInRound ? state.round + 1 : state.round,
        playerIndex: next && lastInRound ? 0 : next ? state.playerIndex + 1 : state.playerIndex,
      };
    }
    case 'END_GAME': {
      if (state.phase !== 'spin' || state.history.length === 0) return state;
      return { ...state, phase: 'gameOver' };
    }
    case 'PLAY_AGAIN':
      return createDareGame(state.settings, action.seed);
    default:
      return state;
  }
}

/** Players sorted by score, highest first. Ties keep seating order. */
export function standings(state: DareState): { player: DarePlayer; score: number }[] {
  return state.settings.players
    .map((player) => ({ player, score: state.scores[player.id] ?? 0 }))
    .sort((a, b) => b.score - a.score);
}

export interface MatchStats {
  done: number;
  refused: number;
  turns: number;
  /** Turns and cards done, per player. */
  perPlayer: Record<string, { done: number; turns: number }>;
}

export function matchStats(state: DareState): MatchStats {
  const perPlayer: MatchStats['perPlayer'] = Object.fromEntries(
    state.settings.players.map((p) => [p.id, { done: 0, turns: 0 }]),
  );
  for (const t of state.history) {
    const p = perPlayer[t.playerId];
    if (!p) continue;
    p.turns++;
    if (t.outcome === 'done') p.done++;
  }
  const done = state.history.filter((t) => t.outcome === 'done').length;
  return { done, refused: state.history.length - done, turns: state.history.length, perPlayer };
}
