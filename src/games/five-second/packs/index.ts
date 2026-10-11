/**
 * Every Five-Second Challenge pack, one file each. To add a pack, write a new
 * file next to this one and list it here; the game rules never list prompts.
 */
import { everyday } from './everyday';
import { general } from './general';
import { kenyanFood } from './kenyan-food';
import { kenyanLife } from './kenyan-life';
import { kenyanMusic } from './kenyan-music';
import { kenyanPlaces } from './kenyan-places';
import { kenyanSports } from './kenyan-sports';
import { popCulture } from './pop-culture';
import type { FivePack } from './types';

export type { FivePack } from './types';

export const FIVE_PACKS: FivePack[] = [
  kenyanLife,
  kenyanFood,
  kenyanMusic,
  kenyanPlaces,
  kenyanSports,
  general,
  popCulture,
  everyday,
];

export function getPack(id: string): FivePack | undefined {
  return FIVE_PACKS.find((p) => p.id === id);
}
