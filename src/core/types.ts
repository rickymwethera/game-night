/**
 * Shared building blocks for every game.
 *
 * Today everyone plays on one shared phone. Later each player may join from
 * their own phone. To keep that door open, each game keeps its rules in a
 * pure reducer (state + action -> new state) that never touches the UI.
 * A future multiplayer layer can then send the same actions over the network
 * and keep every phone's state in sync, without rewriting the games.
 */
import { TEAM_PALETTE } from '../theme';

export type GameId =
  | 'charades'
  | 'spy-among-us'
  | 'trivia'
  | 'dare-or-challenge'
  | 'most-likely-to'
  | 'five-second'
  | 'flags';

/** How the people at the party are connected. Only 'shared' exists for now. */
export type DeviceMode = 'shared' | 'own-phones';

export interface Team {
  id: string;
  name: string;
  color: string;
  emoji: string;
  /** Player names. The first one is the captain. */
  players: string[];
}

const TEAM_NAMES = ['Team Simba', 'Team Kifaru', 'Team Chui', 'Team Ndovu'];

export function makeTeam(index: number): Team {
  const look = TEAM_PALETTE[index % TEAM_PALETTE.length];
  return {
    id: `team-${index + 1}`,
    name: TEAM_NAMES[index] ?? `Team ${index + 1}`,
    color: look.color,
    emoji: look.emoji,
    players: [],
  };
}

export function makeTeams(count: number): Team[] {
  return Array.from({ length: count }, (_, i) => makeTeam(i));
}

/** "Team Simba" -> "Simba", for tight spots like score pods. */
export function shortTeamName(name: string): string {
  return name.replace(/^team\s+/i, '');
}

export function shuffle<T>(items: readonly T[], random: () => number = Math.random): T[] {
  const out = [...items];
  for (let i = out.length - 1; i > 0; i--) {
    const j = Math.floor(random() * (i + 1));
    [out[i], out[j]] = [out[j], out[i]];
  }
  return out;
}
