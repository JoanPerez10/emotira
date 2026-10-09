import type { Puzzle } from "../data/puzzles";

export type ProposalStatus = "pending" | "voting" | "accepted" | "rejected" | "archived";
export type Decision = "voting" | "accepted" | "rejected";

export interface Proposal {
  id: number;
  emojis: string;
  answer: string;
  explanation: string;
  comarca: string | null;
  aliases: string[];
  status: ProposalStatus;
}

export interface NewProposal {
  emojis: string;
  answer: string;
  explanation: string;
  comarca: string | null;
}

export interface Tally {
  up: number;
  down: number;
}

export interface AdminSession {
  email: string;
}

export interface Api {
  mode: "supabase" | "mock";
  enabled: boolean;
  loginHint?: string;

  // Públic
  submitProposal(p: NewProposal): Promise<void>;
  fetchAcceptedPuzzles(): Promise<Puzzle[]>;
  fetchVotingProposals(): Promise<{ proposals: Proposal[]; tallies: Record<number, Tally> }>;
  castVote(proposalId: number, value: 1 | -1): Promise<"ok" | "already">;

  // Sessió (ara només l'admin; més endavant, usuaris)
  auth: {
    getSession(): Promise<AdminSession | null>;
    onChange(cb: (s: AdminSession | null) => void): () => void;
    signIn(email: string, password: string): Promise<boolean>;
    signOut(): Promise<void>;
  };

  // Admin
  admin: {
    listOpenProposals(): Promise<{ rows: Proposal[]; tallies: Record<number, Tally> }>;
    decide(id: number, status: Decision, comarca: string, aliases: string[]): Promise<void>;
  };
}