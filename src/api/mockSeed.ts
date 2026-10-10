import type { Proposal } from "./types";

export interface MockVote {
  proposal_id: number;
  voter_id: string;
  value: 1 | -1;
}

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