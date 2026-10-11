/// <reference types="node" />
import assert from 'node:assert/strict';
import { test } from 'node:test';
import { makeTeams } from '../../../core/types';
import {
  addToLeaderboard,
  BASE_POINTS,
  createTriviaGame,
  currentStreak,
  getQuestion,
  LEADERBOARD_SIZE,
  leaderboardEntries,
  matchStats,
  pointsFor,
  questionIds,
  SPEED_BONUS,
  standings,
  triviaReducer,
  type LeaderboardEntry,
  type TriviaSettings,
  type TriviaState,
} from '../engine';
import { TRIVIA_PACKS } from '../packs';

function makeSettings(overrides: Partial<TriviaSettings> = {}): TriviaSettings {
  return {
    teams: makeTeams(2),
    packIds: ['kenyan-culture', 'football'],
    questionsPerTurn: 3,
    answerSeconds: 20,
    rounds: 1,
    ...overrides,
  };
}

let clock = 0;
/** Plays one turn, answering right for each `true` and wrong for each `false`, 2 seconds per answer. */
function playTurn(state: TriviaState, picks: boolean[]): TriviaState {
  let s = triviaReducer(state, { type: 'START_TURN', now: (clock += 1000) });
  for (const right of picks) {
    const q = s.question!;
    const answer = getQuestion(q.id).a;
    const option = right ? answer : q.options.find((o) => o !== answer)!;
    s = triviaReducer(s, { type: 'ANSWER', option, now: (clock += 2000) });
    s = triviaReducer(s, { type: 'NEXT', now: (clock += 500) });
  }
  return s;
}

test('every pack has unique ids and every question has four distinct, non-empty answers', () => {
  assert.equal(new Set(TRIVIA_PACKS.map((p) => p.id)).size, TRIVIA_PACKS.length);
  for (const pack of TRIVIA_PACKS) {
    assert.ok(pack.questions.length >= 20, `${pack.id} is too small`);
    assert.equal(new Set(pack.questions.map((q) => q.q)).size, pack.questions.length, `${pack.id} repeats a question`);
    for (const q of pack.questions) {
      const options = [q.a, ...q.wrong];
      assert.ok(options.every((o) => o.trim().length > 0), q.q);
      assert.equal(new Set(options).size, 4, `duplicate answer in "${q.q}"`);
    }
  }
});

test('questions come only from the chosen packs, and the same seed gives the same game', () => {
  const a = createTriviaGame(makeSettings({ packIds: ['football'] }), 42);
  const b = createTriviaGame(makeSettings({ packIds: ['football'] }), 42);
  assert.deepEqual(a.deck, b.deck);
  assert.ok(a.deck.every((id) => id.startsWith('football:')));
  const s = triviaReducer(a, { type: 'START_TURN', now: 0 });
  assert.deepEqual(s.question, triviaReducer(b, { type: 'START_TURN', now: 0 }).question);
  assert.ok(s.question!.options.includes(getQuestion(s.question!.id).a));
});

test('right answers score 100 plus a speed bonus; wrong answers and time-outs score nothing', () => {
  assert.equal(pointsFor(true, 0, 20), BASE_POINTS + SPEED_BONUS);
  assert.equal(pointsFor(true, 10_000, 20), BASE_POINTS + SPEED_BONUS / 2);
  assert.equal(pointsFor(true, 30_000, 20), BASE_POINTS);
  assert.equal(pointsFor(true, 5000, 0), BASE_POINTS);
  assert.equal(pointsFor(false, 0, 20), 0);

  let s = triviaReducer(createTriviaGame(makeSettings(), 1), { type: 'START_TURN', now: 0 });
  s = triviaReducer(s, { type: 'ANSWER', option: getQuestion(s.question!.id).a, now: 4000 });
  assert.equal(s.phase, 'reveal');
  assert.equal(s.scores['team-1'], 140);
  assert.equal(s.turnAnswers[0].ms, 4000);

  s = triviaReducer(s, { type: 'NEXT', now: 5000 });
  s = triviaReducer(s, { type: 'TIME_UP', now: 25000 });
  assert.equal(s.turnAnswers[1].picked, null);
  assert.equal(s.scores['team-1'], 140);

  // A late tap after time ran out changes nothing.
  assert.equal(triviaReducer(s, { type: 'ANSWER', option: getQuestion(s.question!.id).a, now: 25100 }), s);
});

test('with no timer, a question has no deadline', () => {
  const s = triviaReducer(createTriviaGame(makeSettings({ answerSeconds: 0 }), 1), { type: 'START_TURN', now: 0 });
  assert.equal(s.endsAt, null);
});

test('teams take turns, rounds repeat, then the game ends', () => {
  let s = createTriviaGame(makeSettings({ rounds: 2 }), 7);
  s = playTurn(s, [true, true, false]);
  assert.equal(s.phase, 'turnOver');
  assert.equal(currentStreak(s.history[0].answers), 0);
  s = triviaReducer(s, { type: 'NEXT_TURN' });
  assert.equal(s.phase, 'handoff');
  assert.equal(s.teamIndex, 1);

  s = triviaReducer(playTurn(s, [true, false, false]), { type: 'NEXT_TURN' });
  assert.equal(s.round, 2);
  assert.equal(s.teamIndex, 0);

  s = triviaReducer(playTurn(s, [true, true, true]), { type: 'NEXT_TURN' });
  s = triviaReducer(playTurn(s, [false, false, false]), { type: 'NEXT_TURN' });
  assert.equal(s.phase, 'gameOver');

  // Every right answer took 2 of 20 seconds: 100 + 45.
  assert.deepEqual(
    standings(s).map((r) => r.score),
    [5 * 145, 145],
  );
  const stats = matchStats(s);
  assert.equal(stats.total, 12);
  assert.equal(stats.correct, 6);
  assert.equal(stats.perTeam['team-1'].bestStreak, 3);
  assert.ok(stats.missed.length > 0 && stats.missed.length <= 6);
});

test('no question repeats until the chosen packs run out', () => {
  const pool = questionIds(['football']).length;
  let s = createTriviaGame(makeSettings({ packIds: ['football'], questionsPerTurn: pool, teams: makeTeams(1) }), 3);
  s = playTurn(s, Array(pool).fill(true));
  const seen = s.history[0].answers.map((a) => a.id);
  assert.equal(new Set(seen).size, pool);
});

test('play again keeps the settings and starts a fresh shuffle', () => {
  const settings = makeSettings();
  const first = createTriviaGame(settings, 5);
  const again = triviaReducer(playTurn(first, [true]), { type: 'PLAY_AGAIN' });
  assert.equal(again.phase, 'handoff');
  assert.equal(again.settings, settings);
  assert.notDeepEqual(again.deck, first.deck);
});

function entry(id: string, score: number, correct = 5, total = 10, playedAt = 0): LeaderboardEntry {
  return { id, name: id, emoji: '🦁', color: '#fff', score, correct, total, playedAt };
}

test('the leaderboard keeps the best scores, highest first, and skips zero scores', () => {
  let board = addToLeaderboard([], [entry('a', 300), entry('b', 0), entry('c', 900)]);
  assert.deepEqual(
    board.map((e) => e.id),
    ['c', 'a'],
  );
  // Same score: better accuracy wins, then whoever set it first.
  board = addToLeaderboard(board, [entry('d', 300, 8, 10, 5), entry('e', 300, 5, 10, 9)]);
  assert.deepEqual(
    board.map((e) => e.id),
    ['c', 'd', 'a', 'e'],
  );

  const many = Array.from({ length: 30 }, (_, i) => entry(`x${i}`, 100 + i));
  board = addToLeaderboard(board, many);
  assert.equal(board.length, LEADERBOARD_SIZE);
  assert.equal(board[0].id, 'c');
});

test('a finished game gives one leaderboard entry per team with its score and accuracy', () => {
  let s = createTriviaGame(makeSettings(), 11);
  s = triviaReducer(playTurn(s, [true, false, true]), { type: 'NEXT_TURN' });
  s = triviaReducer(playTurn(s, [false, false, false]), { type: 'NEXT_TURN' });
  const entries = leaderboardEntries(s, 1234);
  assert.equal(entries.length, 2);
  assert.equal(entries[0].score, 290);
  assert.equal(entries[0].correct, 2);
  assert.equal(entries[0].total, 3);
  assert.notEqual(entries[0].id, entries[1].id);
  assert.equal(addToLeaderboard([], entries).length, 1);
});
