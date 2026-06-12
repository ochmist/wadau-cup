import { T } from "@/lib/data";

export type ProviderName = "football-data" | "api-football" | "openfootball";

export type ProviderTeam = {
  id?: string | number | null;
  name?: string | null;
  shortName?: string | null;
  tla?: string | null;
  code?: string | null;
};

const EXTRA_ALIASES: Record<string, string> = {
  "bosnia and herzegovina": "BIH",
  "cape verde": "CPV",
  "cabo verde": "CPV",
  "cape verde islands": "CPV",
  "congo dr": "COD",
  "congo d r": "COD",
  "dr congo": "COD",
  "democratic republic of congo": "COD",
  "cote divoire": "CIV",
  "cote d ivoire": "CIV",
  "côte d’ivoire": "CIV",
  "ivory coast": "CIV",
  "curacao": "CUW",
  "curaçao": "CUW",
  "czech republic": "CZE",
  "czechia": "CZE",
  "england": "ENG",
  "ir iran": "IRN",
  "iran": "IRN",
  "korea republic": "KOR",
  "republic of korea": "KOR",
  "south korea": "KOR",
  "netherlands": "NED",
  "the netherlands": "NED",
  "new zealand": "NZL",
  "paraguay": "PAR",
  "portugal": "POR",
  "qatar": "QAT",
  "saudi arabia": "KSA",
  "scotland": "SCO",
  "south africa": "RSA",
  "switzerland": "SUI",
  "turkiye": "TUR",
  "turkey": "TUR",
  "united states": "USA",
  "united states of america": "USA",
  "usa": "USA",
};

function normalize(value: string) {
  return value
    .normalize("NFKD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/&/g, " and ")
    .replace(/[^a-z0-9]+/gi, " ")
    .trim()
    .toLowerCase();
}

const aliasToCode = new Map<string, string>();

for (const [code, team] of Object.entries(T)) {
  aliasToCode.set(normalize(code), code);
  aliasToCode.set(normalize(team.n), code);
}

for (const [alias, code] of Object.entries(EXTRA_ALIASES)) {
  aliasToCode.set(normalize(alias), code);
}

export function isPlaceholderTeam(value: string | null | undefined) {
  if (!value) return true;
  const normalized = String(value).trim();
  return /^(w|l|runner-up|winner|group|tbd|to be decided|unknown)/i.test(normalized);
}

export function canonicalTeamId(team: ProviderTeam | string | null | undefined): string | null {
  if (!team) return null;
  const candidates = typeof team === "string"
    ? [team]
    : [team.tla, team.code, team.shortName, team.name, team.id == null ? null : String(team.id)];

  for (const candidate of candidates) {
    if (!candidate || isPlaceholderTeam(candidate)) continue;
    const direct = T[candidate.toUpperCase()] ? candidate.toUpperCase() : null;
    if (direct) return direct;
    const mapped = aliasToCode.get(normalize(candidate));
    if (mapped) return mapped;
  }

  return null;
}

export function teamLabel(team: ProviderTeam | string | null | undefined) {
  if (!team) return "TBD";
  if (typeof team === "string") return team;
  return team.name ?? team.shortName ?? team.tla ?? team.code ?? "TBD";
}
