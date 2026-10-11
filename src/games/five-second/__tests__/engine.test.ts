/// <reference types="node" />
import assert from 'node:assert/strict';
import { test } from 'node:test';
import {
  ANSWERS_NEEDED,
  canSteal,
  createFiveGame,
  fiveReducer,
  matchStats,
  nextUp,
  responder,
  standings,
  type FiveAction,
  type FiveSettings,
  type FiveState,
} from '../engine';
import { FIVE_PACKS } from '../packs';

function makeSettings(count = 3, overrides: Partial<FiveSettings> = {}): FiveSettings {
  const names = ['Amani', 'Brian', 'Wanjiru', 'Otieno'];
  return {
    players: names.slice(0, count).map((name, i) => ({ id: `p${i + 1}`, name, color: '#fff', emoji: '🦁' })),
    packIds: ['kenyan-food'],
    seconds: 5,
    rounds: 2,
    steals: true,
    ...overrides,
  };
}

function run(state: FiveState, ...actions: FiveAction[]): FiveState {
  return actions.reduce(fiveReducer, state);
}

const tally = (n: number, now = 1000): FiveAction[] => Array.from({ length: n }, () => ({ type: 'TALLY', now }));

test('packs are full, unique and have no duplicate prompts', () => {
  assert.equal(new Set(FIVE_PACKS.map((p) => p.id)).size, FIVE_PACKS.length);
  for (const pack of FIVE_PACKS) {
    assert.ok(pack.prompts.length >= 20, `${pack.id} needs at least 20 prompts`);
    assert.equal(new Set(pack.prompts).size, pack.prompts.length, `${pack.id} has a duplicate prompt`);
    for (const p of pack.prompts) assert.ok(!/^name /i.test(p), `${pack.id}: "${p}" should not start with "Name"`);
  }
  assert.ok(FIVE_PACKS.some((p) => p.collection === 'kenyan') && FIVE_PACKS.some((p) => p.collection === 'global'));
});

test('three taps before the buzzer scores a point and records the time', () => {
  let s = run(createFiveGame(makeSettings(), 7), { type: 'START_TURN', now: 0 });
  assert.equal(s.phase, 'playing');
  assert.ok(s.prompt);
  s = run(s, ...tally(ANSWERS_NEEDED, 3200));
  assert.equal(s.phase, 'verdict');
  assert.deepEqual(s.attempts[0], { playerId: 'p1', count: 3, success: true, ms: 3200, steal: false });
  assert.equal(canSteal(s), false);
  s = run(s, { type: 'NEXT_TURN' });
  assert.equal(s.scores.p1, 1);
  assert.equal(s.phase, 'handoff');
  assert.equal(s.playerIndex, 1);
});

test('untally takes back a miscount and never goes below zero', () => {
  let s = run(createFiveGame(makeSettings(), 1), { type: 'START_TURN', now: 0 }, { type: 'UNTALLY' });
  assert.equal(s.count, 0);
  s = run(s, ...tally(2), { type: 'UNTALLY' });
  assert.equal(s.count, 1);
  assert.equal(s.phase, 'playing');
});

test('a miss can be stolen by the next player with a fresh clock', () => {
  let s = run(createFiveGame(makeSettings(), 3), { type: 'START_TURN', now: 0 }, ...tally(2), { type: 'TIME_UP' });
  assert.equal(s.phase, 'verdict');
  assert.equal(canSteal(s), true);
  const prompt = s.prompt;
  s = run(s, { type: 'STEAL', now: 9000 });
  assert.equal(s.phase, 'playing');
  assert.equal(s.count, 0);
  assert.equal(s.endsAt, 14000);
  assert.equal(s.prompt, prompt);
  assert.equal(responder(s).id, 'p2');
  s = run(s, ...tally(3, 11000));
  assert.equal(canSteal(s), false, 'a steal cannot be stolen');
  s = run(s, { type: 'NEXT_TURN' });
  assert.deepEqual(s.scores, { p1: 0, p2: 1, p3: 0 });
  assert.equal(s.history[0].attempts.length, 2);
  assert.equal(s.playerIndex, 1, 'stealing does not skip the stealer’s own turn');
});

test('steals can be switched off', () => {
  const s = run(createFiveGame(makeSettings(3, { steals: false }), 3), { type: 'START_TURN', now: 0 }, { type: 'TIME_UP' });
  assert.equal(canSteal(s), false);
  assert.equal(run(s, { type: 'STEAL', now: 1 }), s);
});

test('the group can overrule the tally', () => {
  let s = run(createFiveGame(makeSettings(), 3), { type: 'START_TURN', now: 0 }, ...tally(2), { type: 'TIME_UP' });
  s = run(s, { type: 'JUDGE', success: true });
  assert.equal(canSteal(s), false);
  s = run(s, { type: 'NEXT_TURN' });
  assert.equal(s.scores.p1, 1);
});

test('everyone plays each round, then the game ends', () => {
  let s = createFiveGame(makeSettings(2, { rounds: 2 }), 5);
  const turn = (st: FiveState) => run(st, { type: 'START_TURN', now: 0 }, { type: 'TIME_UP' }, { type: 'NEXT_TURN' });
  s = turn(s);
  assert.equal(s.round, 1);
  s = turn(s);
  assert.equal(s.round, 2);
  assert.equal(s.playerIndex, 0);
  s = run(s, { type: 'START_TURN', now: 0 }, { type: 'TIME_UP' }, { type: 'NEXT_TURN' }, { type: 'START_TURN', now: 0 }, { type: 'TIME_UP' });
  assert.equal(nextUp(s), null);
  s = run(s, { type: 'NEXT_TURN' });
  assert.equal(s.phase, 'gameOver');
  assert.equal(s.history.length, 4);
});

test('the game can end early, but only after a turn', () => {
  const fresh = createFiveGame(makeSettings(), 5);
  assert.equal(run(fresh, { type: 'END_GAME' }).phase, 'handoff');
  const s = run(fresh, { type: 'START_TURN', now: 0 }, { type: 'TIME_UP' }, { type: 'NEXT_TURN' }, { type: 'END_GAME' });
  assert.equal(s.phase, 'gameOver');
});

test('the deck reshuffles instead of running dry', () => {
  let s = createFiveGame(makeSettings(2, { rounds: 40 }), 9);
  const seen = new Set<string>();
  for (let i = 0; i < 45; i++) {
    s = run(s, { type: 'START_TURN', now: 0 });
    assert.ok(s.prompt, `turn ${i} has a prompt`);
    if (i < 30) seen.add(s.prompt.text);
    s = run(s, { type: 'TIME_UP' }, { type: 'NEXT_TURN' });
  }
  assert.equal(seen.size, 30, 'no prompt repeats until the pack runs out');
});

test('standings and stats', () => {
  let s = createFiveGame(makeSettings(2, { rounds: 1 }), 2);
  s = run(s, { type: 'START_TURN', now: 0 }, { type: 'TIME_UP' }, { type: 'STEAL', now: 0 }, ...tally(3, 2500), { type: 'NEXT_TURN' });
  s = run(s, { type: 'START_TURN', now: 0 }, ...tally(3, 4100), { type: 'NEXT_TURN' });
  assert.equal(s.phase, 'gameOver');
  assert.deepEqual(standings(s).map((r) => [r.player.id, r.score]), [['p2', 2], ['p1', 0]]);
  const stats = matchStats(s);
  assert.equal(stats.nailed, 2);
  assert.equal(stats.steals, 1);
  assert.equal(stats.fastest?.player.id, 'p2');
  assert.equal(stats.fastest?.ms, 2500);
  assert.equal(stats.thief?.player.id, 'p2');
  assert.equal(stats.frozen?.player.id, 'p1');
});
