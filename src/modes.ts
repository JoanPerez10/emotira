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

/** Retrat del mode a la pantalla de resultat. S'aprofita la mateixa imatge que
 * al menú, enlloc de duplicar-ne una miniatura; el CSS la retalla a 1,7 rem. */
export const MODE_IMAGES: Record<Mode, string> = {
  daily: "/assets/repte-diari-guineu.png",
  ten: "/assets/endivina-deu-guineu.png",
  hard: "/assets/dificil-guineu.png",
  infinite: "/assets/infinit-guineu.png",
  timeTrial: "/assets/contrarellotge-guineu.png",
  inverse: "/assets/invers-guineu.png",
  music: "/assets/musica-guineu.png",
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

/** Punts atorgats per un poble segons si s'ha resolt i les pistes/errors utilitzats. */
export const pointsForPuzzle = (result: { status: "correct" | "revealed"; hints: number }): number =>
  result.status === "correct" ? Math.max(1, 3 - result.hints) : 0;

/** Suma total de punts a partir d'un conjunt de resultats de pobles. */
export const calculateScore = (results: { status: "correct" | "revealed"; hints: number }[]): number =>
  results.reduce((sum, r) => sum + pointsForPuzzle(r), 0);

/** Converteix una puntuació en estrelles (0-3), com a Duolingo. */
export const starsFor = (score: number, max: number): number => {
  const pct = max > 0 ? score / max : 0;
  return pct >= 0.9 ? 3 : pct >= 0.6 ? 2 : pct >= 0.3 ? 1 : 0;
};

export interface ModeMeta {
  mode: Mode;
  icon: IconName;
  title: string;
  sub: string;
  variant: "blue" | "orange" | "coral" | "purple";
  src?: string;
}

export const MENU_MODES: ModeMeta[] = [
  { mode: "inverse", icon: MODE_ICONS.inverse, title: MODE_TITLES.inverse, sub: "Del poble als emojis", variant: "blue", src: MODE_IMAGES.inverse },
  { mode: "timeTrial", icon: MODE_ICONS.timeTrial, title: MODE_TITLES.timeTrial, sub: "2 minuts i bonus de temps", variant: "orange", src: MODE_IMAGES.timeTrial },
  { mode: "music", icon: MODE_ICONS.music, title: MODE_TITLES.music, sub: "Grups dels Països Catalans", variant: "purple", src: MODE_IMAGES.music },
  { mode: "ten", icon: MODE_ICONS.ten, title: MODE_TITLES.ten, sub: "10 pobles d'una tirada", variant: "blue", src: MODE_IMAGES.ten },
  { mode: "hard", icon: MODE_ICONS.hard, title: MODE_TITLES.hard, sub: "Sense pistes i 3 intents", variant: "coral", src: MODE_IMAGES.hard },
  { mode: "infinite", icon: MODE_ICONS.infinite, title: MODE_TITLES.infinite, sub: "Fins que et cansis", variant: "purple", src: MODE_IMAGES.infinite },
];