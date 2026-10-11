import type { GameResult, Mode, PuzzleResult, Records } from "../types";
import { todayKey, yesterdayKey } from "./daily";

const KEY = "pobles-emoji:records:v1";

export const emptyRecords = (): Records => ({
  daily: { played: 0, streak: 0, bestStreak: 0, lastDate: null, history: {} },
  ten: { played: 0, best: 0 },
  hard: { played: 0, best: 0 },
  timeTrial: { played: 0, best: 0 },
  inverse: { played: 0, best: 0 },
  infinite: { played: 0, bestSolved: 0, bestStreak: 0 },
  unlockedTowns: [],
});

export function normalizeRecords(p: Partial<Records> | null | undefined): Records {
  const base = emptyRecords();
  const towns = p?.unlockedTowns;
  return {
    daily: { ...base.daily, ...p?.daily },
    ten: { ...base.ten, ...p?.ten },
    hard: { ...base.hard, ...p?.hard },
    timeTrial: { ...base.timeTrial, ...p.timeTrial },
    inverse: { ...base.inverse, ...p.inverse },
    infinite: { ...base.infinite, ...p?.infinite },
    // Les dades guardades abans de la Col·lecció no tenen aquest camp
    unlockedTowns: Array.isArray(towns)
      ? [...new Set<string>(towns.filter((t): t is string => typeof t === "string"))]
      : [],
  };
}

export function loadRecords(): Records {
  try {
    const raw = localStorage.getItem(KEY);
    return normalizeRecords(raw ? JSON.parse(raw) : null);
  } catch {
    return emptyRecords();
  }
}

export function saveRecords(r: Records) {
  try {
    localStorage.setItem(KEY, JSON.stringify(r));
  } catch {
    /* sense emmagatzematge: el joc segueix funcionant */
  }
}

// Afegeix un poble a la col·lecció global; si ja hi era, retorna el mateix objecte
export function unlockTown(prev: Records, answer: string): Records {
  if (prev.unlockedTowns.includes(answer)) return prev;
  return { ...prev, unlockedTowns: [...prev.unlockedTowns, answer] };
}

// La ratxa només compta si ahir o avui s'ha jugat el diari
export const currentStreak = (r: Records) =>
  r.daily.lastDate === todayKey() || r.daily.lastDate === yesterdayKey()
    ? r.daily.streak
    : 0;

const longestRun = (rs: PuzzleResult[]) => {
  let best = 0;
  let cur = 0;
  for (const x of rs) {
    cur = x.status === "correct" ? cur + 1 : 0;
    best = Math.max(best, cur);
  }
  return best;
};

export function recordResult(
  prev: Records,
  mode: Mode,
  res: GameResult
): { records: Records; isBest: boolean } {
  const r: Records = structuredClone(prev);
  let isBest = false;

  if (mode === "daily") {
    const today = todayKey();
    if (r.daily.history[today]) return { records: prev, isBest: false };
    r.daily.streak = r.daily.lastDate === yesterdayKey() ? r.daily.streak + 1 : 1;
    r.daily.bestStreak = Math.max(r.daily.bestStreak, r.daily.streak);
    r.daily.lastDate = today;
    r.daily.played += 1;
    r.daily.history[today] = {
      score: res.score,
      max: res.max,
      results: res.results
        .map((x) => (x.status === "revealed" ? "🟥" : x.hints > 0 ? "🟨" : "🟩"))
        .join(""),
    };
  } else if (mode === "ten" || mode === "hard" || mode === "inverse") {
    const s = r[mode];
    s.played += 1;
    if (res.score > s.best) {
      s.best = res.score;
      isBest = true;
    }
  } else if (mode === "timeTrial") {
    r.timeTrial.played += 1;
    if (res.score > r.timeTrial.best) {
      r.timeTrial.best = res.score;
      isBest = true;
    }
  } else {
    const solved = res.results.filter((x) => x.status === "correct").length;
    const streak = longestRun(res.results);
    r.infinite.played += 1;
    if (streak > r.infinite.bestStreak) {
      r.infinite.bestStreak = streak;
      isBest = true;
    }
    r.infinite.bestSolved = Math.max(r.infinite.bestSolved, solved);
  }
  return { records: r, isBest };
}
