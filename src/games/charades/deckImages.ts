import type { ImageSourcePropType } from 'react-native';

// Kept apart from words.ts so the game rules (and their tests) never load images.
export const DECK_IMAGES: Record<string, ImageSourcePropType> = {
  'kenyan-celebs': require('../../../assets/images/spotlight.jpg'),
  sheng: require('../../../assets/images/deck-sheng.jpg'),
  'kenyan-music': require('../../../assets/images/deck-music.jpg'),
  food: require('../../../assets/images/deck-food.jpg'),
};
