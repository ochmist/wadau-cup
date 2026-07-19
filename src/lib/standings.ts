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

const ADVANCEMENT_ROUND_ORDER = [
  "Group",
  "Round of 32",
  "Round of 16",
  "Quarter-final",
  "Semi-final",
  "Final",
] as const;

const FIXTURE_ROUND_ORDER = [
  "Group",
  "Round of 32",
  "Round of 16",
  "Quarter-final",
  "Semi-final",
  "Third place",
  "Final",
] as const;

const PROGRESSION_SCORE: Record<string, number> = {
  Group: 0,
  "Round of 32": 1,
  "Round of 16": 2,
  "Quarter-final": 3,
  "Semi-final": 4,
  Final: 5,
};

const UNDERDOG_TIE_TIERS = ["F", "E", "D", "C", "B"] as const;

const CHAMPIONSHIP_PATH = [
  { round: "Round of 32", result: "Round of 32 · Win" },
  { round: "Round of 16", result: "Round of 16 · Win" },
  { round: "Quarter-final", result: "Quarter-final · Win" },
  { round: "Semi-final", result: "Semi-final · Win" },
  { round: "Final", result: "Final · Champion" },
] as const;

// Remaining max points a team can earn from its next known knockout match.
const REMAINING_FROM_ROUND: Record<string, Record<Tier, number>> = (() => {
  const result: Record<string, Record<Tier, number>> = {};
  for (let i = 0; i < CHAMPIONSHIP_PATH.length; i++) {
    const remaining: Partial<Record<Tier, number>> = {};
    for (const tier of ["A", "B", "C", "D", "E", "F"] as Tier[]) {
      const ti = TIER_INDEX[tier];
      remaining[tier] = CHAMPIONSHIP_PATH
        .slice(i)
        .reduce((s, path) => s + (SCORING_TABLE[path.result]?.[ti] ?? 0), 0);
    }
    result[CHAMPIONSHIP_PATH[i].round] = remaining as Record<Tier, number>;
  }
  const thirdPlace: Partial<Record<Tier, number>> = {};
  for (const tier of ["A", "B", "C", "D", "E", "F"] as Tier[]) {
    thirdPlace[tier] = pointsForResult("Third place · Win", tier);
  }
  result["Third place"] = thirdPlace as Record<Tier, number>;
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

export type RawFixture = {
  id: string;
  round: string;
  a: string | null;
  b: string | null;
  status?: string | null;
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
    stageGamesLeft: number;
    stagePossiblePoints: number;
  }[];
  points: number;
  ceiling: number;
  stageGamesLeft: number;
  stagePossiblePoints: number;
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
  const label = round.trim();
  const lower = label.toLowerCase();
  if (lower.startsWith("group")) return "Group";
  if (lower.includes("third") || lower.includes("3rd") || lower.includes("bronze")) return "Third place";
  return label;
}

function nextRound(round: string): string | null {
  const label = roundLabel(round);
  const index = ADVANCEMENT_ROUND_ORDER.indexOf(label as (typeof ADVANCEMENT_ROUND_ORDER)[number]);
  if (index < 0 || index === ADVANCEMENT_ROUND_ORDER.length - 1) return null;
  return ADVANCEMENT_ROUND_ORDER[index + 1];
}

function fixtureRoundIndex(round: string) {
  const index = FIXTURE_ROUND_ORDER.indexOf(round as (typeof FIXTURE_ROUND_ORDER)[number]);
  return index < 0 ? FIXTURE_ROUND_ORDER.length : index;
}

function progressionRound(round: string) {
  const label = roundLabel(round);
  if (label === "Third place") return "Semi-final";
  return label;
}

function finalGoalsTotal(results: RawResult[]) {
  const final = results.find((result) => {
    if (!result.win || result.win === "draw") return false;
    if (roundLabel(result.round) !== "Final") return false;
    return typeof result.sa === "number" && typeof result.sb === "number";
  });
  if (!final || typeof final.sa !== "number" || typeof final.sb !== "number") return null;
  return final.sa + final.sb;
}

export function computeStandings(
  rawPlayers: RawPick[],
  results: RawResult[],
  T: TeamDict,
  payoutPct: [number, number, number],
  buyin: number,
  tournamentRound = "Group",
  fixtures: RawFixture[] = [],
): { players: ComputedPlayer[]; scaleMax: number } {
  // Build a map of team code → { pts earned, alive }
  const teamPts: Record<string, number> = {};
  const eliminated = new Set<string>();
  const currentRound: Record<string, string> = {};
  const groupMatchesPlayed: Record<string, number> = {};
  const teamProgress: Record<string, number> = {};
  const fallbackRound = roundLabel(tournamentRound);
  const completedResultIds = new Set(results.filter((r) => r.win).map((r) => r.id));
  const finalGoalTotal = finalGoalsTotal(results);

  function setTeamProgress(code: string | null | undefined, round: string) {
    if (!code) return;
    const score = PROGRESSION_SCORE[progressionRound(round)] ?? 0;
    teamProgress[code] = Math.max(teamProgress[code] ?? 0, score);
  }

  for (const r of results) {
    if (!r.win) continue;
    const round = roundLabel(r.round);
    const isDraw = r.win === "draw";
    setTeamProgress(r.a, round);
    setTeamProgress(r.b, round);
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
      const wKey = round === "Final" ? "Final · Champion" : `${round} · Win`;
      if (wTier) teamPts[winner] = (teamPts[winner] ?? 0) + pointsForResult(wKey, wTier);
      if (round === "Final") {
        setTeamProgress(winner, "Final");
        setTeamProgress(loser, "Final");
      }
      if (round !== "Group") {
        eliminated.add(loser);
      }
      const next = nextRound(round);
      if (round !== "Group" && next) currentRound[winner] = next;
    }
  }

  for (const fixture of fixtures) {
    setTeamProgress(fixture.a, fixture.round);
    setTeamProgress(fixture.b, fixture.round);
  }
  for (const [code, round] of Object.entries(currentRound)) {
    setTeamProgress(code, round);
  }

  function openFixturesForTeam(code: string, round: string) {
    return fixtures.filter((fixture) => {
      if (roundLabel(fixture.round) !== round) return false;
      if (fixture.a !== code && fixture.b !== code) return false;
      if (completedResultIds.has(fixture.id)) return false;
      return fixture.status !== "finished";
    });
  }

  function nextOpenRoundForTeam(code: string) {
    const openRounds = fixtures
      .filter((fixture) => {
        if (fixture.a !== code && fixture.b !== code) return false;
        if (completedResultIds.has(fixture.id)) return false;
        return fixture.status !== "finished";
      })
      .map((fixture) => roundLabel(fixture.round))
      .sort((a, b) => fixtureRoundIndex(a) - fixtureRoundIndex(b));
    return openRounds[0] ?? null;
  }

  function groupGamesLeftForTeam(code: string) {
    const scheduled = openFixturesForTeam(code, "Group").length;
    if (scheduled > 0 || fixtures.length > 0) return scheduled;
    return Math.max(0, 3 - (groupMatchesPlayed[code] ?? 0));
  }

  function teamIsAlive(code: string) {
    const openRound = nextOpenRoundForTeam(code);
    if (eliminated.has(code)) return openRound === "Third place";
    if (currentRound[code]) return true;
    if (openRound) return true;
    if (fixtures.length > 0 && (groupMatchesPlayed[code] ?? 0) > 0 && groupGamesLeftForTeam(code) === 0) {
      return false;
    }
    return true;
  }

  function stageGamesLeftForTeam(code: string, alive: boolean) {
    if (!alive) return 0;
    const stage = nextOpenRoundForTeam(code) ?? currentRound[code] ?? fallbackRound;
    if (stage === "Group") return groupGamesLeftForTeam(code);
    return openFixturesForTeam(code, stage).length;
  }

  function stagePossiblePointsForTeam(code: string, tier: Tier, alive: boolean) {
    if (!alive) return 0;
    const games = stageGamesLeftForTeam(code, alive);
    if (games <= 0) return 0;
    const stage = nextOpenRoundForTeam(code) ?? currentRound[code] ?? fallbackRound;
    if (stage === "Group") return games * pointsForResult("Group · Win", tier);
    const key = stage === "Final" ? "Final · Champion" : `${stage} · Win`;
    return games * pointsForResult(key, tier);
  }

  function remainingForTeam(code: string, tier: Tier, alive: boolean) {
    if (!alive) return 0;
    const round = nextOpenRoundForTeam(code) ?? currentRound[code] ?? fallbackRound;
    if (round === "Group") {
      const groupWinsLeft = groupGamesLeftForTeam(code);
      return (
        groupWinsLeft * pointsForResult("Group · Win", tier) +
        (REMAINING_FROM_ROUND["Round of 32"]?.[tier] ?? 0)
      );
    }
    return REMAINING_FROM_ROUND[round]?.[tier] ?? 0;
  }

  function progressionTieScore(teams: { code: string }[]) {
    const scores = teams.map((team) => teamProgress[team.code] ?? 0);
    const deepest = Math.max(...scores, 0);
    return {
      deepest,
      deepestCount: scores.filter((score) => score === deepest).length,
    };
  }

  function compareFinalGoals(a: ComputedPlayer, b: ComputedPlayer) {
    if (finalGoalTotal == null) return 0;
    const aGuess = typeof a.finalGoals === "number" ? a.finalGoals : null;
    const bGuess = typeof b.finalGoals === "number" ? b.finalGoals : null;
    if (aGuess == null && bGuess == null) return 0;
    if (aGuess == null) return 1;
    if (bGuess == null) return -1;
    return Math.abs(aGuess - finalGoalTotal) - Math.abs(bGuess - finalGoalTotal);
  }

  function tieMetrics(player: ComputedPlayer) {
    const progress = progressionTieScore(player.teams);
    const underdogPoints = Object.fromEntries(
      UNDERDOG_TIE_TIERS.map((tier) => [
        tier,
        player.teams
          .filter((team) => team.tier === tier)
          .reduce((sum, team) => sum + team.pts, 0),
      ]),
    ) as Record<(typeof UNDERDOG_TIE_TIERS)[number], number>;
    const finalGoalDistance = finalGoalTotal == null
      ? null
      : typeof player.finalGoals === "number"
        ? Math.abs(player.finalGoals - finalGoalTotal)
        : Number.MAX_SAFE_INTEGER;
    return { progress, underdogPoints, finalGoalDistance };
  }

  function compareTiedPoints(a: ComputedPlayer, b: ComputedPlayer) {
    const aMetrics = tieMetrics(a);
    const bMetrics = tieMetrics(b);
    const progression =
      bMetrics.progress.deepest - aMetrics.progress.deepest ||
      bMetrics.progress.deepestCount - aMetrics.progress.deepestCount;
    if (progression) return progression;
    for (const tier of UNDERDOG_TIE_TIERS) {
      const tierDiff = bMetrics.underdogPoints[tier] - aMetrics.underdogPoints[tier];
      if (tierDiff) return tierDiff;
    }
    return compareFinalGoals(a, b);
  }

  function compareRankOrder(a: ComputedPlayer, b: ComputedPlayer) {
    const aRankable = (a.approvalStatus ?? "approved") === "approved" && a.paid && a.teams.length > 0;
    const bRankable = (b.approvalStatus ?? "approved") === "approved" && b.paid && b.teams.length > 0;
    if (aRankable !== bRankable) return aRankable ? -1 : 1;
    if (!aRankable || !bRankable) return a.name.localeCompare(b.name);
    return b.points - a.points || compareTiedPoints(a, b) || a.name.localeCompare(b.name);
  }

  function rankingTieKey(player: ComputedPlayer) {
    const metrics = tieMetrics(player);
    return [
      player.points,
      metrics.progress.deepest,
      metrics.progress.deepestCount,
      ...UNDERDOG_TIE_TIERS.map((tier) => metrics.underdogPoints[tier]),
      metrics.finalGoalDistance ?? "pending",
    ].join("|");
  }

  const players: ComputedPlayer[] = rawPlayers.map((p) => {
    const tiers = ["A", "B", "C", "D", "E", "F"] as Tier[];
    const teams = tiers
      .filter((t) => p.picks[t])
      .map((t) => {
        const code = p.picks[t]!;
        const tier = T[code]?.t ?? t;
        const pts = teamPts[code] ?? 0;
        const alive = teamIsAlive(code);
        const rem = remainingForTeam(code, tier, alive);
        const stageGamesLeft = stageGamesLeftForTeam(code, alive);
        const stagePossiblePoints = stagePossiblePointsForTeam(code, tier, alive);
        return { tier, code, pts, rem, alive, stageGamesLeft, stagePossiblePoints };
      });
    const points = teams.reduce((s, t) => s + t.pts, 0);
    const ceiling = points + teams.reduce((s, t) => s + t.rem, 0);
    const stageGamesLeft = teams.reduce((s, t) => s + t.stageGamesLeft, 0);
    const stagePossiblePoints = teams.reduce((s, t) => s + t.stagePossiblePoints, 0);
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
      stageGamesLeft,
      stagePossiblePoints,
      rank: 0,
      mover: 0,
      payout: 0,
      aliveCount,
    };
  });

  players.sort(compareRankOrder);
  const paidPot = rawPlayers.filter((p) => (p.approvalStatus ?? "approved") === "approved" && p.paid).length * buyin;
  const payouts: [number, number, number] = [
    Math.round(paidPot * payoutPct[0] / 100),
    Math.round(paidPot * payoutPct[1] / 100),
    Math.round(paidPot * payoutPct[2] / 100),
  ];
  const payoutForPosition = (position: number) => payouts[position - 1] ?? 0;
  let position = 1;
  for (let i = 0; i < players.length;) {
    const p = players[i];
    const rankable = (p.approvalStatus ?? "approved") === "approved" && p.paid && p.teams.length > 0;
    if (!rankable) {
      p.rank = 0;
      p.mover = 0;
      p.payout = 0;
      i += 1;
      continue;
    }
    const key = rankingTieKey(p);
    let end = i + 1;
    while (end < players.length) {
      const next = players[end];
      const nextRankable = (next.approvalStatus ?? "approved") === "approved" && next.paid && next.teams.length > 0;
      if (!nextRankable || rankingTieKey(next) !== key) break;
      end += 1;
    }
    const tied = players.slice(i, end);
    const groupPayout = tied.reduce((sum, _player, offset) => sum + payoutForPosition(position + offset), 0);
    const payoutShare = groupPayout > 0 ? Math.round(groupPayout / tied.length) : 0;
    for (const tiedPlayer of tied) {
      tiedPlayer.rank = position;
      tiedPlayer.mover = tiedPlayer.prevRank > 0 ? tiedPlayer.prevRank - tiedPlayer.rank : 0;
      tiedPlayer.payout = payoutShare;
    }
    position += tied.length;
    i = end;
  }

  const scaleMax = Math.max(...players.map((p) => p.ceiling), 1) + 4;
  return { players, scaleMax };
}
