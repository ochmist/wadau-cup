import { matchDataConfig } from "@/lib/config";
import { TEMP_FIXTURES, type FixtureGame } from "@/lib/fixtures";
import { canonicalTeamId, isPlaceholderTeam, teamLabel, type ProviderTeam } from "@/lib/team-aliases";

export type NormalizedStatus = "scheduled" | "live" | "finished" | "postponed" | "abandoned" | "unknown";

export type NormalizedFixture = FixtureGame & {
  id: string;
  kickoffAt: string;
  venue: string | null;
  status: NormalizedStatus;
  source: "football-data" | "openfootball" | "temporary";
  sourceIds: Partial<Record<"footballData" | "apiFootball" | "openfootball", string>>;
  warning?: string | null;
  result?: NormalizedResult | null;
  liveState?: NormalizedLiveState | null;
};

export type NormalizedResult = {
  matchId: string;
  round: string;
  a: string;
  b: string;
  sa: number;
  sb: number;
  win: string | "draw";
  pens: string | null;
  source: "football-data" | "openfootball";
  providerMatchId?: string;
};

export type NormalizedLiveState = {
  fixtureId: string;
  status: "live" | "paused" | "finished" | "unknown";
  minute: number | null;
  sa: number | null;
  sb: number | null;
  source: "api-football" | "football-data";
};

export type AdapterWarning = {
  matchId?: string;
  provider: string;
  message: string;
};

export type MatchAdapterResult = {
  fixtures: NormalizedFixture[];
  liveState: NormalizedLiveState[];
  warnings: AdapterWarning[];
  providerConfigured: {
    footballData: boolean;
    apiFootball: boolean;
    openfootball: boolean;
  };
};

type FootballDataTeam = ProviderTeam;
type FootballDataMatch = {
  id: number;
  utcDate: string;
  status: string;
  stage?: string;
  group?: string | null;
  matchday?: number | null;
  venue?: string | null;
  homeTeam: FootballDataTeam;
  awayTeam: FootballDataTeam;
  score?: {
    winner?: "HOME_TEAM" | "AWAY_TEAM" | "DRAW" | null;
    fullTime?: { home?: number | null; away?: number | null };
    penalties?: { home?: number | null; away?: number | null };
  };
};

type ApiFootballFixture = {
  fixture?: {
    id?: number;
    date?: string;
    status?: {
      short?: string;
      elapsed?: number | null;
    };
  };
  league?: {
    round?: string;
  };
  teams?: {
    home?: ProviderTeam;
    away?: ProviderTeam;
  };
  goals?: {
    home?: number | null;
    away?: number | null;
  };
};

function roundFromStage(stage?: string | null, group?: string | null) {
  if (stage === "GROUP_STAGE") return group ? "Group" : "Group";
  if (stage === "LAST_32") return "Round of 32";
  if (stage === "LAST_16") return "Round of 16";
  if (stage === "QUARTER_FINALS") return "Quarter-final";
  if (stage === "SEMI_FINALS") return "Semi-final";
  if (stage === "THIRD_PLACE") return "Third place";
  if (stage === "FINAL") return "Final";
  return stage ? stage.replace(/_/g, " ").toLowerCase().replace(/\b\w/g, (c) => c.toUpperCase()) : "Unknown";
}

function groupFromProvider(group?: string | null) {
  if (!group) return null;
  const normalized = group.replace(/^GROUP[_\s-]*/i, "").trim();
  return normalized ? `Group ${normalized.toUpperCase()}` : null;
}

function statusFromFootballData(status: string): NormalizedStatus {
  if (["FINISHED", "AWARDED"].includes(status)) return "finished";
  if (["IN_PLAY", "PAUSED"].includes(status)) return "live";
  if (["POSTPONED", "TIMED"].includes(status)) return status === "POSTPONED" ? "postponed" : "scheduled";
  if (["SCHEDULED"].includes(status)) return "scheduled";
  if (["SUSPENDED", "CANCELLED"].includes(status)) return "abandoned";
  return "unknown";
}

function datePartsFromIso(iso: string) {
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return { date: "2026-06-11", time: "00:00" };
  return {
    date: date.toISOString().slice(0, 10),
    time: date.toISOString().slice(11, 16),
  };
}

function fixtureKey(round: string, date: string, a: string | null, b: string | null) {
  return [round, date, a ?? "tbd", b ?? "tbd"].join("|");
}

function unresolvedTeamWarning(aTeam: ProviderTeam | string | null | undefined, bTeam: ProviderTeam | string | null | undefined) {
  const aLabel = teamLabel(aTeam);
  const bLabel = teamLabel(bTeam);
  const aPlaceholder = isPlaceholderTeam(aLabel);
  const bPlaceholder = isPlaceholderTeam(bLabel);
  if (aPlaceholder || bPlaceholder) return null;
  return `Unmapped team: ${aLabel} / ${bLabel}`;
}

function liveStateFromFootballData(match: FootballDataMatch, fixtureId: string): NormalizedLiveState | null {
  if (statusFromFootballData(match.status) !== "live") return null;
  const fullTime = match.score?.fullTime;
  const sa = fullTime?.home;
  const sb = fullTime?.away;
  if (typeof sa !== "number" || typeof sb !== "number") return null;
  return {
    fixtureId,
    status: match.status === "PAUSED" ? "paused" : "live",
    minute: null,
    sa,
    sb,
    source: "football-data",
  };
}

function resultFromFootballData(match: FootballDataMatch, fixtureId: string, round: string, a: string | null, b: string | null): NormalizedResult | null {
  if (!a || !b || statusFromFootballData(match.status) !== "finished") return null;
  const fullTime = match.score?.fullTime;
  const sa = fullTime?.home;
  const sb = fullTime?.away;
  if (typeof sa !== "number" || typeof sb !== "number") return null;
  const winner = match.score?.winner;
  const win = winner === "DRAW" ? "draw" : winner === "HOME_TEAM" ? a : winner === "AWAY_TEAM" ? b : sa === sb ? "draw" : sa > sb ? a : b;
  const pens = match.score?.penalties && match.score.penalties.home != null && match.score.penalties.away != null
    ? `${match.score.penalties.home}-${match.score.penalties.away}`
    : null;
  return {
    matchId: fixtureId,
    round,
    a,
    b,
    sa,
    sb,
    win,
    pens,
    source: "football-data",
    providerMatchId: String(match.id),
  };
}

async function fetchJson(url: string, init?: RequestInit) {
  const res = await fetch(url, { ...init, cache: "no-store" });
  if (!res.ok) {
    throw new Error(`${res.status} ${res.statusText}`);
  }
  return res.json();
}

async function fetchFootballDataFixtures(): Promise<{ fixtures: NormalizedFixture[]; warnings: AdapterWarning[] }> {
  if (!matchDataConfig.footballDataApiKey) return { fixtures: [], warnings: [] };
  const url = `${matchDataConfig.footballDataBaseUrl}/competitions/${matchDataConfig.footballDataCompetition}/matches`;
  const data = await fetchJson(url, { headers: { "X-Auth-Token": matchDataConfig.footballDataApiKey } }) as { matches?: FootballDataMatch[] };
  const warnings: AdapterWarning[] = [];
  const fixtures = (data.matches ?? []).map((match) => {
    const round = roundFromStage(match.stage, match.group);
    const group = groupFromProvider(match.group);
    const home = canonicalTeamId(match.homeTeam);
    const away = canonicalTeamId(match.awayTeam);
    const { date, time } = datePartsFromIso(match.utcDate);
    const id = `fd-${match.id}`;
    const warning = !home || !away ? unresolvedTeamWarning(match.homeTeam, match.awayTeam) : null;
    if (warning) warnings.push({ matchId: id, provider: "football-data", message: warning });
    return {
      id,
      label: match.matchday ? `Match ${match.matchday}` : `Match ${match.id}`,
      round,
      group,
      date,
      time,
      kickoffAt: match.utcDate,
      venue: match.venue ?? null,
      status: statusFromFootballData(match.status),
      a: home,
      b: away,
      aName: teamLabel(match.homeTeam),
      bName: teamLabel(match.awayTeam),
      source: "football-data" as const,
      sourceIds: { footballData: String(match.id) },
      warning,
      result: resultFromFootballData(match, id, round, home, away),
      liveState: liveStateFromFootballData(match, id),
    };
  });
  return { fixtures, warnings };
}

function openfootballTeam(value: unknown): ProviderTeam | string | null {
  if (!value) return null;
  if (typeof value === "string") return value;
  if (typeof value === "object") {
    const team = value as Record<string, unknown>;
    return {
      name: typeof team.name === "string" ? team.name : null,
      code: typeof team.code === "string" ? team.code : null,
    };
  }
  return null;
}

function scoreNumber(value: unknown) {
  return typeof value === "number" && Number.isFinite(value) ? value : null;
}

async function fetchOpenfootballFixtures(): Promise<{ fixtures: NormalizedFixture[]; warnings: AdapterWarning[] }> {
  const data = await fetchJson(matchDataConfig.openfootballFixturesUrl) as { rounds?: { name?: string; matches?: Record<string, unknown>[] }[] };
  const warnings: AdapterWarning[] = [];
  const fixtures: NormalizedFixture[] = [];
  for (const roundBlock of data.rounds ?? []) {
    const round = roundFromOpenfootball(roundBlock.name ?? "Unknown");
    for (const match of roundBlock.matches ?? []) {
      const num = String(match.num ?? match.id ?? fixtures.length + 1);
      const team1 = openfootballTeam(match.team1);
      const team2 = openfootballTeam(match.team2);
      const a = canonicalTeamId(team1);
      const b = canonicalTeamId(team2);
      const date = typeof match.date === "string" ? match.date : "2026-06-11";
      const time = typeof match.time === "string" ? match.time : "00:00";
      const kickoffAt = new Date(`${date}T${time}:00Z`).toISOString();
      const id = `of-${num}`;
      const warning = !a || !b ? unresolvedTeamWarning(team1, team2) : null;
      if (warning) warnings.push({ matchId: id, provider: "openfootball", message: warning });
      const sa = scoreNumber(match.score1);
      const sb = scoreNumber(match.score2);
      const result = a && b && sa != null && sb != null
        ? {
            matchId: id,
            round,
            a,
            b,
            sa,
            sb,
            win: sa === sb ? "draw" as const : sa > sb ? a : b,
            pens: null,
            source: "openfootball" as const,
            providerMatchId: num,
          }
        : null;
      fixtures.push({
        id,
        label: `Match ${num}`,
        round,
        date,
        time,
        kickoffAt,
        venue: typeof match.stadium === "string" ? match.stadium : null,
        status: result ? "finished" : "scheduled",
        a,
        b,
        aName: teamLabel(team1),
        bName: teamLabel(team2),
        group: null,
        source: "openfootball",
        sourceIds: { openfootball: num },
        warning,
        result,
      });
    }
  }
  return { fixtures, warnings };
}

function roundFromOpenfootball(name: string) {
  const lower = name.toLowerCase();
  if (lower.includes("group")) return "Group";
  if (lower.includes("round of 32") || lower.includes("last 32")) return "Round of 32";
  if (lower.includes("round of 16") || lower.includes("last 16")) return "Round of 16";
  if (lower.includes("quarter")) return "Quarter-final";
  if (lower.includes("semi")) return "Semi-final";
  if (lower.includes("third")) return "Third place";
  if (lower.includes("final")) return "Final";
  return name;
}

function tempFixtures(): NormalizedFixture[] {
  return TEMP_FIXTURES.map((fixture) => ({
    ...fixture,
    group: fixture.group ?? null,
    kickoffAt: new Date(`${fixture.date}T${fixture.time}:00Z`).toISOString(),
    venue: null,
    status: "scheduled",
    aName: fixture.a ?? "TBD",
    bName: fixture.b ?? "TBD",
    source: "temporary",
    sourceIds: {},
  }));
}

function sameFixtureTeams(fixture: NormalizedFixture, a: string | null, b: string | null) {
  if (!fixture.a || !fixture.b || !a || !b) return false;
  return (fixture.a === a && fixture.b === b) || (fixture.a === b && fixture.b === a);
}

function findFixtureForLive(fixtures: NormalizedFixture[], input: {
  apiFootballId?: string | null;
  a: string | null;
  b: string | null;
  kickoffAt?: string | null;
  round?: string | null;
}) {
  if (input.apiFootballId) {
    const byId = fixtures.find((fixture) => fixture.sourceIds.apiFootball === input.apiFootballId);
    if (byId) return byId;
  }
  const date = input.kickoffAt ? datePartsFromIso(input.kickoffAt).date : null;
  return fixtures.find((fixture) => {
    if (!sameFixtureTeams(fixture, input.a, input.b)) return false;
    if (date && fixture.date !== date) return false;
    return true;
  }) ?? null;
}

function apiFootballStatus(short?: string | null): NormalizedLiveState["status"] {
  if (!short) return "unknown";
  if (["1H", "2H", "ET", "BT", "P", "LIVE"].includes(short)) return "live";
  if (["HT", "INT"].includes(short)) return "paused";
  if (["FT", "AET", "PEN"].includes(short)) return "finished";
  return "unknown";
}

function crossCheckResults(primary: NormalizedFixture[], fallback: NormalizedFixture[]) {
  const byKey = new Map(fallback.map((fixture) => [fixtureKey(fixture.round, fixture.date, fixture.a, fixture.b), fixture.result]));
  const warnings: AdapterWarning[] = [];
  const blocked = new Set<string>();
  for (const fixture of primary) {
    if (!fixture.result) continue;
    const fallbackResult = byKey.get(fixtureKey(fixture.round, fixture.date, fixture.a, fixture.b));
    if (!fallbackResult) continue;
    const same = fallbackResult.sa === fixture.result.sa && fallbackResult.sb === fixture.result.sb && fallbackResult.win === fixture.result.win;
    if (!same) {
      blocked.add(fixture.id);
      warnings.push({
        matchId: fixture.id,
        provider: "reconciliation",
        message: `football-data result disagrees with openfootball (${fixture.result.sa}-${fixture.result.sb} vs ${fallbackResult.sa}-${fallbackResult.sb}). Manual review required.`,
      });
    }
  }
  return { blocked, warnings };
}

async function fetchApiFootballLive(fixtures: NormalizedFixture[]): Promise<{ liveState: NormalizedLiveState[]; warnings: AdapterWarning[] }> {
  if (!matchDataConfig.enableLiveLayer || !matchDataConfig.apiFootballApiKey) return { liveState: [], warnings: [] };
  const qs = new URLSearchParams({ live: "all", league: matchDataConfig.apiFootballLeagueId, season: matchDataConfig.apiFootballSeason });
  const data = await fetchJson(`${matchDataConfig.apiFootballBaseUrl}/fixtures?${qs}`, {
    headers: { "x-apisports-key": matchDataConfig.apiFootballApiKey },
  }) as { response?: ApiFootballFixture[] };
  const warnings: AdapterWarning[] = [];
  const liveState: NormalizedLiveState[] = [];
  for (const row of data.response ?? []) {
    const apiId = row.fixture?.id == null ? null : String(row.fixture.id);
    const a = canonicalTeamId(row.teams?.home);
    const b = canonicalTeamId(row.teams?.away);
    const fixture = findFixtureForLive(fixtures, {
      apiFootballId: apiId,
      a,
      b,
      kickoffAt: row.fixture?.date,
      round: row.league?.round ?? null,
    });
    if (!fixture) {
      const warning = unresolvedTeamWarning(row.teams?.home, row.teams?.away);
      warnings.push({
        provider: "api-football",
        message: warning ?? `Live match did not match a stored fixture: ${teamLabel(row.teams?.home)} / ${teamLabel(row.teams?.away)}`,
      });
      continue;
    }
    liveState.push({
      fixtureId: fixture.id,
      status: apiFootballStatus(row.fixture?.status?.short),
      minute: typeof row.fixture?.status?.elapsed === "number" ? row.fixture.status.elapsed : null,
      sa: scoreNumber(row.goals?.home),
      sb: scoreNumber(row.goals?.away),
      source: "api-football",
    });
  }
  return { liveState, warnings };
}

export async function getMatchAdapterState(options: { enableApiFootball?: boolean } = {}): Promise<MatchAdapterResult> {
  const warnings: AdapterWarning[] = [];
  let footballFixtures: NormalizedFixture[] = [];
  let openfootballFixtures: NormalizedFixture[] = [];
  let liveState: NormalizedLiveState[] = [];

  try {
    const result = await fetchFootballDataFixtures();
    footballFixtures = result.fixtures;
    warnings.push(...result.warnings);
  } catch (error) {
    warnings.push({ provider: "football-data", message: `Fetch failed: ${(error as Error).message}` });
  }

  try {
    const result = await fetchOpenfootballFixtures();
    openfootballFixtures = result.fixtures;
    warnings.push(...result.warnings);
  } catch (error) {
    warnings.push({ provider: "openfootball", message: `Fetch failed: ${(error as Error).message}` });
  }

  const fixtures = footballFixtures.length ? footballFixtures : openfootballFixtures.length ? openfootballFixtures : tempFixtures();
  if (matchDataConfig.requireCrossCheck && footballFixtures.length && openfootballFixtures.length) {
    const reconciliation = crossCheckResults(fixtures, openfootballFixtures);
    warnings.push(...reconciliation.warnings);
    for (const fixture of fixtures) {
      if (reconciliation.blocked.has(fixture.id)) {
        fixture.warning = fixture.warning ?? "Result requires manual review.";
        fixture.result = null;
      }
    }
  }
  liveState = fixtures.flatMap((fixture) => fixture.liveState ? [fixture.liveState] : []);

  if (options.enableApiFootball !== false) {
    try {
      const result = await fetchApiFootballLive(fixtures);
      liveState = result.liveState.length ? result.liveState : liveState;
      warnings.push(...result.warnings);
    } catch (error) {
      warnings.push({ provider: "api-football", message: `Fetch failed: ${(error as Error).message}` });
    }
  } else if (matchDataConfig.enableLiveLayer && matchDataConfig.apiFootballApiKey) {
    warnings.push({ provider: "api-football", message: "Daily live-score quota reached; live layer skipped until tomorrow." });
  }

  return {
    fixtures,
    liveState,
    warnings,
    providerConfigured: {
      footballData: Boolean(matchDataConfig.footballDataApiKey),
      apiFootball: Boolean(matchDataConfig.apiFootballApiKey && matchDataConfig.enableLiveLayer),
      openfootball: Boolean(matchDataConfig.openfootballFixturesUrl),
    },
  };
}
