import type { Puzzle } from "../data/puzzles";
import { MODES } from "../modes";
import type { Mode, Records } from "../types";
import {
  SEED_GROUPS, SEED_MEMBERS, SEED_PROPOSALS, SEED_SCORES, SEED_USERS, SEED_VOTES,
  type MockGroup, type MockMember, type MockScore, type MockUser, type MockVote,
} from "./mockSeed";
import type { Api, GroupInfo, GroupRankRow, Proposal, Session, Tally } from "./types";
import { votedStorageKey, voterId } from "./voter";

const DB_KEY = "emotira:mock-db:v4";
const SESSION_KEY = "emotira:mock-session";
const LATENCY_MS = 250; // simula la xarxa
const USERNAME_RE = /^[A-Za-z0-9_]{3,20}$/;
const CODE_ALPHABET = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";

interface MockDb {
  proposals: Proposal[];
  votes: MockVote[];
  nextId: number;
  users: MockUser[];
  records: Record<string, Records>;
  scores: MockScore[];
  groups: MockGroup[];
  members: MockMember[];
}

const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));
const delay = () => sleep(LATENCY_MS);

const seed = (): MockDb => ({
  proposals: structuredClone(SEED_PROPOSALS),
  votes: structuredClone(SEED_VOTES),
  nextId: Math.max(...SEED_PROPOSALS.map((p) => p.id)) + 1,
  users: structuredClone(SEED_USERS),
  records: {},
  scores: structuredClone(SEED_SCORES),
  groups: structuredClone(SEED_GROUPS),
  members: structuredClone(SEED_MEMBERS),
});

const load = (): MockDb => {
  try {
    const raw = localStorage.getItem(DB_KEY);
    if (raw) return JSON.parse(raw) as MockDb;
  } catch {
    /* ens quedem amb les dades inicials */
  }
  return seed();
};

const save = () => {
  try {
    localStorage.setItem(DB_KEY, JSON.stringify(db));
  } catch {
    /* sense emmagatzematge */
  }
};

let db: MockDb = load();

export function resetMockDb() {
  db = seed();
  save();
  try {
    localStorage.removeItem(SESSION_KEY);
    localStorage.removeItem(votedStorageKey("mock"));
  } catch {
    /* res */
  }
}

// ---------- Sessió ----------
const listeners = new Set<(s: Session | null) => void>();

const toSession = (u: MockUser): Session => ({
  id: u.id, email: u.email, username: u.username, isAdmin: u.isAdmin,
});

const currentUser = (): MockUser | null => {
  try {
    const id = localStorage.getItem(SESSION_KEY);
    return db.users.find((u) => u.id === id) ?? null;
  } catch {
    return null;
  }
};

const setSessionUser = (u: MockUser | null) => {
  try {
    if (u) localStorage.setItem(SESSION_KEY, u.id);
    else localStorage.removeItem(SESSION_KEY);
  } catch {
    /* res */
  }
  listeners.forEach((cb) => cb(u ? toSession(u) : null));
};

// Imiten el que farien les polítiques RLS / funcions de Supabase
const requireUser = (): MockUser => {
  const u = currentUser();
  if (!u) throw new Error("Cal iniciar sessió.");
  return u;
};
const requireAdmin = () => {
  if (!requireUser().isAdmin) throw new Error("No tens permís: cal ser administrador.");
};

// ---------- Ajudants ----------
const tallyFor = (ids: number[]) => {
  const t: Record<number, Tally> = {};
  for (const v of db.votes) {
    if (!ids.includes(v.proposal_id)) continue;
    const x = (t[v.proposal_id] ??= { up: 0, down: 0 });
    if (v.value > 0) x.up++;
    else x.down++;
  }
  return t;
};

function ranked(mode: Mode, userIds: string[] | null, includeZero: boolean) {
  const me = currentUser()?.id;
  const rows = db.users
    .filter((u) => !userIds || userIds.includes(u.id))
    .map((u) => {
      const s = db.scores.find((x) => x.user_id === u.id && x.mode === mode);
      return { username: u.username, value: s?.value ?? 0, at: s?.updated_at ?? "", isMe: u.id === me };
    })
    .filter((r) => includeZero || r.value > 0)
    .sort((a, b) => b.value - a.value || a.at.localeCompare(b.at) || a.username.localeCompare(b.username));
  let prev = -1;
  let rank = 0;
  return rows.map((r, i) => {
    if (r.value !== prev) {
      rank = i + 1;
      prev = r.value;
    }
    return { rank, username: r.username, value: r.value, isMe: r.isMe };
  });
}

const groupInfo = (g: MockGroup): GroupInfo => ({
  id: g.id, name: g.name, code: g.code,
  members: db.members.filter((m) => m.group_id === g.id).length,
});

const randomCode = () =>
  Array.from({ length: 6 }, () => CODE_ALPHABET[Math.floor(Math.random() * CODE_ALPHABET.length)]).join("");

export const mockApi: Api = {
  mode: "mock",
  enabled: true,
  loginHint:
    "Mode developer · admin: admin@dev.local / admin · jugadors: marta@dev.local / dev12345 (o crea'n un de nou)",

  // ----- Propostes -----
  async submitProposal(p) {
    await delay();
    db.proposals.push({ id: db.nextId++, ...p, aliases: [], status: "pending" });
    save();
  },

  async fetchAcceptedPuzzles() {
    await delay();
    return db.proposals
      .filter((p) => p.status === "accepted")
      .map(
        (p): Puzzle => ({
          emojis: p.emojis,
          answer: p.answer,
          aliases: p.aliases.length ? p.aliases : undefined,
          comarca: p.comarca ?? "",
          explanation: p.explanation,
        })
      );
  },

  async fetchVotingProposals() {
    await delay();
    const proposals = db.proposals.filter((p) => p.status === "voting");
    return { proposals: structuredClone(proposals), tallies: tallyFor(proposals.map((p) => p.id)) };
  },

  async castVote(id, value) {
    await delay();
    const p = db.proposals.find((x) => x.id === id);
    if (!p || p.status !== "voting") throw new Error("Aquesta proposta ja no admet vots.");
    const me = voterId();
    if (db.votes.some((v) => v.proposal_id === id && v.voter_id === me)) return "already";
    db.votes.push({ proposal_id: id, voter_id: me, value });
    save();
    return "ok";
  },

  // ----- Comptes -----
  auth: {
    async getSession() {
      await delay();
      const u = currentUser();
      return u ? toSession(u) : null;
    },
    onChange(cb) {
      listeners.add(cb);
      return () => {
        listeners.delete(cb);
      };
    },
    async signIn(email, password) {
      await delay();
      const u = db.users.find(
        (x) => x.email.toLowerCase() === email.trim().toLowerCase() && x.password === password
      );
      if (!u) return false;
      setSessionUser(u);
      return true;
    },
    async signUp(username, email, password) {
      await delay();
      if (!USERNAME_RE.test(username))
        return { ok: false, error: "El nom d'usuari ha de tenir 3-20 caràcters (lletres, números o _)." };
      if (db.users.some((u) => u.username.toLowerCase() === username.toLowerCase()))
        return { ok: false, error: "Aquest nom d'usuari ja està agafat." };
      if (db.users.some((u) => u.email.toLowerCase() === email.trim().toLowerCase()))
        return { ok: false, error: "Aquest correu ja està registrat." };
      if (password.length < 8)
        return { ok: false, error: "La contrasenya ha de tenir almenys 8 caràcters." };
      const user: MockUser = {
        id: `u-${crypto.randomUUID()}`, email: email.trim(), username, password, isAdmin: false,
      };
      db.users.push(user);
      save();
      setSessionUser(user);
      return { ok: true, needsConfirmation: false };
    },
    async signOut() {
      setSessionUser(null);
    },
    async usernameAvailable(username) {
      await delay();
      return !db.users.some((u) => u.username.toLowerCase() === username.toLowerCase());
    },
    async deleteAccount() {
      await delay();
      const u = requireUser();
      db.users = db.users.filter((x) => x.id !== u.id);
      delete db.records[u.id];
      db.scores = db.scores.filter((s) => s.user_id !== u.id);
      db.members = db.members.filter((m) => m.user_id !== u.id);
      db.groups = db.groups.filter((g) => db.members.some((m) => m.group_id === g.id));
      save();
      setSessionUser(null);
    },
  },

  // ----- Rècords i rànquings -----
  records: {
    async load() {
      await delay();
      const u = requireUser();
      return db.records[u.id] ? structuredClone(db.records[u.id]) : null;
    },
    async save(r) {
      await delay();
      const u = requireUser();
      db.records[u.id] = structuredClone(r);
      save();
    },
  },

  scores: {
    async submit(mode, value) {
      await delay();
      const u = requireUser();
      const max = mode === "ten" || mode === "hard" || mode === "inverse" || mode === "music" ? 30 : 10000;
      if (!MODES.includes(mode) || value < 0 || value > max) throw new Error("Puntuació no vàlida.");
      const cur = db.scores.find((s) => s.user_id === u.id && s.mode === mode);
      if (!cur) {
        db.scores.push({ user_id: u.id, mode, value, updated_at: new Date().toISOString() });
      } else if (value > cur.value) {
        cur.value = value;
        cur.updated_at = new Date().toISOString();
      }
      save();
    },
    async leaderboard(mode) {
      await delay();
      return ranked(mode, null, false).filter((r, i) => i < 5 || r.isMe);
    },
  },

  // ----- Grups -----
  groups: {
    async list() {
      await delay();
      const u = requireUser();
      const mine = db.members.filter((m) => m.user_id === u.id).map((m) => m.group_id);
      return db.groups.filter((g) => mine.includes(g.id)).map(groupInfo);
    },
    async create(name) {
      await delay();
      const u = requireUser();
      const n = name.trim();
      if (n.length < 2 || n.length > 40) throw new Error("El nom del grup ha de tenir entre 2 i 40 caràcters");
      let code = randomCode();
      while (db.groups.some((g) => g.code === code)) code = randomCode();
      const g: MockGroup = { id: `g-${crypto.randomUUID()}`, name: n, code, owner_id: u.id };
      db.groups.push(g);
      db.members.push({ group_id: g.id, user_id: u.id });
      save();
      return groupInfo(g);
    },
    async join(code) {
      await delay();
      const u = requireUser();
      const g = db.groups.find((x) => x.code === code.trim().toUpperCase());
      if (!g) throw new Error("Codi de grup no vàlid");
      if (!db.members.some((m) => m.group_id === g.id && m.user_id === u.id)) {
        db.members.push({ group_id: g.id, user_id: u.id });
        save();
      }
      return groupInfo(g);
    },
    async leave(id) {
      await delay();
      const u = requireUser();
      db.members = db.members.filter((m) => !(m.group_id === id && m.user_id === u.id));
      if (!db.members.some((m) => m.group_id === id)) {
        db.groups = db.groups.filter((g) => g.id !== id);
      }
      save();
    },
    async ranking(id) {
      await delay();
      const u = requireUser();
      if (!db.members.some((m) => m.group_id === id && m.user_id === u.id))
        throw new Error("No ets membre d'aquest grup");
      const ids = db.members.filter((m) => m.group_id === id).map((m) => m.user_id);
      return MODES.flatMap((mode) =>
        ranked(mode, ids, true).map((r): GroupRankRow => ({ mode, ...r }))
      );
    },
  },

  // ----- Admin -----
  admin: {
    async listOpenProposals() {
      await delay();
      requireAdmin();
      const rows = db.proposals.filter((p) => p.status === "pending" || p.status === "voting");
      return {
        rows: structuredClone(rows),
        tallies: tallyFor(rows.filter((r) => r.status === "voting").map((r) => r.id)),
      };
    },
    async decide(id, status, comarca, aliases) {
      await delay();
      requireAdmin();
      const p = db.proposals.find((x) => x.id === id);
      if (!p) throw new Error("Proposta inexistent.");
      p.status = status;
      p.comarca = comarca || null;
      p.aliases = aliases;
      save();
    },
  },
};