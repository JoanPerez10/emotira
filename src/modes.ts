import type { Mode, Records } from "./types";

export const MODES: Mode[] = ["daily", "ten", "hard", "infinite"];

export const MODE_TITLES: Record<Mode, string> = {
  daily: "📅 Repte diari",
  ten: "🔟 Endivina 10",
  hard: "🔥 Mode difícil",
  infinite: "♾️ Mode infinit",
};

// Què es compara al rànquing de cada minijoc
export const MODE_METRIC: Record<Mode, string> = {
  daily: "Millor ratxa (dies)",
  ten: "Millor puntuació",
  hard: "Millor puntuació",
  infinite: "Millor ratxa d'encerts",
};

export const scoreOf = (r: Records, m: Mode): number =>
  m === "daily" ? r.daily.bestStreak
  : m === "ten" ? r.ten.best
  : m === "hard" ? r.hard.best
  : r.infinite.bestStreak;