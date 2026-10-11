/**
 * Every trivia pack. Each pack lives in its own file: edit those files to add
 * or fix questions, and add a new pack by creating a file and listing it here.
 */
import { FOOTBALL } from './football';
import { GENERAL_KNOWLEDGE } from './general-knowledge';
import { GEOGRAPHY } from './geography';
import { KENYAN_CULTURE } from './kenyan-culture';
import { KENYAN_MUSIC } from './kenyan-music';
import { POP_CULTURE } from './pop-culture';
import type { TriviaPack } from './types';

export type { TriviaPack, TriviaQuestion } from './types';

export const TRIVIA_PACKS: TriviaPack[] = [KENYAN_CULTURE, KENYAN_MUSIC, FOOTBALL, GEOGRAPHY, GENERAL_KNOWLEDGE, POP_CULTURE];
