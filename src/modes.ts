import type { Mode, Records } from "./types";
import { type IconName } from "./components/Icon";

export const MODES: Mode[] = ["daily", "ten", "hard", "infinite", "timeTrial", "inverse", "music"];

export const MODE_TITLES: Record<Mode, string> = {
  daily: "Repte diari",
  ten: "Endivina 10",
  hard: "Mode difícil",
  infinite: "Mode infinit",
  timeTrial: "Contrarellotge",
  inverse: "Invers",
  music: "Música",
};

// Què es compara al rànquing de cada minijoc
export const MODE_METRIC: Record<Mode, string> = {
  daily: "Millor ratxa (dies)",
  ten: "Millor puntuació",
  hard: "Millor puntuació",
  infinite: "Millor ratxa d'encerts",
  timeTrial: "Més pobles encertats",
  inverse: "Millor puntuació",
  music: "Millor puntuació",
};

export const MODE_ICONS: Record<Mode, IconName> = {
  daily: "calendar",
  ten: "target",
  infinite: "infinity",
  hard: "flame",
  timeTrial: "timer",
  inverse: "reverse",
  music: "music",
};

export const scoreOf = (r: Records, m: Mode): number =>
  m === "daily" ? r.daily.bestStreak
  : m === "ten" ? r.ten.best
  : m === "hard" ? r.hard.best
  : m === "timeTrial" ? r.timeTrial.best
  : m === "inverse" ? r.inverse.best
  : m === "music" ? r.music.best
  : r.infinite.bestStreak;

export const formatScoreValue = (mode: Mode, value: number): string => {
  if (mode === "timeTrial") return `${value} ${value === 1 ? "poble" : "pobles"}`;
  if (mode === "ten" || mode === "hard" || mode === "inverse" || mode === "music") return `${value} / 30`;
  if (mode === "daily") return `${value} ${value === 1 ? "dia" : "dies"}`;
  return `${value} ${value === 1 ? "encert" : "encerts"}`;
};