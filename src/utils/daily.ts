import { puzzles } from "../data/puzzles";
import { seededShuffle } from "./random";

export const DAILY_COUNT = 5;

export const dateKey = (d: Date) =>
  `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;

export const todayKey = () => dateKey(new Date());

export const yesterdayKey = () => {
  const d = new Date();
  d.setDate(d.getDate() - 1);
  return dateKey(d);
};

export const dailyPuzzles = (key = todayKey()) =>
  seededShuffle(puzzles, key).slice(0, DAILY_COUNT);