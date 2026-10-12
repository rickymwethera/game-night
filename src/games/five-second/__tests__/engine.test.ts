/// <reference types="node" />
import assert from 'node:assert/strict';
import { test } from 'node:test';
import {
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

const START: FiveAction = { type: 'START_TURN', now: 0 };
const BUZZER: FiveAction = { type: 'TIME_UP' };
const YES: FiveAction = { type: 'JUDGE', success: true };
const NO: FiveAction = { type: 'JUDGE', success: false };
const NEXT: FiveAction = { type: 'NEXT_TURN' };

test('packs are full, unique and have no duplicate prompts', () => {
  assert.equal(new Set(FIVE_PACKS.map((p) => p.id)).size, FIVE_PACKS.length);
  for (const pack of FIVE_PACKS) {
    assert.ok(pack.prompts.length >= 20, `${pack.id} needs at least 20 prompts`);
    assert.equal(new Set(pack.prompts).size, pack.prompts.length, `${pack.id} has a duplicate prompt`);
    for (const p of pack.prompts) assert.ok(!/^name /i.test(p), `${pack.id}: "${p}" should not start with "Name"`);
  }
  assert.ok(FIVE_PACKS.some((p) => p.collection === 'kenyan') && FIVE_PACKS.some((p) => p.collection === 'global'));
});

test('the clock runs out, then the group makes the call', () => {
  let s = run(createFiveGame(makeSettings(), 7), START);
  assert.equal(s.phase, 'playing');
  assert.ok(s.prompt);
  assert.equal(s.endsAt, 5000);
  assert.equal(run(s, YES), s, 'no call before the buzzer');
  s = run(s, BUZZER);
  assert.equal(s.phase, 'judge');
  assert.equal(s.endsAt, null);
  s = run(s, YES);
  assert.equal(s.phase, 'verdict');
  assert.deepEqual(s.attempts[0], { playerId: 'p1', success: true, steal: false });
  assert.equal(canSteal(s), false);
  s = run(s, NEXT);
  assert.equal(s.scores.p1, 1);
  assert.equal(s.phase, 'handoff');
  assert.equal(s.playerIndex, 1);
});

test('a miss can be stolen by the next player with a fresh clock', () => {
  let s = run(createFiveGame(makeSettings(), 3), START, BUZZER, NO);
  assert.equal(s.phase, 'verdict');
  assert.equal(canSteal(s), true);
  const prompt = s.prompt;
  s = run(s, { type: 'STEAL', now: 9000 });
  assert.equal(s.phase, 'playing');
  assert.equal(s.endsAt, 14000);
  assert.equal(s.prompt, prompt);
  assert.equal(responder(s).id, 'p2');
  s = run(s, BUZZER, YES);
  assert.equal(canSteal(s), false, 'a steal cannot be stolen');
  s = run(s, NEXT);
  assert.deepEqual(s.scores, { p1: 0, p2: 1, p3: 0 });
  assert.equal(s.history[0].attempts.length, 2);
  assert.equal(s.playerIndex, 1, 'stealing does not skip the stealer’s own turn');
});

test('steals can be switched off', () => {
  const s = run(createFiveGame(makeSettings(3, { steals: false }), 3), START, BUZZER, NO);
  assert.equal(canSteal(s), false);
  assert.equal(run(s, { type: 'STEAL', now: 1 }), s);
});

test('the group can change its call on the verdict screen', () => {
  let s = run(createFiveGame(makeSettings(), 3), START, BUZZER, NO, YES);
  assert.equal(canSteal(s), false);
  s = run(s, NEXT);
  assert.equal(s.scores.p1, 1);
});

test('everyone plays each round, then the game ends', () => {
  let s = createFiveGame(makeSettings(2, { rounds: 2 }), 5);
  const turn = (st: FiveState) => run(st, START, BUZZER, NO, NEXT);
  s = turn(s);
  assert.equal(s.round, 1);
  s = turn(s);
  assert.equal(s.round, 2);
  assert.equal(s.playerIndex, 0);
  s = run(s, START, BUZZER, NO, NEXT, START, BUZZER, NO);
  assert.equal(nextUp(s), null);
  s = run(s, { type: 'NEXT_TURN' });
  assert.equal(s.phase, 'gameOver');
  assert.equal(s.history.length, 4);
});

test('the game can end early, but only after a turn', () => {
  const fresh = createFiveGame(makeSettings(), 5);
  assert.equal(run(fresh, { type: 'END_GAME' }).phase, 'handoff');
  const s = run(fresh, START, BUZZER, NO, NEXT, { type: 'END_GAME' });
  assert.equal(s.phase, 'gameOver');
});

test('the deck reshuffles instead of running dry', () => {
  let s = createFiveGame(makeSettings(2, { rounds: 40 }), 9);
  const seen = new Set<string>();
  for (let i = 0; i < 45; i++) {
    s = run(s, START);
    assert.ok(s.prompt, `turn ${i} has a prompt`);
    if (i < 30) seen.add(s.prompt.text);
    s = run(s, BUZZER, NO, NEXT);
  }
  assert.equal(seen.size, 30, 'no prompt repeats until the pack runs out');
});

test('standings and stats', () => {
  let s = createFiveGame(makeSettings(2, { rounds: 1 }), 2);
  s = run(s, START, BUZZER, NO, { type: 'STEAL', now: 0 }, BUZZER, YES, NEXT);
  s = run(s, START, BUZZER, YES, NEXT);
  assert.equal(s.phase, 'gameOver');
  assert.deepEqual(standings(s).map((r) => [r.player.id, r.score]), [['p2', 2], ['p1', 0]]);
  assert.deepEqual(matchStats(s), { nailed: 2, attempts: 3, steals: 1 });
});
