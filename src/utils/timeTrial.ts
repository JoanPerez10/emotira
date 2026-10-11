import type { Puzzle } from "../data/puzzles";
import type { PuzzleResult } from "../types";
import { normalize } from "./normalize";

export const TRIAL_SECONDS = 120;
export const TRIAL_MAX_SECONDS = 180;
export const TRIAL_PENALTY = 2;
export const TRIAL_ATTEMPTS = 3;
export const TRIAL_BONUS_STEPS = 5;
export const TRIAL_BONUS_SECONDS = 5;
// Pobles per celebrar la partida. Aquí el percentatge no serveix: el
// denominador són els pobles que has arribat a veure, no un total fix, i
// encertar-ne 3 de 3 donaria un 100% que no significa res.
export const TRIAL_WIN_AT = 5;

export interface TrialState {
  queue: Puzzle[];
  deadline: number;
  remaining: number;
  bonusSeconds: number;
  progress: number;
  fails: number;
  turn: number;
  status: "playing" | "correct" | "failed" | "finished";
  results: PuzzleResult[];
  message: string;
}

export type TrialAction =
  | { type: "tick"; now: number }
  | { type: "submit"; now: number; turn: number; text: string }
  | { type: "skip"; now: number; turn: number }
  | { type: "advance"; now: number; turn: number; refill: Puzzle[] };

export function createTrial(queue: Puzzle[], now: number): TrialState {
  return { queue, deadline: now + TRIAL_SECONDS * 1000, remaining: TRIAL_SECONDS,
    bonusSeconds: 0, progress: 0, fails: 0, turn: 0,
    status: queue.length ? "playing" : "finished", results: [], message: "" };
}

// Timestamp absolut: també compta si el navegador frena els intervals en segon pla.
export function trialReducer(state: TrialState, action: TrialAction): TrialState {
  if (state.status === "finished") return state;
  const remaining = Math.max(0, Math.ceil((state.deadline - action.now) / 1000));
  if (!remaining) return { ...state, remaining: 0, status: "finished" };
  const s = { ...state, remaining };
  if (action.type === "tick") return remaining === state.remaining ? state : s;
  if (action.turn !== s.turn) return s;
  if (action.type === "advance") {
    if (s.status !== "correct" && s.status !== "failed") return s;
    const queue = s.queue.slice(1);
    return { ...s, queue: queue.length ? queue : action.refill, turn: s.turn + 1,
      status: queue.length || action.refill.length ? "playing" : "finished", fails: 0 };
  }
  if (s.status !== "playing") return s;
  const puzzle = s.queue[0];
  if (action.type === "submit") {
    const text = normalize(action.text);
    if (!text) return s;
    const accepted = [puzzle.answer, ...(puzzle.aliases ?? [])].map(normalize);
    // Un enviament parcial no és un intent; els àlies curts continuen sent vàlids.
    if (!accepted.includes(text) && !accepted.some((answer) => answer.length === text.length)) return s;
    if (accepted.includes(text)) {
      const progress = s.progress + 1;
      const bonus = progress === TRIAL_BONUS_STEPS
        ? Math.min(TRIAL_BONUS_SECONDS, TRIAL_MAX_SECONDS - TRIAL_SECONDS - s.bonusSeconds) : 0;
      const deadline = s.deadline + bonus * 1000;
      return { ...s, status: "correct", progress: progress % TRIAL_BONUS_STEPS,
        bonusSeconds: s.bonusSeconds + bonus, deadline,
        remaining: Math.ceil((deadline - action.now) / 1000),
        message: bonus ? "+5 segons! Bonus completat!" : "Ho has encertat!",
        results: [...s.results, { status: "correct", hints: 0, answer: puzzle.answer, explanation: puzzle.explanation }] };
    }
    const fails = s.fails + 1;
    if (fails < TRIAL_ATTEMPTS) return { ...s, fails,
      message: `No és aquest. Et queden ${TRIAL_ATTEMPTS - fails} intents.` };
  }
  const skipped = action.type === "skip";
  // Només el salt voluntari resta temps; esgotar els intents reinicia el bonus.
  const deadline = s.deadline - (skipped ? TRIAL_PENALTY * 1000 : 0);
  const left = Math.max(0, Math.ceil((deadline - action.now) / 1000));
  return { ...s, deadline, remaining: left, progress: 0, fails: skipped ? 0 : TRIAL_ATTEMPTS,
    status: left ? (skipped ? "playing" : "failed") : "finished",
    queue: skipped ? [...s.queue.slice(1), puzzle] : s.queue,
    turn: s.turn + (skipped ? 1 : 0),
    message: skipped ? "Poble saltat: −2 segons. Bonus reiniciat." : "Sense intents. Bonus reiniciat.",
    results: [...s.results, { status: "revealed", hints: 0, answer: puzzle.answer,
      explanation: puzzle.explanation, reason: skipped ? "skipped" : "failed" }] };
}
