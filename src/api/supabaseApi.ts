import type { Puzzle } from "../data/puzzles";
import { supabase } from "../lib/supabase";
import type { Mode, Records } from "../types";
import type {
  Api, GroupInfo, GroupRankRow, LeaderRow, Proposal, Session, Tally,
} from "./types";
import { voterId } from "./voter";

const URL_ = import.meta.env.VITE_SUPABASE_URL as string | undefined;
const KEY = import.meta.env.VITE_SUPABASE_ANON_KEY as string | undefined;

const COLS = "id,emojis,answer,explanation,comarca,aliases,status";

function sb() {
  if (!supabase) throw new Error("Supabase no està configurat");
  return supabase;
}

async function rpc<T>(fn: string, args?: Record<string, unknown>): Promise<T> {
  const { data, error } = await sb().rpc(fn, args);
  if (error) throw new Error(error.message);
  return data as T;
}

async function toSession(user: { id: string; email?: string | null }): Promise<Session> {
  const { data } = await sb()
    .from("profiles")
    .select("username,is_admin")
    .eq("id", user.id)
    .maybeSingle();
  return {
    id: user.id,
    email: user.email ?? "",
    username: data?.username ?? "",
    isAdmin: Boolean(data?.is_admin),
  };
}

type GroupRow = { group_id: string; group_name: string; group_code: string; member_count: number };
const toGroup = (r: GroupRow): GroupInfo => ({
  id: r.group_id, name: r.group_name, code: r.group_code, members: r.member_count,
});

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
      return data.session ? toSession(data.session.user) : null;
    },
    onChange(cb) {
      const { data } = sb().auth.onAuthStateChange((_event, s) => {
        // Dins d'aquest callback no es poden fer crides a Supabase: s'ajornen
        setTimeout(() => {
          if (!s) cb(null);
          else toSession(s.user).then(cb);
        }, 0);
      });
      return () => data.subscription.unsubscribe();
    },
    async signIn(email, password) {
      const { error } = await sb().auth.signInWithPassword({ email, password });
      return !error;
    },
    async signUp(username, email, password) {
      const { data, error } = await sb().auth.signUp({
        email,
        password,
        options: { data: { username } },
      });
      if (error) {
        return {
          ok: false,
          error: /already|registered/i.test(error.message)
            ? "Aquest correu ja està registrat."
            : `No s'ha pogut crear el compte: ${error.message}`,
        };
      }
      return { ok: true, needsConfirmation: !data.session };
    },
    async signOut() {
      await sb().auth.signOut();
    },
    async usernameAvailable(username) {
      return Boolean(await rpc<boolean>("username_available", { p_username: username }));
    },
    async deleteAccount() {
      await rpc("delete_account");
    },
  },

  records: {
    async load() {
      const { data, error } = await sb().from("records").select("data").maybeSingle();
      if (error) throw new Error(error.message);
      return (data?.data as Records | undefined) ?? null;
    },
    async save(r) {
      const { data: s } = await sb().auth.getSession();
      if (!s.session) throw new Error("Cal iniciar sessió.");
      const { error } = await sb()
        .from("records")
        .upsert({ user_id: s.session.user.id, data: r, updated_at: new Date().toISOString() });
      if (error) throw new Error(error.message);
    },
  },

  scores: {
    async submit(mode: Mode, value) {
      await rpc("submit_score", { p_mode: mode, p_value: value });
    },
    async leaderboard(mode: Mode) {
      const rows = await rpc<{ rank: number; username: string; value: number; is_me: boolean }[]>(
        "leaderboard",
        { p_mode: mode, p_limit: 5 }
      );
      return (rows ?? []).map(
        (r): LeaderRow => ({ rank: Number(r.rank), username: r.username, value: r.value, isMe: r.is_me })
      );
    },
  },

  groups: {
    async list() {
      return ((await rpc<GroupRow[]>("my_groups")) ?? []).map(toGroup);
    },
    async create(name) {
      return toGroup((await rpc<GroupRow[]>("create_group", { p_name: name }))[0]);
    },
    async join(code) {
      return toGroup((await rpc<GroupRow[]>("join_group", { p_code: code }))[0]);
    },
    async leave(id) {
      await rpc("leave_group", { p_group: id });
    },
    async ranking(id) {
      const rows = await rpc<
        { mode: string; rank: number; username: string; value: number; is_me: boolean }[]
      >("group_ranking", { p_group: id });
      return (rows ?? []).map(
        (r): GroupRankRow => ({
          mode: r.mode as Mode,
          rank: Number(r.rank),
          username: r.username,
          value: r.value,
          isMe: r.is_me,
        })
      );
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