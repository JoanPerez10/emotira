import type { Puzzle } from "../data/puzzles";
import type { Mode, Records } from "../types";

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

export interface Session {
  id: string;
  email: string;
  username: string;
  isAdmin: boolean;
}

export interface LeaderRow {
  rank: number;
  username: string;
  value: number;
  isMe: boolean;
}

export interface GroupInfo {
  id: string;
  name: string;
  code: string;
  members: number;
}

export interface GroupRankRow extends LeaderRow {
  mode: Mode;
}

export type SignUpResult =
  | { ok: true; needsConfirmation: boolean, error?: string }
  | { ok: false; error: string };

export interface Api {
  mode: "supabase" | "mock";
  enabled: boolean;
  loginHint?: string;

  // Propostes
  submitProposal(p: NewProposal): Promise<void>;
  fetchAcceptedPuzzles(): Promise<Puzzle[]>;
  fetchVotingProposals(): Promise<{ proposals: Proposal[]; tallies: Record<number, Tally> }>;
  castVote(proposalId: number, value: 1 | -1): Promise<"ok" | "already">;

  // Comptes
  auth: {
    getSession(): Promise<Session | null>;
    onChange(cb: (s: Session | null) => void): () => void;
    signIn(email: string, password: string): Promise<boolean>;
    signUp(username: string, email: string, password: string): Promise<SignUpResult>;
    signOut(): Promise<void>;
    usernameAvailable(username: string): Promise<boolean>;
    deleteAccount(): Promise<void>;
  };

  // Rècords i rànquings
  records: {
    load(): Promise<Records | null>;
    save(r: Records): Promise<void>;
  };
  scores: {
    submit(mode: Mode, value: number): Promise<void>;
    leaderboard(mode: Mode): Promise<LeaderRow[]>;
  };

  // Grups
  groups: {
    list(): Promise<GroupInfo[]>;
    create(name: string): Promise<GroupInfo>;
    join(code: string): Promise<GroupInfo>;
    leave(id: string): Promise<void>;
    ranking(id: string): Promise<GroupRankRow[]>;
  };

  // Admin
  admin: {
    listOpenProposals(): Promise<{ rows: Proposal[]; tallies: Record<number, Tally> }>;
    decide(id: number, status: Decision, comarca: string, aliases: string[]): Promise<void>;
  };
}