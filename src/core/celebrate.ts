/**
 * When a finished game earns confetti. Kept deliberately rare: only a
 * perfect game of real length, or beating an existing top score.
 */

/** Fewer questions than this and a perfect run is too easy to celebrate. */
export const PERFECT_MIN_QUESTIONS = 10;

export function isPerfectGame(correct: number, total: number): boolean {
  return total >= PERFECT_MIN_QUESTIONS && correct === total;
}

/** A new top score, only when there was already a score to beat. */
export function isNewRecord(previousBest: number | undefined, score: number): boolean {
  return previousBest !== undefined && previousBest > 0 && score > previousBest;
}

export function earnsConfetti({
  perTeam,
  previousBest,
}: {
  perTeam: { correct: number; total: number; score?: number }[];
  previousBest?: number;
}): boolean {
  return perTeam.some((t) => isPerfectGame(t.correct, t.total) || (t.score !== undefined && isNewRecord(previousBest, t.score)));
}
