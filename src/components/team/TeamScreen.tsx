"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import { PageHead, SectionLabel, TierBadge } from "@/components/ui";
import { fixtureHref, teamHref } from "@/components/entity-links";
import { GROUP_ORDER, GROUPS, T, tierMeta } from "@/lib/data";
import { fixtureStageLabel } from "@/lib/fixtures";
import { useFixtures } from "@/hooks/useFixtures";
import { useResults } from "@/hooks/useResults";
import { useStandings } from "@/hooks/useStandings";
import { useTeamProfiles } from "@/hooks/useTeamProfiles";
import { enrichPlayerTeams, useMyData } from "@/hooks/useMyData";
import { useAuth } from "@/lib/auth";
import type { FixtureWithId, LiveStateWithId, ResultWithId } from "@/lib/firestore";
import type { SerializedPlayer, TeamProfileDoc } from "@/lib/types";

type TeamFact = {
  fifa?: number;
  titles?: number;
  best?: string;
  apps?: number;
  blurb: string;
  key: { name: string; pos: string }[];
};

const TEAM_FACTS: Record<string, TeamFact> = {
  ARG: { fifa: 1, titles: 3, best: "Winners '78 '86 '22", apps: 18, blurb: "Reigning champions, built to grind out knockout football.", key: [{ name: "L. Messi", pos: "FW" }, { name: "J. Alvarez", pos: "FW" }, { name: "E. Martinez", pos: "GK" }] },
  BRA: { fifa: 5, titles: 5, best: "5x Winners", apps: 22, blurb: "Record five-time winners with attacking talent everywhere.", key: [{ name: "Vinicius Jr", pos: "FW" }, { name: "Rodrygo", pos: "FW" }, { name: "Casemiro", pos: "MF" }] },
  ENG: { fifa: 4, titles: 1, best: "Winners '66", apps: 16, blurb: "Deep, athletic squad still chasing a second star.", key: [{ name: "J. Bellingham", pos: "MF" }, { name: "H. Kane", pos: "FW" }, { name: "B. Saka", pos: "FW" }] },
  FRA: { fifa: 2, titles: 2, best: "Winners '98 '18", apps: 16, blurb: "Tournament favourites with ruthless transitions and a world-class spine.", key: [{ name: "K. Mbappe", pos: "FW" }, { name: "A. Tchouameni", pos: "MF" }, { name: "W. Saliba", pos: "DF" }] },
  GER: { fifa: 9, titles: 4, best: "4x Winners", apps: 20, blurb: "Four-time winners rebuilding around a young core.", key: [{ name: "J. Musiala", pos: "MF" }, { name: "F. Wirtz", pos: "MF" }, { name: "K. Havertz", pos: "FW" }] },
  MEX: { fifa: 16, titles: 0, best: "QF '70 '86", apps: 17, blurb: "Always at the finals; chasing a first deep run abroad.", key: [{ name: "S. Gimenez", pos: "FW" }, { name: "E. Alvarez", pos: "MF" }, { name: "G. Ochoa", pos: "GK" }] },
  NED: { fifa: 7, titles: 0, best: "Runners-up x3", apps: 11, blurb: "Total-football heritage, dangerous on the counter.", key: [{ name: "V. van Dijk", pos: "DF" }, { name: "C. Gakpo", pos: "FW" }, { name: "F. de Jong", pos: "MF" }] },
  USA: { fifa: 13, titles: 0, best: "3rd '30", apps: 11, blurb: "Athletic young core on home soil.", key: [{ name: "C. Pulisic", pos: "FW" }, { name: "W. McKennie", pos: "MF" }, { name: "Y. Musah", pos: "MF" }] },
};

function fallbackFact(code: string): TeamFact {
  const team = T[code];
  const meta = tierMeta[team.t];
  return {
    blurb: `${team.n} are a Tier ${team.t} ${meta.label.toLowerCase()} pick. ${meta.blurb}`,
    key: [],
  };
}

function kickoffLabel(value?: string | null) {
  if (!value) return "Time TBD";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "Time TBD";
  return date.toLocaleString([], { month: "short", day: "numeric", hour: "numeric", minute: "2-digit" });
}

function matchTeams(match: Pick<FixtureWithId, "a" | "b" | "aName" | "bName">, code: string) {
  const opponentCode = match.a === code ? match.b : match.a;
  const opponentName = match.a === code ? match.bName : match.aName;
  const opponent = opponentCode ? T[opponentCode] : null;
  return { opponentCode, opponentName: opponent?.n ?? opponentName ?? "TBD", opponentFlag: opponent?.f ?? "•" };
}

function resultScore(result: ResultWithId) {
  const score = result.sa == null || result.sb == null ? "Result entered" : `${result.sa}-${result.sb}`;
  return result.pens ? `${score} · pens ${result.pens}` : score;
}

function resultTone(result: ResultWithId, code: string) {
  if (result.win === "draw") return "Draw";
  if (result.win === code) return result.round === "Final" ? "Champion" : "Win";
  return "Loss";
}

function resultPointsForTeam(result: ResultWithId, code: string) {
  return result.pts?.find((row) => row.code === code)?.points ?? 0;
}

function normalizedRound(round?: string | null) {
  if (!round) return "Group";
  if (round.startsWith("Group")) return "Group";
  return round;
}

function rankTeamRoundsLeft(round?: string | null) {
  const value = (round ?? "").toLowerCase();
  const current = value.includes("final")
    ? 5
    : value.includes("semi")
      ? 4
      : value.includes("quarter")
        ? 3
        : value.includes("16")
          ? 2
          : value.includes("32")
            ? 1
            : 0;
  return Math.max(0, 6 - current - 1);
}

function nextFixturesForTeam(fixtures: FixtureWithId[], code: string) {
  return fixtures
    .filter((fixture) => (fixture.a === code || fixture.b === code) && fixture.status !== "finished")
    .sort((a, b) => {
      const ad = a.kickoffAt ? new Date(a.kickoffAt).getTime() : Number.MAX_SAFE_INTEGER;
      const bd = b.kickoffAt ? new Date(b.kickoffAt).getTime() : Number.MAX_SAFE_INTEGER;
      return ad - bd;
    });
}

function holderRows(players: SerializedPlayer[], code: string) {
  return players
    .map((player) => {
      const team = player.teams.find((entry) => entry.code === code);
      return team ? { player, team } : null;
    })
    .filter((row): row is { player: SerializedPlayer; team: SerializedPlayer["teams"][number] } => Boolean(row))
    .sort((a, b) => {
      const aRank = a.player.rank > 0 ? a.player.rank : 999;
      const bRank = b.player.rank > 0 ? b.player.rank : 999;
      return aRank - bRank || b.team.pts - a.team.pts;
    });
}

function SegTabs({ tabs, value, onChange }: { tabs: string[]; value: string; onChange: (value: string) => void }) {
  return (
    <div style={{ display: "flex", gap: 3, padding: 3, background: "var(--surface-2)", border: "1px solid var(--line)", borderRadius: 12 }}>
      {tabs.map((tab) => (
        <button
          key={tab}
          type="button"
          onClick={() => onChange(tab)}
          style={{
            flex: 1,
            fontFamily: "inherit",
            fontSize: 13,
            fontWeight: 600,
            padding: "9px 6px",
            borderRadius: 9,
            border: "none",
            cursor: "pointer",
            background: value === tab ? "var(--bg)" : "transparent",
            color: value === tab ? "var(--text)" : "var(--dim)",
            boxShadow: value === tab ? "0 1px 3px rgba(0,0,0,0.18)" : "none",
            letterSpacing: "-0.01em",
          }}
        >
          {tab}
        </button>
      ))}
    </div>
  );
}

function TeamLiveStrip({ match, live, code }: { match?: FixtureWithId; live?: LiveStateWithId; code: string }) {
  if (!match) return null;
  const opponent = matchTeams(match, code);
  const isA = match.a === code;
  const ownScore = isA ? live?.sa : live?.sb;
  const oppScore = isA ? live?.sb : live?.sa;
  return (
    <Link
      href={fixtureHref(match.id)}
      className="wc-card"
      style={{
        padding: "11px 15px",
        borderColor: "var(--lime-line)",
        display: "flex",
        alignItems: "center",
        gap: 11,
        background: "var(--lime-soft)",
        color: "var(--text)",
        textDecoration: "none",
        marginBottom: 16,
      }}
    >
      <span className="wc-live-dot" />
      <span className="wc-eyebrow" style={{ color: "var(--lime-ink)" }}>Live now</span>
      <span style={{ fontSize: 13.5, fontWeight: 700, letterSpacing: "-0.01em", flex: 1, minWidth: 0, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>
        {T[code]?.f} {T[code]?.n} {ownScore ?? 0}-{oppScore ?? 0} {opponent.opponentName} {opponent.opponentFlag}
      </span>
      <span className="wc-num" style={{ fontSize: 12, fontWeight: 600, color: "var(--lime-ink)" }}>{live?.minute ?? "LIVE"}′</span>
    </Link>
  );
}

function TeamHero({ code, group, alive, statusLine, big = false }: { code: string; group?: string | null; alive: boolean; statusLine: string; big?: boolean }) {
  const team = T[code];
  const meta = tierMeta[team.t];
  return (
    <div className="wc-card" style={{ padding: big ? "22px 24px" : "18px 18px", position: "relative", overflow: "hidden" }}>
      <div style={{ position: "absolute", top: -50, right: -30, width: 170, height: 170, borderRadius: "50%", background: "radial-gradient(circle, var(--surface-3), transparent 70%)", pointerEvents: "none" }} />
      <div style={{ display: "flex", alignItems: "center", gap: 16, position: "relative" }}>
        <div style={{ width: big ? 72 : 60, height: big ? 72 : 60, borderRadius: 18, flex: "none", display: "flex", alignItems: "center", justifyContent: "center", fontSize: big ? 40 : 34, background: "var(--flag-bg)", border: "1px solid var(--flag-bd)", boxShadow: "0 8px 22px -12px rgba(0,0,0,0.5)", filter: alive ? "none" : "grayscale(1)", opacity: alive ? 1 : 0.6 }}>{team.f}</div>
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 9, flexWrap: "wrap" }}>
            <span style={{ fontSize: big ? 26 : 22, fontWeight: 800, letterSpacing: "-0.02em" }}>{team.n}</span>
            <TierBadge tier={team.t} size={24} />
          </div>
          <div style={{ display: "flex", alignItems: "center", gap: 8, marginTop: 7 }}>
            <span className="wc-pill" style={{ padding: "3px 9px" }}>Group {group ?? GROUPS[code] ?? "—"}</span>
            <span style={{ fontSize: 12.5, color: "var(--dim)", fontWeight: 500 }}>{meta.label} · +{meta.win}/win</span>
          </div>
        </div>
      </div>
      <div style={{ display: "flex", alignItems: "center", gap: 9, marginTop: 16, padding: "10px 13px", borderRadius: 12, background: alive ? "var(--lime-soft)" : "var(--surface-2)", border: `1px solid ${alive ? "var(--lime-line)" : "var(--line)"}` }}>
        {alive ? <span className="wc-live-dot" style={{ width: 8, height: 8 }} /> : <span style={{ color: "var(--down)", fontSize: 13, flex: "none" }}>x</span>}
        <span style={{ fontSize: 13, fontWeight: 600, whiteSpace: "nowrap", color: alive ? "var(--lime-ink)" : "var(--dim)" }}>{alive ? "Still in" : "Out"}</span>
        <span style={{ fontSize: 12.5, color: "var(--dim)", minWidth: 0, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>· {statusLine}</span>
      </div>
    </div>
  );
}

function TeamStatTrio({ holders }: { holders: ReturnType<typeof holderRows> }) {
  const poolBanked = holders.reduce((sum, row) => sum + row.team.pts, 0);
  const poolWinnable = holders.reduce((sum, row) => sum + (row.team.alive ? row.team.rem : 0), 0);
  const stat = (value: number | string, label: string, color?: string) => (
    <div className="wc-card" style={{ minWidth: 0, padding: "13px 15px" }}>
      <div className="wc-num" style={{ fontSize: 22, fontWeight: 600, color: color ?? "var(--text)", lineHeight: 1 }}>{value}</div>
      <div className="wc-eyebrow wc-team-stat-label" style={{ marginTop: 6, fontSize: 9 }}>{label}</div>
    </div>
  );
  return (
    <div className="wc-team-stat-trio" style={{ display: "grid", gridTemplateColumns: "repeat(3, minmax(0, 1fr))", gap: 10 }}>
      {stat(holders.length, "held by")}
      {stat(poolBanked, "pool pts delivered", "var(--lime-ink)")}
      {stat(`+${poolWinnable}`, "still winnable", "var(--gold)")}
    </div>
  );
}

function TeamAbout({ code, profile }: { code: string; profile?: TeamProfileDoc }) {
  const fact = TEAM_FACTS[code] ?? fallbackFact(code);
  const coach = profile?.coach?.name ?? T[code].coach?.name;
  const stat = (value: string | number, label: string) => (
    <div style={{ flex: 1, padding: "11px 12px", borderRadius: 12, background: "var(--surface-2)", border: "1px solid var(--line)" }}>
      <div className="wc-num" style={{ fontSize: 18, fontWeight: 600, lineHeight: 1 }}>{value}</div>
      <div className="wc-eyebrow" style={{ marginTop: 6, fontSize: 8.5 }}>{label}</div>
    </div>
  );
  return (
    <div className="wc-card" style={{ padding: "17px 18px" }}>
      <SectionLabel>About</SectionLabel>
      <div style={{ fontSize: 14, color: "var(--text)", lineHeight: 1.55, marginTop: 9 }}>{fact.blurb}</div>
      {(fact.fifa || fact.titles != null || fact.apps) && (
        <div style={{ display: "flex", gap: 9, marginTop: 14 }}>
          {stat(fact.fifa ? `#${fact.fifa}` : "—", "FIFA rank")}
          {stat(fact.titles ?? 0, "WC titles")}
          {stat(fact.apps ?? "—", "appearances")}
        </div>
      )}
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginTop: 14, paddingTop: 13, borderTop: "1px solid var(--line)", gap: 12 }}>
        <div style={{ display: "flex", alignItems: "center", gap: 10, minWidth: 0 }}>
          <div style={{ width: 30, height: 30, borderRadius: 9, background: "var(--surface-3)", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 14 }}>♟</div>
          <div style={{ minWidth: 0 }}>
            <div className="wc-eyebrow">Head coach</div>
            <div style={{ fontSize: 13.5, fontWeight: 600, marginTop: 2, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{coach ?? "TBD"}</div>
          </div>
        </div>
        <div style={{ textAlign: "right", flex: "none" }}>
          <div className="wc-eyebrow">Best finish</div>
          <div style={{ fontSize: 12.5, fontWeight: 600, marginTop: 2, color: "var(--gold)" }}>{fact.best ?? "TBD"}</div>
        </div>
      </div>
    </div>
  );
}

function TeamMatchRow({ match, code, result }: { match: FixtureWithId; code: string; result?: ResultWithId }) {
  const opponent = matchTeams(match, code);
  const live = match.status === "live";
  const finished = result || match.status === "finished";
  return (
    <Link
      href={fixtureHref(match.id)}
      className="wc-card"
      style={{
        padding: "13px 14px",
        display: "grid",
        gridTemplateColumns: "1fr auto",
        gap: 12,
        alignItems: "center",
        color: "var(--text)",
        textDecoration: "none",
      }}
    >
      <div style={{ minWidth: 0 }}>
        <div className="wc-eyebrow">{fixtureStageLabel(match.round, match.group)}</div>
        <div style={{ display: "flex", alignItems: "center", gap: 8, marginTop: 6, minWidth: 0 }}>
          <span className="wc-flag" style={{ width: 24, height: 24, fontSize: 15 }}>{opponent.opponentFlag}</span>
          <span style={{ fontSize: 14.5, fontWeight: 700, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>
            vs {opponent.opponentName}
          </span>
        </div>
      </div>
      <div style={{ textAlign: "right" }}>
        <div className="wc-num" style={{ fontSize: 13, color: live ? "var(--lime-ink)" : "var(--dim)", fontWeight: live || finished ? 800 : 600 }}>
          {result ? resultScore(result) : live ? "LIVE" : kickoffLabel(match.kickoffAt)}
        </div>
        {result && (
          <div className="wc-eyebrow" style={{ marginTop: 4, color: result.win === code ? "var(--lime-ink)" : result.win === "draw" ? "var(--gold)" : "var(--faint)" }}>
            {resultTone(result, code)}
          </div>
        )}
      </div>
    </Link>
  );
}

function SquadCard({ profile }: { profile?: TeamProfileDoc }) {
  if (!profile?.players?.length && !profile?.coach) {
    return (
      <div className="wc-card" style={{ padding: 16 }}>
        <SectionLabel>Squad</SectionLabel>
        <div style={{ color: "var(--dim)", fontSize: 13.5, marginTop: 10 }}>
          Squad and coach details will appear when the provider publishes them.
        </div>
      </div>
    );
  }
  const grouped = (profile.players ?? []).reduce<Record<string, NonNullable<TeamProfileDoc["players"]>>>((acc, player) => {
    const key = player.position ?? "Squad";
    acc[key] = [...(acc[key] ?? []), player];
    return acc;
  }, {});
  return (
    <div className="wc-card" style={{ padding: 16 }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline", gap: 12 }}>
        <SectionLabel>Squad</SectionLabel>
        {profile.coach?.name && <span className="wc-num" style={{ fontSize: 12, color: "var(--dim)" }}>Coach · {profile.coach.name}</span>}
      </div>
      <div style={{ display: "grid", gap: 13, marginTop: 14 }}>
        {Object.entries(grouped).map(([position, players]) => (
          <div key={position}>
            <div className="wc-eyebrow" style={{ marginBottom: 7 }}>{position}</div>
            <div style={{ display: "flex", flexWrap: "wrap", gap: 7 }}>
              {players.map((player) => (
                <span key={player.id} className="wc-pill" style={{ padding: "5px 9px", fontSize: 10.5 }}>
                  {player.number ? `${player.number} · ` : ""}{player.name}
                </span>
              ))}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

function TeamSquad({ code, profile }: { code: string; profile?: TeamProfileDoc }) {
  const fact = TEAM_FACTS[code] ?? fallbackFact(code);
  if (!profile?.players?.length) {
    if (!fact.key.length) return null;
    return (
      <div className="wc-card" style={{ padding: "17px 18px" }}>
        <SectionLabel>Key players</SectionLabel>
        <div style={{ marginTop: 10 }}>
          {fact.key.map((player, index) => (
            <div key={`${player.name}-${player.pos}`} style={{ display: "flex", alignItems: "center", gap: 11, padding: "10px 0", borderBottom: index === fact.key.length - 1 ? "none" : "1px solid var(--line)" }}>
              <div className="wc-avatar" style={{ width: 32, height: 32, borderRadius: 9, fontSize: 11 }}>{player.name.split(" ").pop()?.slice(0, 2).toUpperCase()}</div>
              <span style={{ fontSize: 14, fontWeight: 600, flex: 1 }}>{player.name}</span>
              <span className="wc-pill" style={{ padding: "2px 8px" }}>{player.pos}</span>
            </div>
          ))}
        </div>
      </div>
    );
  }

  const grouped = profile.players.reduce<Record<string, NonNullable<TeamProfileDoc["players"]>>>((acc, player) => {
    const value = (player.position ?? "").toLowerCase();
    const key = value.includes("goal") || value === "gk"
      ? "GK"
      : value.includes("def") || value === "d"
        ? "DEF"
        : value.includes("mid") || value === "m"
          ? "MID"
          : value.includes("forward") || value.includes("att") || value === "f"
            ? "FWD"
            : "MID";
    acc[key] = [...(acc[key] ?? []), player];
    return acc;
  }, {});
  const groups = [["GK", "Goalkeepers"], ["DEF", "Defenders"], ["MID", "Midfielders"], ["FWD", "Forwards"]] as const;
  const total = profile.players.length;
  return (
    <div className="wc-card" style={{ padding: "17px 18px" }}>
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 4 }}>
        <SectionLabel>Squad</SectionLabel>
        <span className="wc-num" style={{ fontSize: 11, color: "var(--faint)" }}>{total} players</span>
      </div>
      {groups.map(([key, label]) => {
        const players = grouped[key] ?? [];
        if (!players.length) return null;
        return (
          <div key={key} style={{ marginTop: 14 }}>
            <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 8 }}>
              <span className="wc-num" style={{ fontSize: 10, fontWeight: 700, color: "var(--lime-ink)", background: "var(--lime-soft)", border: "1px solid var(--lime-line)", borderRadius: 6, padding: "2px 7px" }}>{key}</span>
              <span className="wc-eyebrow">{label}</span>
              <span className="wc-num" style={{ fontSize: 10, color: "var(--faint)" }}>{players.length}</span>
            </div>
            <div style={{ display: "flex", flexWrap: "wrap", gap: "7px 8px" }}>
              {players.map((player) => (
                <span key={player.id} style={{ display: "inline-flex", alignItems: "center", gap: 6, padding: "5px 11px 5px 5px", borderRadius: 999, background: "var(--surface-2)", border: "1px solid var(--line)" }}>
                  <span className="wc-avatar" style={{ width: 20, height: 20, borderRadius: 6, fontSize: 8.5 }}>{player.name.split(/[ .]/).pop()?.slice(0, 2).toUpperCase()}</span>
                  <span style={{ fontSize: 12.5, fontWeight: 600 }}>{player.name}</span>
                </span>
              ))}
            </div>
          </div>
        );
      })}
      {profile.coach?.name && <div className="wc-eyebrow" style={{ marginTop: 15, paddingTop: 13, borderTop: "1px solid var(--line)", color: "var(--faint)" }}>Coach · {profile.coach.name}</div>}
    </div>
  );
}

function KeyPlayersCard({ code }: { code: string }) {
  const fact = TEAM_FACTS[code] ?? fallbackFact(code);
  if (!fact.key.length) return null;
  return (
    <div className="wc-card" style={{ padding: "17px 18px" }}>
      <SectionLabel>Key players</SectionLabel>
      <div style={{ marginTop: 10 }}>
        {fact.key.map((player, index) => (
          <div key={`${player.name}-${player.pos}`} style={{ display: "flex", alignItems: "center", gap: 11, padding: "10px 0", borderBottom: index === fact.key.length - 1 ? "none" : "1px solid var(--line)" }}>
            <div className="wc-avatar" style={{ width: 32, height: 32, borderRadius: 9, fontSize: 11 }}>{player.name.split(" ").pop()?.slice(0, 2).toUpperCase()}</div>
            <span style={{ fontSize: 14, fontWeight: 600, flex: 1 }}>{player.name}</span>
            <span className="wc-pill" style={{ padding: "2px 8px" }}>{player.pos}</span>
          </div>
        ))}
      </div>
    </div>
  );
}

function TeamPath({ code, fixtures, results }: { code: string; fixtures: FixtureWithId[]; results: ResultWithId[] }) {
  const played = results
    .filter((result) => result.a === code || result.b === code)
    .sort((a, b) => normalizedRound(a.round).localeCompare(normalizedRound(b.round)));
  const upcoming = nextFixturesForTeam(fixtures, code).slice(0, 4);
  const perWin = tierMeta[T[code].t].win;
  return (
    <div className="wc-card" style={{ padding: "17px 18px" }}>
      <SectionLabel>Path so far</SectionLabel>
      {played.length === 0 && <div style={{ fontSize: 13, color: "var(--faint)", marginTop: 11 }}>No scored results in the recent feed.</div>}
      <div style={{ marginTop: 11 }}>
        {played.map((result, index) => {
          const isA = result.a === code;
          const opponentCode = isA ? result.b : result.a;
          const opponent = T[opponentCode];
          const gf = isA ? result.sa : result.sb;
          const ga = isA ? result.sb : result.sa;
          const tone = resultTone(result, code);
          const got = resultPointsForTeam(result, code);
          const color = tone === "Win" || tone === "Champion" ? "var(--up)" : tone === "Loss" ? "var(--down)" : "var(--flat)";
          return (
            <div key={result.id} style={{ display: "flex", alignItems: "center", gap: 12, padding: "10px 0", borderBottom: index === played.length - 1 && upcoming.length === 0 ? "none" : "1px solid var(--line)" }}>
              <span style={{ width: 22, height: 22, flex: "none", borderRadius: 7, fontFamily: "var(--mono)", fontSize: 11, fontWeight: 700, display: "flex", alignItems: "center", justifyContent: "center", color, background: "var(--surface-3)" }}>{tone[0]}</span>
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ fontSize: 13.5, fontWeight: 600, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>
                  <span style={{ marginRight: 6 }}>{opponent?.f ?? "•"}</span>vs {opponent?.n ?? opponentCode}
                </div>
                <div className="wc-eyebrow" style={{ marginTop: 2 }}>{fixtureStageLabel(result.round)}</div>
              </div>
              <div style={{ textAlign: "right", flex: "none" }}>
                <div className="wc-num" style={{ fontSize: 14, fontWeight: 600 }}>{gf ?? "—"}-{ga ?? "—"}</div>
                {got > 0 && <div className="wc-num" style={{ fontSize: 11, color: "var(--lime-ink)", fontWeight: 600, marginTop: 2 }}>+{got} pool</div>}
              </div>
            </div>
          );
        })}
      </div>
      {upcoming.length > 0 && (
        <div style={{ marginTop: 16 }}>
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 10 }}>
            <SectionLabel>Road ahead</SectionLabel>
            <span className="wc-num" style={{ fontSize: 11, color: "var(--gold)", fontWeight: 600 }}>+{perWin}/win</span>
          </div>
          <div style={{ position: "relative" }}>
            <div style={{ position: "absolute", left: 11, top: 8, bottom: 8, width: 1.5, background: "var(--line)" }} />
            {upcoming.map((fixture, index) => {
              const opponent = matchTeams(fixture, code);
              return (
                <Link key={fixture.id} href={fixtureHref(fixture.id)} style={{ display: "flex", alignItems: "center", gap: 12, padding: "9px 0", position: "relative", color: "var(--text)", textDecoration: "none" }}>
                  <span style={{ width: 23, height: 23, flex: "none", borderRadius: "50%", display: "flex", alignItems: "center", justifyContent: "center", zIndex: 1, background: fixture.status === "live" ? "var(--lime-soft)" : "var(--surface-3)", border: `1.5px solid ${fixture.status === "live" ? "var(--lime-line)" : "var(--line)"}` }}>
                    {fixture.status === "live" ? <span className="wc-live-dot" style={{ width: 7, height: 7 }} /> : <span className="wc-num" style={{ fontSize: 9.5, fontWeight: 700, color: index === 0 ? "var(--text)" : "var(--faint)" }}>{index + 1}</span>}
                  </span>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ fontSize: 13.5, fontWeight: 600, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>
                      {fixtureStageLabel(fixture.round, fixture.group)} · vs {opponent.opponentName}
                    </div>
                    <div className="wc-eyebrow" style={{ marginTop: 2 }}>{fixture.status === "live" ? "Live now" : kickoffLabel(fixture.kickoffAt)}</div>
                  </div>
                </Link>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}

function groupRowsForTeam(code: string, fixtures: FixtureWithId[], results: ResultWithId[]) {
  const group = GROUPS[code];
  if (!group) return [];
  const resultFixtureMap = new Map(fixtures.map((fixture) => [fixture.id, fixture]));
  const rows = Object.entries(GROUPS)
    .filter(([, g]) => g === group)
    .map(([teamCode]) => teamCode)
    .sort((a, b) => a.localeCompare(b))
    .map((teamCode) => ({ code: teamCode, played: 0, gf: 0, ga: 0, gd: 0, pts: 0 }));
  const byCode = new Map(rows.map((row) => [row.code, row]));

  for (const result of results) {
    const fixture = resultFixtureMap.get(result.id);
    const resultGroup = fixture?.group ?? GROUPS[result.a] ?? GROUPS[result.b];
    if (resultGroup !== group || result.sa == null || result.sb == null) continue;
    const a = byCode.get(result.a);
    const b = byCode.get(result.b);
    if (a) {
      a.played += 1;
      a.gf += result.sa;
      a.ga += result.sb;
      if (result.sa > result.sb) a.pts += 3;
      if (result.sa === result.sb) a.pts += 1;
    }
    if (b) {
      b.played += 1;
      b.gf += result.sb;
      b.ga += result.sa;
      if (result.sb > result.sa) b.pts += 3;
      if (result.sa === result.sb) b.pts += 1;
    }
  }

  for (const row of rows) row.gd = row.gf - row.ga;
  return rows.sort((a, b) => b.pts - a.pts || b.gd - a.gd || b.gf - a.gf || T[a.code].n.localeCompare(T[b.code].n));
}

function GroupCard({ code, fixtures, results, holdersByTeam }: { code: string; fixtures: FixtureWithId[]; results: ResultWithId[]; holdersByTeam: Map<string, { count: number; me: boolean }> }) {
  const group = GROUPS[code];
  if (!group) return null;
  const teams = groupRowsForTeam(code, fixtures, results);
  return (
    <div>
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 10 }}>
        <SectionLabel>Group {group} · table</SectionLabel>
        <Link href="/world-cup" style={{ fontSize: 11.5, color: "var(--lime-ink)", fontWeight: 600, textDecoration: "none" }}>All groups →</Link>
      </div>
      <div className="wc-card" style={{ overflow: "hidden", padding: 0 }}>
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "12px 15px 10px", borderBottom: "1px solid var(--line)" }}>
          <div style={{ display: "flex", alignItems: "center", gap: 9 }}>
            <span style={{ width: 24, height: 24, borderRadius: 7, background: "var(--surface-3)", display: "flex", alignItems: "center", justifyContent: "center", fontFamily: "var(--mono)", fontSize: 12, fontWeight: 700 }}>{group}</span>
            <span style={{ fontSize: 14, fontWeight: 700, letterSpacing: "-0.01em" }}>Group {group}</span>
          </div>
          <div style={{ display: "flex", gap: 12 }}>
            <span className="wc-num" style={{ width: 28, flex: "none", textAlign: "center", fontSize: 12, color: "var(--faint)" }}>GD</span>
            <span className="wc-num" style={{ width: 30, flex: "none", textAlign: "center", fontSize: 12, color: "var(--faint)" }}>Pts</span>
          </div>
        </div>
        {teams.map((row, index) => {
          const team = T[row.code];
          const holders = holdersByTeam.get(row.code);
          return (
            <Link key={row.code} href={teamHref(row.code)} style={{ display: "flex", alignItems: "center", gap: 10, padding: "10px 15px", color: "var(--text)", textDecoration: "none", borderBottom: index === teams.length - 1 ? "none" : "1px solid var(--line)", background: row.code === code ? "var(--lime-soft)" : "transparent", position: "relative" }}>
              {index < 2 && <div style={{ position: "absolute", left: 0, top: 0, bottom: 0, width: 3, background: index === 0 ? "var(--lime)" : "var(--lime-line)" }} />}
              <span className="wc-num" style={{ width: 14, flex: "none", fontSize: 12, color: index < 2 ? "var(--lime-ink)" : "var(--faint)", fontWeight: 600 }}>{index + 1}</span>
              <span className="wc-flag alive" style={{ width: 21, height: 21, fontSize: 14, flex: "none" }}>{team?.f ?? "•"}</span>
              <div style={{ flex: 1, minWidth: 0, display: "flex", alignItems: "center", gap: 7 }}>
                <span style={{ fontWeight: row.code === code ? 700 : 600, fontSize: 13.5, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis", minWidth: 0 }}>{team?.n ?? row.code}</span>
                {holders?.me ? <span className="wc-tag-you" style={{ fontSize: 8 }}>PICK</span> : holders?.count ? <span className="wc-num" style={{ fontSize: 9.5, color: "var(--faint)" }}>{holders.count}♦</span> : null}
              </div>
              <span className="wc-num" style={{ width: 28, textAlign: "center", fontSize: 12, color: "var(--dim)" }}>{row.gd > 0 ? `+${row.gd}` : row.gd}</span>
              <span className="wc-num" style={{ width: 30, textAlign: "center", fontSize: 12, color: "var(--text)", fontWeight: 700 }}>{row.pts}</span>
            </Link>
          );
        })}
      </div>
    </div>
  );
}

function TeamHolders({ holders }: { holders: ReturnType<typeof holderRows> }) {
  const top = holders[0]?.player;
  return (
    <div className="wc-card" style={{ padding: "17px 18px" }}>
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
        <SectionLabel>In the pool · {holders.length} {holders.length === 1 ? "holder" : "holders"}</SectionLabel>
        {top && <span className="wc-num" style={{ fontSize: 11, color: "var(--faint)" }}>most valuable to {top.me ? "you" : top.name.split(" ")[0]}</span>}
      </div>
      <div style={{ marginTop: 6 }}>
        {holders.length ? holders.map(({ player, team: pick }, index) => (
          <Link
            key={player.uid}
            href={`/player/${encodeURIComponent(player.name)}`}
            style={{ display: "flex", alignItems: "center", gap: 11, padding: "11px 0", borderBottom: index === holders.length - 1 ? "none" : "1px solid var(--line)", color: "var(--text)", textDecoration: "none" }}
          >
            <span className="wc-num" style={{ fontSize: 12, color: player.rank > 0 && player.rank <= 3 ? "var(--gold)" : "var(--faint)", width: 24, fontWeight: 600 }}>#{player.rank > 0 ? player.rank : "—"}</span>
            <div className="wc-avatar" style={{ width: 30, height: 30, borderRadius: 9, fontSize: 11, background: player.me ? "var(--lime)" : "var(--surface-3)", color: player.me ? "var(--on-lime)" : "var(--dim)" }}>{player.short}</div>
            <div style={{ flex: 1, minWidth: 0 }}>
              <div style={{ display: "flex", alignItems: "center", gap: 7 }}>
                <span style={{ fontSize: 14, fontWeight: 600 }}>{player.me ? "You" : player.name}</span>
                {player.me && <span className="wc-tag-you">You</span>}
              </div>
            </div>
            <div style={{ textAlign: "right", flex: "none" }}>
              <div style={{ display: "flex", alignItems: "baseline", gap: 3, justifyContent: "flex-end" }}>
                <span className="wc-num" style={{ fontSize: 15, fontWeight: 600 }}>{pick.pts}</span>
                <span className="wc-eyebrow" style={{ fontSize: 8 }}>pts</span>
              </div>
              {pick.alive && pick.rem > 0 && <div className="wc-num" style={{ fontSize: 10.5, color: "var(--lime-ink)", marginTop: 2 }}>+{pick.rem} left</div>}
            </div>
          </Link>
        )) : <div style={{ color: "var(--dim)", fontSize: 13, marginTop: 10 }}>No pool entries hold this team.</div>}
      </div>
    </div>
  );
}

function TeamScoringCard({ code, roundsLeft }: { code: string; roundsLeft: number }) {
  const team = T[code];
  const meta = tierMeta[team.t];
  return (
    <div className="wc-card" style={{ padding: "17px 18px" }}>
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
        <SectionLabel>Tier & scoring</SectionLabel>
        <TierBadge tier={team.t} size={26} />
      </div>
      <div style={{ fontSize: 15, fontWeight: 700, marginTop: 11 }}>Tier {team.t} · {meta.label}</div>
      <div style={{ fontSize: 13, color: "var(--dim)", marginTop: 6, lineHeight: 1.55 }}>{meta.blurb}</div>
      <div style={{ display: "flex", gap: 10, marginTop: 14 }}>
        <div style={{ flex: 1, padding: "11px 13px", borderRadius: 12, background: "var(--surface-2)", border: "1px solid var(--line)" }}>
          <div className="wc-num" style={{ fontSize: 20, fontWeight: 600, color: "var(--lime-ink)", lineHeight: 1 }}>+{meta.win}</div>
          <div className="wc-eyebrow" style={{ marginTop: 6, fontSize: 9 }}>per win</div>
        </div>
        <div style={{ flex: 1, padding: "11px 13px", borderRadius: 12, background: "var(--surface-2)", border: "1px solid var(--line)" }}>
          <div className="wc-num" style={{ fontSize: 20, fontWeight: 600, lineHeight: 1 }}>{roundsLeft}</div>
          <div className="wc-eyebrow" style={{ marginTop: 6, fontSize: 9 }}>rounds left</div>
        </div>
      </div>
    </div>
  );
}

export function TeamScreen({ code }: { code: string }) {
  const teamCode = code.toUpperCase();
  const team = T[teamCode];
  const [tab, setTab] = useState("Team");
  const { user } = useAuth();
  const { players, loading: standingsLoading } = useStandings(user?.uid);
  const { player: myPlayer } = useMyData();
  const { fixtures, liveState, loading: fixturesLoading } = useFixtures();
  const { results, loading: resultsLoading } = useResults();
  const { teams: profiles } = useTeamProfiles();
  const profile = profiles.find((entry) => entry.code === teamCode);
  const group = profile?.group ?? GROUPS[teamCode] ?? null;

  const teamFixtures = useMemo(
    () => fixtures.filter((fixture) => fixture.a === teamCode || fixture.b === teamCode),
    [fixtures, teamCode],
  );
  const liveMatch = useMemo(() => teamFixtures.find((fixture) => fixture.status === "live"), [teamFixtures]);
  const liveForMatch = useMemo(() => liveState.find((entry) => entry.fixtureId === liveMatch?.id), [liveMatch?.id, liveState]);
  const holders = useMemo(() => {
    const rows = holderRows(players, teamCode);
    if (!user?.uid || !myPlayer?.picks || rows.some((row) => row.player.uid === user.uid)) return rows;
    const myTeam = enrichPlayerTeams(myPlayer).find((entry) => entry.code === teamCode);
    if (!myTeam) return rows;
    const currentPlayer: SerializedPlayer = {
      uid: user.uid,
      name: myPlayer.name,
      short: myPlayer.short,
      phone: myPlayer.phone,
      paid: myPlayer.paid,
      approvalStatus: myPlayer.approvalStatus ?? "approved",
      passwordSet: myPlayer.passwordSet,
      hasDrafted: myPlayer.hasDrafted,
      finalGoals: myPlayer.finalGoals,
      points: myPlayer.points ?? myTeam.pts,
      ceiling: myPlayer.ceiling ?? myTeam.pts + myTeam.rem,
      rank: myPlayer.rank ?? 0,
      prevRank: myPlayer.prevRank ?? 0,
      mover: myPlayer.mover ?? 0,
      payout: myPlayer.payout ?? 0,
      aliveCount: myPlayer.aliveCount ?? 0,
      teams: [
        {
          code: myTeam.code,
          name: myTeam.name,
          flag: myTeam.flag,
          tier: myTeam.tier,
          pts: myTeam.pts,
          rem: myTeam.rem,
          alive: myTeam.alive,
        },
      ],
      me: true,
    };
    return holderRows([...players, currentPlayer], teamCode);
  }, [players, teamCode, myPlayer, user?.uid]);
  const holdersByTeam = useMemo(() => {
    const map = new Map<string, { count: number; me: boolean }>();
    for (const player of players) {
      for (const pick of player.teams) {
        if (!pick.alive) continue;
        const current = map.get(pick.code) ?? { count: 0, me: false };
        current.count += 1;
        current.me = current.me || Boolean(player.me);
        map.set(pick.code, current);
      }
    }
    return map;
  }, [players]);

  if (!team) {
    return (
      <div style={{ maxWidth: 760, margin: "0 auto", padding: "32px 24px" }}>
        <div className="wc-card" style={{ padding: 20 }}>
          <SectionLabel>Team not found</SectionLabel>
          <div style={{ fontSize: 18, fontWeight: 800, marginTop: 8 }}>No team exists for {code}</div>
        </div>
      </div>
    );
  }

  const loading = fixturesLoading || resultsLoading || standingsLoading;
  const currentPick = holders.find((row) => row.team.code === teamCode)?.team;
  const alive = currentPick?.alive ?? !results.some((result) => result.win && result.win !== "draw" && (result.a === teamCode || result.b === teamCode) && result.win !== teamCode && normalizedRound(result.round) !== "Group");
  const nextMatch = nextFixturesForTeam(teamFixtures, teamCode)[0];
  const statusLine = alive
    ? nextMatch
      ? `${fixtureStageLabel(nextMatch.round, nextMatch.group)} · ${kickoffLabel(nextMatch.kickoffAt)}`
      : "No scheduled match currently"
    : `Eliminated · ${normalizedRound([...results].reverse().find((result) => result.a === teamCode || result.b === teamCode)?.round)}`;
  const roundsLeft = rankTeamRoundsLeft(nextMatch?.round ?? statusLine);

  return (
    <div className="wc-team-page" style={{ maxWidth: 1040, margin: "0 auto", padding: "26px 24px 64px" }}>
      <PageHead
        title={`${team.f} ${team.n}`}
        sub={`Tier ${team.t}${group ? ` · Group ${group}` : ""}`}
        right={<Link href="/world-cup" style={{ color: "var(--lime-ink)", fontWeight: 800, textDecoration: "none" }}>World Cup table →</Link>}
      />
      <TeamLiveStrip match={liveMatch} live={liveForMatch} code={teamCode} />
      <TeamHero code={teamCode} group={group} alive={alive} statusLine={statusLine} big />
      <div style={{ marginTop: 18, maxWidth: 380 }}>
        <SegTabs tabs={["Team", "Pool"]} value={tab} onChange={setTab} />
      </div>
      {tab === "Team" ? (
        <div className="wc-team-layout" style={{ display: "grid", gridTemplateColumns: "minmax(0, 1fr) minmax(280px, 0.7fr)", gap: 18, alignItems: "start", marginTop: 20 }}>
          <div style={{ display: "grid", gap: 18 }}>
            <TeamAbout code={teamCode} profile={profile} />
            <TeamSquad code={teamCode} profile={profile} />
          </div>
        </div>
      ) : (
        <div className="wc-team-layout" style={{ display: "grid", gridTemplateColumns: "minmax(0, 1fr) minmax(280px, 0.7fr)", gap: 18, alignItems: "start", marginTop: 20 }}>
          <div style={{ display: "grid", gap: 18 }}>
            <TeamStatTrio holders={holders} />
            <TeamHolders holders={holders} />
            <TeamScoringCard code={teamCode} roundsLeft={roundsLeft} />
          </div>
          <div style={{ display: "grid", gap: 16 }}>
            <TeamPath code={teamCode} fixtures={teamFixtures} results={results} />
            <GroupCard code={teamCode} fixtures={fixtures} results={results} holdersByTeam={holdersByTeam} />
          </div>
        </div>
      )}
      <style jsx global>{`
        @media (max-width: 760px) {
          .wc-team-page {
            padding: 20px 18px 72px !important;
          }
          .wc-team-layout {
            grid-template-columns: 1fr !important;
          }
          .wc-team-stat-trio {
            gap: 8px !important;
          }
          .wc-team-stat-trio .wc-card {
            padding: 11px 10px !important;
          }
          .wc-team-stat-label {
            font-size: 7.5px !important;
            overflow-wrap: anywhere;
          }
        }
      `}</style>
    </div>
  );
}
