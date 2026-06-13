// Shared TypeScript types mirroring the Firestore document structure.
// These parallel src/lib/data.ts but are the authoritative production types.

import type { Timestamp } from "firebase/firestore";

export type Tier = "A" | "B" | "C" | "D" | "E" | "F";

// ── Firestore: pools/{poolId} ──────────────────────────────────────────────
export type PoolDoc = {
  name: string;
  season: string;
  buyin: number;
  payoutPct: [number, number, number]; // e.g. [50, 30, 20]
  lockAt: Timestamp;
  adminUid: string;
  round: string; // e.g. "Round of 16"
  createdAt: Timestamp;
};

// ── Firestore: pools/{poolId}/players/{uid} ────────────────────────────────
export type PickEntry = {
  code: string;
  pts: number;
  rem: number;
  alive: boolean;
};

export type ResultPointDoc = {
  code: string;
  tier: Tier;
  points: number;
};

export type MatchEventDoc = {
  id: string;
  team: string | null;
  teamName: string;
  minute: number | null;
  extra: number | null;
  player: string | null;
  assist: string | null;
  type: "goal" | "card" | "substitution" | "var" | "other";
  detail: string | null;
  comments?: string | null;
};

export type MatchLineupPlayerDoc = {
  id: string;
  name: string;
  number: number | null;
  position: string | null;
  grid: string | null;
};

export type MatchLineupTeamDoc = {
  team: string | null;
  teamName: string;
  formation: string | null;
  coach: string | null;
  startXI: MatchLineupPlayerDoc[];
  substitutes: MatchLineupPlayerDoc[];
};

export type MatchStatisticDoc = {
  team: string | null;
  teamName: string;
  type: string;
  value: string | number | null;
};

export type TeamSquadPlayerDoc = {
  id: string;
  name: string;
  age: number | null;
  number: number | null;
  position: string | null;
  photo: string | null;
};

export type TeamCoachDoc = {
  id: string;
  name: string;
  nationality: string | null;
  photo: string | null;
};

export type TeamProfileDoc = {
  code: string;
  name: string;
  flag: string;
  tier: Tier;
  group: string | null;
  providerTeamId: string | null;
  logo: string | null;
  coach: TeamCoachDoc | null;
  players: TeamSquadPlayerDoc[];
  updatedAt?: Timestamp;
};

export type PlayerDoc = {
  name: string;
  short: string; // 2-char display initials
  phone: string;
  paid: boolean;
  approvalStatus?: "pending" | "approved";
  passwordSet?: boolean;
  hasDrafted: boolean;
  finalGoals: number | null;
  picks: Partial<Record<Tier, PickEntry>> | null; // null until drafted
  // computed by recompute API (written with Admin SDK)
  points: number;
  ceiling: number;
  rank: number;
  prevRank: number;
  mover: number;
  payout: number;
  aliveCount: number;
  joinedAt: Timestamp;
};

// ── Firestore: pools/{poolId}/results/{matchId} ────────────────────────────
export type ResultDoc = {
  id: string; // match ID, e.g. "m49"
  round: string;
  a: string; // team code
  b: string; // team code
  sa: number | null;
  sb: number | null;
  win: string | null; // winning team code or "draw"
  pens: string | null;
  pts: ResultPointDoc[]; // Firestore-safe point rows for each team awarded points.
  held: number; // how many players hold the winning team
  note: string;
  enteredAt: Timestamp;
  locked?: boolean;
  manualOverride?: boolean;
  source?: "manual" | "football-data" | "api-football" | "openfootball";
  providerMatchId?: string;
};

// ── Firestore: pools/{poolId}/fixtures/{matchId} ──────────────────────────
export type FixtureDoc = {
  id: string;
  label: string;
  round: string;
  group: string | null;
  date: string; // yyyy-mm-dd, derived from kickoffAt
  time: string; // HH:mm, derived from kickoffAt
  kickoffAt: string; // ISO UTC
  venue: string | null;
  status: "scheduled" | "live" | "finished" | "postponed" | "abandoned" | "unknown";
  a: string | null;
  b: string | null;
  aName: string;
  bName: string;
  source: "football-data" | "api-football" | "openfootball" | "temporary";
  sourceIds: Partial<Record<"footballData" | "apiFootball" | "openfootball", string>>;
  lastSyncedAt?: Timestamp;
  warning?: string | null;
  events?: MatchEventDoc[];
  lineups?: MatchLineupTeamDoc[];
  statistics?: MatchStatisticDoc[];
};

// ── Firestore: pools/{poolId}/liveState/{matchId} ─────────────────────────
export type LiveStateDoc = {
  id: string;
  fixtureId: string;
  status: "live" | "paused" | "finished" | "unknown";
  statusShort?: string | null;
  statusLong?: string | null;
  minute: number | null;
  extra?: number | null;
  sa: number | null;
  sb: number | null;
  source: "api-football" | "football-data";
  events?: MatchEventDoc[];
  lineups?: MatchLineupTeamDoc[];
  statistics?: MatchStatisticDoc[];
  updatedAt: Timestamp;
};

// ── Firestore: pools/{poolId}/sync/status ─────────────────────────────────
export type SyncWarning = {
  matchId?: string;
  provider: string;
  message: string;
};

export type SyncStatusDoc = {
  providerConfigured?: {
    footballData: boolean;
    apiFootball: boolean;
    openfootball: boolean;
  };
  warnings?: SyncWarning[];
  fixtureCount?: number;
  liveCount?: number;
  teamProfileCount?: number;
  clearedFixtureCount?: number;
  clearedLiveCount?: number;
  lockedResultCount?: number;
  skippedManualCount?: number;
  syncedAt?: Timestamp;
};

// ── Firestore: pools/{poolId}/standings/current ────────────────────────────
export type StandingsDoc = {
  players: SerializedPlayer[];
  scaleMax: number;
  computedAt: Timestamp;
  round: string;
};

// Serialized player for standings (Timestamp replaced with string for JSON compat)
export type SerializedPlayer = Omit<PlayerDoc, "joinedAt" | "picks"> & {
  uid: string;
  teams: {
    code: string;
    name: string;
    flag: string;
    tier: Tier;
    pts: number;
    rem: number;
    alive: boolean;
  }[];
  me?: boolean; // set client-side based on auth UID
  // compatibility aliases matching the legacy Player type used in display components
  prev?: number;
  short: string;
};

// ── Firestore: joinRequests/{id} ───────────────────────────────────────────
export type JoinRequestDoc = {
  name: string;
  phone: string;
  cc: string; // dial code, e.g. "+254"
  poolId: string;
  playerUid?: string;
  requestedAt: Timestamp;
  status: "pending" | "approved" | "declined";
};

// ── Firebase Auth custom claims ────────────────────────────────────────────
export type WadauClaims = {
  poolId: string;
  isAdmin: boolean;
  passwordSet: boolean;
  approvalStatus?: "pending" | "approved";
};
