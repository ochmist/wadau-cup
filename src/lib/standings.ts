// Standings computation — runs inside the /api/admin/recompute route.
// Pure function: takes picks + results, returns computed standings.

import type { Tier } from "./types";

export type TeamInfo = { n: string; f: string; t: Tier };
export type TeamDict = Record<string, TeamInfo>;

// Points table indexed by [resultType][tierIndex 0=A..5=F]
// Matches the SCORING array in wadau-rules.jsx exactly.
const TIER_INDEX: Record<Tier, number> = { A: 0, B: 1, C: 2, D: 3, E: 4, F: 5 };

const SCORING_TABLE: Record<string, number[]> = {
  "Group · Win": [1, 1, 2, 2, 3, 4],
  "Group · Draw": [0, 1, 1, 1, 2, 2],
  "Round of 32 · Win": [1, 1, 2, 2, 2, 3],
  "Round of 16 · Win": [1, 1, 1, 1, 2, 2],
  "Quarter-final · Win": [1, 1, 1, 1, 1, 1],
  "Semi-final · Win": [2, 2, 2, 2, 2, 2],
  "Third place · Win": [1, 1, 1, 1, 1, 1],
  "Final · Champion": [3, 3, 3, 3, 3, 3],
};

const ROUND_ORDER = [
  "Group",
  "Round of 32",
  "Round of 16",
  "Quarter-final",
  "Semi-final",
  "Final",
] as const;

const KNOCKOUT_ROUNDS = [
    "Round of 32 · Win",
    "Round of 16 · Win",
    "Quarter-final · Win",
    "Semi-final · Win",
    "Final · Champion",
] as const;

// Remaining max points a team can earn if they win everything from a given knockout round.
const REMAINING_FROM_ROUND: Record<string, Record<Tier, number>> = (() => {
  const result: Record<string, Record<Tier, number>> = {};
  for (let i = 0; i < KNOCKOUT_ROUNDS.length; i++) {
    const remaining: Partial<Record<Tier, number>> = {};
    for (const tier of ["A", "B", "C", "D", "E", "F"] as Tier[]) {
      const ti = TIER_INDEX[tier];
      remaining[tier] = KNOCKOUT_ROUNDS
        .slice(i)
        .reduce((s, r) => s + (SCORING_TABLE[r]?.[ti] ?? 0), 0);
    }
    // Key by the round name the team is currently in (about to play)
    result[KNOCKOUT_ROUNDS[i].replace(" · Win", "")] = remaining as Record<Tier, number>;
  }
  return result;
})();

export type RawResult = {
  id: string;
  round: string; // "Round of 16", "Group F", etc.
  a: string;
  b: string;
  win: string | null; // winner code or "draw"
  sa?: number | null;
  sb?: number | null;
};

export type RawPick = {
  uid: string;
  name: string;
  short: string;
  phone: string;
  paid: boolean;
  approvalStatus?: "pending" | "approved";
  finalGoals: number | null;
  picks: Partial<Record<Tier, string>>; // tier → team code
  prevRank: number;
};

export type ComputedPlayer = {
  uid: string;
  name: string;
  short: string;
  phone: string;
  paid: boolean;
  approvalStatus?: "pending" | "approved";
  finalGoals: number | null;
  prevRank: number;
  teams: {
    tier: Tier;
    code: string;
    pts: number;
    rem: number;
    alive: boolean;
  }[];
  points: number;
  ceiling: number;
  rank: number;
  mover: number;
  payout: number;
  aliveCount: number;
};

export function pointsForResult(
  resultType: string,
  tier: Tier,
): number {
  const row = SCORING_TABLE[resultType];
  if (!row) return 0;
  return row[TIER_INDEX[tier]] ?? 0;
}

export function roundLabel(round: string): string {
  // Normalize "Group F", "Group Stage" → "Group"; keep R16 etc as-is.
  if (round.startsWith("Group")) return "Group";
  return round;
}

function nextRound(round: string): string | null {
  const label = roundLabel(round);
  const index = ROUND_ORDER.indexOf(label as (typeof ROUND_ORDER)[number]);
  if (index < 0 || index === ROUND_ORDER.length - 1) return null;
  return ROUND_ORDER[index + 1];
}

export function computeStandings(
  rawPlayers: RawPick[],
  results: RawResult[],
  T: TeamDict,
  payoutPct: [number, number, number],
  buyin: number,
  tournamentRound = "Group",
): { players: ComputedPlayer[]; scaleMax: number } {
  // Build a map of team code → { pts earned, alive }
  const teamPts: Record<string, number> = {};
  const eliminated = new Set<string>();
  const currentRound: Record<string, string> = {};
  const groupMatchesPlayed: Record<string, number> = {};
  const fallbackRound = roundLabel(tournamentRound);

  for (const r of results) {
    if (!r.win) continue;
    const round = roundLabel(r.round);
    const isDraw = r.win === "draw";
    if (round === "Group") {
      groupMatchesPlayed[r.a] = (groupMatchesPlayed[r.a] ?? 0) + 1;
      groupMatchesPlayed[r.b] = (groupMatchesPlayed[r.b] ?? 0) + 1;
    }

    if (isDraw) {
      const aKey = `${round} · Draw`;
      const bKey = `${round} · Draw`;
      const aTier = T[r.a]?.t;
      const bTier = T[r.b]?.t;
      if (aTier) teamPts[r.a] = (teamPts[r.a] ?? 0) + pointsForResult(aKey, aTier);
      if (bTier) teamPts[r.b] = (teamPts[r.b] ?? 0) + pointsForResult(bKey, bTier);
    } else {
      const winner = r.win;
      const loser = winner === r.a ? r.b : r.a;
      const wTier = T[winner]?.t;
      const wKey = `${round} · Win`;
      if (wTier) teamPts[winner] = (teamPts[winner] ?? 0) + pointsForResult(wKey, wTier);
      if (round !== "Group") {
        eliminated.add(loser);
      }
      const next = nextRound(round);
      if (next) currentRound[winner] = next;
    }
  }

  function remainingForTeam(code: string, tier: Tier, alive: boolean) {
    if (!alive) return 0;
    const round = currentRound[code] ?? fallbackRound;
    if (round === "Group") {
      const groupWinsLeft = Math.max(0, 3 - (groupMatchesPlayed[code] ?? 0));
      return (
        groupWinsLeft * pointsForResult("Group · Win", tier) +
        (REMAINING_FROM_ROUND["Round of 32"]?.[tier] ?? 0)
      );
    }
    return REMAINING_FROM_ROUND[round]?.[tier] ?? 0;
  }

  const players: ComputedPlayer[] = rawPlayers.map((p) => {
    const tiers = ["A", "B", "C", "D", "E", "F"] as Tier[];
    const teams = tiers
      .filter((t) => p.picks[t])
      .map((t) => {
        const code = p.picks[t]!;
        const tier = T[code]?.t ?? t;
        const pts = teamPts[code] ?? 0;
        const alive = !eliminated.has(code);
        const rem = remainingForTeam(code, tier, alive);
        return { tier, code, pts, rem, alive };
      });
    const points = teams.reduce((s, t) => s + t.pts, 0);
    const ceiling = points + teams.reduce((s, t) => s + t.rem, 0);
    const aliveCount = teams.filter((t) => t.alive).length;
    return {
      uid: p.uid,
      name: p.name,
      short: p.short,
      phone: p.phone,
      paid: p.paid,
      approvalStatus: p.approvalStatus ?? "approved",
      finalGoals: p.finalGoals,
      prevRank: p.prevRank,
      teams,
      points,
      ceiling,
      rank: 0,
      mover: 0,
      payout: 0,
      aliveCount,
    };
  });

  players.sort((a, b) => {
    const aRankable = (a.approvalStatus ?? "approved") === "approved" && a.paid && a.teams.length > 0;
    const bRankable = (b.approvalStatus ?? "approved") === "approved" && b.paid && b.teams.length > 0;
    if (aRankable !== bRankable) return aRankable ? -1 : 1;
    return b.points - a.points || b.ceiling - a.ceiling;
  });
  const paidPot = rawPlayers.filter((p) => (p.approvalStatus ?? "approved") === "approved" && p.paid).length * buyin;
  const payouts: [number, number, number] = [
    Math.round(paidPot * payoutPct[0] / 100),
    Math.round(paidPot * payoutPct[1] / 100),
    Math.round(paidPot * payoutPct[2] / 100),
  ];
  let rank = 1;
  players.forEach((p) => {
    const rankable = (p.approvalStatus ?? "approved") === "approved" && p.paid && p.teams.length > 0;
    if (!rankable) {
      p.rank = 0;
      p.mover = 0;
      p.payout = 0;
      return;
    }
    p.rank = rank;
    rank += 1;
    p.mover = p.prevRank > 0 ? p.prevRank - p.rank : 0;
    p.payout = p.rank <= 3 ? payouts[p.rank - 1] : 0;
  });

  const scaleMax = Math.max(...players.map((p) => p.ceiling), 1) + 4;
  return { players, scaleMax };
}
