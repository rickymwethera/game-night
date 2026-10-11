import assert from 'node:assert/strict';
import { test } from 'node:test';
import { earnsConfetti, isNewRecord, isPerfectGame } from '../celebrate';

test('a perfect game needs at least ten questions', () => {
  assert.equal(isPerfectGame(10, 10), true);
  assert.equal(isPerfectGame(5, 5), false);
  assert.equal(isPerfectGame(9, 10), false);
  assert.equal(isPerfectGame(0, 0), false);
});

test('a new record needs an earlier score to beat', () => {
  assert.equal(isNewRecord(undefined, 50), false);
  assert.equal(isNewRecord(0, 50), false);
  assert.equal(isNewRecord(40, 40), false);
  assert.equal(isNewRecord(40, 41), true);
});

test('confetti for any team that earns it, and not otherwise', () => {
  assert.equal(earnsConfetti({ perTeam: [{ correct: 7, total: 10, score: 70 }], previousBest: 90 }), false);
  assert.equal(earnsConfetti({ perTeam: [{ correct: 7, total: 10, score: 70 }] }), false);
  assert.equal(
    earnsConfetti({ perTeam: [{ correct: 3, total: 10, score: 30 }, { correct: 10, total: 10, score: 100 }], previousBest: 200 }),
    true,
  );
  assert.equal(earnsConfetti({ perTeam: [{ correct: 8, total: 10, score: 95 }], previousBest: 90 }), true);
});
