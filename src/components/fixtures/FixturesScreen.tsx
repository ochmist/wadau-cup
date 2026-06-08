"use client";

/* Screen 11 — Fixtures. Ported from wadau-fixtures.jsx (FixturesBody,
   FixtureCard, FixtureSide), extended with a completed-match state so played
   fixtures stay visible for reference. A game with a score (`sa`/`sb`) renders
   as played: final score + FT, winner emphasised, loser dimmed/grayscale. */

import { useMemo, useState } from "react";
import { PageHead } from "@/components/ui";
import { T } from "@/lib/data";
import { fixtureStageLabel, stageLabel } from "@/lib/fixtures";
import { useAuth } from "@/lib/auth";
import { useMyData, enrichPlayerTeams } from "@/hooks/useMyData";
import { useResults } from "@/hooks/useResults";
import { useFixtures } from "@/hooks/useFixtures";

type Game = {
  id: string;
  date: string;
  time: string;
  a: string | null;
  b: string | null;
  aName?: string;
  bName?: string;
  round: string;
  group?: string | null;
  status?: string;
  venue?: string | null;
  warning?: string | null;
  // present only on completed matches
  sa?: number;
  sb?: number;
  win?: string; // winning code, or "draw"
  pens?: string;
};
type Day = { key: string; day: string; date: string; games: Game[] };

const isPlayed = (g: Game) => g.sa != null && g.sb != null;
const isFinal = (g: Game) => Boolean(g.win) && g.sa != null && g.sb != null;
const hasScore = (g: Game) => g.sa != null && g.sb != null;
const isTbdWarning = (warning?: string | null) => Boolean(warning && /\bTBD\b/i.test(warning));

function dayLabel(date: string) {
  const parsed = new Date(`${date}T12:00:00`);
  return {
    day: parsed.toLocaleDateString([], { weekday: "long" }),
    date: parsed.toLocaleDateString([], { month: "short", day: "numeric" }),
  };
}

type SideState = "win" | "lose" | "even";

function FixtureSide({
  code,
  label,
  mine,
  align,
  state = "even",
}: {
  code: string | null;
  label?: string;
  mine: boolean;
  align: "left" | "right";
  state?: SideState;
}) {
  const lost = state === "lose";
  const team = code ? T[code] : null;
  return (
    <div
      style={{
        display: "flex",
        alignItems: "center",
        gap: 9,
        flex: 1,
        opacity: lost ? 0.5 : 1,
        justifyContent: align === "right" ? "flex-end" : "flex-start",
        flexDirection: align === "right" ? "row-reverse" : "row",
      }}
    >
      <span className={"wc-flag " + (lost ? "out" : "alive")} style={{ width: 28, height: 28, fontSize: 18 }}>
        {team?.f ?? "•"}
      </span>
      <div style={{ display: "flex", flexDirection: "column", alignItems: align === "right" ? "flex-end" : "flex-start" }}>
        <span style={{ fontSize: 14.5, fontWeight: state === "win" || mine ? 700 : 600, whiteSpace: "nowrap" }}>
          {team?.n ?? label ?? "TBD"}
        </span>
        {mine && (
          <span
            className="wc-num"
            style={{
              fontSize: 9,
              fontWeight: 600,
              color: "var(--on-lime)",
              background: "var(--lime)",
              padding: "1px 5px",
              borderRadius: 4,
              marginTop: 3,
            }}
          >
            YOUR PICK
          </span>
        )}
      </div>
    </div>
  );
}

function FixtureCard({ g, mineCodes }: { g: Game; mineCodes: string[] }) {
  const aMine = Boolean(g.a && mineCodes.includes(g.a));
  const bMine = Boolean(g.b && mineCodes.includes(g.b));
  const played = isFinal(g);
  const scoreVisible = hasScore(g);
  const draw = g.win === "draw";
  const aState: SideState = !played || draw ? "even" : g.win === g.a ? "win" : "lose";
  const bState: SideState = !played || draw ? "even" : g.win === g.b ? "win" : "lose";

  return (
    <div
      className="wc-card"
      style={{
        padding: "13px 16px",
        border: "1px solid " + (aMine || bMine ? "var(--lime-line)" : "var(--line)"),
        // completed ties recede so upcoming matches lead the eye (esp. in "All")
        background: played ? "var(--surface-2)" : "var(--surface)",
        opacity: played ? 0.6 : 1,
      }}
    >
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 10 }}>
        {played ? (
          <span className="wc-num" style={{ fontSize: 10.5, fontWeight: 600, letterSpacing: "0.08em", color: "var(--faint)" }}>
            FT
          </span>
        ) : g.status === "live" ? (
          <span className="wc-num" style={{ fontSize: 10.5, fontWeight: 600, letterSpacing: "0.08em", color: "var(--lime-ink)" }}>
            LIVE
          </span>
        ) : (
          <span className="wc-num" style={{ fontSize: 12, fontWeight: 600 }}>
            {g.time}
          </span>
        )}
        <span className="wc-pill" style={{ padding: "2px 8px", fontSize: 9 }}>
          {g.status === "live" ? "LIVE" : fixtureStageLabel(g.round, g.group)}
        </span>
      </div>
      <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
        <FixtureSide code={g.a} label={g.aName} mine={aMine} align="left" state={aState} />
        {scoreVisible ? (
          <div style={{ textAlign: "center", flex: "none" }}>
            <div className="wc-num" style={{ fontSize: 17, fontWeight: 600 }}>
              {g.sa}
              <span style={{ color: "var(--faint)", margin: "0 4px" }}>–</span>
              {g.sb}
            </div>
            {g.pens && (
              <div className="wc-num" style={{ fontSize: 9, color: "var(--faint)", marginTop: 1 }}>
                pens {g.pens}
              </div>
            )}
          </div>
        ) : (
          <span className="wc-num" style={{ fontSize: 11, color: "var(--faint)", flex: "none" }}>
            vs
          </span>
        )}
        <FixtureSide code={g.b} label={g.bName} mine={bMine} align="right" state={bState} />
      </div>
      {g.warning && !isTbdWarning(g.warning) && (
        <div style={{ marginTop: 9, fontSize: 11.5, color: "var(--gold)", lineHeight: 1.35 }}>
          {g.warning}
        </div>
      )}
    </div>
  );
}

const CHIPS = ["All", "Upcoming", "Completed", "My teams"] as const;
type Filter = (typeof CHIPS)[number];
const STAGES = ["All stages", "Group", "Round of 32", "Round of 16", "Quarter-final", "Semi-final", "Third place", "Final"] as const;
type StageFilter = (typeof STAGES)[number];

function FilterChip({
  label,
  selected,
  onSelect,
}: {
  label: string;
  selected: boolean;
  onSelect: () => void;
}) {
  return (
    <button type="button" className={"wc-chip" + (selected ? " on" : "")} aria-pressed={selected} onClick={onSelect}>
      {label}
    </button>
  );
}

export function FixturesScreen() {
  const { user } = useAuth();
  const { player } = useMyData();
  const { results } = useResults();
  const { fixtures, liveState } = useFixtures();
  const mineCodes = enrichPlayerTeams(player).map((t) => t.code);
  const [filter, setFilter] = useState<Filter>("Upcoming");
  const [stageFilter, setStageFilter] = useState<StageFilter>("All stages");
  const resultById = useMemo(() => new Map(results.map((result) => [result.id, result])), [results]);
  const liveById = useMemo(() => new Map(liveState.map((state) => [state.fixtureId, state])), [liveState]);
  const allGames = useMemo<Game[]>(() => fixtures.map((fixture) => {
    const result = resultById.get(fixture.id);
    const live = liveById.get(fixture.id);
    return {
      ...fixture,
      sa: result?.sa ?? live?.sa ?? undefined,
      sb: result?.sb ?? live?.sb ?? undefined,
      win: result?.win ?? undefined,
      pens: result?.pens ?? undefined,
      status: result ? "finished" : live ? "live" : fixture.status,
    };
  }), [fixtures, liveById, resultById]);

  const matches = (g: Game) => {
    if (stageFilter !== "All stages" && g.round !== stageFilter) return false;
    switch (filter) {
      case "Upcoming":
        return !isFinal(g);
      case "Completed":
        return isFinal(g);
      case "My teams":
        return Boolean((g.a && mineCodes.includes(g.a)) || (g.b && mineCodes.includes(g.b)));
      default:
        return true;
    }
  };

  const grouped = allGames.reduce<Record<string, Game[]>>((acc, game) => {
    (acc[game.date] ??= []).push(game);
    return acc;
  }, {});
  const days = Object.entries(grouped)
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([date, games]) => ({ key: date, ...dayLabel(date), games: games.filter(matches) }))
    .filter((d) => d.games.length);

  return (
    <div style={{ maxWidth: 840, margin: "0 auto", padding: "20px 18px 24px" }}>
      <PageHead title="Fixtures" sub="Upcoming and completed matches. Your live teams are highlighted." />
      {!user && (
        <div className="wc-card" style={{ padding: "10px 12px", color: "var(--dim)", fontSize: 12.5, marginBottom: 12 }}>
          Sign in to highlight your teams.
        </div>
      )}
      <div className="wc-chiprow" style={{ overflowX: "auto", paddingBottom: 4, marginBottom: 16 }}>
        {CHIPS.map((c) => (
          <FilterChip key={c} label={c} selected={filter === c} onSelect={() => setFilter(c)} />
        ))}
      </div>
      <div className="wc-chiprow" style={{ overflowX: "auto", paddingBottom: 4, marginBottom: 16 }}>
        {STAGES.map((stage) => (
          <FilterChip
            key={stage}
            label={stage === "All stages" ? stage : stageLabel(stage)}
            selected={stageFilter === stage}
            onSelect={() => setStageFilter(stage)}
          />
        ))}
      </div>
      {days.length === 0 ? (
        <div className="wc-card" style={{ padding: "28px 20px", textAlign: "center", color: "var(--dim)", fontSize: 14 }}>
          No matches to show.
        </div>
      ) : (
        <div style={{ display: "flex", flexDirection: "column", gap: 22 }}>
          {days.map((d) => (
            <div key={d.key}>
              <div style={{ display: "flex", alignItems: "baseline", gap: 9, marginBottom: 11 }}>
                <span style={{ fontSize: 15, fontWeight: 700 }}>{d.day}</span>
                <span className="wc-eyebrow">{d.date}</span>
              </div>
              <div className="wc-fixture-grid">
                {d.games.map((g) => (
                  <FixtureCard key={g.id} g={g} mineCodes={mineCodes} />
                ))}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
