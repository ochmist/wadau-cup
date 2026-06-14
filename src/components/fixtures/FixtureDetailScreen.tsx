"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { ThemeToggle } from "@/components/ds";
import { SectionLabel } from "@/components/ui";
import { useAuth } from "@/lib/auth";
import { T } from "@/lib/data";
import { fixtureStageLabel } from "@/lib/fixtures";
import { useFixtures } from "@/hooks/useFixtures";
import { useResults } from "@/hooks/useResults";
import { useStandings } from "@/hooks/useStandings";
import type { FixtureWithId, LiveStateWithId, ResultWithId } from "@/lib/firestore";
import type { MatchEventDoc, MatchLineupPlayerDoc, MatchLineupTeamDoc, MatchStatisticDoc, SerializedPlayer } from "@/lib/types";

type MatchGame = Omit<FixtureWithId, "status"> & {
  status: FixtureWithId["status"] | LiveStateWithId["status"];
  sa?: number;
  sb?: number;
  win?: string;
  pens?: string;
  minute?: number | null;
  extra?: number | null;
  statusShort?: string | null;
  statusLong?: string | null;
  events?: MatchEventDoc[];
  lineups?: MatchLineupTeamDoc[];
  statistics?: MatchStatisticDoc[];
};

const DETAIL_VISUAL_PREVIEW = process.env.NODE_ENV !== "production";

function mergeFixture(fixture: FixtureWithId, live?: LiveStateWithId, result?: ResultWithId): MatchGame {
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
    status: result ? "finished" : live ? live.status : fixture.status,
  };
}

function previewPlayer(id: string, name: string, number: number, position: string, grid: string | null): MatchLineupPlayerDoc {
  return { id, name, number, position, grid };
}

function previewLineups(game: MatchGame): MatchLineupTeamDoc[] {
  return [
    {
      team: game.a,
      teamName: teamName(game.a, game.aName),
      formation: "4-3-3",
      coach: game.a === "NED" ? "Ronald Koeman" : null,
      startXI: [
        previewPlayer("preview-a-1", "Bart Verbruggen", 1, "G", "1:1"),
        previewPlayer("preview-a-12", "Jeremie Frimpong", 12, "D", "2:1"),
        previewPlayer("preview-a-5", "Nathan Ake", 5, "D", "2:2"),
        previewPlayer("preview-a-4", "Virgil van Dijk", 4, "D", "2:3"),
        previewPlayer("preview-a-22", "Denzel Dumfries", 22, "D", "2:4"),
        previewPlayer("preview-a-21", "Frenkie de Jong", 21, "M", "3:1"),
        previewPlayer("preview-a-14", "Tijjani Reijnders", 14, "M", "3:2"),
        previewPlayer("preview-a-10", "Xavi Simons", 10, "M", "3:3"),
        previewPlayer("preview-a-11", "Cody Gakpo", 11, "F", "4:1"),
        previewPlayer("preview-a-9", "Memphis Depay", 9, "F", "4:2"),
        previewPlayer("preview-a-18", "Donyell Malen", 18, "F", "4:3"),
      ],
      substitutes: [
        previewPlayer("preview-a-13", "Justin Bijlow", 13, "G", null),
        previewPlayer("preview-a-3", "Matthijs de Ligt", 3, "D", null),
        previewPlayer("preview-a-8", "Ryan Gravenberch", 8, "M", null),
        previewPlayer("preview-a-19", "Wout Weghorst", 19, "F", null),
      ],
    },
    {
      team: game.b,
      teamName: teamName(game.b, game.bName),
      formation: "4-2-3-1",
      coach: game.b === "JPN" ? "Hajime Moriyasu" : null,
      startXI: [
        previewPlayer("preview-b-23", "Zion Suzuki", 23, "G", "1:1"),
        previewPlayer("preview-b-21", "Hiroki Ito", 21, "D", "2:1"),
        previewPlayer("preview-b-4", "Ko Itakura", 4, "D", "2:2"),
        previewPlayer("preview-b-16", "Takehiro Tomiyasu", 16, "D", "2:3"),
        previewPlayer("preview-b-2", "Yukinari Sugawara", 2, "D", "2:4"),
        previewPlayer("preview-b-6", "Wataru Endo", 6, "M", "3:1"),
        previewPlayer("preview-b-5", "Hidemasa Morita", 5, "M", "3:2"),
        previewPlayer("preview-b-10", "Ritsu Doan", 10, "M", "4:1"),
        previewPlayer("preview-b-20", "Takefusa Kubo", 20, "M", "4:2"),
        previewPlayer("preview-b-7", "Kaoru Mitoma", 7, "M", "4:3"),
        previewPlayer("preview-b-9", "Ayase Ueda", 9, "F", "5:1"),
      ],
      substitutes: [
        previewPlayer("preview-b-25", "Daizen Maeda", 25, "F", null),
        previewPlayer("preview-b-8", "Takumi Minamino", 8, "M", null),
        previewPlayer("preview-b-15", "Reo Hatate", 15, "M", null),
        previewPlayer("preview-b-3", "Shogo Taniguchi", 3, "D", null),
      ],
    },
  ];
}

function previewEvents(game: MatchGame): MatchEventDoc[] {
  return [
    {
      id: "preview-88-chance",
      team: game.b,
      teamName: teamName(game.b, game.bName),
      minute: 88,
      extra: null,
      player: "Kaoru Mitoma",
      assist: null,
      type: "other",
      detail: "Chance",
      comments: "Cuts inside and forces a late save.",
    },
    {
      id: "preview-76-card",
      team: game.a,
      teamName: teamName(game.a, game.aName),
      minute: 76,
      extra: null,
      player: "Tijjani Reijnders",
      assist: null,
      type: "card",
      detail: "Yellow Card",
      comments: "Stops the counter in midfield.",
    },
    {
      id: "preview-64-sub",
      team: game.a,
      teamName: teamName(game.a, game.aName),
      minute: 64,
      extra: null,
      player: "Memphis Depay",
      assist: "Wout Weghorst",
      type: "substitution",
      detail: "Substitution",
      comments: "Fresh striker for the final push.",
    },
    {
      id: "preview-52-shot",
      team: game.b,
      teamName: teamName(game.b, game.bName),
      minute: 52,
      extra: null,
      player: "Takefusa Kubo",
      assist: null,
      type: "other",
      detail: "Shot on target",
      comments: "Low drive held by the keeper.",
    },
    {
      id: "preview-33-chance",
      team: game.a,
      teamName: teamName(game.a, game.aName),
      minute: 33,
      extra: null,
      player: "Cody Gakpo",
      assist: "Xavi Simons",
      type: "other",
      detail: "Big chance",
      comments: "Header flashes wide from close range.",
    },
    {
      id: "preview-1-kickoff",
      team: null,
      teamName: "",
      minute: 1,
      extra: null,
      player: null,
      assist: null,
      type: "other",
      detail: "Kick-off",
      comments: `${teamName(game.a, game.aName)} get us underway.`,
    },
  ];
}

function previewStats(game: MatchGame): MatchStatisticDoc[] {
  const home = { team: game.a, teamName: teamName(game.a, game.aName) };
  const away = { team: game.b, teamName: teamName(game.b, game.bName) };
  return [
    { ...home, type: "Possession", value: "55%" },
    { ...away, type: "Possession", value: "45%" },
    { ...home, type: "Shots", value: 13 },
    { ...away, type: "Shots", value: 10 },
    { ...home, type: "Shots on target", value: 5 },
    { ...away, type: "Shots on target", value: 4 },
    { ...home, type: "Corners", value: 6 },
    { ...away, type: "Corners", value: 3 },
    { ...home, type: "Fouls", value: 11 },
    { ...away, type: "Fouls", value: 13 },
    { ...home, type: "Yellow cards", value: 1 },
    { ...away, type: "Yellow cards", value: 0 },
  ];
}

function withPreviewData(game: MatchGame): MatchGame {
  if (!DETAIL_VISUAL_PREVIEW) return game;
  return {
    ...game,
    events: game.events?.length ? game.events : previewEvents(game),
    lineups: game.lineups?.length ? game.lineups : previewLineups(game),
    statistics: game.statistics?.length ? game.statistics : previewStats(game),
  };
}

function teamName(code: string | null | undefined, fallback?: string | null) {
  return code ? T[code]?.n ?? fallback ?? code : fallback ?? "TBD";
}

function teamFlag(code: string | null | undefined) {
  return code ? T[code]?.f ?? "•" : "•";
}

function scoreLabel(game: MatchGame) {
  return game.sa != null && game.sb != null ? `${game.sa} – ${game.sb}` : "vs";
}

function statusLabel(game: MatchGame) {
  if (game.statusShort === "HT") return "HT";
  if (game.statusShort === "FT" || game.status === "finished") return "FT";
  if (typeof game.minute === "number") return `${game.minute}${typeof game.extra === "number" && game.extra > 0 ? `+${game.extra}` : ""}'`;
  if (game.status === "live" || game.status === "paused") {
    const kickoff = Date.parse(game.kickoffAt);
    if (!Number.isNaN(kickoff)) {
      const elapsed = Math.max(1, Math.floor((Date.now() - kickoff) / 60_000) + 1);
      if (elapsed > 0 && elapsed < 130) return `${elapsed}'`;
    }
    return game.statusShort ?? game.statusLong ?? "LIVE";
  }
  const kickoff = new Date(game.kickoffAt);
  return Number.isNaN(kickoff.getTime()) ? "Time TBD" : kickoff.toLocaleTimeString([], { hour: "numeric", minute: "2-digit" });
}

function MatchTop({ game }: { game: MatchGame }) {
  return (
    <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "14px 24px", borderBottom: "1px solid var(--line)", flex: "none" }}>
      <div style={{ display: "flex", alignItems: "center", gap: 11, minWidth: 0 }}>
        <Link href="/fixtures" className="wc-icon-btn" aria-label="Back to fixtures" style={{ textDecoration: "none" }}>
          <svg width="16" height="16" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round">
            <path d="M10 3 5 8l5 5" />
          </svg>
        </Link>
        <div style={{ minWidth: 0 }}>
          <div style={{ fontSize: 15, fontWeight: 700, letterSpacing: "-0.01em", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>
            {teamName(game.a, game.aName)} v {teamName(game.b, game.bName)}
          </div>
          <div className="wc-eyebrow" style={{ marginTop: 1 }}>
            World Cup 2026 · {fixtureStageLabel(game.round, game.group)}
          </div>
        </div>
      </div>
      <div style={{ display: "flex", alignItems: "center", gap: 8, flex: "none" }}>
        <ThemeToggle />
      </div>
    </div>
  );
}

function TeamCrest({ code, label, formation }: { code: string | null; label?: string | null; formation?: string | null }) {
  return (
    <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 9, flex: 1, minWidth: 0 }}>
      <div
        style={{
          width: 62,
          height: 62,
          borderRadius: 16,
          background: "var(--surface-2)",
          border: "1px solid var(--line-2)",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          fontSize: 34,
          boxShadow: "0 8px 24px -12px rgba(0,0,0,0.5)",
        }}
      >
        {teamFlag(code)}
      </div>
      <div style={{ textAlign: "center", minWidth: 0 }}>
        <div style={{ fontSize: 17, fontWeight: 800, letterSpacing: "-0.02em", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>
          {teamName(code, label)}
        </div>
        {formation && <div className="wc-num" style={{ fontSize: 10.5, color: "var(--faint)", marginTop: 3 }}>{formation}</div>}
      </div>
    </div>
  );
}

function liveClockStartSeconds(game: MatchGame) {
  if (typeof game.minute === "number") return game.minute * 60 + new Date().getSeconds();
  const label = statusLabel(game);
  const minute = Number(label.match(/^(\d+)/)?.[1]);
  if (Number.isFinite(minute)) return minute * 60 + new Date().getSeconds();
  return 0;
}

function LiveClock({ game }: { game: MatchGame }) {
  const [seconds, setSeconds] = useState(liveClockStartSeconds(game));
  useEffect(() => {
    setSeconds(liveClockStartSeconds(game));
    if (game.status !== "live") return;
    const id = setInterval(() => setSeconds((current) => current + 1), 1000);
    return () => clearInterval(id);
  }, [game.id, game.kickoffAt, game.minute, game.status]);
  const mm = Math.floor(seconds / 60);
  const ss = seconds % 60;
  return (
    <div style={{ display: "inline-flex", alignItems: "center", gap: 8 }}>
      <span className="wc-live-dot" />
      <span className="wc-num" style={{ fontSize: 14, fontWeight: 600, color: "var(--up)", letterSpacing: "0.04em" }}>
        {mm}:{String(ss).padStart(2, "0")}
      </span>
    </div>
  );
}

function LiveScoreboard({ game, compact = false }: { game: MatchGame; compact?: boolean }) {
  const live = game.status === "live" || game.status === "paused";
  const homeLineup = game.lineups?.find((lineup) => lineup.team === game.a || lineup.teamName === game.aName);
  const awayLineup = game.lineups?.find((lineup) => lineup.team === game.b || lineup.teamName === game.bName);
  return (
    <div
      style={{
        position: "relative",
        overflow: "hidden",
        borderRadius: 18,
        padding: compact ? "18px 16px 16px" : "22px 26px 20px",
        background: "linear-gradient(180deg, var(--surface-2), var(--bg))",
        border: "1px solid var(--line-2)",
      }}
    >
      <div style={{ display: "flex", alignItems: "center", justifyContent: "center", gap: 10, marginBottom: 16, flexWrap: "wrap" }}>
        <span className="wc-pill">
          {live && <span className="wc-live-dot" />}
          {live ? `Live · ${statusLabel(game)}` : statusLabel(game)}
        </span>
        <span className="wc-eyebrow">{fixtureStageLabel(game.round, game.group)}</span>
      </div>
      <div style={{ display: "flex", alignItems: "center", gap: compact ? 6 : 14 }}>
        <TeamCrest code={game.a} label={game.aName} formation={homeLineup?.formation} />
        <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 6, flex: "none" }}>
          <div style={{ display: "flex", alignItems: "center", gap: compact ? 10 : 16 }}>
            <span className="wc-num" style={{ fontSize: compact ? 46 : 56, fontWeight: 600, lineHeight: 1, letterSpacing: "-0.03em" }}>
              {game.sa ?? "–"}
            </span>
          <span className="wc-num" style={{ fontSize: 22, fontWeight: 500, color: "var(--faint)" }}>–</span>
            <span className="wc-num" style={{ fontSize: compact ? 46 : 56, fontWeight: 600, lineHeight: 1, letterSpacing: "-0.03em" }}>
              {game.sb ?? "–"}
            </span>
          </div>
          {live ? <LiveClock game={game} /> : (
            <span className="wc-num" style={{ fontSize: 11, color: "var(--dim)" }}>
              {scoreLabel(game) === "vs" ? "Not started" : statusLabel(game)}
            </span>
          )}
        </div>
        <TeamCrest code={game.b} label={game.bName} formation={awayLineup?.formation} />
      </div>
      {game.venue && (
        <div style={{ display: "flex", alignItems: "center", justifyContent: "center", gap: 7, marginTop: 16, color: "var(--faint)" }}>
          <svg width="12" height="12" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.4">
            <path d="M8 1.5c2.8 0 5 2.2 5 5 0 3.4-5 8-5 8s-5-4.6-5-8c0-2.8 2.2-5 5-5z" />
            <circle cx="8" cy="6.5" r="1.6" />
          </svg>
          <span className="wc-num" style={{ fontSize: 11 }}>{game.venue}</span>
        </div>
      )}
    </div>
  );
}

function HolderChip({ player, teamCode, currentUid }: { player: SerializedPlayer; teamCode: string; currentUid?: string }) {
  const pick = player.teams.find((team) => team.code === teamCode);
  const isMe = player.uid === currentUid;
  return (
    <div style={{ display: "flex", alignItems: "center", gap: 10, padding: "9px 11px", borderRadius: 11, background: "var(--surface-2)", border: "1px solid var(--line)" }}>
      <div className="wc-avatar" style={{ width: 30, height: 30, borderRadius: 9, background: isMe ? "var(--lime)" : "var(--surface-3)", color: isMe ? "var(--on-lime)" : "var(--dim)" }}>
        {player.short}
      </div>
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
          <span style={{ fontSize: 13.5, fontWeight: 700, letterSpacing: "-0.01em" }}>{isMe ? "You" : player.name}</span>
          <span className="wc-num" style={{ fontSize: 10, color: player.rank <= 3 ? "var(--gold)" : "var(--faint)" }}>P{player.rank || "–"}</span>
        </div>
        <div style={{ fontSize: 11.5, color: "var(--dim)", fontWeight: 600, marginTop: 1 }}>
          {pick ? `${pick.pts} pts · +${pick.rem} still possible` : "picked this team"}
        </div>
      </div>
    </div>
  );
}

function matchOutcomeLabel(game: MatchGame) {
  const home = teamName(game.a, game.aName);
  const away = teamName(game.b, game.bName);
  if (game.sa == null || game.sb == null) return `${home} vs ${away}`;
  if (game.sa === game.sb) return `Draw right now · ${home} ${game.sa}–${game.sb} ${away}`;
  const leader = game.sa > game.sb ? home : away;
  return `${leader} winning · ${home} ${game.sa}–${game.sb} ${away}`;
}

function stakesHeading(game: MatchGame) {
  if (game.status === "finished") {
    const home = teamName(game.a, game.aName);
    const away = teamName(game.b, game.bName);
    if (game.sa == null || game.sb == null) return "Final outcome";
    if (game.sa === game.sb) return `Final · ${home} ${game.sa}–${game.sb} ${away}`;
    const winner = game.sa > game.sb ? home : away;
    return `${winner} won · ${home} ${game.sa}–${game.sb} ${away}`;
  }
  return "If it ends now";
}

function StakesBand({ game, players, currentUid }: { game: MatchGame; players: SerializedPlayer[]; currentUid?: string }) {
  const sides = [
    { code: game.a, name: teamName(game.a, game.aName), flag: teamFlag(game.a) },
    { code: game.b, name: teamName(game.b, game.bName), flag: teamFlag(game.b) },
  ];
  return (
    <div className="wc-card" style={{ padding: 0, overflow: "hidden" }}>
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "13px 16px 12px", borderBottom: "1px solid var(--line)" }}>
        <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
          <span style={{ fontSize: 14 }}>{game.status === "finished" ? "🏁" : "💸"}</span>
          <span style={{ fontSize: 14.5, fontWeight: 800, letterSpacing: "-0.01em" }}>{stakesHeading(game)}</span>
          {game.status !== "finished" && game.sa != null && game.sb != null && (
            <span className="wc-num" style={{ color: "var(--dim)", fontSize: 11, fontWeight: 600 }}>
              {matchOutcomeLabel(game).replace(" right now", "")}
            </span>
          )}
        </div>
        <span className="wc-pill" style={{ color: "var(--up)", borderColor: "var(--up)" }}>
          <span className="wc-live-dot" />Live
        </span>
      </div>
      <div className="wc-lv-stakes-grid" style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12, padding: "14px 16px" }}>
        {sides.map((side) => {
          const holders = side.code ? players.filter((player) => player.teams.some((team) => team.code === side.code)).slice(0, 5) : [];
          return (
            <div key={side.name}>
              <div style={{ display: "flex", alignItems: "center", gap: 7, marginBottom: 9 }}>
                <span style={{ fontSize: 15 }}>{side.flag}</span>
                <span style={{ fontSize: 12.5, fontWeight: 700 }}>{side.name}</span>
                <span className="wc-eyebrow">{holders.length ? `${holders.length} holders` : "no picks"}</span>
              </div>
              <div style={{ display: "flex", flexDirection: "column", gap: 7 }}>
                {holders.length ? holders.map((player) => (
                  <HolderChip key={player.uid} player={player} teamCode={side.code ?? ""} currentUid={currentUid} />
                )) : (
                  <div style={{ color: "var(--dim)", fontSize: 12.5, lineHeight: 1.4 }}>No one in the pool holds this side.</div>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

function eventMinute(event: MatchEventDoc) {
  if (event.minute == null) return "";
  return `${event.minute}${event.extra ? `+${event.extra}` : ""}'`;
}

function EventIcon({ event }: { event: MatchEventDoc }) {
  const base = {
    width: 30,
    height: 30,
    borderRadius: 9,
    flex: "none",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    fontSize: 14,
  };
  if (event.type === "goal") return <div style={{ ...base, background: "var(--lime-soft)", border: "1px solid var(--lime-line)" }}>⚽</div>;
  if (event.type === "card") {
    const red = (event.detail ?? "").toLowerCase().includes("red");
    return (
      <div style={{ ...base, background: red ? "var(--down-soft)" : "var(--gold-soft)", border: `1px solid ${red ? "var(--down)" : "var(--gold-line)"}` }}>
        <span style={{ width: 11, height: 14, borderRadius: 2, background: red ? "var(--down)" : "var(--gold)", display: "block" }} />
      </div>
    );
  }
  if (event.type === "substitution") return <div style={{ ...base, background: "var(--surface-3)", border: "1px solid var(--line-2)" }}>🔄</div>;
  if (event.type === "var") return <div className="wc-num" style={{ ...base, background: "var(--surface-2)", border: "1px solid var(--line)", color: "var(--faint)", fontSize: 9, fontWeight: 800 }}>VAR</div>;
  if ((event.detail ?? "").toLowerCase().includes("chance") || (event.detail ?? "").toLowerCase().includes("shot")) {
    return (
      <div style={{ ...base, background: "var(--surface-2)", border: "1px solid var(--line)", color: "var(--faint)" }}>
        <svg width="14" height="14" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5">
          <circle cx="8" cy="8" r="5.5" strokeDasharray="2 2" />
        </svg>
      </div>
    );
  }
  return <div style={{ ...base, background: "var(--surface-2)", border: "1px solid var(--line)", color: "var(--faint)" }}>•</div>;
}

function eventTitle(event: MatchEventDoc) {
  if (event.type === "goal") return event.detail?.toLowerCase().includes("own") ? "Own goal" : "Goal";
  if (event.type === "substitution") return "Substitution";
  if (event.type === "card") return event.detail ?? "Card";
  if (event.type === "var") return "VAR";
  return event.detail ?? "Event";
}

function eventBody(event: MatchEventDoc) {
  if (event.type === "goal") return [event.player, event.assist ? `assist ${event.assist}` : null].filter(Boolean).join(" · ");
  if (event.type === "substitution") return event.player && event.assist ? `${event.assist} for ${event.player}` : event.player ?? event.assist ?? "";
  return [event.player, event.comments].filter(Boolean).join(" · ");
}

function timelineTeamFlag(event: MatchEventDoc) {
  return event.team ? teamFlag(event.team) : null;
}

function eventStake(event: MatchEventDoc, game: MatchGame) {
  if (event.type !== "goal" || !event.team) return null;
  return `+pts for ${teamName(event.team, event.teamName)} holders`;
}

function TimelineSeparator({ label }: { label: string }) {
  return (
    <div style={{ display: "flex", alignItems: "center", gap: 10, padding: "10px 0" }}>
      <div style={{ flex: 1, height: 1, background: "var(--line)" }} />
      <span className="wc-eyebrow">{label}</span>
      <div style={{ flex: 1, height: 1, background: "var(--line)" }} />
    </div>
  );
}

function TimelineEventRow({ event, game }: { event: MatchEventDoc; game: MatchGame }) {
  const isGoal = event.type === "goal";
  const flag = timelineTeamFlag(event);
  const stake = eventStake(event, game);
  return (
    <div style={{ display: "flex", gap: 12, padding: "11px 0", position: "relative" }}>
      <div className="wc-num" style={{ width: 34, flex: "none", textAlign: "right", fontSize: 12, fontWeight: 600, color: isGoal ? "var(--lime-ink)" : "var(--faint)", paddingTop: 7 }}>
        {eventMinute(event) || "–"}
      </div>
      <EventIcon event={event} />
      <div style={{ flex: 1, minWidth: 0, paddingTop: 1 }}>
        <div style={{ fontSize: 14.5, fontWeight: isGoal ? 800 : 600, letterSpacing: "-0.01em", lineHeight: 1.3 }}>
          {eventTitle(event)}
          {flag && <span style={{ marginLeft: 6, fontSize: 13 }}>{flag}</span>}
        </div>
        {(eventBody(event) || event.detail) && (
          <div style={{ fontSize: 12.5, color: "var(--dim)", marginTop: 3, lineHeight: 1.35 }}>{eventBody(event) || event.detail}</div>
        )}
        {stake && (
          <div style={{ display: "inline-flex", alignItems: "center", gap: 6, marginTop: 7, padding: "3px 9px", borderRadius: 999, background: "var(--lime-soft)", border: "1px solid var(--lime-line)" }}>
            <span style={{ fontSize: 11 }}>💸</span>
            <span className="wc-num" style={{ fontSize: 10.5, fontWeight: 600, color: "var(--lime-ink)" }}>{stake}</span>
          </div>
        )}
      </div>
    </div>
  );
}

function MatchTimeline({ game }: { game: MatchGame }) {
  const events = [...(game.events ?? [])].sort((a, b) => (b.minute ?? -1) - (a.minute ?? -1) || (b.extra ?? 0) - (a.extra ?? 0));
  let insertedHalfTime = false;
  return (
    <div className="wc-card" style={{ padding: "8px 16px 12px" }}>
      <SectionLabel style={{ display: "block", padding: "10px 0 4px" }}>Timeline</SectionLabel>
      {game.status === "live" && (
        <div style={{ display: "flex", alignItems: "center", gap: 12, padding: "4px 0 14px" }}>
          <div style={{ width: 30, display: "flex", justifyContent: "center", flex: "none" }}><span className="wc-live-marker-dot" /></div>
          <span className="wc-num" style={{ fontSize: 12, fontWeight: 600, color: "var(--up)", whiteSpace: "nowrap" }}>{statusLabel(game)} · In play</span>
        </div>
      )}
      {events.length ? events.map((event) => {
        const showHalfTime = !insertedHalfTime && (event.minute ?? 0) <= 45 && events.some((item) => (item.minute ?? 0) > 45);
        if (showHalfTime) insertedHalfTime = true;
        return (
          <div key={event.id}>
            {showHalfTime && <TimelineSeparator label={`Half time · ${teamName(game.a, game.aName)} ${game.sa ?? 0}–${game.sb ?? 0} ${teamName(game.b, game.bName)}`} />}
            <TimelineEventRow event={event} game={game} />
          </div>
        );
      }) : (
        <div style={{ color: "var(--dim)", fontSize: 13, padding: "14px 0 10px" }}>No match events published yet.</div>
      )}
    </div>
  );
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

function playerLastName(name: string) {
  const parts = name.split(/\s+/).filter(Boolean);
  return parts.at(-1) ?? name;
}

type PitchPlayer = MatchLineupPlayerDoc & {
  x: number;
  y: number;
  captain?: boolean;
  goal?: boolean;
  booked?: boolean;
  off?: boolean;
  home: boolean;
};

function pitchPlayers(lineup: MatchLineupTeamDoc, home: boolean, events: MatchEventDoc[] = []): PitchPlayer[] {
  const positions = lineupPositions(lineup.startXI);
  const maxRow = Math.max(4, ...positions.map((entry) => entry.row));
  return positions.map(({ player, row, col, rowSize }, index) => {
    const baseX = col / (rowSize + 1) * 100;
    const rowY = 7 + ((row - 1) / Math.max(1, maxRow - 1)) * 37;
    const playerEvents = events.filter((event) => event.player === player.name);
    return {
      ...player,
      x: home ? baseX : 100 - baseX,
      y: home ? rowY : 100 - rowY,
      captain: index === 2,
      goal: playerEvents.some((event) => event.type === "goal"),
      booked: playerEvents.some((event) => event.type === "card"),
      off: playerEvents.some((event) => event.type === "substitution"),
      home,
    };
  });
}

function singleTeamPitchPlayers(lineup: MatchLineupTeamDoc, events: MatchEventDoc[] = []): PitchPlayer[] {
  const positions = lineupPositions(lineup.startXI);
  const maxRow = Math.max(4, ...positions.map((entry) => entry.row));
  return positions.map(({ player, row, col, rowSize }, index) => {
    const playerEvents = events.filter((event) => event.player === player.name);
    return {
      ...player,
      x: col / (rowSize + 1) * 100,
      y: 92 - (row / (maxRow + 1)) * 82,
      captain: index === 2,
      goal: playerEvents.some((event) => event.type === "goal"),
      booked: playerEvents.some((event) => event.type === "card"),
      off: playerEvents.some((event) => event.type === "substitution"),
      home: true,
    };
  });
}

function PlayerDot({ player }: { player: PitchPlayer }) {
  const ring = player.home ? "var(--lime-line)" : "var(--line-2)";
  const bg = player.home ? "var(--lime-soft)" : "var(--surface-3)";
  const ink = player.home ? "var(--lime-ink)" : "var(--text)";
  return (
    <div style={{ position: "absolute", left: `${player.x}%`, top: `${player.y}%`, transform: "translate(-50%, -50%)", textAlign: "center", width: 54 }}>
      <div style={{ position: "relative", width: 30, height: 30, margin: "0 auto", borderRadius: "50%", background: bg, border: `1.5px solid ${ring}`, display: "flex", alignItems: "center", justifyContent: "center" }}>
        <span className="wc-num" style={{ fontSize: 11.5, fontWeight: 600, color: ink }}>{player.number ?? "–"}</span>
        {player.captain && <span style={{ position: "absolute", top: -4, right: -5, width: 13, height: 13, borderRadius: "50%", background: "var(--gold)", color: "var(--on-lime)", fontSize: 8, fontWeight: 700, display: "flex", alignItems: "center", justifyContent: "center", fontFamily: "var(--mono)" }}>C</span>}
        {player.goal && <span style={{ position: "absolute", bottom: -4, right: -6, fontSize: 11 }}>⚽</span>}
        {player.booked && <span style={{ position: "absolute", bottom: -3, left: -5, width: 8, height: 11, borderRadius: 1.5, background: "var(--gold)" }} />}
        {player.off && <span style={{ position: "absolute", top: -4, left: -5, fontSize: 9, color: "var(--down)" }}>▾</span>}
      </div>
      <div style={{ fontSize: 9.5, fontWeight: 600, color: "var(--dim)", marginTop: 3, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>
        {playerLastName(player.name)}
      </div>
    </div>
  );
}

function FormationPitch({ home, away }: { home: PitchPlayer[]; away: PitchPlayer[] }) {
  return (
    <div
      style={{
        position: "relative",
        width: "100%",
        aspectRatio: "3 / 4",
        borderRadius: 14,
        overflow: "hidden",
        background: "linear-gradient(180deg, var(--surface-2), var(--bg) 50%, var(--surface-2))",
        border: "1px solid var(--line-2)",
      }}
    >
      <svg viewBox="0 0 100 133" preserveAspectRatio="none" style={{ position: "absolute", inset: 0, width: "100%", height: "100%", opacity: 0.5 }}>
        <g fill="none" stroke="var(--line-2)" strokeWidth="0.4">
          <line x1="0" y1="66.5" x2="100" y2="66.5" />
          <circle cx="50" cy="66.5" r="11" />
          <rect x="28" y="0" width="44" height="16" />
          <rect x="28" y="117" width="44" height="16" />
          <rect x="40" y="0" width="20" height="7" />
          <rect x="40" y="126" width="20" height="7" />
        </g>
      </svg>
      {[...home, ...away].map((player) => (
        <PlayerDot key={`${player.home ? "h" : "a"}-${player.id}`} player={player} />
      ))}
    </div>
  );
}

function TeamFormationPitch({ players }: { players: PitchPlayer[] }) {
  return (
    <div
      style={{
        position: "relative",
        width: "100%",
        aspectRatio: "3 / 4",
        borderRadius: 14,
        overflow: "hidden",
        background: "linear-gradient(180deg, var(--surface-2), var(--bg) 50%, var(--surface-2))",
        border: "1px solid var(--line-2)",
      }}
    >
      <svg viewBox="0 0 100 133" preserveAspectRatio="none" style={{ position: "absolute", inset: 0, width: "100%", height: "100%", opacity: 0.5 }}>
        <g fill="none" stroke="var(--line-2)" strokeWidth="0.4">
          <line x1="0" y1="66.5" x2="100" y2="66.5" />
          <circle cx="50" cy="66.5" r="11" />
          <rect x="28" y="0" width="44" height="16" />
          <rect x="28" y="117" width="44" height="16" />
          <rect x="40" y="0" width="20" height="7" />
          <rect x="40" y="126" width="20" height="7" />
        </g>
      </svg>
      {players.map((player) => (
        <PlayerDot key={`single-${player.id}`} player={player} />
      ))}
    </div>
  );
}

function LineupTeamMeta({ lineup }: { lineup: MatchLineupTeamDoc }) {
  return (
    <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8, minWidth: 0, padding: "10px 11px", borderRadius: 12, background: "var(--surface-2)", border: "1px solid var(--line)" }}>
      <div style={{ minWidth: 0 }}>
        <div className="wc-eyebrow" style={{ fontSize: 9 }}>Formation</div>
        <div className="wc-num" style={{ marginTop: 4, fontSize: 15, fontWeight: 500, color: "var(--dim)" }}>
          {lineup.formation ?? "TBD"}
        </div>
      </div>
      <div style={{ minWidth: 0 }}>
        <div className="wc-eyebrow" style={{ fontSize: 9 }}>Manager</div>
        <div style={{ marginTop: 4, fontSize: 14, fontWeight: 600, color: "var(--dim)", letterSpacing: "-0.01em", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>
          {lineup.coach ?? "TBD"}
        </div>
      </div>
    </div>
  );
}

function BenchList({ lineup }: { lineup: MatchLineupTeamDoc }) {
  return (
    <div>
      <div style={{ display: "flex", alignItems: "center", gap: 7, marginBottom: 9 }}>
        <span style={{ fontSize: 14 }}>{teamFlag(lineup.team)}</span>
        <SectionLabel style={{ display: "inline" }}>{lineup.teamName} bench</SectionLabel>
      </div>
      <div style={{ display: "flex", flexWrap: "wrap", gap: 7 }}>
        {lineup.substitutes.map((player) => (
          <div key={player.id} title={`${player.number ?? "-"} ${player.name}${player.position ? ` · ${player.position}` : ""}`} style={{ display: "flex", alignItems: "center", gap: 7, padding: "5px 10px 5px 7px", borderRadius: 999, background: "var(--surface-2)", border: "1px solid var(--line)" }}>
            <span className="wc-num" style={{ fontSize: 10.5, color: "var(--faint)", width: 16, textAlign: "center" }}>{player.number ?? "–"}</span>
            <span style={{ fontSize: 12.5, fontWeight: 600 }}>{playerLastName(player.name)}</span>
          </div>
        ))}
      </div>
    </div>
  );
}

function Lineups({ game }: { game: MatchGame }) {
  const [selected, setSelected] = useState(0);
  const homeLineup = game.lineups?.find((lineup) => lineup.team === game.a || lineup.teamName === game.aName) ?? game.lineups?.[0];
  const awayLineup = game.lineups?.find((lineup) => lineup.team === game.b || lineup.teamName === game.bName) ?? game.lineups?.[1];
  if (!homeLineup || !awayLineup) {
    return (
      <div className="wc-card" style={{ padding: 16 }}>
        <SectionLabel>Lineups</SectionLabel>
        <div style={{ color: "var(--dim)", fontSize: 13, marginTop: 12 }}>Lineups will appear when the provider publishes them.</div>
      </div>
    );
  }
  const lineups = [homeLineup, awayLineup];
  const selectedLineup = lineups[Math.min(selected, lineups.length - 1)];
  const selectedPlayers = singleTeamPitchPlayers(selectedLineup, game.events);
  return (
    <div className="wc-card" style={{ padding: 16 }}>
      <div style={{ marginBottom: 14 }}>
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 12, marginBottom: 10 }}>
          <SectionLabel style={{ display: "inline" }}>Lineups</SectionLabel>
          <span className="wc-eyebrow">starting XI</span>
        </div>
        <div className="wc-lv-seg" style={{ marginBottom: 10 }}>
          {lineups.map((lineup, index) => (
            <button key={lineup.teamName} type="button" className={selected === index ? "on" : ""} onClick={() => setSelected(index)} aria-pressed={selected === index}>
              <span style={{ marginRight: 6 }}>{teamFlag(lineup.team)}</span>
              {lineup.teamName}
            </button>
          ))}
        </div>
        <LineupTeamMeta lineup={selectedLineup} />
      </div>
      <TeamFormationPitch players={selectedPlayers} />
      <div style={{ display: "flex", flexDirection: "column", gap: 16, marginTop: 18 }}>
        {selectedLineup.substitutes.length > 0 && <BenchList lineup={selectedLineup} />}
      </div>
    </div>
  );
}

function numericStat(value: MatchStatisticDoc["value"]) {
  if (typeof value === "number") return value;
  if (typeof value !== "string") return null;
  const parsed = Number(value.replace("%", ""));
  return Number.isFinite(parsed) ? parsed : null;
}

function valueLabel(value: MatchStatisticDoc["value"]) {
  if (value == null || value === "") return "–";
  return String(value);
}

function statRows(game: MatchGame) {
  const byType = new Map<string, { a: MatchStatisticDoc["value"]; b: MatchStatisticDoc["value"] }>();
  for (const stat of game.statistics ?? []) {
    const row = byType.get(stat.type) ?? { a: null, b: null };
    if (stat.team === game.a || (!stat.team && stat.teamName === game.aName)) row.a = stat.value;
    if (stat.team === game.b || (!stat.team && stat.teamName === game.bName)) row.b = stat.value;
    byType.set(stat.type, row);
  }
  return Array.from(byType.entries()).filter(([, row]) => row.a != null || row.b != null);
}

function StatBar({ label, a, b }: { label: string; a: MatchStatisticDoc["value"]; b: MatchStatisticDoc["value"] }) {
  const av = numericStat(a);
  const bv = numericStat(b);
  const total = av != null && bv != null ? av + bv : 0;
  const aPct = total > 0 ? Math.max(0, Math.min(100, (av! / total) * 100)) : 50;
  const lead = av == null || bv == null || av === bv ? null : av > bv ? "a" : "b";
  return (
    <div style={{ padding: "10px 0" }}>
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 7 }}>
        <span className="wc-num" style={{ fontSize: 13.5, fontWeight: 600, color: lead === "a" ? "var(--text)" : "var(--dim)" }}>{valueLabel(a)}</span>
        <span className="wc-eyebrow">{label}</span>
        <span className="wc-num" style={{ fontSize: 13.5, fontWeight: 600, color: lead === "b" ? "var(--text)" : "var(--dim)" }}>{valueLabel(b)}</span>
      </div>
      <div style={{ display: "flex", gap: 4, height: 5 }}>
        <div style={{ flex: 1, display: "flex", justifyContent: "flex-end", background: "var(--surface-3)", borderRadius: "999px 0 0 999px", overflow: "hidden" }}>
          <div style={{ width: `${aPct}%`, background: lead === "a" ? "var(--lime)" : "var(--line-2)", borderRadius: "999px 0 0 999px" }} />
        </div>
        <div style={{ flex: 1, background: "var(--surface-3)", borderRadius: "0 999px 999px 0", overflow: "hidden" }}>
          <div style={{ width: `${100 - aPct}%`, background: lead === "b" ? "var(--text)" : "var(--line-2)", borderRadius: "0 999px 999px 0" }} />
        </div>
      </div>
    </div>
  );
}

function MatchStats({ game }: { game: MatchGame }) {
  const rows = statRows(game);
  return (
    <div className="wc-card" style={{ padding: "10px 16px 14px" }}>
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "10px 0 4px" }}>
        <span style={{ fontSize: 15 }}>{teamFlag(game.a)}</span>
        <SectionLabel style={{ display: "inline" }}>Match stats</SectionLabel>
        <span style={{ fontSize: 15 }}>{teamFlag(game.b)}</span>
      </div>
      {rows.length ? rows.map(([label, row]) => <StatBar key={label} label={label} a={row.a} b={row.b} />) : (
        <div style={{ color: "var(--dim)", fontSize: 13, padding: "14px 0 10px" }}>Match stats will appear as the game data comes in.</div>
      )}
    </div>
  );
}

export function FixtureDetailScreen({ fixtureId }: { fixtureId: string }) {
  const { user } = useAuth();
  const { fixtures, liveState, loading: fixturesLoading } = useFixtures();
  const { results, loading: resultsLoading } = useResults();
  const { players } = useStandings(user?.uid);
  const [tab, setTab] = useState<"Timeline" | "Lineups" | "Stats">("Timeline");

  const resultById = useMemo(() => new Map(results.map((result) => [result.id, result])), [results]);
  const liveById = useMemo(() => new Map(liveState.map((state) => [state.fixtureId, state])), [liveState]);
  const game = useMemo(() => {
    const fixture = fixtures.find((item) => item.id === fixtureId);
    return fixture ? mergeFixture(fixture, liveById.get(fixture.id), resultById.get(fixture.id)) : null;
  }, [fixtureId, fixtures, liveById, resultById]);
  const displayGame = useMemo(() => (game ? withPreviewData(game) : null), [game]);

  if ((fixturesLoading || resultsLoading) && !displayGame) {
    return <div className="wc-card" style={{ maxWidth: 920, margin: "22px auto", padding: 28, color: "var(--dim)" }}>Loading match...</div>;
  }

  if (!displayGame) {
    return (
      <div style={{ maxWidth: 760, margin: "0 auto", padding: "22px 18px 34px" }}>
        <MatchTop game={{ id: fixtureId, label: "", round: "Fixture", group: null, date: "", time: "", kickoffAt: "", venue: null, status: "unknown", a: null, b: null, aName: "TBD", bName: "TBD", source: "temporary", sourceIds: {} }} />
        <div className="wc-card" style={{ padding: 28, color: "var(--dim)", textAlign: "center" }}>Match not found.</div>
      </div>
    );
  }

  return (
    <div style={{ background: "var(--bg)", minHeight: "100vh", display: "flex", flexDirection: "column" }}>
      <MatchTop game={displayGame} />
      <div style={{ maxWidth: 1280, margin: "0 auto", width: "100%", padding: "22px 24px 56px" }}>
        <LiveScoreboard game={displayGame} />
        <div style={{ margin: "18px 0" }}>
          <StakesBand game={displayGame} players={players} currentUid={user?.uid} />
        </div>
        <div className="wc-lv-mobile-tabs">
          {(["Timeline", "Lineups", "Stats"] as const).map((item) => (
            <button key={item} className={tab === item ? "on" : ""} onClick={() => setTab(item)}>{item}</button>
          ))}
        </div>
        <div className="wc-lv-detail-grid wc-lv-desktop-detail">
          <div className="wc-lv-lineups-col">
            <Lineups game={displayGame} />
          </div>
          <div className="wc-lv-main-col">
            <MatchTimeline game={displayGame} />
            <MatchStats game={displayGame} />
          </div>
        </div>
        <div className="wc-lv-mobile-detail">
          {tab === "Timeline" && <MatchTimeline game={displayGame} />}
          {tab === "Lineups" && <Lineups game={displayGame} />}
          {tab === "Stats" && <MatchStats game={displayGame} />}
        </div>
      </div>
    </div>
  );
}
