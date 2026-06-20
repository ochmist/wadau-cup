"use client";

/* Screen 11 — Fixtures. Ported from wadau-fixtures.jsx (FixturesBody,
   FixtureCard, FixtureSide), extended with a completed-match state so played
   fixtures stay visible for reference. A game with a score (`sa`/`sb`) renders
   as played: final score + FT, winner emphasised, loser dimmed/grayscale. */

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { LiveMarker } from "@/components/LiveMarker";
import { PageHead } from "@/components/ui";
import { TeamEntityLink } from "@/components/entity-links";
import { T } from "@/lib/data";
import { fixtureStageLabel, stageLabel } from "@/lib/fixtures";
import { useAuth } from "@/lib/auth";
import { useMyData, enrichPlayerTeams } from "@/hooks/useMyData";
import { useResults } from "@/hooks/useResults";
import { useFixtures } from "@/hooks/useFixtures";
import type { MatchEventDoc, MatchLineupPlayerDoc, MatchLineupTeamDoc, MatchStatisticDoc } from "@/lib/types";

type Game = {
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
  status?: string;
  venue?: string | null;
  warning?: string | null;
  minute?: number | null;
  extra?: number | null;
  statusShort?: string | null;
  statusLong?: string | null;
  events?: MatchEventDoc[];
  lineups?: MatchLineupTeamDoc[];
  statistics?: MatchStatisticDoc[];
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

function localKickoffDate(g: Pick<Game, "date" | "time" | "kickoffAt">) {
  const parsed = g.kickoffAt ? new Date(g.kickoffAt) : new Date(`${g.date}T${g.time}:00Z`);
  return Number.isNaN(parsed.getTime()) ? new Date(`${g.date}T12:00:00`) : parsed;
}

function localDateKey(g: Pick<Game, "date" | "time" | "kickoffAt">) {
  const parsed = localKickoffDate(g);
  const year = parsed.getFullYear();
  const month = String(parsed.getMonth() + 1).padStart(2, "0");
  const day = String(parsed.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

function dayLabel(g: Pick<Game, "date" | "time" | "kickoffAt">) {
  const parsed = localKickoffDate(g);
  const today = new Date();
  const startOfToday = new Date(today.getFullYear(), today.getMonth(), today.getDate()).getTime();
  const startOfParsed = new Date(parsed.getFullYear(), parsed.getMonth(), parsed.getDate()).getTime();
  const dayOffset = Math.round((startOfParsed - startOfToday) / 86_400_000);
  return {
    day: dayOffset === 0 ? "Today" : dayOffset === 1 ? "Tomorrow" : parsed.toLocaleDateString([], { weekday: "long" }),
    date: parsed.toLocaleDateString([], { month: "short", day: "numeric" }),
  };
}

function kickoffLabel(g: Game) {
  const date = localKickoffDate(g);
  if (Number.isNaN(date.getTime())) return g.time;
  return date.toLocaleTimeString([], { hour: "numeric", minute: "2-digit" });
}

function clockLabel(g: Game) {
  if (g.statusShort === "HT") return "HT";
  if (g.statusShort === "FT" || g.status === "finished") return "FT";
  if (typeof g.minute === "number") return `${g.minute}${typeof g.extra === "number" && g.extra > 0 ? `+${g.extra}` : ""}'`;
  return g.statusLong ?? "LIVE";
}

function liveMarkerLabel(g: Game) {
  if (typeof g.minute === "number") return clockLabel(g);
  const kickoff = g.kickoffAt ? Date.parse(g.kickoffAt) : Number.NaN;
  if (!Number.isNaN(kickoff)) {
    const elapsed = Math.max(1, Math.floor((Date.now() - kickoff) / 60_000) + 1);
    if (elapsed > 0 && elapsed < 130) return `${elapsed}'`;
  }
  return clockLabel(g);
}

function minuteLabel(event: MatchEventDoc) {
  if (typeof event.minute !== "number") return "";
  return `${event.minute}${typeof event.extra === "number" && event.extra > 0 ? `+${event.extra}` : ""}'`;
}

function teamScorers(events: MatchEventDoc[] | undefined, teamCode: string | null) {
  if (!teamCode) return [];
  return (events ?? []).filter((event) => event.type === "goal" && event.team === teamCode && event.player);
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
        <TeamEntityLink code={code}>{team?.f ?? "•"}</TeamEntityLink>
      </span>
      <div style={{ display: "flex", flexDirection: "column", alignItems: align === "right" ? "flex-end" : "flex-start" }}>
        <TeamEntityLink code={code}>
          <span style={{ fontSize: 14.5, fontWeight: state === "win" || mine ? 700 : 600, whiteSpace: "nowrap" }}>
            {team?.n ?? label ?? "TBD"}
          </span>
        </TeamEntityLink>
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

function ScorerLine({ label, events, align }: { label: string; events: MatchEventDoc[]; align: "left" | "right" }) {
  return (
    <div
      style={{
        minWidth: 0,
        textAlign: align,
        fontSize: 11.5,
        color: "var(--dim)",
        whiteSpace: "nowrap",
        overflow: "hidden",
        textOverflow: "ellipsis",
      }}
      title={`${label}: ${events.map((event) => `${event.player} ${minuteLabel(event)}`.trim()).join(", ")}`}
    >
      {events.map((event) => `${event.player} ${minuteLabel(event)}`.trim()).join(", ")}
    </div>
  );
}

function FixtureCard({ g, mineCodes, href }: { g: Game; mineCodes: string[]; href: string }) {
  const router = useRouter();
  const aMine = Boolean(g.a && mineCodes.includes(g.a));
  const bMine = Boolean(g.b && mineCodes.includes(g.b));
  const played = isFinal(g);
  const scoreVisible = hasScore(g);
  const draw = g.win === "draw";
  const aState: SideState = !played || draw ? "even" : g.win === g.a ? "win" : "lose";
  const bState: SideState = !played || draw ? "even" : g.win === g.b ? "win" : "lose";
  const aScorers = teamScorers(g.events, g.a);
  const bScorers = teamScorers(g.events, g.b);

  return (
    <div
      role="link"
      tabIndex={0}
      onClick={() => router.push(href)}
      onKeyDown={(event) => {
        if (event.key === "Enter" || event.key === " ") {
          event.preventDefault();
          router.push(href);
        }
      }}
      className="wc-card"
      style={{
        width: "100%",
        display: "block",
        font: "inherit",
        color: "var(--text)",
        textDecoration: "none",
        textAlign: "left",
        padding: "13px 16px",
        border: "1px solid " + (aMine || bMine ? "var(--lime-line)" : "var(--line)"),
        // completed ties recede so upcoming matches lead the eye (esp. in "All")
        background: played ? "var(--surface-2)" : "var(--surface)",
        opacity: played ? 0.6 : 1,
        cursor: "pointer",
      }}
    >
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 10 }}>
        {g.status === "live" ? (
          <LiveMarker
            fixture
            label={liveMarkerLabel(g)}
            minute={g.minute}
            extra={g.extra}
            statusShort={g.statusShort}
            statusLong={g.statusLong}
          />
        ) : played ? (
          <span className="wc-num" style={{ fontSize: 10.5, fontWeight: 600, letterSpacing: "0.08em", color: "var(--faint)" }}>
            {clockLabel(g)}
          </span>
        ) : (
          <span className="wc-num" style={{ fontSize: 12, fontWeight: 600 }}>
            {kickoffLabel(g)}
          </span>
        )}
        {g.status !== "live" && (
          <span className="wc-pill" style={{ padding: "2px 8px", fontSize: 9 }}>
            {fixtureStageLabel(g.round, g.group)}
          </span>
        )}
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
      {(aScorers.length > 0 || bScorers.length > 0) && (
        <div
          style={{
            display: "grid",
            gridTemplateColumns: "1fr auto 1fr",
            gap: 10,
            marginTop: 9,
            alignItems: "start",
          }}
        >
          <ScorerLine label={T[g.a ?? ""]?.n ?? g.aName ?? "Home"} events={aScorers} align="left" />
          <span aria-hidden style={{ width: scoreVisible ? 46 : 18 }} />
          <ScorerLine label={T[g.b ?? ""]?.n ?? g.bName ?? "Away"} events={bScorers} align="right" />
        </div>
      )}
      {g.warning && !isTbdWarning(g.warning) && (
        <div style={{ marginTop: 9, fontSize: 11.5, color: "var(--gold)", lineHeight: 1.35 }}>
          {g.warning}
        </div>
      )}
    </div>
  );
}

function eventLabel(event: MatchEventDoc) {
  if (event.type === "goal") return event.detail?.toLowerCase().includes("own") ? "Own goal" : "Goal";
  if (event.type === "substitution") return "Substitution";
  if (event.type === "card") return event.detail ?? "Card";
  if (event.type === "var") return "VAR";
  return event.detail ?? "Event";
}

function eventText(event: MatchEventDoc) {
  if (event.type === "goal") {
    return [event.player, event.assist ? `assist ${event.assist}` : null].filter(Boolean).join(" · ");
  }
  if (event.type === "substitution") {
    if (event.player && event.assist) return `${event.assist} for ${event.player}`;
    return event.player ?? event.assist ?? "";
  }
  return [event.player, event.comments].filter(Boolean).join(" · ");
}

function cardColor(event: MatchEventDoc) {
  const detail = (event.detail ?? "").toLowerCase();
  if (detail.includes("red")) return "#ef4444";
  if (detail.includes("yellow")) return "#facc15";
  return "var(--gold)";
}

function ActivityIcon({ event }: { event: MatchEventDoc }) {
  if (event.type === "goal") {
    return (
      <span
        aria-hidden
        style={{
          width: 26,
          height: 26,
          borderRadius: "50%",
          display: "grid",
          placeItems: "center",
          background: "var(--surface-2)",
          border: "1px solid var(--line)",
          fontSize: 15,
        }}
      >
        ⚽
      </span>
    );
  }
  if (event.type === "card") {
    const color = cardColor(event);
    return (
      <span
        aria-hidden
        style={{
          width: 18,
          height: 24,
          borderRadius: 3,
          background: color,
          boxShadow: "0 5px 14px rgba(0,0,0,0.2)",
          transform: "rotate(6deg)",
          border: color === "#facc15" ? "1px solid rgba(0,0,0,0.18)" : "1px solid rgba(255,255,255,0.18)",
        }}
      />
    );
  }
  if (event.type === "substitution") {
    return (
      <span
        className="wc-num"
        aria-hidden
        style={{
          width: 26,
          height: 26,
          borderRadius: "50%",
          display: "grid",
          placeItems: "center",
          background: "color-mix(in srgb, var(--lime) 18%, transparent)",
          color: "var(--lime-ink)",
          fontSize: 15,
          fontWeight: 800,
        }}
      >
        ↕
      </span>
    );
  }
  if (event.type === "var") {
    return (
      <span
        className="wc-num"
        aria-hidden
        style={{
          minWidth: 28,
          height: 20,
          borderRadius: 5,
          display: "grid",
          placeItems: "center",
          background: "var(--surface-2)",
          border: "1px solid var(--line)",
          color: "var(--dim)",
          fontSize: 9,
          fontWeight: 800,
        }}
      >
        VAR
      </span>
    );
  }
  return (
    <span
      aria-hidden
      style={{
        width: 9,
        height: 9,
        borderRadius: "50%",
        background: "var(--faint)",
      }}
    />
  );
}

function valueLabel(value: MatchStatisticDoc["value"]) {
  if (value == null || value === "") return "-";
  return String(value);
}

function statsRows(g: Game) {
  const byType = new Map<string, { a: MatchStatisticDoc["value"]; b: MatchStatisticDoc["value"] }>();
  for (const stat of g.statistics ?? []) {
    const row = byType.get(stat.type) ?? { a: null, b: null };
    if (stat.team === g.a || (!stat.team && stat.teamName === g.aName)) row.a = stat.value;
    if (stat.team === g.b || (!stat.team && stat.teamName === g.bName)) row.b = stat.value;
    byType.set(stat.type, row);
  }
  return Array.from(byType.entries()).filter(([, row]) => row.a != null || row.b != null);
}

function playerLastName(name: string) {
  const parts = name.split(/\s+/).filter(Boolean);
  return parts.at(-1) ?? name;
}

function parseGrid(grid?: string | null) {
  const match = grid?.match(/^(\d+):(\d+)$/);
  if (!match) return null;
  return { row: Number(match[1]), col: Number(match[2]) };
}

function fallbackRows(players: MatchLineupPlayerDoc[]) {
  const rank = (position?: string | null) => {
    const value = (position ?? "").toUpperCase();
    if (value === "G") return 1;
    if (value === "D") return 2;
    if (value === "M") return 3;
    if (value === "F") return 4;
    return 3;
  };
  const grouped = new Map<number, MatchLineupPlayerDoc[]>();
  for (const player of players) {
    const row = rank(player.position);
    grouped.set(row, [...(grouped.get(row) ?? []), player]);
  }
  return Array.from(grouped.entries()).flatMap(([row, rowPlayers]) =>
    rowPlayers.map((player, index) => ({ player, row, col: index + 1, rowSize: rowPlayers.length })),
  );
}

function lineupPositions(players: MatchLineupPlayerDoc[]) {
  const parsed = players.map((player) => ({ player, grid: parseGrid(player.grid) }));
  if (parsed.some((entry) => !entry.grid)) return fallbackRows(players);
  const rowSizes = new Map<number, number>();
  for (const entry of parsed) {
    if (!entry.grid) continue;
    rowSizes.set(entry.grid.row, Math.max(rowSizes.get(entry.grid.row) ?? 0, entry.grid.col));
  }
  return parsed.map((entry) => ({
    player: entry.player,
    row: entry.grid?.row ?? 3,
    col: entry.grid?.col ?? 1,
    rowSize: rowSizes.get(entry.grid?.row ?? 3) ?? 1,
  }));
}

function FormationPitch({ lineup }: { lineup: MatchLineupTeamDoc }) {
  const positions = lineupPositions(lineup.startXI);
  const maxRow = Math.max(4, ...positions.map((entry) => entry.row));
  return (
    <div
      style={{
        position: "relative",
        minHeight: 440,
        border: "1px solid color-mix(in srgb, var(--lime) 34%, var(--line))",
        borderRadius: 18,
        overflow: "hidden",
        background:
          "linear-gradient(180deg, color-mix(in srgb, var(--lime) 10%, transparent), transparent 38%), repeating-linear-gradient(90deg, color-mix(in srgb, var(--lime) 8%, transparent) 0 18%, transparent 18% 36%), var(--surface-2)",
      }}
    >
      <div style={{ position: "absolute", inset: 12, border: "1px solid color-mix(in srgb, var(--lime) 28%, transparent)", borderRadius: 14 }} />
      <div style={{ position: "absolute", left: "50%", top: 12, bottom: 12, width: 1, background: "color-mix(in srgb, var(--lime) 24%, transparent)" }} />
      <div
        style={{
          position: "absolute",
          left: "50%",
          top: "50%",
          width: 82,
          height: 82,
          transform: "translate(-50%, -50%)",
          border: "1px solid color-mix(in srgb, var(--lime) 24%, transparent)",
          borderRadius: "50%",
        }}
      />
      <div
        style={{
          position: "absolute",
          left: "50%",
          bottom: 12,
          width: 180,
          height: 58,
          transform: "translateX(-50%)",
          border: "1px solid color-mix(in srgb, var(--lime) 22%, transparent)",
          borderBottom: 0,
          borderRadius: "12px 12px 0 0",
        }}
      />
      {positions.map(({ player, row, col, rowSize }) => {
        const left = (col / (rowSize + 1)) * 100;
        const top = 92 - (row / (maxRow + 1)) * 82;
        return (
          <div
            key={player.id}
            title={`${player.number ?? "-"} ${player.name}${player.position ? ` · ${player.position}` : ""}`}
            style={{
              position: "absolute",
              left: `${left}%`,
              top: `${top}%`,
              transform: "translate(-50%, -50%)",
              display: "grid",
              justifyItems: "center",
              gap: 4,
              width: 76,
            }}
          >
            <span
              className="wc-num"
              style={{
                width: 30,
                height: 30,
                borderRadius: "50%",
                display: "grid",
                placeItems: "center",
                background: "var(--lime)",
                color: "var(--on-lime)",
                fontSize: 12,
                fontWeight: 800,
                boxShadow: "0 8px 22px rgba(0,0,0,0.18)",
              }}
            >
              {player.number ?? "-"}
            </span>
            <span
              style={{
                maxWidth: 76,
                overflow: "hidden",
                textOverflow: "ellipsis",
                whiteSpace: "nowrap",
                fontSize: 11,
                fontWeight: 700,
                textShadow: "0 1px 6px var(--surface)",
              }}
            >
              {playerLastName(player.name)}
            </span>
          </div>
        );
      })}
    </div>
  );
}

function LineupsSection({ lineups }: { lineups: MatchLineupTeamDoc[] | undefined }) {
  const [selected, setSelected] = useState(0);
  const lineup = lineups?.[Math.min(selected, Math.max(0, lineups.length - 1))];
  if (!lineups?.length || !lineup) {
    return <div style={{ color: "var(--dim)", fontSize: 13 }}>Lineups will appear when the provider publishes them.</div>;
  }
  return (
    <div style={{ display: "grid", gap: 12 }}>
      <div className="wc-chiprow" style={{ overflowX: "auto", paddingBottom: 2 }}>
        {lineups.map((item, index) => (
          <button
            key={item.teamName}
            type="button"
            className={"wc-chip" + (index === selected ? " on" : "")}
            aria-pressed={index === selected}
            onClick={() => setSelected(index)}
          >
            {item.teamName}
          </button>
        ))}
      </div>
      <div style={{ display: "flex", justifyContent: "space-between", gap: 12, alignItems: "baseline" }}>
        <div>
          <strong style={{ fontSize: 16 }}>{lineup.teamName}</strong>
          {lineup.coach && <div style={{ color: "var(--dim)", fontSize: 12, marginTop: 3 }}>Coach: {lineup.coach}</div>}
        </div>
        {lineup.formation && <span className="wc-pill" style={{ padding: "3px 9px", fontSize: 10 }}>{lineup.formation}</span>}
      </div>
      <FormationPitch lineup={lineup} />
      {lineup.substitutes.length > 0 && (
        <div>
          <div className="wc-eyebrow" style={{ marginBottom: 8 }}>BENCH</div>
          <div style={{ display: "flex", flexWrap: "wrap", gap: 7 }}>
            {lineup.substitutes.map((player) => (
              <span
                key={player.id}
                className="wc-pill"
                title={`${player.number ?? "-"} ${player.name}${player.position ? ` · ${player.position}` : ""}`}
                style={{ padding: "4px 8px", fontSize: 10, maxWidth: 150, overflow: "hidden", textOverflow: "ellipsis" }}
              >
                {player.number ?? "-"} · {playerLastName(player.name)}
              </span>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

function MatchDetailDialog({ game, onClose }: { game: Game; onClose: () => void }) {
  const timeline = [...(game.events ?? [])].sort((a, b) => (a.minute ?? 999) - (b.minute ?? 999) || (a.extra ?? 0) - (b.extra ?? 0));
  const statRows = statsRows(game);
  const title = `${T[game.a ?? ""]?.n ?? game.aName ?? "TBD"} vs ${T[game.b ?? ""]?.n ?? game.bName ?? "TBD"}`;
  return (
    <div
      role="presentation"
      onClick={onClose}
      style={{
        position: "fixed",
        inset: 0,
        zIndex: 80,
        background: "rgba(0,0,0,0.42)",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        padding: 16,
      }}
    >
      <div
        role="dialog"
        aria-modal="true"
        aria-label={title}
        className="wc-card"
        onClick={(event) => event.stopPropagation()}
        style={{
          width: "min(760px, 100%)",
          maxHeight: "86vh",
          overflow: "auto",
          padding: 0,
          background: "var(--surface)",
        }}
      >
        <div style={{ padding: "18px 18px 14px", borderBottom: "1px solid var(--line)" }}>
          <div style={{ display: "flex", justifyContent: "space-between", gap: 12, alignItems: "flex-start" }}>
            <div>
              <div className="wc-eyebrow" style={{ marginBottom: 7 }}>
                {game.status === "live" ? (
                  <span style={{ display: "inline-flex", alignItems: "center", gap: 10, flexWrap: "wrap" }}>
                    <LiveMarker
                      fixture
                      label={liveMarkerLabel(game)}
                      minute={game.minute}
                      extra={game.extra}
                      statusShort={game.statusShort}
                      statusLong={game.statusLong}
                    />
                    <span>{fixtureStageLabel(game.round, game.group)}</span>
                  </span>
                ) : (
                  <>{kickoffLabel(game)} · {fixtureStageLabel(game.round, game.group)}</>
                )}
              </div>
              <h2 style={{ margin: 0, fontSize: 21 }}>{title}</h2>
              {game.venue && <div style={{ marginTop: 5, color: "var(--dim)", fontSize: 13 }}>{game.venue}</div>}
            </div>
            <button type="button" className="wc-icon-btn" aria-label="Close match details" onClick={onClose} style={{ flex: "none" }}>
              ×
            </button>
          </div>
          <div style={{ display: "grid", gridTemplateColumns: "1fr auto 1fr", gap: 12, alignItems: "center", marginTop: 18 }}>
            <FixtureSide code={game.a} label={game.aName} mine={false} align="left" state="even" />
            <div className="wc-num" style={{ fontSize: 22, fontWeight: 700, textAlign: "center" }}>
              {hasScore(game) ? `${game.sa} - ${game.sb}` : "vs"}
            </div>
            <FixtureSide code={game.b} label={game.bName} mine={false} align="right" state="even" />
          </div>
        </div>

        <div style={{ padding: 18, display: "grid", gap: 20 }}>
          <section>
            <div className="wc-eyebrow" style={{ marginBottom: 10 }}>LINEUPS</div>
            <LineupsSection lineups={game.lineups} />
          </section>

          <section>
            <div className="wc-eyebrow" style={{ marginBottom: 10 }}>MATCH STATS</div>
            {statRows.length === 0 ? (
              <div style={{ color: "var(--dim)", fontSize: 13 }}>Match stats will appear as the game data comes in.</div>
            ) : (
              <div style={{ display: "grid", gap: 8 }}>
                {statRows.map(([type, row]) => (
                  <div key={type} style={{ display: "grid", gridTemplateColumns: "64px 1fr 64px", gap: 10, alignItems: "center", fontSize: 12.5 }}>
                    <span className="wc-num" style={{ textAlign: "left", fontWeight: 700 }}>{valueLabel(row.a)}</span>
                    <span style={{ textAlign: "center", color: "var(--dim)" }}>{type}</span>
                    <span className="wc-num" style={{ textAlign: "right", fontWeight: 700 }}>{valueLabel(row.b)}</span>
                  </div>
                ))}
              </div>
            )}
          </section>

          <section>
            <div className="wc-eyebrow" style={{ marginBottom: 10 }}>MINUTE BY MINUTE</div>
            {timeline.length === 0 ? (
              <div style={{ color: "var(--dim)", fontSize: 13 }}>No match events published yet.</div>
            ) : (
              <div style={{ display: "grid", gap: 8 }}>
                {timeline.map((event) => (
                  <div
                    key={event.id}
                    style={{
                      display: "grid",
                      gridTemplateColumns: "30px 46px 1fr",
                      gap: 10,
                      alignItems: "start",
                      padding: "9px 0",
                      borderBottom: "1px solid var(--line)",
                    }}
                  >
                    <ActivityIcon event={event} />
                    <span className="wc-num" style={{ color: "var(--lime-ink)", fontWeight: 700 }}>{minuteLabel(event) || "-"}</span>
                    <div>
                      <div style={{ display: "flex", gap: 8, flexWrap: "wrap", alignItems: "baseline" }}>
                        <strong style={{ fontSize: 13.5 }}>{eventLabel(event)}</strong>
                        <span style={{ color: "var(--dim)", fontSize: 12 }}>{event.teamName}</span>
                      </div>
                      <div style={{ color: "var(--text)", fontSize: 13, marginTop: 2 }}>{eventText(event) || event.detail || "No detail"}</div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </section>
        </div>
      </div>
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
      minute: live?.minute ?? undefined,
      extra: live?.extra ?? undefined,
      statusShort: live?.statusShort ?? undefined,
      statusLong: live?.statusLong ?? undefined,
      events: live?.events?.length ? live.events : fixture.events,
      lineups: live?.lineups?.length ? live.lineups : fixture.lineups,
      statistics: live?.statistics?.length ? live.statistics : fixture.statistics,
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
    (acc[localDateKey(game)] ??= []).push(game);
    return acc;
  }, {});
  const days = Object.entries(grouped)
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([date, games]) => ({ key: date, ...dayLabel(games[0]), games: games.filter(matches) }))
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
                  <FixtureCard key={g.id} g={g} mineCodes={mineCodes} href={`/fixtures/${encodeURIComponent(g.id)}`} />
                ))}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
