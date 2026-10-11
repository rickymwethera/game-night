/**
 * A Five-Second Challenge prompt pack. Each prompt finishes the sentence
 * "Name 3…", so write it as a plural category: 'Kenyan presidents', not
 * 'Name three Kenyan presidents'. Every prompt needs at least three answers
 * most people at the party could know.
 */
export interface FivePack {
  id: string;
  title: string;
  emoji: string;
  /** 'kenyan' packs are listed first, 'global' ones after. */
  collection: 'kenyan' | 'global';
  description: string;
  prompts: string[];
}
