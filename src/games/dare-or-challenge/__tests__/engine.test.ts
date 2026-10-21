/// <reference types="node" />
import assert from 'node:assert/strict';
import { test } from 'node:test';
import { CATEGORIES, FORFEITS, type CategoryId } from '../cards';
import {
  cardsFor,
  createDareGame,
  dareReducer,
  matchStats,
  nextUp,
  standings,
  turnPlayer,
  type DareAction,
  type DareSettings,
  type DareState,
} from '../engine';

const ALL: CategoryId[] = CATEGORIES.map((c) => c.id);

function makeSettings(count = 3, overrides: Partial<DareSettings> = {}): DareSettings {
  const names = ['Amani', 'Brian', 'Wanjiru', 'Otieno'];
  return {
    players: names.slice(0, count).map((name, i) => ({ id: `p${i + 1}`, name, color: '#fff', emoji: '🦁' })),
    categoryIds: ALL,
    rounds: 2,
    adult: false,
    ...overrides,
  };
}

function run(state: DareState, ...actions: DareAction[]): DareState {
  return actions.reduce(dareReducer, state);
}

let seed = 1000;
const spin = (): DareAction => ({ type: 'SPIN', seed: seed++ });
const REVEAL: DareAction = { type: 'REVEAL' };
const DONE: DareAction = { type: 'JUDGE', outcome: 'done' };
const REFUSE: DareAction = { type: 'JUDGE', outcome: 'refused' };
const NEXT: DareAction = { type: 'NEXT_TURN' };

test('cards are full, unique and every category has clean and 18+ cards', () => {
  assert.equal(new Set(CATEGORIES.map((c) => c.id)).size, CATEGORIES.length);
  for (const c of CATEGORIES) {
    const texts = c.cards.map((x) => x.text);
    assert.equal(new Set(texts).size, texts.length, `${c.id} has a duplicate card`);
    assert.ok(c.cards.filter((x) => !x.adult).length >= 20, `${c.id} needs at least 20 clean cards`);
    assert.ok(c.cards.some((x) => x.adult), `${c.id} needs some 18+ cards`);
  }
  assert.ok(FORFEITS.filter((f) => !f.adult).length >= 10);
});

test('18+ cards only appear when adults-only content is on', () => {
  for (const id of ALL) {
    assert.ok(cardsFor(id, false).every((c) => !c.adult));
    assert.ok(cardsFor(id, true).some((c) => c.adult));
  }
  const clean = createDareGame(makeSettings(), 1);
  for (const deck of Object.values(clean.decks)) assert.ok(deck!.every((c) => !c.adult));
  assert.ok(clean.forfeits.every((c) => !c.adult));

  // Play a long clean game, chickening out every time, and never see an 18+ card or forfeit.
  let s = createDareGame(makeSettings(2, { rounds: 100 }), 2);
  for (let i = 0; i < 150; i++) {
    s = run(s, spin(), REVEAL, REFUSE);
    assert.ok(!s.card!.adult, s.card!.text);
    assert.ok(!s.forfeit!.adult, s.forfeit!.text);
    s = run(s, NEXT);
  }
});

test('a turn: spin, see the card, do it, score a point', () => {
  let s = createDareGame(makeSettings(), 7);
  assert.equal(s.phase, 'spin');
  assert.equal(run(s, REVEAL), s, 'nothing to reveal before a spin');
  s = run(s, spin());
  assert.equal(s.phase, 'spinning');
  assert.ok(s.landed !== null && s.card);
  assert.equal(s.card.category, s.settings.categoryIds[s.landed]);
  assert.equal(run(s, spin()), s, 'one spin per turn');
  s = run(s, REVEAL);
  assert.equal(s.phase, 'task');
  s = run(s, DONE);
  assert.equal(s.phase, 'result');
  assert.equal(s.forfeit, null);
  s = run(s, NEXT);
  assert.equal(s.scores.p1, 1);
  assert.equal(s.phase, 'spin');
  assert.equal(turnPlayer(s).id, 'p2');
  assert.equal(s.history[0].outcome, 'done');
});

test('chickening out scores nothing and deals a forfeit; the call can be changed', () => {
  let s = run(createDareGame(makeSettings(), 3), spin(), REVEAL, REFUSE);
  assert.equal(s.outcome, 'refused');
  assert.ok(s.forfeit);
  const forfeit = s.forfeit;
  s = run(s, DONE);
  assert.equal(s.outcome, 'done', 'the group changed its mind');
  s = run(s, REFUSE);
  assert.equal(s.forfeit, forfeit, 'flipping back keeps the same forfeit');
  s = run(s, NEXT);
  assert.equal(s.scores.p1, 0);
  assert.equal(matchStats(s).refused, 1);
});

test('the wheel only lands on the chosen categories', () => {
  let s = createDareGame(makeSettings(2, { categoryIds: ['impression', 'group'], rounds: 50 }), 4);
  for (let i = 0; i < 60; i++) {
    s = run(s, spin(), REVEAL);
    assert.ok(['impression', 'group'].includes(s.card!.category));
    s = run(s, DONE, NEXT);
  }
});

test('the wheel is random: every category comes up evenly and spins do not walk round the wheel', () => {
  const settings = makeSettings(2, { rounds: 1000 });
  const counts: Record<string, number> = {};
  let steps = 0;
  let forwardByOne = 0;
  let s = createDareGame(settings, 11);
  let prev: number | null = null;
  // Consecutive seeds on purpose: related seeds must not give related spins.
  for (let i = 0; i < 2000; i++) {
    s = run(s, { type: 'SPIN', seed: i });
    const landed = s.landed!;
    counts[landed] = (counts[landed] ?? 0) + 1;
    if (prev !== null) {
      steps++;
      if (landed === (prev + 1) % ALL.length) forwardByOne++;
    }
    prev = landed;
    s = run(s, REVEAL, DONE, NEXT);
  }
  const expected = 2000 / ALL.length;
  for (let i = 0; i < ALL.length; i++) {
    assert.ok(Math.abs(counts[i] - expected) < expected * 0.15, `category ${i} came up ${counts[i]} times`);
  }
  assert.ok(forwardByOne / steps < 0.3, `walked forward ${forwardByOne} of ${steps} times`);
});

test('cards do not repeat until a category deck runs out', () => {
  let s = createDareGame(makeSettings(2, { categoryIds: ['dare'], rounds: 100 }), 5);
  const size = cardsFor('dare', false).length;
  const seen = new Set<string>();
  for (let i = 0; i < size; i++) {
    s = run(s, spin(), REVEAL);
    assert.ok(!seen.has(s.card!.text), `repeat: ${s.card!.text}`);
    seen.add(s.card!.text);
    s = run(s, DONE, NEXT);
  }
  s = run(s, spin());
  assert.ok(s.card, 'a fresh deck is shuffled when one runs out');
});

test('rounds end the game, END_GAME stops early, PLAY_AGAIN starts over', () => {
  let s = createDareGame(makeSettings(2, { rounds: 2 }), 9);
  assert.equal(run(s, { type: 'END_GAME' }), s, 'nothing to end before the first turn');
  s = run(s, spin(), REVEAL, DONE, NEXT);
  assert.equal(run(s, { type: 'END_GAME' }).phase, 'gameOver');
  s = run(s, spin(), REVEAL, REFUSE, NEXT);
  assert.equal(s.round, 2);
  s = run(s, spin(), REVEAL, DONE, NEXT);
  assert.equal(nextUp({ ...s, phase: 'result' }), null);
  s = run(s, spin(), REVEAL, DONE);
  assert.equal(nextUp(s), null);
  s = run(s, NEXT);
  assert.equal(s.phase, 'gameOver');
  assert.deepEqual(
    standings(s).map((r) => [r.player.id, r.score]),
    [
      ['p1', 2],
      ['p2', 1],
    ],
  );
  const stats = matchStats(s);
  assert.equal(stats.turns, 4);
  assert.deepEqual(stats.perPlayer.p1, { done: 2, turns: 2 });
  const again = run(s, { type: 'PLAY_AGAIN', seed: 42 });
  assert.equal(again.phase, 'spin');
  assert.equal(again.history.length, 0);
  assert.equal(again.scores.p1, 0);
});
