/// <reference types="node" />
import assert from 'node:assert/strict';
import { test } from 'node:test';
import { makeTeams } from '../../../core/types';
import {
  charadesReducer,
  createCharadesGame,
  currentActor,
  matchStats,
  standings,
  type CharadesSettings,
  type CharadesState,
} from '../engine';
import { CHARADES_CATEGORIES } from '../words';

function makeSettings(overrides: Partial<CharadesSettings> = {}): CharadesSettings {
  const teams = makeTeams(2);
  teams[0].players = ['Brian', 'Amani'];
  return {
    teams,
    categoryIds: ['food'],
    roundSeconds: 60,
    targetPoints: 5,
    maxRounds: 10,
    skipPenalty: false,
    ...overrides,
  };
}

let clock = 0;
function playTurn(state: CharadesState, correct: number, skipped: number): CharadesState {
  let s = charadesReducer(state, { type: 'START_TURN', now: (clock += 1000) });
  for (let i = 0; i < correct; i++) s = charadesReducer(s, { type: 'GOT_IT', now: (clock += 2000) });
  for (let i = 0; i < skipped; i++) s = charadesReducer(s, { type: 'SKIP', now: (clock += 5000) });
  return charadesReducer(s, { type: 'TIME_UP' });
}

test('categories have no duplicate words', () => {
  for (const c of CHARADES_CATEGORIES) assert.equal(new Set(c.words).size, c.words.length, c.id);
});

test('same seed gives same deck', () => {
  assert.deepEqual(createCharadesGame(makeSettings(), 7).deck, createCharadesGame(makeSettings(), 7).deck);
});

test('game ends after the full round in which a team reaches the target', () => {
  let s = createCharadesGame(makeSettings(), 1);
  s = playTurn(s, 4, 1);
  s = charadesReducer(s, { type: 'TOGGLE_RESULT', index: 4 }); // pass -> correct
  s = charadesReducer(s, { type: 'NEXT_TURN' });
  assert.equal(s.scores['team-1'], 5);
  assert.equal(s.phase, 'handoff', 'second team still gets its turn');
  s = charadesReducer(playTurn(s, 2, 0), { type: 'NEXT_TURN' });
  assert.equal(s.phase, 'gameOver');
  assert.deepEqual(standings(s).map((x) => x.score), [5, 2]);
});

test('actors rotate within a team, with a fallback name for empty teams', () => {
  let s = createCharadesGame(makeSettings({ targetPoints: 100 }), 1);
  assert.equal(currentActor(s), 'Brian');
  s = charadesReducer(playTurn(s, 1, 0), { type: 'NEXT_TURN' });
  assert.equal(currentActor(s), "Team Kifaru's actor");
  s = charadesReducer(playTurn(s, 1, 0), { type: 'NEXT_TURN' });
  assert.equal(currentActor(s), 'Amani');
});

test('skip penalty takes a point per pass', () => {
  let s = createCharadesGame(makeSettings({ skipPenalty: true }), 1);
  s = charadesReducer(playTurn(s, 3, 2), { type: 'NEXT_TURN' });
  assert.equal(s.scores['team-1'], 1);
});

test('pausing stops the clock and resuming restores the time left', () => {
  let s = createCharadesGame(makeSettings(), 1);
  s = charadesReducer(s, { type: 'START_TURN', now: 0 });
  s = charadesReducer(s, { type: 'PAUSE', now: 20_000 });
  assert.equal(s.turnEndsAt, null);
  assert.equal(charadesReducer(s, { type: 'GOT_IT', now: 21_000 }), s, 'no scoring while paused');
  s = charadesReducer(s, { type: 'RESUME', now: 100_000 });
  assert.equal(s.turnEndsAt, 140_000);
  s = charadesReducer(s, { type: 'GOT_IT', now: 101_000 });
  assert.equal(s.turnResults[0].ms, 21_000, 'paused time is not counted');
});

test('match stats pick MVP and quickest guess', () => {
  let s = createCharadesGame(makeSettings(), 1);
  s = charadesReducer(playTurn(s, 5, 1), { type: 'NEXT_TURN' });
  s = charadesReducer(playTurn(s, 1, 0), { type: 'NEXT_TURN' });
  const stats = matchStats(s);
  assert.equal(stats.correct, 6);
  assert.equal(stats.skipped, 1);
  assert.equal(stats.mvp['team-1']?.actor, 'Brian');
  assert.equal(stats.quickest?.ms, 2000);
});

test('deck reshuffles when it runs out', () => {
  let s = charadesReducer(createCharadesGame(makeSettings(), 3), { type: 'START_TURN', now: 0 });
  for (let i = 0; i < 70; i++) s = charadesReducer(s, { type: 'GOT_IT', now: i });
  assert.ok(s.currentCard);
  assert.equal(s.turnResults.length, 70);
});

test('actions in the wrong phase are ignored', () => {
  const s = createCharadesGame(makeSettings(), 1);
  assert.equal(charadesReducer(s, { type: 'GOT_IT', now: 0 }), s);
  assert.equal(charadesReducer(s, { type: 'NEXT_TURN' }), s);
});
