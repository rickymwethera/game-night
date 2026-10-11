/// <reference types="node" />
import assert from 'node:assert/strict';
import { test } from 'node:test';
import {
  createSpyGame,
  currentVoter,
  matchStats,
  POINTS,
  spyReducer,
  standings,
  tally,
  type SpyAction,
  type SpySettings,
  type SpyState,
} from '../engine';
import { SPY_PACKS, getPack } from '../words';

function makeSettings(count = 4, overrides: Partial<SpySettings> = {}): SpySettings {
  const names = ['Amani', 'Brian', 'Wanjiru', 'Otieno', 'Zawadi', 'Kevo'];
  return {
    players: names.slice(0, count).map((name, i) => ({ id: `p${i + 1}`, name, color: '#fff', emoji: '🦁' })),
    packIds: ['kenyan-eats'],
    discussSeconds: 60,
    spyHint: true,
    voting: 'secret',
    rounds: 3,
    ...overrides,
  };
}

function run(state: SpyState, ...actions: SpyAction[]): SpyState {
  return actions.reduce(spyReducer, state);
}

/** Everyone peeks and passes the phone on. */
function revealAll(state: SpyState): SpyState {
  let s = state;
  for (let i = 0; i < s.settings.players.length; i++) s = run(s, { type: 'SHOW_ROLE' }, { type: 'HIDE_ROLE', now: 1000 });
  return s;
}

/** Each voter in turn picks `choose(voterId)`. */
function voteAll(state: SpyState, choose: (voterId: string) => string): SpyState {
  let s = state;
  while (s.phase === 'vote') {
    const next = spyReducer(s, { type: 'CAST_VOTE', targetId: choose(currentVoter(s).id) });
    if (next === s) throw new Error(`vote by ${currentVoter(s).id} was refused`);
    s = next;
    if (s.voterIndex === 0) return s; // a runoff started: let the test decide the next ballot
  }
  return s;
}

const innocent = (s: SpyState) => s.settings.players.find((p) => p.id !== s.spyId)!.id;

test('word packs are big enough and have no duplicate words', () => {
  for (const pack of SPY_PACKS) {
    assert.ok(pack.words.length >= 8, `${pack.id} needs at least 8 words for the spy's guess`);
    assert.equal(new Set(pack.words).size, pack.words.length, `${pack.id} has a duplicate word`);
  }
  assert.equal(new Set(SPY_PACKS.map((p) => p.id)).size, SPY_PACKS.length);
});

test('a new game deals a spy, a word from the chosen packs and guess options', () => {
  const s = createSpyGame(makeSettings(), 42);
  assert.equal(s.phase, 'reveal');
  assert.ok(s.settings.players.some((p) => p.id === s.spyId));
  assert.equal(s.packId, 'kenyan-eats');
  assert.ok(getPack('kenyan-eats')!.words.includes(s.word));
  assert.equal(s.guessOptions.length, 8);
  assert.ok(s.guessOptions.includes(s.word));
  assert.deepEqual(createSpyGame(makeSettings(), 42), s, 'same seed, same deal');
});

test('the phone goes round once, then the discussion clock starts', () => {
  let s = createSpyGame(makeSettings(), 1);
  assert.equal(run(s, { type: 'HIDE_ROLE', now: 0 }), s, 'cannot pass before peeking');
  s = run(s, { type: 'SHOW_ROLE' }, { type: 'HIDE_ROLE', now: 0 });
  assert.equal(s.revealIndex, 1);
  assert.equal(s.roleShown, false);
  s = revealAll(createSpyGame(makeSettings(), 1));
  assert.equal(s.phase, 'discuss');
  assert.equal(s.discussEndsAt, 1000 + 60_000);
});

test('voting out the spy, then a wrong guess, scores a point for everyone else', () => {
  let s = revealAll(createSpyGame(makeSettings(), 7));
  s = run(s, { type: 'CALL_VOTE' });
  s = voteAll(s, (voter) => (voter === s.spyId ? innocent(s) : s.spyId));
  assert.equal(s.phase, 'verdict');
  assert.equal(s.accusedId, s.spyId);
  s = run(s, { type: 'REVEAL' });
  assert.equal(s.phase, 'spyGuess');
  const wrong = s.guessOptions.find((w) => w !== s.word)!;
  s = run(s, { type: 'SPY_GUESS', word: wrong });
  assert.equal(s.phase, 'roundOver');
  assert.equal(s.history[0].outcome, 'spy-caught');
  for (const p of s.settings.players) assert.equal(s.scores[p.id], p.id === s.spyId ? 0 : POINTS.caught);
});

test('the spy steals the round by naming the word after being caught', () => {
  let s = revealAll(createSpyGame(makeSettings(), 8));
  s = run(s, { type: 'ACCUSE', playerId: s.spyId }, { type: 'REVEAL' }, { type: 'SPY_GUESS', word: s.word });
  assert.equal(s.history[0].outcome, 'spy-stole');
  assert.equal(s.scores[s.spyId], POINTS.spyStole);
});

test('voting out an innocent player lets the spy escape', () => {
  let s = revealAll(createSpyGame(makeSettings(), 9));
  const victim = innocent(s);
  s = run(s, { type: 'ACCUSE', playerId: victim }, { type: 'REVEAL' });
  assert.equal(s.phase, 'roundOver');
  assert.equal(s.history[0].outcome, 'spy-escaped');
  assert.equal(s.scores[s.spyId], POINTS.spyEscaped);
});

test('players cannot vote for themselves', () => {
  let s = run(revealAll(createSpyGame(makeSettings(), 3)), { type: 'CALL_VOTE' });
  const voter = currentVoter(s).id;
  assert.equal(run(s, { type: 'CAST_VOTE', targetId: voter }), s);
});

test('a tie goes to a runoff between the tied players, and a second tie lets the spy off', () => {
  let s = run(revealAll(createSpyGame(makeSettings(4), 11)), { type: 'CALL_VOTE' });
  // p1 and p2 vote for each other, p3 and p4 vote for each other: four-way tie at one vote each.
  const pairs: Record<string, string> = { p1: 'p2', p2: 'p1', p3: 'p4', p4: 'p3' };
  s = voteAll(s, (v) => pairs[v]);
  assert.equal(s.phase, 'vote');
  assert.equal(s.runoff, true);
  assert.deepEqual([...s.candidates].sort(), ['p1', 'p2', 'p3', 'p4']);
  s = voteAll(s, (v) => pairs[v]);
  assert.equal(s.phase, 'verdict');
  assert.equal(s.accusedId, null);
  s = run(s, { type: 'REVEAL' });
  assert.equal(s.history[0].outcome, 'spy-escaped');
});

test('a runoff only allows the tied players', () => {
  let s = run(revealAll(createSpyGame(makeSettings(5), 12)), { type: 'CALL_VOTE' });
  // p1 gets 2, p2 gets 2, p3 gets 1.
  const picks: Record<string, string> = { p1: 'p2', p2: 'p1', p3: 'p1', p4: 'p2', p5: 'p3' };
  s = voteAll(s, (v) => picks[v]);
  assert.equal(s.runoff, true);
  assert.deepEqual([...s.candidates].sort(), ['p1', 'p2']);
  assert.equal(run(s, { type: 'CAST_VOTE', targetId: 'p3' }), s);
  // In the runoff p1 may vote for p2 and vice versa; everyone else backs p1.
  s = voteAll(s, (v) => (v === 'p1' ? 'p2' : 'p1'));
  assert.equal(s.phase, 'verdict');
  assert.equal(s.accusedId, 'p1');
  assert.equal(tally(s)[0].player.id, 'p1');
});

test('the spy can own up early and guess', () => {
  let s = revealAll(createSpyGame(makeSettings(), 21));
  s = run(s, { type: 'SPY_OWNS_UP' });
  assert.equal(s.phase, 'spyGuess');
  const right = run(s, { type: 'SPY_GUESS', word: s.word });
  assert.equal(right.history[0].outcome, 'spy-guessed');
  assert.equal(right.scores[s.spyId], POINTS.spyGuessed);
  const wrong = run(s, { type: 'SPY_GUESS', word: s.guessOptions.find((w) => w !== s.word)! });
  assert.equal(wrong.history[0].outcome, 'spy-blundered');
  assert.equal(wrong.scores[s.spyId], 0);
});

test('rounds deal new words and stop at the planned count', () => {
  let s = createSpyGame(makeSettings(4, { rounds: 3 }), 5);
  const words = new Set<string>();
  const spies: string[] = [];
  for (let r = 1; r <= 3; r++) {
    words.add(s.word);
    spies.push(s.spyId);
    s = revealAll(s);
    s = run(s, { type: 'ACCUSE', playerId: s.spyId }, { type: 'REVEAL' }, { type: 'SPY_GUESS', word: 'nope' });
    if (r < 3) s = run(s, { type: 'NEXT_ROUND' });
  }
  assert.equal(words.size, 3, 'no word repeats while the pack has fresh ones');
  for (let i = 1; i < spies.length; i++) assert.notEqual(spies[i], spies[i - 1], 'no back-to-back spy');
  assert.equal(run(s, { type: 'NEXT_ROUND' }), s, 'no round after the last one');
  s = run(s, { type: 'END_GAME' });
  assert.equal(s.phase, 'gameOver');
  assert.equal(standings(s)[0].score, 3);
  assert.equal(matchStats(s).groupWins, 3);
  assert.equal(run(s, { type: 'PLAY_AGAIN' }).round, 1);
});
