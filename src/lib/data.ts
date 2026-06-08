/* Wadau Cup — shared sample data for the leaderboard system.
   Ported from the design handoff (wadau-data.js). Numbers are illustrative of a
   tournament mid-Round-of-16. In production, replace this module with API calls;
   points / ceiling / rank / mover / payout are all DERIVED below. */

export type Tier = "A" | "B" | "C" | "D" | "E" | "F";

export type TeamInfo = { n: string; f: string; t: Tier };

// Team dictionary: code -> { n: name, f: flag emoji, t: tier }
export const T: Record<string, TeamInfo> = {
  FRA: { n: "France", f: "🇫🇷", t: "A" },
  ESP: { n: "Spain", f: "🇪🇸", t: "A" },
  ARG: { n: "Argentina", f: "🇦🇷", t: "A" },
  ENG: { n: "England", f: "🏴󠁧󠁢󠁥󠁮󠁧󠁿", t: "A" },
  POR: { n: "Portugal", f: "🇵🇹", t: "A" },
  BRA: { n: "Brazil", f: "🇧🇷", t: "A" },
  NED: { n: "Netherlands", f: "🇳🇱", t: "A" },
  GER: { n: "Germany", f: "🇩🇪", t: "A" },
  BEL: { n: "Belgium", f: "🇧🇪", t: "B" },
  MAR: { n: "Morocco", f: "🇲🇦", t: "B" },
  CRO: { n: "Croatia", f: "🇭🇷", t: "B" },
  COL: { n: "Colombia", f: "🇨🇴", t: "B" },
  SEN: { n: "Senegal", f: "🇸🇳", t: "B" },
  MEX: { n: "Mexico", f: "🇲🇽", t: "B" },
  SUI: { n: "Switzerland", f: "🇨🇭", t: "B" },
  URU: { n: "Uruguay", f: "🇺🇾", t: "B" },
  JPN: { n: "Japan", f: "🇯🇵", t: "C" },
  USA: { n: "USA", f: "🇺🇸", t: "C" },
  IRN: { n: "Iran", f: "🇮🇷", t: "C" },
  TUR: { n: "Türkiye", f: "🇹🇷", t: "C" },
  ECU: { n: "Ecuador", f: "🇪🇨", t: "C" },
  AUT: { n: "Austria", f: "🇦🇹", t: "C" },
  KOR: { n: "South Korea", f: "🇰🇷", t: "C" },
  AUS: { n: "Australia", f: "🇦🇺", t: "C" },
  ALG: { n: "Algeria", f: "🇩🇿", t: "D" },
  EGY: { n: "Egypt", f: "🇪🇬", t: "D" },
  CAN: { n: "Canada", f: "🇨🇦", t: "D" },
  NOR: { n: "Norway", f: "🇳🇴", t: "D" },
  PAN: { n: "Panama", f: "🇵🇦", t: "D" },
  CIV: { n: "Côte d'Ivoire", f: "🇨🇮", t: "D" },
  SWE: { n: "Sweden", f: "🇸🇪", t: "D" },
  PAR: { n: "Paraguay", f: "🇵🇾", t: "D" },
  CZE: { n: "Czechia", f: "🇨🇿", t: "E" },
  SCO: { n: "Scotland", f: "🏴󠁧󠁢󠁳󠁣󠁴󠁿", t: "E" },
  TUN: { n: "Tunisia", f: "🇹🇳", t: "E" },
  COD: { n: "DR Congo", f: "🇨🇩", t: "E" },
  UZB: { n: "Uzbekistan", f: "🇺🇿", t: "E" },
  QAT: { n: "Qatar", f: "🇶🇦", t: "E" },
  IRQ: { n: "Iraq", f: "🇮🇶", t: "E" },
  RSA: { n: "South Africa", f: "🇿🇦", t: "E" },
  KSA: { n: "Saudi Arabia", f: "🇸🇦", t: "F" },
  BIH: { n: "Bosnia", f: "🇧🇦", t: "F" },
  CPV: { n: "Cabo Verde", f: "🇨🇻", t: "F" },
  GHA: { n: "Ghana", f: "🇬🇭", t: "F" },
  CUW: { n: "Curaçao", f: "🇨🇼", t: "F" },
  HAI: { n: "Haiti", f: "🇭🇹", t: "F" },
  NZL: { n: "New Zealand", f: "🇳🇿", t: "F" },
  JOR: { n: "Jordan", f: "🇯🇴", t: "F" },
};

// [code, ptsEarned, remaining(maxStillEarnable), alive]
type Pick = [string, number, number, number];

type RawPlayer = {
  name: string;
  short: string;
  prev: number;
  paid: boolean;
  me: boolean;
  finalGoals: number;
  picks: Pick[];
};

const RAW: RawPlayer[] = [
  { name: "Wanjiru", short: "WN", prev: 2, paid: true, me: false, finalGoals: 3, picks: [["FRA", 8, 10, 1], ["MAR", 6, 6, 1], ["JPN", 5, 5, 1], ["EGY", 4, 0, 0], ["CZE", 4, 4, 1], ["GHA", 4, 5, 1]] },
  { name: "Brayo", short: "BR", prev: 1, paid: true, me: true, finalGoals: 2, picks: [["ESP", 9, 10, 1], ["BEL", 7, 7, 1], ["USA", 4, 0, 0], ["NOR", 3, 0, 0], ["SCO", 3, 4, 1], ["KSA", 4, 5, 1]] },
  { name: "Otieno", short: "OT", prev: 5, paid: true, me: false, finalGoals: 4, picks: [["ARG", 8, 10, 1], ["URU", 5, 6, 1], ["ECU", 4, 4, 1], ["CIV", 3, 0, 0], ["TUN", 2, 0, 0], ["CPV", 5, 6, 1]] },
  { name: "Achieng", short: "AC", prev: 3, paid: true, me: false, finalGoals: 2, picks: [["ENG", 8, 10, 1], ["SEN", 5, 5, 1], ["KOR", 4, 0, 0], ["CAN", 3, 4, 1], ["UZB", 3, 3, 1], ["HAI", 3, 0, 0]] },
  { name: "Kimani", short: "KM", prev: 4, paid: true, me: false, finalGoals: 3, picks: [["POR", 7, 9, 1], ["MEX", 5, 5, 1], ["IRN", 4, 0, 0], ["SWE", 3, 3, 1], ["QAT", 3, 3, 1], ["BIH", 3, 0, 0]] },
  { name: "Njoro", short: "NJ", prev: 6, paid: true, me: false, finalGoals: 5, picks: [["BRA", 9, 10, 1], ["COL", 5, 6, 1], ["AUT", 2, 0, 0], ["PAN", 2, 0, 0], ["IRQ", 2, 0, 0], ["NZL", 3, 4, 1]] },
  { name: "Mwangi", short: "MW", prev: 9, paid: true, me: false, finalGoals: 2, picks: [["GER", 7, 9, 1], ["SUI", 5, 5, 1], ["TUR", 3, 0, 0], ["ALG", 3, 3, 1], ["COD", 2, 0, 0], ["JOR", 2, 0, 0]] },
  { name: "Aisha", short: "AI", prev: 7, paid: true, me: false, finalGoals: 3, picks: [["NED", 7, 8, 1], ["SEN", 4, 5, 1], ["AUS", 3, 0, 0], ["EGY", 4, 0, 0], ["SCO", 3, 4, 1], ["GHA", 4, 5, 1]] },
  { name: "Dennoh", short: "DN", prev: 8, paid: false, me: false, finalGoals: 1, picks: [["FRA", 6, 9, 1], ["URU", 4, 0, 0], ["JPN", 4, 5, 1], ["NOR", 2, 0, 0], ["TUN", 2, 0, 0], ["CUW", 2, 0, 0]] },
  { name: "Faith", short: "FT", prev: 11, paid: true, me: false, finalGoals: 4, picks: [["ESP", 6, 9, 1], ["BEL", 5, 6, 1], ["IRN", 2, 0, 0], ["PAR", 2, 0, 0], ["UZB", 2, 3, 1], ["KSA", 2, 0, 0]] },
  { name: "Maxie", short: "MX", prev: 10, paid: false, me: false, finalGoals: 2, picks: [["POR", 6, 8, 1], ["MAR", 4, 5, 1], ["ECU", 3, 4, 1], ["CIV", 2, 0, 0], ["RSA", 1, 0, 0], ["JOR", 2, 0, 0]] },
  { name: "Shiro", short: "SH", prev: 12, paid: true, me: false, finalGoals: 3, picks: [["ARG", 7, 10, 1], ["SUI", 3, 0, 0], ["KOR", 2, 0, 0], ["SWE", 2, 3, 1], ["QAT", 1, 0, 0], ["HAI", 1, 0, 0]] },
  { name: "Baraka", short: "BA", prev: 14, paid: true, me: false, finalGoals: 3, picks: [["GER", 6, 9, 1], ["COL", 3, 0, 0], ["AUT", 2, 0, 0], ["CAN", 2, 3, 1], ["SCO", 1, 0, 0], ["NZL", 1, 0, 0]] },
  { name: "Trevor", short: "TR", prev: 13, paid: false, me: false, finalGoals: 2, picks: [["NED", 5, 8, 1], ["MEX", 3, 0, 0], ["USA", 2, 0, 0], ["PAN", 1, 0, 0], ["IRQ", 1, 0, 0], ["CPV", 1, 0, 0]] },
];

export type PlayerTeam = {
  code: string;
  name: string;
  flag: string;
  tier: Tier;
  pts: number;
  rem: number;
  alive: boolean;
};

export type Player = {
  name: string;
  short: string;
  prev: number;
  paid: boolean;
  me: boolean;
  finalGoals: number;
  teams: PlayerTeam[];
  points: number;
  ceiling: number;
  aliveCount: number;
  prevRank: number;
  rank: number;
  mover: number;
  payout: number;
};

const BUYIN = 1000;

export const players: Player[] = RAW.map((p) => {
  const teams: PlayerTeam[] = p.picks.map(([c, pts, rem, alive]) => ({
    code: c,
    name: T[c].n,
    flag: T[c].f,
    tier: T[c].t,
    pts,
    rem,
    alive: !!alive,
  }));
  const points = teams.reduce((s, t) => s + t.pts, 0);
  const ceiling = points + teams.reduce((s, t) => s + (t.alive ? t.rem : 0), 0);
  const aliveCount = teams.filter((t) => t.alive).length;
  // rank / mover / payout are derived in the passes below.
  return {
    name: p.name,
    short: p.short,
    prev: p.prev,
    paid: p.paid,
    me: p.me,
    finalGoals: p.finalGoals,
    teams,
    points,
    ceiling,
    aliveCount,
    prevRank: p.prev,
    rank: 0,
    mover: 0,
    payout: 0,
  };
});

// Rank paid players by points desc; keep unpaid/unranked players at the bottom.
players.sort((a, b) => {
  if (a.paid !== b.paid) return a.paid ? -1 : 1;
  return b.points - a.points;
});
let nextRank = 1;
players.forEach((p) => {
  if (!p.paid) {
    p.rank = 0;
    p.mover = 0;
    return;
  }
  p.rank = nextRank;
  nextRank += 1;
  p.mover = p.prevRank - p.rank;
});

const entries = players.length;
const paidEntries = players.filter((p) => p.paid).length;
const pot = paidEntries * BUYIN;
const payouts: [number, number, number] = [
  Math.round(pot * 0.5),
  Math.round(pot * 0.3),
  Math.round(pot * 0.2),
];
players.forEach((p) => {
  p.payout = p.rank > 0 && p.rank <= 3 ? payouts[p.rank - 1] : 0;
});

const leaderPoints = players[0].points;
const contention = players.filter((p) => p.ceiling >= leaderPoints).length;
const scaleMax = Math.max(...players.map((p) => p.ceiling)) + 4; // shared bar scale

export const WADAU = {
  T,
  players,
  entries,
  pot,
  buyin: BUYIN,
  payouts,
  scaleMax,
  leaderPoints,
  contention,
  round: "Round of 16",
  updated: "2h ago",
  poolName: "Wadau Cup",
  season: "2026",
};

export const fmtK = (n: number) => n.toLocaleString("en-US");
export const fmtKES = (n: number) => "KES " + n.toLocaleString("en-US");

/* ---------- extended data for the draft (ported from wadau-data2.js) ---------- */

// teams grouped by tier (for the picker sheet)
export const byTier: Record<Tier, string[]> = { A: [], B: [], C: [], D: [], E: [], F: [] };
Object.keys(T).forEach((code) => byTier[T[code].t].push(code));

// real World Cup group per team code
export const GROUPS: Record<string, string> = {
  ALG: "J", ARG: "J", AUS: "D", AUT: "J", BEL: "G", BIH: "B", BRA: "C", CPV: "H", CAN: "B", COL: "K",
  CIV: "E", CRO: "L", CUW: "E", CZE: "A", COD: "K", ECU: "E", EGY: "G", ENG: "L", FRA: "I", GER: "E",
  GHA: "L", HAI: "C", IRN: "G", IRQ: "I", JPN: "F", JOR: "J", MEX: "A", MAR: "C", NED: "F", NZL: "G",
  NOR: "I", PAN: "L", PAR: "D", POR: "K", QAT: "B", KSA: "H", SCO: "C", SEN: "I", RSA: "A", KOR: "A",
  ESP: "H", SWE: "F", SUI: "B", TUN: "F", TUR: "D", USA: "D", URU: "H", UZB: "K",
};

export type TierMeta = { label: string; win: number; blurb: string };

export const tierMeta: Record<Tier, TierMeta> = {
  A: { label: "Favourites", win: 1, blurb: "The giants. Low points per win, but they go deep." },
  B: { label: "Contenders", win: 1, blurb: "Strong sides that can upset anyone on their day." },
  C: { label: "Dark horses", win: 2, blurb: "Worth more per win. A run here pays off." },
  D: { label: "Outsiders", win: 2, blurb: "Punch above their weight for solid points." },
  E: { label: "Underdogs", win: 3, blurb: "Big points early. One win swings your week." },
  F: { label: "Longshots", win: 4, blurb: "Max points if they shock the world. High risk." },
};

export const draftRemainingByTier: Record<Tier, number> = {
  A: 11,
  B: 11,
  C: 15,
  D: 15,
  E: 19,
  F: 23,
};

// current player
export const me: Player = players.find((p) => p.me) || players[1];

/* ---------- team status + results feed (ported from wadau-data2.js) ---------- */

// where an alive team plays next, at this point in the tournament (R16)
const NEXT: Record<string, string> = {
  ESP: "R16 · vs Cabo Verde · Sat 6pm", BEL: "R16 · vs Uzbekistan · Sat 9pm",
  SCO: "R16 · vs Morocco · Sun 6pm", KSA: "R16 · vs Ghana · Sun 9pm",
  FRA: "R16 · vs DR Congo · Sat 9pm", ARG: "R16 · vs Norway · Sun 9pm",
  BRA: "R16 · vs Haiti · Sat 6pm", GER: "R16 · vs Ecuador · Sun 6pm",
  ENG: "R16 · vs Croatia · Mon 9pm", POR: "R16 · vs Colombia · Mon 6pm",
  NED: "R16 · vs Japan · Sun 6pm", JPN: "R16 · vs Netherlands · Sun 6pm",
  MAR: "R16 · vs Scotland · Sun 6pm", SEN: "R16 · vs France · Sat 9pm",
  MEX: "R16 · vs Switzerland · Mon 6pm", SUI: "R16 · vs Mexico · Mon 6pm",
  COL: "R16 · vs Portugal · Mon 6pm", URU: "R16 · vs Spain · Sat 6pm",
  CPV: "R16 · vs Saudi Arabia · Sun 9pm", GHA: "R16 · vs Saudi Arabia · Sun 9pm",
  ECU: "R16 · vs Germany · Sun 6pm", CZE: "R16 · vs Mexico · Mon 6pm",
  QAT: "R16 · vs Canada · Tue 6pm", CAN: "R16 · vs Qatar · Tue 6pm",
  UZB: "R16 · vs Belgium · Sat 9pm", ALG: "R16 · vs Austria · Tue 9pm",
  NZL: "R16 · vs New chance · Tue", COD: "R16", SWE: "R16 · vs Cabo Verde · Sun",
};
const OUT: Record<string, string> = {
  EGY: "Group", USA: "R32", NOR: "R32", CIV: "Group", TUN: "Group", KOR: "R32", HAI: "Group",
  IRN: "Group", BIH: "Group", AUT: "R32", PAN: "Group", IRQ: "Group", JOR: "Group", TUR: "R32",
  AUS: "Group", PAR: "Group", RSA: "Group", CUW: "Group",
};

export function teamStatus(code: string, alive: boolean): { alive: boolean; line: string } {
  if (alive) return { alive: true, line: NEXT[code] || "Round of 16" };
  return { alive: false, line: "Out · " + (OUT[code] || "Group") };
}

export type ResultPts = [string, Tier, number]; // [teamCode, tier, points]

export type ResultMatch = {
  id: string;
  kind?: undefined;
  round: string;
  a: string;
  b: string;
  sa: number;
  sb: number;
  win: string; // winning code, or "draw"
  pts: ResultPts[];
  held: number;
  note: string;
  pens?: string;
};

export type ResultCallout = {
  id: string;
  kind: "callout";
  tone: "mover" | "upset";
  title: string;
  body: string;
  tag: string;
};

export type ResultItem = ResultMatch | ResultCallout;
