// Temporary fixture source.
// Replace this module with the official fixtures provider once that account is ready.
export type FixtureGame = {
  id: string;
  date: string;
  time: string;
  kickoffAt?: string;
  a: string | null;
  b: string | null;
  aName?: string;
  bName?: string;
  round: string;
  group?: string | null;
  label: string;
  venue?: string | null;
  status?: "scheduled" | "live" | "finished" | "postponed" | "abandoned" | "unknown";
  source?: "football-data" | "openfootball" | "temporary";
  warning?: string | null;
};

export const TEMP_FIXTURES: FixtureGame[] = [
  { id: "m49", date: "2026-06-26", time: "18:00", a: "FRA", b: "COD", round: "Round of 16", label: "Match 49" },
  { id: "m50", date: "2026-06-26", time: "21:00", a: "ARG", b: "NOR", round: "Round of 16", label: "Match 50" },
  { id: "m51", date: "2026-06-27", time: "18:00", a: "ESP", b: "URU", round: "Round of 16", label: "Match 51" },
  { id: "m52", date: "2026-06-27", time: "21:00", a: "BRA", b: "HAI", round: "Round of 16", label: "Match 52" },
  { id: "m53", date: "2026-06-28", time: "18:00", a: "BEL", b: "UZB", round: "Round of 16", label: "Match 53" },
  { id: "m54", date: "2026-06-28", time: "21:00", a: "CPV", b: "KSA", round: "Round of 16", label: "Match 54" },
  { id: "m55", date: "2026-06-29", time: "18:00", a: "NED", b: "JPN", round: "Round of 16", label: "Match 55" },
  { id: "m56", date: "2026-06-29", time: "21:00", a: "MAR", b: "SCO", round: "Round of 16", label: "Match 56" },
];

export function shortRound(round: string) {
  if (round === "Group") return "Group";
  if (round === "Round of 16") return "R16";
  if (round === "Round of 32") return "R32";
  if (round === "Quarter-final") return "QF";
  if (round === "Semi-final") return "SF";
  if (round === "Third place") return "3rd";
  return round;
}

export function stageLabel(round: string) {
  if (round === "Group") return "Group stage";
  if (round === "Round of 32") return "Round of 32";
  if (round === "Round of 16") return "Round of 16";
  if (round === "Quarter-final") return "Quarter-final";
  if (round === "Semi-final") return "Semi-final";
  if (round === "Third place") return "Third place";
  if (round === "Final") return "Final";
  return round;
}

export function fixtureStageLabel(round: string, group?: string | null) {
  const stage = stageLabel(round);
  if (round === "Group" && group) return `${stage} · ${group}`;
  return stage;
}
