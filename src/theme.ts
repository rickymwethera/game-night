// Tokens sampled from the Game Night Figma designs (Material-style dark palette).
export const colors = {
  background: '#11141D',
  surfaceLowest: '#0C0F18',
  surfaceLow: '#181B25',
  surface: '#1C1F29',
  surfaceHigh: '#22252E',
  surfaceHighest: '#2D303A',
  border: '#2D303A',

  text: '#E1E2EC',
  textMuted: '#C4C6D0',
  textDim: '#8E909A',

  primary: '#D0BCFF', // lavender
  primaryStrong: '#A078FF',
  onPrimary: '#3C0091',
  coral: '#FFB59D',
  coralStrong: '#FF8A5B',
  orange: '#B83900',
  pink: '#FFB0CD',
  pinkStrong: '#F15CA0',
  onPink: '#640039',
  success: '#7CE0A3',
  danger: '#FF8A80',
};

export const gradients = {
  hero: ['#181B25', '#2A2445', '#493D73'] as const,
  quickPlay: ['#8B6CE0', '#6C51B4', '#AF3917'] as const,
  gotIt: ['#B794FF', '#A078FF'] as const,
  title: ['#FFB0CD', '#FEB3AB'] as const,
};

export const fonts = {
  display: 'BricolageGrotesque_800ExtraBold',
  displayBold: 'BricolageGrotesque_700Bold',
  body: 'PlusJakartaSans_400Regular',
  medium: 'PlusJakartaSans_500Medium',
  semibold: 'PlusJakartaSans_600SemiBold',
  bold: 'PlusJakartaSans_700Bold',
  extrabold: 'PlusJakartaSans_800ExtraBold',
};

export const radius = { sm: 12, md: 20, lg: 28, pill: 999 };

export const spacing = { xs: 4, sm: 8, md: 16, lg: 24, xl: 32 };

export const TEAM_PALETTE = [
  { color: '#FF8A5B', emoji: '🦁' },
  { color: '#D0BCFF', emoji: '🦏' },
  { color: '#FFB0CD', emoji: '🐆' },
  { color: '#7CE0A3', emoji: '🐘' },
];
