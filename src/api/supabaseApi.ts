import type { Puzzle } from "../data/puzzles";
import { supabase } from "../lib/supabase";
import type { Api, Proposal, Tally } from "./types";
import { voterId } from "./voter";

const URL_ = import.meta.env.VITE_SUPABASE_URL as string | undefined;
const KEY = import.meta.env.VITE_SUPABASE_ANON_KEY as string | undefined;

const COLS = "id,emojis,answer,explanation,comarca,aliases,status";

function sb() {
  if (!supabase) throw new Error("Supabase no està configurat");
  return supabase;
}

async function tallyFor(ids: number[]): Promise<Record<number, Tally>> {
  const t: Record<number, Tally> = {};
  if (!ids.length) return t;
  const { data } = await sb()
    .from("votes")
    .select("proposal_id,value")
    .in("proposal_id", ids);
  for (const v of data ?? []) {
    const x = (t[v.proposal_id] ??= { up: 0, down: 0 });
    if (v.value > 0) x.up++;
    else x.down++;
  }
  return t;
}

export const supabaseApi: Api = {
  mode: "supabase",
  enabled: Boolean(supabase),

  // fetch directe: sempre com a rol "anon", encara que l'admin tingui sessió oberta
  async submitProposal(p) {
    const res = await fetch(`${URL_}/rest/v1/proposals`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        apikey: KEY!,
        ...(KEY!.startsWith("eyJ") ? { Authorization: `Bearer ${KEY}` } : {}),
        Prefer: "return=minimal",
      },
      body: JSON.stringify(p),
    });
    if (!res.ok) throw new Error(String(res.status));
  },

  async fetchAcceptedPuzzles() {
    if (!supabase) return [];
    const { data, error } = await supabase
      .from("proposals")
      .select("emojis,answer,aliases,comarca,explanation")
      .eq("status", "accepted")
      .order("id");
    if (error || !data) return [];
    return data.map(
      (r): Puzzle => ({
        emojis: r.emojis,
        answer: r.answer,
        aliases: r.aliases?.length ? r.aliases : undefined,
        comarca: r.comarca ?? "",
        explanation: r.explanation,
      })
    );
  },

  async fetchVotingProposals() {
    const { data, error } = await sb()
      .from("proposals")
      .select(COLS)
      .eq("status", "voting")
      .order("id");
    if (error) throw new Error(error.message);
    const proposals = (data ?? []) as Proposal[];
    return { proposals, tallies: await tallyFor(proposals.map((p) => p.id)) };
  },

  async castVote(id, value) {
    const { error } = await sb()
      .from("votes")
      .insert({ proposal_id: id, voter_id: voterId(), value });
    if (error?.code === "23505") return "already"; // ja havia votat
    if (error) throw new Error(error.message);
    return "ok";
  },

  auth: {
    async getSession() {
      const { data } = await sb().auth.getSession();
      return data.session ? { email: data.session.user.email ?? "" } : null;
    },
    onChange(cb) {
      const { data } = sb().auth.onAuthStateChange((_e, s) =>
        cb(s ? { email: s.user.email ?? "" } : null)
      );
      return () => data.subscription.unsubscribe();
    },
    async signIn(email, password) {
      const { error } = await sb().auth.signInWithPassword({ email, password });
      return !error;
    },
    async signOut() {
      await sb().auth.signOut();
    },
  },

  admin: {
    async listOpenProposals() {
      const { data, error } = await sb()
        .from("proposals")
        .select(COLS)
        .in("status", ["pending", "voting"])
        .order("id");
      if (error) throw new Error(error.message);
      const rows = (data ?? []) as Proposal[];
      const tallies = await tallyFor(rows.filter((r) => r.status === "voting").map((r) => r.id));
      return { rows, tallies };
    },
    async decide(id, status, comarca, aliases) {
      const { data, error } = await sb()
        .from("proposals")
        .update({ status, comarca: comarca || null, aliases })
        .eq("id", id)
        .select("id");
      if (error) throw new Error(error.message);
      if (!data?.length) {
        throw new Error(
          "No s'ha pogut actualitzar: revisa que el teu usuari sigui l'administrador a les polítiques de Supabase."
        );
      }
    },
  },
};