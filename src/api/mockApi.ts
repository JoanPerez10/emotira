import type { Puzzle } from "../data/puzzles";
import { SEED_PROPOSALS, SEED_VOTES, type MockVote } from "./mockSeed";
import type { AdminSession, Api, Proposal, Tally } from "./types";
import { votedStorageKey, voterId } from "./voter";

const DB_KEY = "pobles-emoji:mock-db:v1";
const SESSION_KEY = "pobles-emoji:mock-session";
const LATENCY_MS = 250; // simula la xarxa, per veure els estats de "Carregant…"
const MOCK_ADMIN = { email: "admin@dev.local", password: "admin" };

interface MockDb {
  proposals: Proposal[];
  votes: MockVote[];
  nextId: number;
}

const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));
const delay = () => sleep(LATENCY_MS);

const seed = (): MockDb => ({
  proposals: structuredClone(SEED_PROPOSALS),
  votes: structuredClone(SEED_VOTES),
  nextId: Math.max(...SEED_PROPOSALS.map((p) => p.id)) + 1,
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
    /* sense emmagatzematge: les dades duren fins que es recarregui */
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

// Sessió simulada
const listeners = new Set<(s: AdminSession | null) => void>();

const storedSession = (): AdminSession | null => {
  try {
    const raw = localStorage.getItem(SESSION_KEY);
    return raw ? (JSON.parse(raw) as AdminSession) : null;
  } catch {
    return null;
  }
};

const setSession = (s: AdminSession | null) => {
  try {
    if (s) localStorage.setItem(SESSION_KEY, JSON.stringify(s));
    else localStorage.removeItem(SESSION_KEY);
  } catch {
    /* res */
  }
  listeners.forEach((cb) => cb(s));
};

// Imita el que farien les polítiques RLS de Supabase
const requireAdmin = () => {
  if (!storedSession()) throw new Error("No tens permís: inicia sessió com a admin.");
};

export const mockApi: Api = {
  mode: "mock",
  enabled: true,
  loginHint: `Mode developer: ${MOCK_ADMIN.email} / ${MOCK_ADMIN.password}`,

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
    return {
      proposals: structuredClone(proposals),
      tallies: tallyFor(proposals.map((p) => p.id)),
    };
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

  auth: {
    async getSession() {
      await delay();
      return storedSession();
    },
    onChange(cb) {
      listeners.add(cb);
      return () => {
        listeners.delete(cb);
      };
    },
    async signIn(email, password) {
      await delay();
      if (email.trim() === MOCK_ADMIN.email && password === MOCK_ADMIN.password) {
        setSession({ email: MOCK_ADMIN.email });
        return true;
      }
      return false;
    },
    async signOut() {
      setSession(null);
    },
  },

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