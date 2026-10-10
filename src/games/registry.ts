import type { ImageSourcePropType } from 'react-native';
import type { IconName } from '../components/ui';
import type { GameId } from '../core/types';

export type GameTag = 'acting' | 'social' | 'quick' | 'brainy';

export const GAME_TAGS: { id: GameTag; label: string; icon: IconName }[] = [
  { id: 'acting', label: 'Acting & Energy', icon: 'zap' },
  { id: 'social', label: 'Social & Bluff', icon: 'eye' },
  { id: 'quick', label: 'Quick Fire', icon: 'clock' },
  { id: 'brainy', label: 'Brainy', icon: 'award' },
];

export interface GameInfo {
  id: GameId;
  title: string;
  /** One line for the home list. */
  tagline: string;
  /** Longer pitch for the games tab. */
  description: string;
  emoji: string;
  icon: IconName;
  image?: ImageSourcePropType;
  badge: { label: string; icon: IconName; bg: string; fg: string };
  players: string;
  pills: { label: string; icon: IconName }[];
  rules: string[];
  tags: GameTag[];
  available: boolean;
}

export const GAMES: GameInfo[] = [
  {
    id: 'charades',
    title: 'Charades',
    tagline: 'Act it out, no talking allowed.',
    description:
      'Act out Kenyan celebrities, Sheng, songs, football and food before the buzzer! 180 prompts across six decks.',
    emoji: '🎭',
    icon: 'smile',
    image: require('../../assets/images/game-charades.jpg'),
    badge: { label: 'POPULAR PICK', icon: 'star', bg: '#A078FF', fg: '#1A0050' },
    players: '4+ Players',
    pills: [
      { label: 'Team Mode', icon: 'users' },
      { label: '60s Turns', icon: 'clock' },
      { label: '6 Decks', icon: 'layers' },
    ],
    rules: [
      'Split into teams. One actor per turn gets the phone.',
      'Act out the word without speaking. Your team shouts guesses.',
      'Tap Got it for every correct guess, Pass to skip. First to the target wins.',
    ],
    tags: ['acting', 'quick'],
    available: true,
  },
  {
    id: 'spy-among-us',
    title: 'Spy Among Us',
    tagline: 'Secret words, one spy, many lies.',
    description:
      'One phone passed around reveals the secret word to everyone except the spy. Question carefully, bluff naturally, and cast your vote.',
    emoji: '🕵🏾',
    icon: 'eye',
    image: require('../../assets/images/game-spy.jpg'),
    badge: { label: 'PASS-THE-PHONE', icon: 'smartphone', bg: '#2D303A', fg: '#E1E2EC' },
    players: '4–10 Players',
    pills: [
      { label: 'Social Deduction', icon: 'help-circle' },
      { label: 'Single Device', icon: 'smartphone' },
    ],
    rules: [
      'Everyone peeks at the phone in turn. One player is secretly the spy.',
      'Take turns giving a one-word clue about the secret word.',
      'Vote out the spy before they guess the word.',
    ],
    tags: ['social'],
    available: false,
  },
  {
    id: 'most-likely-to',
    title: "Who's Most Likely To?",
    tagline: 'Group confessions and pointing.',
    description:
      'Spicy, hilarious and brutally honest party voting. Reveal truths, settle debates, and find out what your friends really think on 3, 2, 1… point!',
    emoji: '👉🏾',
    icon: 'thumbs-up',
    image: require('../../assets/images/game-most-likely.jpg'),
    badge: { label: 'SPICY & CHILL', icon: 'sun', bg: '#B83900', fg: '#FFE4D8' },
    players: '4–20 Players',
    pills: [
      { label: '250+ Prompts', icon: 'message-square' },
      { label: 'No Eliminations', icon: 'smile' },
    ],
    rules: ['Read the statement out loud.', 'Count down from three and everyone points.', 'Most fingers takes the title.'],
    tags: ['social'],
    available: false,
  },
  {
    id: 'five-second',
    title: '5-Second Challenge',
    tagline: 'Rapid fire brain freeze.',
    description:
      'Name THREE things in a category before the unforgiving buzzer sounds! Brain freezes, stuttering and non-stop laughter guaranteed.',
    emoji: '⏱️',
    icon: 'clock',
    image: require('../../assets/images/game-five-second.jpg'),
    badge: { label: 'HIGH ADRENALINE', icon: 'activity', bg: '#F15CA0', fg: '#3D0020' },
    players: '2–12 Players',
    pills: [
      { label: '5s Buzzer', icon: 'zap' },
      { label: 'Sudden Death', icon: 'alert-triangle' },
    ],
    rules: ['Get a category.', 'Name three things before five seconds run out.', 'Fail and the next player can steal.'],
    tags: ['quick', 'brainy'],
    available: false,
  },
  {
    id: 'trivia',
    title: 'Trivia',
    tagline: 'Kenyan culture, music and football.',
    description: 'Team trivia on Kenyan culture, music, football, geography and pop culture, with a live leaderboard.',
    emoji: '🧠',
    icon: 'award',
    badge: { label: 'TEAM MODE', icon: 'users', bg: '#2D303A', fg: '#E1E2EC' },
    players: '2+ Players',
    pills: [
      { label: 'Leaderboard', icon: 'bar-chart-2' },
      { label: 'Teams', icon: 'users' },
    ],
    rules: ['Answer as a team.', 'Faster answers score more.', 'Highest score after ten questions wins.'],
    tags: ['brainy'],
    available: false,
  },
  {
    id: 'dare-or-challenge',
    title: 'Dare or Challenge',
    tagline: 'Spin the wheel, face the music.',
    description: 'Spin a wheel for funny challenges, impressions, quick performances and group tasks. Clean and adults-only settings.',
    emoji: '🎡',
    icon: 'refresh-cw',
    badge: { label: 'PARTY STARTER', icon: 'zap', bg: '#2D303A', fg: '#E1E2EC' },
    players: '3+ Players',
    pills: [
      { label: 'Spin Wheel', icon: 'refresh-cw' },
      { label: 'Clean or 18+', icon: 'shield' },
    ],
    rules: ['Spin the wheel.', 'Do the dare or take the challenge.', 'Refuse and the group picks your forfeit.'],
    tags: ['acting', 'social'],
    available: false,
  },
];

export function getGame(id: GameId): GameInfo {
  const game = GAMES.find((g) => g.id === id);
  if (!game) throw new Error(`Unknown game: ${id}`);
  return game;
}
