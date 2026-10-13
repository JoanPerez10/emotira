import type { Puzzle } from "../data/puzzles";
import { splitGraphemes } from "./graphemes";
import { shuffle } from "./random";

export { splitGraphemes };

// Un emoji compost (🏊‍♀️, banderes, etc.) ocupa una sola casella.
export const splitEmojis = (text: string): string[] =>
  splitGraphemes(text).filter((s) => s.trim());

export function inverseOptions(answer: string[], pool: Puzzle[]): string[] {
  const correct = [...new Set(answer)];
  const distractors = [...new Set(pool.flatMap((p) => splitEmojis(p.emojis)))]
    .filter((emoji) => !correct.includes(emoji));
  return shuffle([...correct, ...shuffle(distractors).slice(0, Math.max(0, 10 - correct.length))]);
}

export function eliminateDistractors(options: string[], answer: string[], removed: string[]): string[] {
  const candidates = options.filter((emoji) => !answer.includes(emoji) && !removed.includes(emoji));
  return [...removed, ...shuffle(candidates).slice(0, 2)];
}
