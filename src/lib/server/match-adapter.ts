import { matchDataConfig } from "@/lib/config";
import { GROUPS, T } from "@/lib/data";
import { TEMP_FIXTURES, type FixtureGame } from "@/lib/fixtures";
import { canonicalTeamId, isPlaceholderTeam, teamLabel, type ProviderTeam } from "@/lib/team-aliases";
import type { FixtureDoc, MatchEventDoc, MatchLineupTeamDoc, MatchStatisticDoc, TeamProfileDoc } from "@/lib/types";

const MIN_COMPLETE_FIXTURE_COUNT = 64;

export type NormalizedStatus = "scheduled" | "live" | "finished" | "postponed" | "abandoned" | "unknown";

export type NormalizedFixture = FixtureGame & {
  id: string;
  kickoffAt: string;
  venue: string | null;
  status: NormalizedStatus;
  source: "football-data" | "api-football" | "openfootball" | "temporary";
  sourceIds: Partial<Record<"footballData" | "apiFootball" | "openfootball", string>>;
  warning?: string | null;
  events?: MatchEventDoc[];
  lineups?: MatchLineupTeamDoc[];
  statistics?: MatchStatisticDoc[];
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
  source: "football-data" | "api-football" | "openfootball";
  providerMatchId?: string;
};

export type NormalizedLiveState = {
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
};

export type AdapterWarning = {
  matchId?: string;
  provider: string;
  message: string;
};

export type MatchAdapterResult = {
  fixtures: NormalizedFixture[];
  liveState: NormalizedLiveState[];
  teamProfiles: TeamProfileDoc[];
  apiFootballCalls: number;
  warnings: AdapterWarning[];
  providerConfigured: {
    footballData: boolean;
    apiFootball: boolean;
    openfootball: boolean;
  };
};

export type StoredFixtureForSync = FixtureDoc & { id: string };

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
      long?: string;
      elapsed?: number | null;
      extra?: number | null;
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
  score?: {
    penalty?: { home?: number | null; away?: number | null };
  };
  venue?: {
    name?: string | null;
  };
};

type ApiFootballEvent = {
  time?: {
    elapsed?: number | null;
    extra?: number | null;
  };
  team?: ProviderTeam & { logo?: string | null };
  player?: {
    id?: number | null;
    name?: string | null;
  };
  assist?: {
    id?: number | null;
    name?: string | null;
  };
  type?: string | null;
  detail?: string | null;
  comments?: string | null;
};

type ApiFootballLineup = {
  team?: ProviderTeam & { logo?: string | null };
  coach?: {
    id?: number | null;
    name?: string | null;
  };
  formation?: string | null;
  startXI?: {
    player?: {
      id?: number | null;
      name?: string | null;
      number?: number | null;
      pos?: string | null;
      grid?: string | null;
    };
  }[];
  substitutes?: {
    player?: {
      id?: number | null;
      name?: string | null;
      number?: number | null;
      pos?: string | null;
      grid?: string | null;
    };
  }[];
};

type ApiFootballStatistic = {
  team?: ProviderTeam & { logo?: string | null };
  statistics?: {
    type?: string | null;
    value?: string | number | null;
  }[];
};

type ApiFootballProceedings = {
  events: MatchEventDoc[];
  lineups: MatchLineupTeamDoc[];
  statistics: MatchStatisticDoc[];
};

type ApiFootballSquad = {
  team?: ProviderTeam & { logo?: string | null };
  players?: {
    id?: number | null;
    name?: string | null;
    age?: number | null;
    number?: number | null;
    position?: string | null;
    photo?: string | null;
  }[];
};

type ApiFootballCoach = {
  id?: number | null;
  name?: string | null;
  nationality?: string | null;
  photo?: string | null;
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

function providerErrorMessage(errors: unknown): string | null {
  if (!errors) return null;
  if (typeof errors === "string") return errors.trim() || null;
  if (Array.isArray(errors)) {
    const messages = errors.map(providerErrorMessage).filter((message): message is string => Boolean(message));
    return messages.length ? messages.join("; ") : null;
  }
  if (typeof errors === "object") {
    const entries = Object.entries(errors as Record<string, unknown>);
    if (!entries.length) return null;
    return entries
      .map(([key, value]) => {
        const message = providerErrorMessage(value);
        return message ? `${key}: ${message}` : key;
      })
      .join("; ");
  }
  return String(errors);
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

function eventKind(value?: string | null): MatchEventDoc["type"] {
  const normalized = (value ?? "").toLowerCase();
  if (normalized === "goal") return "goal";
  if (normalized === "card") return "card";
  if (normalized === "subst") return "substitution";
  if (normalized === "var") return "var";
  return "other";
}

function normalizedEventId(event: ApiFootballEvent, index: number) {
  return [
    event.time?.elapsed ?? "m",
    event.time?.extra ?? "x",
    event.team?.id ?? event.team?.name ?? "team",
    event.player?.id ?? event.player?.name ?? "player",
    event.type ?? "event",
    event.detail ?? "detail",
    index,
  ].join("-");
}

function normalizeApiFootballEvents(events: ApiFootballEvent[]): MatchEventDoc[] {
  return events.map((event, index) => ({
    id: normalizedEventId(event, index),
    team: canonicalTeamId(event.team),
    teamName: teamLabel(event.team),
    minute: scoreNumber(event.time?.elapsed),
    extra: scoreNumber(event.time?.extra),
    player: event.player?.name ?? null,
    assist: event.assist?.name ?? null,
    type: eventKind(event.type),
    detail: event.detail ?? null,
    comments: event.comments ?? null,
  }));
}

function normalizeLineupPlayer(input: NonNullable<ApiFootballLineup["startXI"]>[number], fallbackIndex: number) {
  const player = input.player;
  return {
    id: player?.id == null ? `${player?.name ?? "player"}-${fallbackIndex}` : String(player.id),
    name: player?.name ?? "Unknown player",
    number: scoreNumber(player?.number),
    position: player?.pos ?? null,
    grid: player?.grid ?? null,
  };
}

function normalizeApiFootballLineups(lineups: ApiFootballLineup[]): MatchLineupTeamDoc[] {
  return lineups.map((lineup) => ({
    team: canonicalTeamId(lineup.team),
    teamName: teamLabel(lineup.team),
    formation: lineup.formation ?? null,
    coach: lineup.coach?.name ?? null,
    startXI: (lineup.startXI ?? []).map(normalizeLineupPlayer),
    substitutes: (lineup.substitutes ?? []).map(normalizeLineupPlayer),
  }));
}

function normalizeApiFootballStatistics(rows: ApiFootballStatistic[]): MatchStatisticDoc[] {
  return rows.flatMap((row) => {
    const team = canonicalTeamId(row.team);
    const teamName = teamLabel(row.team);
    return (row.statistics ?? [])
      .filter((stat) => stat.type)
      .map((stat) => ({
        team,
        teamName,
        type: stat.type ?? "Unknown",
        value: stat.value ?? null,
      }));
  });
}

function apiFootballTeamRefs(fixtures: ApiFootballFixture[]) {
  const refs = new Map<string, { code: string; providerTeamId: string; name: string; logo: string | null }>();
  for (const row of fixtures) {
    for (const team of [row.teams?.home, row.teams?.away]) {
      const code = canonicalTeamId(team);
      const id = team?.id == null ? null : String(team.id);
      if (!code || !id || refs.has(code)) continue;
      refs.set(code, {
        code,
        providerTeamId: id,
        name: teamLabel(team),
        logo: team && "logo" in team && typeof team.logo === "string" ? team.logo : null,
      });
    }
  }
  return Array.from(refs.values());
}

async function fetchApiFootballProceedings(fixtureId: string): Promise<{
  events: MatchEventDoc[];
  lineups: MatchLineupTeamDoc[];
  statistics: MatchStatisticDoc[];
  warnings: AdapterWarning[];
  calls: number;
}> {
  const headers = { "x-apisports-key": matchDataConfig.apiFootballApiKey };
  const qs = new URLSearchParams({ fixture: fixtureId });
  const [eventResult, lineupResult, statisticsResult] = await Promise.allSettled([
    fetchJson(`${matchDataConfig.apiFootballBaseUrl}/fixtures/events?${qs}`, { headers }) as Promise<{ response?: ApiFootballEvent[]; errors?: unknown }>,
    fetchJson(`${matchDataConfig.apiFootballBaseUrl}/fixtures/lineups?${qs}`, { headers }) as Promise<{ response?: ApiFootballLineup[]; errors?: unknown }>,
    fetchJson(`${matchDataConfig.apiFootballBaseUrl}/fixtures/statistics?${qs}`, { headers }) as Promise<{ response?: ApiFootballStatistic[]; errors?: unknown }>,
  ]);
  const warnings: AdapterWarning[] = [];
  let events: MatchEventDoc[] = [];
  let lineups: MatchLineupTeamDoc[] = [];
  let statistics: MatchStatisticDoc[] = [];

  if (eventResult.status === "fulfilled") {
    const providerError = providerErrorMessage(eventResult.value.errors);
    if (providerError) warnings.push({ provider: "api-football", matchId: `af-${fixtureId}`, message: providerError });
    events = normalizeApiFootballEvents(eventResult.value.response ?? []);
  } else {
    warnings.push({ provider: "api-football", matchId: `af-${fixtureId}`, message: `Events fetch failed: ${eventResult.reason instanceof Error ? eventResult.reason.message : String(eventResult.reason)}` });
  }

  if (lineupResult.status === "fulfilled") {
    const providerError = providerErrorMessage(lineupResult.value.errors);
    if (providerError) warnings.push({ provider: "api-football", matchId: `af-${fixtureId}`, message: providerError });
    lineups = normalizeApiFootballLineups(lineupResult.value.response ?? []);
  } else {
    warnings.push({ provider: "api-football", matchId: `af-${fixtureId}`, message: `Lineups fetch failed: ${lineupResult.reason instanceof Error ? lineupResult.reason.message : String(lineupResult.reason)}` });
  }

  if (statisticsResult.status === "fulfilled") {
    const providerError = providerErrorMessage(statisticsResult.value.errors);
    if (providerError) warnings.push({ provider: "api-football", matchId: `af-${fixtureId}`, message: providerError });
    statistics = normalizeApiFootballStatistics(statisticsResult.value.response ?? []);
  } else {
    warnings.push({ provider: "api-football", matchId: `af-${fixtureId}`, message: `Statistics fetch failed: ${statisticsResult.reason instanceof Error ? statisticsResult.reason.message : String(statisticsResult.reason)}` });
  }

  return { events, lineups, statistics, warnings, calls: 3 };
}

async function fetchApiFootballTeamProfile(input: {
  code: string;
  providerTeamId: string;
  name: string;
  logo: string | null;
}): Promise<{ profile: TeamProfileDoc; warnings: AdapterWarning[]; calls: number }> {
  const headers = { "x-apisports-key": matchDataConfig.apiFootballApiKey };
  const [squadData, coachData] = await Promise.all([
    fetchJson(`${matchDataConfig.apiFootballBaseUrl}/players/squads?${new URLSearchParams({ team: input.providerTeamId })}`, { headers }) as Promise<{ response?: ApiFootballSquad[]; errors?: unknown }>,
    fetchJson(`${matchDataConfig.apiFootballBaseUrl}/coachs?${new URLSearchParams({ team: input.providerTeamId })}`, { headers }) as Promise<{ response?: ApiFootballCoach[]; errors?: unknown }>,
  ]);
  const warnings: AdapterWarning[] = [];
  const squadError = providerErrorMessage(squadData.errors);
  const coachError = providerErrorMessage(coachData.errors);
  if (squadError) warnings.push({ provider: "api-football", message: `${input.code} squad: ${squadError}` });
  if (coachError) warnings.push({ provider: "api-football", message: `${input.code} coach: ${coachError}` });
  const squad = squadData.response?.[0];
  const coach = coachData.response?.[0];
  const team = T[input.code];
  return {
    warnings,
    calls: 2,
    profile: {
      code: input.code,
      name: team?.n ?? input.name,
      flag: team?.f ?? "🏳",
      tier: team?.t ?? "F",
      group: GROUPS[input.code] ?? null,
      providerTeamId: input.providerTeamId,
      logo: squad?.team?.logo ?? input.logo,
      coach: coach?.id == null && !coach?.name
        ? null
        : {
            id: coach?.id == null ? "" : String(coach.id),
            name: coach?.name ?? "Unknown coach",
            nationality: coach?.nationality ?? null,
            photo: coach?.photo ?? null,
          },
      players: (squad?.players ?? []).map((player) => ({
        id: player.id == null ? player.name ?? "" : String(player.id),
        name: player.name ?? "Unknown player",
        age: scoreNumber(player.age),
        number: scoreNumber(player.number),
        position: player.position ?? null,
        photo: player.photo ?? null,
      })),
    },
  };
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

function statusFromApiFootball(short?: string | null): NormalizedStatus {
  if (!short) return "unknown";
  if (["NS", "TBD"].includes(short)) return "scheduled";
  if (["1H", "2H", "ET", "BT", "P", "LIVE", "HT", "INT"].includes(short)) return "live";
  if (["FT", "AET", "PEN"].includes(short)) return "finished";
  if (["PST"].includes(short)) return "postponed";
  if (["SUSP", "CANC", "ABD", "AWD", "WO"].includes(short)) return "abandoned";
  return "unknown";
}

function roundFromApiFootball(value?: string | null) {
  const lower = (value ?? "").toLowerCase();
  if (lower.includes("group")) return "Group";
  if (lower.includes("32")) return "Round of 32";
  if (lower.includes("16")) return "Round of 16";
  if (lower.includes("quarter")) return "Quarter-final";
  if (lower.includes("semi")) return "Semi-final";
  if (lower.includes("third")) return "Third place";
  if (lower.includes("final")) return "Final";
  return value ?? "Unknown";
}

function liveStateFromApiFootball(row: ApiFootballFixture, fixtureId: string, proceedings: Partial<ApiFootballProceedings> = {}): NormalizedLiveState | null {
  const status = apiFootballStatus(row.fixture?.status?.short);
  if (status !== "live" && status !== "paused") return null;
  return {
    fixtureId,
    status,
    statusShort: row.fixture?.status?.short ?? null,
    statusLong: row.fixture?.status?.long ?? null,
    minute: typeof row.fixture?.status?.elapsed === "number" ? row.fixture.status.elapsed : null,
    extra: typeof row.fixture?.status?.extra === "number" ? row.fixture.status.extra : null,
    sa: scoreNumber(row.goals?.home),
    sb: scoreNumber(row.goals?.away),
    source: "api-football",
    events: proceedings.events ?? [],
    lineups: proceedings.lineups ?? [],
    statistics: proceedings.statistics ?? [],
  };
}

function resultFromApiFootball(row: ApiFootballFixture, fixtureId: string, round: string, a: string | null, b: string | null): NormalizedResult | null {
  if (!a || !b || statusFromApiFootball(row.fixture?.status?.short) !== "finished") return null;
  const sa = scoreNumber(row.goals?.home);
  const sb = scoreNumber(row.goals?.away);
  if (sa == null || sb == null) return null;
  const penaltyHome = scoreNumber(row.score?.penalty?.home);
  const penaltyAway = scoreNumber(row.score?.penalty?.away);
  const win = sa === sb && penaltyHome != null && penaltyAway != null
    ? penaltyHome === penaltyAway ? "draw" : penaltyHome > penaltyAway ? a : b
    : sa === sb ? "draw" : sa > sb ? a : b;
  return {
    matchId: fixtureId,
    round,
    a,
    b,
    sa,
    sb,
    win,
    pens: penaltyHome != null && penaltyAway != null ? `${penaltyHome}-${penaltyAway}` : null,
    source: "api-football",
    providerMatchId: row.fixture?.id == null ? undefined : String(row.fixture.id),
  };
}

async function fetchApiFootballFixtures(options: { includeTeamProfiles?: boolean } = {}): Promise<{
  fixtures: NormalizedFixture[];
  teamProfiles: TeamProfileDoc[];
  warnings: AdapterWarning[];
  calls: number;
}> {
  if (!matchDataConfig.enableLiveLayer || !matchDataConfig.apiFootballApiKey) {
    return { fixtures: [], teamProfiles: [], warnings: [], calls: 0 };
  }
  const qs = new URLSearchParams({ league: matchDataConfig.apiFootballLeagueId, season: matchDataConfig.apiFootballSeason });
  const data = await fetchJson(`${matchDataConfig.apiFootballBaseUrl}/fixtures?${qs}`, {
    headers: { "x-apisports-key": matchDataConfig.apiFootballApiKey },
  }) as { response?: ApiFootballFixture[]; errors?: unknown };
  const warnings: AdapterWarning[] = [];
  let calls = 1;
  const providerError = providerErrorMessage(data.errors);
  if (providerError) warnings.push({ provider: "api-football", message: providerError });

  const response = data.response ?? [];
  const fixtures: NormalizedFixture[] = [];
  for (const [index, row] of response.entries()) {
    const apiId = row.fixture?.id == null ? String(index + 1) : String(row.fixture.id);
    const id = `af-${apiId}`;
    const round = roundFromApiFootball(row.league?.round);
    const home = canonicalTeamId(row.teams?.home);
    const away = canonicalTeamId(row.teams?.away);
    const kickoffAt = row.fixture?.date ?? "2026-06-11T00:00:00Z";
    const { date, time } = datePartsFromIso(kickoffAt);
    const warning = !home || !away ? unresolvedTeamWarning(row.teams?.home, row.teams?.away) : null;
    if (warning) warnings.push({ matchId: id, provider: "api-football", message: warning });
    let proceedings: ApiFootballProceedings = { events: [], lineups: [], statistics: [] };
    if (["live", "finished"].includes(statusFromApiFootball(row.fixture?.status?.short)) && row.fixture?.id != null) {
      try {
        const result = await fetchApiFootballProceedings(apiId);
        proceedings = { events: result.events, lineups: result.lineups, statistics: result.statistics };
        calls += result.calls;
        warnings.push(...result.warnings);
      } catch (error) {
        warnings.push({ matchId: id, provider: "api-football", message: `Proceedings fetch failed: ${(error as Error).message}` });
      }
    }
    fixtures.push({
      id,
      label: `Match ${apiId}`,
      round,
      group: null,
      date,
      time,
      kickoffAt,
      venue: row.venue?.name ?? null,
      status: statusFromApiFootball(row.fixture?.status?.short),
      a: home,
      b: away,
      aName: teamLabel(row.teams?.home),
      bName: teamLabel(row.teams?.away),
      source: "api-football" as const,
      sourceIds: { apiFootball: apiId },
      warning,
      events: proceedings.events,
      lineups: proceedings.lineups,
      statistics: proceedings.statistics,
      result: resultFromApiFootball(row, id, round, home, away),
      liveState: liveStateFromApiFootball(row, id, proceedings),
    });
  }

  const teamProfiles: TeamProfileDoc[] = [];
  if (options.includeTeamProfiles) {
    for (const ref of apiFootballTeamRefs(response)) {
      try {
        const result = await fetchApiFootballTeamProfile(ref);
        teamProfiles.push(result.profile);
        calls += result.calls;
        warnings.push(...result.warnings);
      } catch (error) {
        warnings.push({ provider: "api-football", message: `${ref.code} profile fetch failed: ${(error as Error).message}` });
      }
    }
  }

  return { fixtures, teamProfiles, warnings, calls };
}

function mergeApiFootballFixtures(primary: NormalizedFixture[], apiFixtures: NormalizedFixture[]) {
  if (!primary.length) return apiFixtures;
  if (!apiFixtures.length) return primary;
  const used = new Set<string>();
  return primary.map((fixture) => {
    const apiFixture = apiFixtures.find((candidate) => !used.has(candidate.id) && sameFixtureTeams(fixture, candidate.a, candidate.b) && fixture.date === candidate.date);
    if (!apiFixture) return fixture;
    used.add(apiFixture.id);
    const apiStatus = apiFixture.status;
    const shouldTrustApiStatus = apiStatus === "live" || apiStatus === "finished";
    return {
      ...fixture,
      status: shouldTrustApiStatus ? apiStatus : fixture.status,
      sourceIds: { ...fixture.sourceIds, apiFootball: apiFixture.sourceIds.apiFootball },
      result: fixture.result ?? apiFixture.result,
      liveState: apiFixture.liveState ?? fixture.liveState,
      events: apiFixture.events?.length ? apiFixture.events : fixture.events,
      lineups: apiFixture.lineups?.length ? apiFixture.lineups : fixture.lineups,
      statistics: apiFixture.statistics?.length ? apiFixture.statistics : fixture.statistics,
      venue: fixture.venue ?? apiFixture.venue,
    };
  });
}

function normalizeStoredFixture(fixture: StoredFixtureForSync): NormalizedFixture {
  return {
    id: fixture.id,
    label: fixture.label,
    round: fixture.round,
    group: fixture.group ?? null,
    date: fixture.date,
    time: fixture.time,
    kickoffAt: fixture.kickoffAt,
    venue: fixture.venue ?? null,
    status: fixture.status,
    a: fixture.a ?? null,
    b: fixture.b ?? null,
    aName: fixture.aName,
    bName: fixture.bName,
    source: fixture.source,
    sourceIds: fixture.sourceIds ?? {},
    warning: fixture.warning ?? null,
    events: fixture.events ?? [],
    lineups: fixture.lineups ?? [],
    statistics: fixture.statistics ?? [],
  };
}

function shouldPollStoredFixture(fixture: StoredFixtureForSync, resultIds: Set<string>, now = Date.now()) {
  if (!fixture.sourceIds?.apiFootball) return false;
  if (fixture.status === "live") return true;
  if (!resultIds.has(fixture.id)) {
    const kickoff = Date.parse(fixture.kickoffAt);
    if (!Number.isNaN(kickoff) && now >= kickoff - 20 * 60 * 1000 && now <= kickoff + 36 * 60 * 60 * 1000) {
      return true;
    }
  }
  return false;
}

function normalizedApiFootballFixtureForStored(
  stored: StoredFixtureForSync,
  row: ApiFootballFixture,
  proceedings: ApiFootballProceedings,
): NormalizedFixture {
  const round = roundFromApiFootball(row.league?.round);
  const home = canonicalTeamId(row.teams?.home);
  const away = canonicalTeamId(row.teams?.away);
  const kickoffAt = row.fixture?.date ?? stored.kickoffAt;
  const { date, time } = datePartsFromIso(kickoffAt);
  const warning = !home || !away ? unresolvedTeamWarning(row.teams?.home, row.teams?.away) : null;
  const next: NormalizedFixture = {
    ...normalizeStoredFixture(stored),
    round: round === "Unknown" ? stored.round : round,
    date,
    time,
    kickoffAt,
    venue: row.venue?.name ?? stored.venue ?? null,
    status: statusFromApiFootball(row.fixture?.status?.short),
    a: home ?? stored.a ?? null,
    b: away ?? stored.b ?? null,
    aName: home ? teamLabel(row.teams?.home) : stored.aName,
    bName: away ? teamLabel(row.teams?.away) : stored.bName,
    source: "api-football",
    sourceIds: { ...stored.sourceIds, apiFootball: row.fixture?.id == null ? stored.sourceIds?.apiFootball : String(row.fixture.id) },
    warning,
    events: proceedings.events,
    lineups: proceedings.lineups,
    statistics: proceedings.statistics,
  };
  next.result = resultFromApiFootball(row, stored.id, next.round, next.a, next.b);
  next.liveState = liveStateFromApiFootball(row, stored.id, proceedings);
  return next;
}

async function fetchApiFootballFixtureById(stored: StoredFixtureForSync): Promise<{
  fixture: NormalizedFixture | null;
  warnings: AdapterWarning[];
  calls: number;
}> {
  const apiId = stored.sourceIds?.apiFootball;
  if (!apiId) return { fixture: null, warnings: [], calls: 0 };
  const headers = { "x-apisports-key": matchDataConfig.apiFootballApiKey };
  const data = await fetchJson(`${matchDataConfig.apiFootballBaseUrl}/fixtures?${new URLSearchParams({ id: apiId })}`, {
    headers,
  }) as { response?: ApiFootballFixture[]; errors?: unknown };
  const warnings: AdapterWarning[] = [];
  let calls = 1;
  const providerError = providerErrorMessage(data.errors);
  if (providerError) warnings.push({ provider: "api-football", matchId: stored.id, message: providerError });
  const row = data.response?.[0];
  if (!row) {
    warnings.push({ provider: "api-football", matchId: stored.id, message: `No fixture returned for API-Football id ${apiId}.` });
    return { fixture: null, warnings, calls };
  }

  let proceedings: ApiFootballProceedings = { events: [], lineups: [], statistics: [] };
  if (["live", "finished"].includes(statusFromApiFootball(row.fixture?.status?.short))) {
    try {
      const result = await fetchApiFootballProceedings(apiId);
      proceedings = { events: result.events, lineups: result.lineups, statistics: result.statistics };
      calls += result.calls;
      warnings.push(...result.warnings);
    } catch (error) {
      warnings.push({ provider: "api-football", matchId: stored.id, message: `Proceedings fetch failed: ${(error as Error).message}` });
    }
  }

  const fixture = normalizedApiFootballFixtureForStored(stored, row, proceedings);
  return { fixture, warnings, calls };
}

export async function getKnownFixtureUpdates(input: {
  fixtures: StoredFixtureForSync[];
  resultIds: Set<string>;
  now?: number;
}): Promise<MatchAdapterResult> {
  const warnings: AdapterWarning[] = [];
  let apiFootballCalls = 0;
  const fixtures: NormalizedFixture[] = [];
  const teamProfiles: TeamProfileDoc[] = [];

  if (!matchDataConfig.enableLiveLayer || !matchDataConfig.apiFootballApiKey) {
    return {
      fixtures,
      liveState: [],
      teamProfiles,
      apiFootballCalls,
      warnings: [{ provider: "api-football", message: "Live layer is not configured." }],
      providerConfigured: {
        footballData: Boolean(matchDataConfig.footballDataApiKey),
        apiFootball: Boolean(matchDataConfig.apiFootballApiKey && matchDataConfig.enableLiveLayer),
        openfootball: Boolean(matchDataConfig.openfootballFixturesUrl),
      },
    };
  }

  const targets = input.fixtures.filter((fixture) => shouldPollStoredFixture(fixture, input.resultIds, input.now));
  for (const target of targets) {
    try {
      const result = await fetchApiFootballFixtureById(target);
      apiFootballCalls += result.calls;
      warnings.push(...result.warnings);
      if (result.fixture) fixtures.push(result.fixture);
    } catch (error) {
      warnings.push({ provider: "api-football", matchId: target.id, message: `Known fixture poll failed: ${(error as Error).message}` });
    }
  }

  return {
    fixtures,
    liveState: fixtures.flatMap((fixture) => fixture.liveState ? [fixture.liveState] : []),
    teamProfiles,
    apiFootballCalls,
    warnings,
    providerConfigured: {
      footballData: Boolean(matchDataConfig.footballDataApiKey),
      apiFootball: Boolean(matchDataConfig.apiFootballApiKey && matchDataConfig.enableLiveLayer),
      openfootball: Boolean(matchDataConfig.openfootballFixturesUrl),
    },
  };
}

function chooseCanonicalFixtures(input: {
  footballFixtures: NormalizedFixture[];
  apiFootballFixtures: NormalizedFixture[];
  openfootballFixtures: NormalizedFixture[];
}) {
  const { footballFixtures, apiFootballFixtures, openfootballFixtures } = input;
  if (footballFixtures.length) return mergeApiFootballFixtures(footballFixtures, apiFootballFixtures);
  if (openfootballFixtures.length) return mergeApiFootballFixtures(openfootballFixtures, apiFootballFixtures);
  if (apiFootballFixtures.length >= MIN_COMPLETE_FIXTURE_COUNT) return apiFootballFixtures;
  if (apiFootballFixtures.length) return apiFootballFixtures;
  return tempFixtures();
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

async function fetchApiFootballLive(fixtures: NormalizedFixture[]): Promise<{ liveState: NormalizedLiveState[]; warnings: AdapterWarning[]; calls: number }> {
  if (!matchDataConfig.enableLiveLayer || !matchDataConfig.apiFootballApiKey) return { liveState: [], warnings: [], calls: 0 };
  const qs = new URLSearchParams({ live: "all", league: matchDataConfig.apiFootballLeagueId, season: matchDataConfig.apiFootballSeason });
  const data = await fetchJson(`${matchDataConfig.apiFootballBaseUrl}/fixtures?${qs}`, {
    headers: { "x-apisports-key": matchDataConfig.apiFootballApiKey },
  }) as { response?: ApiFootballFixture[]; errors?: unknown };
  const warnings: AdapterWarning[] = [];
  let calls = 1;
  const providerError = providerErrorMessage(data.errors);
  if (providerError) {
    warnings.push({ provider: "api-football", message: providerError });
  }
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
    let proceedings: ApiFootballProceedings = { events: [], lineups: [], statistics: [] };
    if (apiId) {
      try {
        const result = await fetchApiFootballProceedings(apiId);
        proceedings = { events: result.events, lineups: result.lineups, statistics: result.statistics };
        calls += result.calls;
        warnings.push(...result.warnings);
      } catch (error) {
        warnings.push({ provider: "api-football", matchId: fixture.id, message: `Live proceedings fetch failed: ${(error as Error).message}` });
      }
    }
    liveState.push({
      fixtureId: fixture.id,
      status: apiFootballStatus(row.fixture?.status?.short),
      statusShort: row.fixture?.status?.short ?? null,
      statusLong: row.fixture?.status?.long ?? null,
      minute: typeof row.fixture?.status?.elapsed === "number" ? row.fixture.status.elapsed : null,
      extra: typeof row.fixture?.status?.extra === "number" ? row.fixture.status.extra : null,
      sa: scoreNumber(row.goals?.home),
      sb: scoreNumber(row.goals?.away),
      source: "api-football",
      events: proceedings.events,
      lineups: proceedings.lineups,
      statistics: proceedings.statistics,
    });
  }
  return { liveState, warnings, calls };
}

export async function getMatchAdapterState(options: { enableApiFootball?: boolean; enableApiFootballFixtures?: boolean } = {}): Promise<MatchAdapterResult> {
  const warnings: AdapterWarning[] = [];
  let footballFixtures: NormalizedFixture[] = [];
  let apiFootballFixtures: NormalizedFixture[] = [];
  let openfootballFixtures: NormalizedFixture[] = [];
  let teamProfiles: TeamProfileDoc[] = [];
  let liveState: NormalizedLiveState[] = [];
  let apiFootballCalls = 0;

  try {
    const result = await fetchFootballDataFixtures();
    footballFixtures = result.fixtures;
    warnings.push(...result.warnings);
  } catch (error) {
    warnings.push({ provider: "football-data", message: `Fetch failed: ${(error as Error).message}` });
  }

  if (options.enableApiFootball !== false && options.enableApiFootballFixtures !== false) {
    try {
      const result = await fetchApiFootballFixtures({ includeTeamProfiles: true });
      apiFootballFixtures = result.fixtures;
      teamProfiles = result.teamProfiles;
      apiFootballCalls += result.calls;
      warnings.push(...result.warnings);
    } catch (error) {
      warnings.push({ provider: "api-football", message: `Fixture fetch failed: ${(error as Error).message}` });
    }
  }

  try {
    const result = await fetchOpenfootballFixtures();
    openfootballFixtures = result.fixtures;
    warnings.push(...result.warnings);
  } catch (error) {
    warnings.push({ provider: "openfootball", message: `Fetch failed: ${(error as Error).message}` });
  }

  const fixtures = chooseCanonicalFixtures({ footballFixtures, apiFootballFixtures, openfootballFixtures });
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
      apiFootballCalls += result.calls;
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
    teamProfiles,
    apiFootballCalls,
    warnings,
    providerConfigured: {
      footballData: Boolean(matchDataConfig.footballDataApiKey),
      apiFootball: Boolean(matchDataConfig.apiFootballApiKey && matchDataConfig.enableLiveLayer),
      openfootball: Boolean(matchDataConfig.openfootballFixturesUrl),
    },
  };
}
