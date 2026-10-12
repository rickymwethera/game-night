/**
 * Showing a game on a TV. The TV opens the web app at /tv and shows a short
 * room code; the host types that code on their phone. From then on the phone
 * keeps running the game as usual and sends each new game state to the room,
 * and the TV only draws it. Secrets never need to leave the phone: each game's
 * TV view decides what the whole room may see.
 *
 * This file is the plain-data half (codes, messages, clock fixes) so it can
 * be tested without React Native. The live connection is in tv.ts.
 */
import { getQuestion, type TriviaState } from '../games/trivia/engine';

/** No I, O, 0 or 1, so a code read off a TV across the room can't be misread. */
const CODE_LETTERS = 'ABCDEFGHJKLMNPQRSTUVWXYZ';
export const TV_CODE_LENGTH = 4;

export function makeTvCode(random: () => number = Math.random): string {
  let code = '';
  for (let i = 0; i < TV_CODE_LENGTH; i++) code += CODE_LETTERS[Math.floor(random() * CODE_LETTERS.length)];
  return code;
}

/** Uppercases and drops anything that can't be in a code, so " abcd " and "ab-cd" both work. */
export function normalizeTvCode(input: string): string {
  return input
    .toUpperCase()
    .split('')
    .filter((c) => CODE_LETTERS.includes(c))
    .join('')
    .slice(0, TV_CODE_LENGTH);
}

export function isTvCode(code: string): boolean {
  return code.length === TV_CODE_LENGTH && normalizeTvCode(code) === code;
}

export function tvChannelName(code: string): string {
  return `game-night-tv-${code}`;
}

/** What the phone shows on the TV. `state` is null while the host is still picking settings. */
export type TvScreen = { game: 'trivia'; state: TriviaState | null };

/** Phone to TV. `sentAt` is the phone's clock, so the TV can line up timers. */
export interface TvShowMessage {
  screen: TvScreen;
  sentAt: number;
}

/** Checks a message from the room before the TV draws it, since anyone who knows the code can send one. */
export function parseTvShowMessage(payload: unknown): TvShowMessage | null {
  if (!payload || typeof payload !== 'object') return null;
  const { screen, sentAt } = payload as Partial<TvShowMessage>;
  if (typeof sentAt !== 'number' || !screen || screen.game !== 'trivia') return null;
  if (screen.state === null) return { screen, sentAt };
  return isTriviaState(screen.state) ? { screen, sentAt } : null;
}

function isTriviaState(state: unknown): state is TriviaState {
  if (!state || typeof state !== 'object') return false;
  const s = state as TriviaState;
  if (typeof s.phase !== 'string' || !s.settings || !Array.isArray(s.settings.teams) || s.settings.teams.length === 0) return false;
  if (!s.scores || typeof s.scores !== 'object' || !Array.isArray(s.history) || !Array.isArray(s.turnAnswers)) return false;
  if (typeof s.teamIndex !== 'number' || !s.settings.teams[s.teamIndex]) return false;
  try {
    if (s.question) getQuestion(s.question.id);
    for (const a of s.turnAnswers) getQuestion(a.id);
    for (const t of s.history) for (const a of t.answers) getQuestion(a.id);
  } catch {
    return false;
  }
  return true;
}

/**
 * The phone's and the TV's clocks rarely agree, so a timer's end time is moved
 * onto the TV's clock using when the message was sent and when it arrived.
 * Network delay makes the TV at most a moment behind, which is fine for a display.
 */
export function toLocalTime(phoneTime: number, sentAt: number, receivedAt: number): number {
  return phoneTime + (receivedAt - sentAt);
}
