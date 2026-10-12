/// <reference types="node" />
import assert from 'node:assert/strict';
import { test } from 'node:test';
import { createTriviaGame, DEFAULT_SETTINGS, triviaReducer } from '../../games/trivia/engine';
import { isTvCode, makeTvCode, normalizeTvCode, parseTvShowMessage, toLocalTime, TV_CODE_LENGTH } from '../tvLink';
import { makeTeams } from '../types';

test('codes are four easy-to-read letters', () => {
  for (let i = 0; i < 200; i++) {
    const code = makeTvCode();
    assert.equal(code.length, TV_CODE_LENGTH);
    assert.ok(isTvCode(code), code);
    assert.doesNotMatch(code, /[IO01]/);
  }
});

test('typed codes are cleaned up', () => {
  assert.equal(normalizeTvCode(' ab-cd '), 'ABCD');
  assert.equal(normalizeTvCode('abcdef'), 'ABCD');
  assert.equal(isTvCode('ABC'), false);
  assert.equal(isTvCode('ABIO'), false);
});

test('a timer end time moves onto the TV clock', () => {
  // The TV's clock is 5 seconds ahead of the phone's.
  assert.equal(toLocalTime(20_000, 1_000, 6_000), 25_000);
});

test('the TV accepts real game states and setup screens', () => {
  let state = createTriviaGame({ ...DEFAULT_SETTINGS, teams: makeTeams(2) }, 7);
  state = triviaReducer(state, { type: 'START_TURN', now: 0 });
  state = triviaReducer(state, { type: 'TIME_UP', now: 1 });
  assert.ok(parseTvShowMessage({ screen: { game: 'trivia', state }, sentAt: 1 }));
  assert.ok(parseTvShowMessage({ screen: { game: 'trivia', state: null }, sentAt: 1 }));
});

test('the TV ignores messages it cannot draw', () => {
  const state = createTriviaGame({ ...DEFAULT_SETTINGS, teams: makeTeams(2) }, 7);
  const broken = { ...state, question: { id: 'no-such-pack:0', options: [] } };
  assert.equal(parseTvShowMessage(null), null);
  assert.equal(parseTvShowMessage({ screen: { game: 'trivia', state } }), null);
  assert.equal(parseTvShowMessage({ screen: { game: 'charades', state: null }, sentAt: 1 }), null);
  assert.equal(parseTvShowMessage({ screen: { game: 'trivia', state: broken }, sentAt: 1 }), null);
  assert.equal(parseTvShowMessage({ screen: { game: 'trivia', state: { ...state, teamIndex: 9 } }, sentAt: 1 }), null);
});
