export type Mode = "daily" | "ten" | "hard" | "infinite";

export interface PuzzleResult {
  status: "correct" | "revealed";
  hints: number;
}

export interface GameResult {
  score: number;
  max: number;
  results: PuzzleResult[];
}

export interface Records {
  daily: {
    played: number;
    streak: number;
    bestStreak: number;
    lastDate: string | null;
    history: Record<string, { score: number; max: number; results: string }>;
  };
  ten: { played: number; best: number };
  hard: { played: number; best: number };
  infinite: { played: number; bestSolved: number; bestStreak: number };
  /** Respostes (`puzzle.answer`) de tots els pobles encertats, en qualsevol mode. Sense duplicats. */
  unlockedTowns: string[];
}