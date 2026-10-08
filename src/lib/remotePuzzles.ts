import type { Puzzle } from "../data/puzzles";
import { supabase } from "./supabase";

export async function fetchAcceptedPuzzles(): Promise<Puzzle[]> {
  const sb = supabase;
  if (!sb) return [];
  const { data, error } = await sb
    .from("proposals")
    .select("emojis,answer,aliases,comarca,explanation")
    .eq("status", "accepted")
    .order("id");
  if (error || !data) return [];
  return data.map((r) => ({
    emojis: r.emojis,
    answer: r.answer,
    aliases: r.aliases?.length ? r.aliases : undefined,
    comarca: r.comarca ?? "",
    explanation: r.explanation,
  }));
}