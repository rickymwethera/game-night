/// <reference types="node" />
import assert from 'node:assert/strict';
import { existsSync } from 'node:fs';
import { join } from 'node:path';
import { test } from 'node:test';
import { makeTeams } from '../../../core/types';
import { COUNTRIES } from '../countries';
import {
  buildOptions,
  countriesIn,
  createFlagsGame,
  currentStreak,
  flagsReducer,
  getCountry,
  matchStats,
  standings,
  type FlagsSettings,
  type FlagsState,
} from '../engine';

function makeSettings(overrides: Partial<FlagsSettings> = {}): FlagsSettings {
  return { teams: makeTeams(2), region: 'africa', flagsPerTurn: 3, answerSeconds: 15, rounds: 1, ...overrides };
}

const FLAGS_DIR = join(__dirname, '../../../../assets/flags');

let clock = 0;
/** Plays one turn, answering right for each `true` and wrong for each `false`. */
function playTurn(state: FlagsState, picks: boolean[]): FlagsState {
  let s = flagsReducer(state, { type: 'START_TURN', now: (clock += 1000) });
  for (const right of picks) {
    const q = s.question!;
    const code = right ? q.code : q.options.find((o) => o !== q.code)!;
    s = flagsReducer(s, { type: 'ANSWER', code, now: (clock += 2000) });
    s = flagsReducer(s, { type: 'NEXT', now: (clock += 500) });
  }
  return s;
}

test('the flag list covers the 193 UN members plus 4 others, each with a bundled image', () => {
  assert.equal(COUNTRIES.length, 197);
  assert.equal(COUNTRIES.filter((c) => c.nonMember).length, 4);
  assert.equal(new Set(COUNTRIES.map((c) => c.code)).size, 197);
  for (const c of COUNTRIES) assert.ok(existsSync(join(FLAGS_DIR, `${c.code}.png`)), `missing image for ${c.code}`);
  assert.equal(countriesIn('africa').length, 54);
  assert.equal(countriesIn('world').length, 197);
});

test('options are four distinct countries from the answer’s continent, answer included', () => {
  for (const code of ['ke', 'fj', 'br', 'ru']) {
    const options = buildOptions(code, Math.random);
    assert.equal(options.length, 4);
    assert.equal(new Set(options).size, 4);
    assert.ok(options.includes(code));
    for (const o of options) assert.equal(getCountry(o).continent, getCountry(code).continent);
  }
});

test('a continent game only shows that continent’s flags, and the same seed gives the same game', () => {
  const a = createFlagsGame(makeSettings({ region: 'oceania' }), 42);
  const b = createFlagsGame(makeSettings({ region: 'oceania' }), 42);
  assert.deepEqual(a.deck, b.deck);
  const s = flagsReducer(a, { type: 'START_TURN', now: 0 });
  assert.equal(getCountry(s.question!.code).continent, 'oceania');
  assert.deepEqual(s.question, flagsReducer(b, { type: 'START_TURN', now: 0 }).question);
});

test('right answers score, wrong answers and time-outs do not', () => {
  let s = flagsReducer(createFlagsGame(makeSettings(), 1), { type: 'START_TURN', now: 0 });
  s = flagsReducer(s, { type: 'ANSWER', code: s.question!.code, now: 1200 });
  assert.equal(s.phase, 'reveal');
  assert.equal(s.scores['team-1'], 1);
  assert.equal(s.turnAnswers[0].ms, 1200);

  s = flagsReducer(s, { type: 'NEXT', now: 2000 });
  s = flagsReducer(s, { type: 'TIME_UP', now: 17000 });
  assert.equal(s.turnAnswers[1].picked, null);
  assert.equal(s.scores['team-1'], 1);

  // A late tap after time ran out changes nothing.
  assert.equal(flagsReducer(s, { type: 'ANSWER', code: s.question!.code, now: 17100 }), s);
});

test('with no timer, a question has no deadline', () => {
  const s = flagsReducer(createFlagsGame(makeSettings({ answerSeconds: 0 }), 1), { type: 'START_TURN', now: 0 });
  assert.equal(s.endsAt, null);
});

test('teams take turns, rounds repeat, then the game ends', () => {
  let s = createFlagsGame(makeSettings({ rounds: 2 }), 7);
  s = playTurn(s, [true, true, false]);
  assert.equal(s.phase, 'turnOver');
  assert.equal(currentStreak(s.history[0].answers), 0);
  s = flagsReducer(s, { type: 'NEXT_TURN' });
  assert.equal(s.phase, 'handoff');
  assert.equal(s.teamIndex, 1);

  s = flagsReducer(playTurn(s, [true, false, false]), { type: 'NEXT_TURN' });
  assert.equal(s.round, 2);
  assert.equal(s.teamIndex, 0);

  s = flagsReducer(playTurn(s, [true, true, true]), { type: 'NEXT_TURN' });
  s = flagsReducer(playTurn(s, [false, false, false]), { type: 'NEXT_TURN' });
  assert.equal(s.phase, 'gameOver');

  assert.deepEqual(
    standings(s).map((r) => r.score),
    [5, 1],
  );
  const stats = matchStats(s);
  assert.equal(stats.total, 12);
  assert.equal(stats.correct, 6);
  assert.equal(stats.perTeam['team-1'].bestStreak, 3);
  assert.ok(stats.missed.length > 0 && stats.missed.length <= 6);
});

test('no flag repeats until the whole region has been shown', () => {
  let s = createFlagsGame(makeSettings({ region: 'south-america', flagsPerTurn: 12, teams: makeTeams(1) }), 3);
  s = playTurn(s, Array(12).fill(true));
  const seen = s.history[0].answers.map((a) => a.code);
  assert.equal(new Set(seen).size, 12);
});

test('play again keeps the settings and starts a fresh shuffle', () => {
  const settings = makeSettings();
  const first = createFlagsGame(settings, 5);
  const again = flagsReducer(playTurn(first, [true]), { type: 'PLAY_AGAIN' });
  assert.equal(again.phase, 'handoff');
  assert.equal(again.settings, settings);
  assert.notDeepEqual(again.deck, first.deck);
});
