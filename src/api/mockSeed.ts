import type { Mode } from "../types";
import type { Proposal } from "./types";

export interface MockVote { proposal_id: number; voter_id: string; value: 1 | -1 }
export interface MockUser { id: string; email: string; username: string; password: string; isAdmin: boolean }
export interface MockScore { user_id: string; mode: Mode; value: number; updated_at: string }
export interface MockGroup { id: string; name: string; code: string; owner_id: string }
export interface MockMember { group_id: string; user_id: string }

export const SEED_PROPOSALS: Proposal[] = [
  { id: 1, emojis: "🥜🌊", answer: "L’Ametlla de Mar", explanation: "Ametlla + de mar (prova)", comarca: null, aliases: [], status: "pending" },
  { id: 2, emojis: "🧀🏔️", answer: "Poble de prova A", explanation: "Formatge + muntanya (prova)", comarca: null, aliases: [], status: "pending" },
  { id: 3, emojis: "🐟🏖️", answer: "Poble de prova B", explanation: "Peix + platja (prova)", comarca: "Maresme", aliases: [], status: "voting" },
  { id: 4, emojis: "🌲🍄", answer: "Poble de prova C", explanation: "Pi + bolet (prova)", comarca: "Selva", aliases: [], status: "voting" },
  { id: 5, emojis: "🦊🏡", answer: "Poble de prova D", explanation: "Guineu + casa (prova)", comarca: "Osona", aliases: ["Prova D"], status: "accepted" },
];

export const SEED_VOTES: MockVote[] = [
  { proposal_id: 3, voter_id: "seed-1", value: 1 },
  { proposal_id: 3, voter_id: "seed-2", value: 1 },
  { proposal_id: 3, voter_id: "seed-3", value: -1 },
];

const PLAYER_PASSWORD = "dev12345";
const names = ["marta", "pau", "laia", "jordi", "nuria", "oriol", "anna"];

export const SEED_USERS: MockUser[] = [
  { id: "u-admin", email: "admin@dev.local", username: "admin", password: "admin", isAdmin: true },
  ...names.map((n) => ({
    id: `u-${n}`, email: `${n}@dev.local`, username: n, password: PLAYER_PASSWORD, isAdmin: false,
  })),
];

// [usuari, daily, ten, hard, infinite, timeTrial, inverse]
const SCORES: [string, number, number, number, number, number, number][] = [
  ["marta", 12, 27, 21, 18, 14, 26],
  ["pau", 7, 25, 24, 9, 11, 23],
  ["laia", 3, 22, 15, 14, 8, 20],
  ["jordi", 20, 18, 9, 6, 6, 17],
  ["nuria", 1, 29, 26, 22, 16, 28],
  ["oriol", 5, 15, 12, 11, 10, 15],
  ["anna", 9, 20, 18, 8, 13, 22],
];
const MODES_ORDER: Mode[] = ["daily", "ten", "hard", "infinite", "timeTrial", "inverse"];

export const SEED_SCORES: MockScore[] = SCORES.flatMap(([n, ...vals], i) =>
  vals.map((value, j) => ({
    user_id: `u-${n}`,
    mode: MODES_ORDER[j],
    value,
    updated_at: new Date(Date.UTC(2026, 0, 1, 0, i, j)).toISOString(),
  }))
);

export const SEED_GROUPS: MockGroup[] = [
  { id: "g-1", name: "Colla de prova", code: "PROVA1", owner_id: "u-marta" },
];
export const SEED_MEMBERS: MockMember[] = ["marta", "pau", "laia", "nuria"].map((n) => ({
  group_id: "g-1", user_id: `u-${n}`,
}));