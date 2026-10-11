export interface TriviaQuestion {
  q: string;
  /** The right answer. */
  a: string;
  /** Three wrong answers. Options are shuffled when the question is shown. */
  wrong: [string, string, string];
}

export interface TriviaPack {
  id: string;
  title: string;
  emoji: string;
  tag: string;
  collection: 'kenyan' | 'global';
  questions: TriviaQuestion[];
}
