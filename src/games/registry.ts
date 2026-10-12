import type { ImageSourcePropType } from 'react-native';
import type { IconName } from '../components/ui';
import type { GameId } from '../core/types';

export type GameTag = 'acting' | 'social' | 'quick' | 'brainy';

export const GAME_TAGS: { id: GameTag; label: string }[] = [
  { id: 'acting', label: 'Acting' },
  { id: 'social', label: 'Social' },
  { id: 'quick', label: 'Quick' },
  { id: 'brainy', label: 'Brainy' },
];

export interface GameInfo {
  id: GameId;
  title: string;
  /** One short line shown under the title. */
  tagline: string;
  emoji: string;
  icon: IconName;
  image?: ImageSourcePropType;
  players: string;
  rules: string[];
  tags: GameTag[];
  available: boolean;
}

export const GAMES: GameInfo[] = [
  {
    id: 'charades',
    title: 'Charades',
    tagline: 'Act it out, no talking allowed.',
    emoji: '🎭',
    icon: 'smile',
    image: require('../../assets/images/game-charades.jpg'),
    players: '4+ Players',
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
    emoji: '🕵🏾',
    icon: 'eye',
    image: require('../../assets/images/game-spy.jpg'),
    players: '3–10 Players',
    rules: [
      'Everyone peeks at the phone in turn. One player is secretly the spy.',
      'Ask each other questions about the word. The spy has to bluff.',
      'Vote out the spy. If caught, the spy gets one guess at the word to steal the round.',
    ],
    tags: ['social'],
    available: true,
  },
  {
    id: 'most-likely-to',
    title: "Who's Most Likely To?",
    tagline: 'Group confessions and pointing.',
    emoji: '👉🏾',
    icon: 'thumbs-up',
    image: require('../../assets/images/game-most-likely.jpg'),
    players: '4–20 Players',
    rules: ['Read the statement out loud.', 'Count down from three and everyone points.', 'Most fingers takes the title.'],
    tags: ['social'],
    available: false,
  },
  {
    id: 'five-second',
    title: '5-Second Challenge',
    tagline: 'Name three. Five seconds. Go!',
    emoji: '⏱️',
    icon: 'clock',
    image: require('../../assets/images/game-five-second.jpg'),
    players: '2–12 Players',
    rules: [
      'Pass the phone. A category pops up and the five seconds start.',
      'Name three things out loud. When the buzzer goes, the group says if you made it.',
      'Miss, and the next player can steal the point. Most points wins.',
    ],
    tags: ['quick', 'brainy'],
    available: true,
  },
  {
    id: 'trivia',
    title: 'Trivia',
    tagline: 'Kenyan culture, music and football.',
    emoji: '🧠',
    icon: 'award',
    players: '1–4 Teams',
    rules: [
      'Pick your question packs, then pass the phone between teams.',
      'Each team answers its own run of questions from four choices.',
      'Right answers score 100, plus up to 50 for speed. Top score wins and lands on the leaderboard.',
    ],
    tags: ['brainy'],
    available: true,
  },
  {
    id: 'dare-or-challenge',
    title: 'Dare or Challenge',
    tagline: 'Spin the wheel, face the music.',
    emoji: '🎡',
    icon: 'refresh-cw',
    players: '3+ Players',
    rules: ['Spin the wheel.', 'Do the dare or take the challenge.', 'Refuse and the group picks your forfeit.'],
    tags: ['acting', 'social'],
    available: false,
  },
  {
    id: 'flags',
    title: 'Guess the Flag',
    tagline: 'Every flag on Earth. Name it fast.',
    emoji: '🏳️',
    icon: 'flag',
    players: '1–4 Teams',
    rules: [
      'Pick the whole world or one continent.',
      'Each team gets a run of flags. Tap the right country from four choices.',
      'One point per correct flag. Most points after every turn wins.',
    ],
    tags: ['brainy', 'quick'],
    available: true,
  },
];

export function getGame(id: GameId): GameInfo {
  const game = GAMES.find((g) => g.id === id);
  if (!game) throw new Error(`Unknown game: ${id}`);
  return game;
}
