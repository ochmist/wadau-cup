// Env constants shared by client and server — no SDK initialisation here.
export const POOL_ID = process.env.NEXT_PUBLIC_POOL_ID ?? "default";

// FIFA World Cup 2026 opening match: Thu 11 Jun 2026, 13:00 Mexico City.
// Stored in UTC so every client evaluates the same lock boundary.
export const WORLD_CUP_FIRST_KICKOFF_ISO = "2026-06-11T19:00:00.000Z";

export const matchDataConfig = {
  footballDataApiKey: process.env.FOOTBALL_DATA_API_KEY ?? "",
  footballDataBaseUrl: process.env.FOOTBALL_DATA_BASE_URL ?? "https://api.football-data.org/v4",
  footballDataCompetition: process.env.FOOTBALL_DATA_COMPETITION ?? "WC",
  openfootballFixturesUrl:
    process.env.OPENFOOTBALL_FIXTURES_URL ??
    "https://raw.githubusercontent.com/openfootball/worldcup.json/master/2026/worldcup.json",
  apiFootballApiKey: process.env.API_FOOTBALL_API_KEY ?? "",
  apiFootballBaseUrl: process.env.API_FOOTBALL_BASE_URL ?? "https://v3.football.api-sports.io",
  apiFootballLeagueId: process.env.API_FOOTBALL_LEAGUE_ID ?? "1",
  apiFootballSeason: process.env.API_FOOTBALL_SEASON ?? "2026",
  enableLiveLayer: process.env.ENABLE_LIVE_LAYER === "true",
  fullTimePollSeconds: Number(process.env.FULL_TIME_POLL_SECONDS ?? 75),
  livePollSeconds: Number(process.env.LIVE_POLL_SECONDS ?? 540),
  apiFootballDailyCap: Number(process.env.API_FOOTBALL_DAILY_CAP ?? 90),
  requireCrossCheck: process.env.REQUIRE_RESULT_CROSS_CHECK !== "false",
  syncCronSecret: process.env.SYNC_CRON_SECRET ?? "",
};
