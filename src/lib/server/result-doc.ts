import { T } from "@/lib/data";
import type { PlayerDoc, ResultDoc, Tier } from "@/lib/types";

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

function roundLabel(round: string) {
  if (round.startsWith("Group")) return "Group";
  return round;
}

function pointsFor(round: string, outcome: "win" | "draw", tier: Tier) {
  const normalized = roundLabel(round);
  const key = outcome === "draw"
    ? `${normalized} · Draw`
    : normalized === "Final"
      ? "Final · Champion"
      : `${normalized} · Win`;
  return SCORING_TABLE[key]?.[TIER_INDEX[tier]] ?? 0;
}

function playerHasTeam(player: PlayerDoc, code: string) {
  return Object.values(player.picks ?? {}).some((pick) => pick?.code === code);
}

export function buildResultDoc(input: {
  id: string;
  round: string;
  a: string;
  b: string;
  sa: number | null;
  sb: number | null;
  win: string | "draw" | null;
  pens?: string | null;
  note?: string;
  players?: PlayerDoc[];
  source?: ResultDoc["source"];
  manualOverride?: boolean;
  providerMatchId?: string;
}): Omit<ResultDoc, "enteredAt"> {
  const awarded: ResultDoc["pts"] = [];
  if (input.win === "draw") {
    for (const code of [input.a, input.b]) {
      const tier = T[code]?.t;
      if (tier) awarded.push({ code, tier, points: pointsFor(input.round, "draw", tier) });
    }
  } else if (input.win) {
    const tier = T[input.win]?.t;
    if (tier) awarded.push({ code: input.win, tier, points: pointsFor(input.round, "win", tier) });
  }

  const held = input.win && input.win !== "draw" && input.players
    ? input.players.filter((player) => playerHasTeam(player, input.win as string)).length
    : 0;

  const doc: Omit<ResultDoc, "enteredAt"> = {
    id: input.id,
    round: input.round,
    a: input.a,
    b: input.b,
    sa: input.sa,
    sb: input.sb,
    win: input.win,
    pens: input.pens ?? null,
    pts: awarded,
    held,
    note: input.note ?? "",
    locked: Boolean(input.win),
    manualOverride: Boolean(input.manualOverride),
  };
  if (input.source) doc.source = input.source;
  if (input.providerMatchId) doc.providerMatchId = input.providerMatchId;
  return doc;
}
