"use client";

/* Player views — My Picks and Player Detail. */

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { CeilingBar, MiniStanding, Mover, fmtKES } from "@/components/ds";
import { Btn, PageHead, SectionLabel, TierBadge } from "@/components/ui";
import { TeamLine } from "@/components/player/parts";
import { fixtureHref, TeamEntityLink } from "@/components/entity-links";
import { T } from "@/lib/data";
import { useStandings } from "@/hooks/useStandings";
import { useMyData, enrichPlayerTeams } from "@/hooks/useMyData";
import { useResults } from "@/hooks/useResults";
import { useFixtures } from "@/hooks/useFixtures";
import { usePool } from "@/hooks/usePool";
import { useAuth } from "@/lib/auth";
import { useCountdown } from "@/lib/countdown";
import { EdgeBanner } from "@/components/edge/EdgeBanner";
import { displayPhone } from "@/lib/phone";
import { pointsForResult, roundLabel } from "@/lib/standings";
import type { FixtureWithId, LiveStateWithId, ResultWithId } from "@/lib/firestore";
import type { SerializedPlayer, Tier } from "@/lib/types";
import type { PlayerTeam } from "@/lib/data";

// Sort helper shared by several views
const sortByPts = (a: { pts: number }, b: { pts: number }) => b.pts - a.pts;

function timestampMs(value: unknown) {
  if (value && typeof value === "object" && "toDate" in value && typeof value.toDate === "function") {
    return value.toDate().getTime();
  }
  if (value && typeof value === "object" && "seconds" in value && typeof value.seconds === "number") {
    return value.seconds * 1000;
  }
  return 0;
}

function resultSortKey(result: ResultWithId) {
  return timestampMs(result.enteredAt) || Number(result.id.replace(/\D/g, "")) || 0;
}

function resultScore(result: ResultWithId) {
  if (result.sa == null || result.sb == null) return "";
  const pens = result.pens ? ` · pens ${result.pens}` : "";
  return `${result.sa}-${result.sb}${pens}`;
}

function scoringLabel(result: ResultWithId, teamCode: string) {
  if (result.win === "draw") return "Draw";
  if (result.round === "Final" && result.win === teamCode) return "Champion";
  return "Win";
}

type PointEventTuple = [string, Tier, number];
type AccountingEvent = {
  id: string;
  label: string;
  opponentCode: string | null;
  opponentName: string;
  opponentFlag: string;
  detail: string;
  points: number;
  tone: "earned" | "lost" | "pending";
};

function pointEventTuple(value: unknown): PointEventTuple | null {
  if (Array.isArray(value)) {
    const [code, tier, points] = value;
    return typeof code === "string" && typeof tier === "string" && typeof points === "number"
      ? [code, tier as Tier, points]
      : null;
  }

  if (value && typeof value === "object") {
    const row = value as Record<string, unknown>;
    const code = row.code ?? row.team ?? row.teamCode;
    const tier = row.tier;
    const points = row.points ?? row.pts ?? row.value ?? row.v;
    return typeof code === "string" && typeof tier === "string" && typeof points === "number"
      ? [code, tier as Tier, points]
      : null;
  }

  return null;
}

function localFixtureTime(value?: string | null) {
  if (!value) return "Time TBD";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "Time TBD";
  return date.toLocaleString([], { month: "short", day: "numeric", hour: "numeric", minute: "2-digit" });
}

function fixtureSortMs(fixture: FixtureWithId) {
  const ms = Date.parse(fixture.kickoffAt);
  return Number.isNaN(ms) ? 0 : ms;
}

function teamAccountingEvents(team: PlayerTeam, results: ResultWithId[], fixtures: FixtureWithId[]): AccountingEvent[] {
  const resultRows = [...results]
    .filter((result) => result.a === team.code || result.b === team.code)
    .sort((a, b) => resultSortKey(a) - resultSortKey(b))
    .map((result) => {
      const pointRow = (result.pts ?? [])
        .map(pointEventTuple)
        .filter((entry): entry is PointEventTuple => Boolean(entry))
        .find((entry) => entry[0] === team.code && entry[1] === team.tier);
      const points = pointRow?.[2] ?? 0;
      const opponentCode = result.a === team.code ? result.b : result.a;
      const opponent = T[opponentCode];
      const didDraw = result.win === "draw";
      const didWin = result.win === team.code;
      const outcome = didWin ? scoringLabel(result, team.code) : didDraw ? "Draw" : "Loss";
      const score = resultScore(result);
      return {
        id: result.id,
        label: `Tier ${team.tier} · ${result.round} · ${outcome}`,
        opponentCode,
        opponentName: opponent?.n ?? opponentCode,
        opponentFlag: opponent?.f ?? "🏳",
        detail: `${score || "Result entered"} · ${points > 0 ? `earned ${points}` : didDraw ? "no points awarded" : "lost, 0 pts"}`,
        points,
        tone: points > 0 ? "earned" as const : "lost" as const,
      };
    });

  const resultIds = new Set(results.map((result) => result.id));
  const fixtureRows = [...fixtures]
    .filter((fixture) => !resultIds.has(fixture.id))
    .filter((fixture) => fixture.a === team.code || fixture.b === team.code)
    .sort((a, b) => fixtureSortMs(a) - fixtureSortMs(b))
    .map((fixture) => {
      const opponentCode = fixture.a === team.code ? fixture.b : fixture.a;
      const opponentName = fixture.a === team.code ? fixture.bName : fixture.aName;
      const opponent = opponentCode ? T[opponentCode] : null;
      const state = fixture.status === "live"
        ? "Live now"
        : fixture.status === "finished"
          ? "Awaiting result"
          : "Not played yet";
      return {
        id: fixture.id,
        label: `Tier ${team.tier} · ${fixture.round} · ${state}`,
        opponentCode,
        opponentName: opponent?.n ?? opponentName ?? "TBD",
        opponentFlag: opponent?.f ?? "•",
        detail: fixture.status === "live" ? "In progress, points pending" : localFixtureTime(fixture.kickoffAt),
        points: 0,
        tone: "pending" as const,
      };
    });

  return [...resultRows, ...fixtureRows];
}

function PointsPath({
  player,
  results,
  fixtures,
  loading,
}: {
  player: SerializedPlayer;
  results: ResultWithId[];
  fixtures: FixtureWithId[];
  loading: boolean;
}) {
  const rows = player.teams.map((team) => {
    const events = teamAccountingEvents(team, results, fixtures);
    const explained = events.reduce((sum, event) => sum + event.points, 0);
    return { team, events, explained };
  });
  const explainedTotal = rows.reduce((sum, row) => sum + row.explained, 0);

  return (
    <div className="wc-card" style={{ padding: "16px 16px" }}>
      <div style={{ display: "flex", alignItems: "baseline", justifyContent: "space-between", gap: 12 }}>
        <SectionLabel>Points path</SectionLabel>
        <span className="wc-num" style={{ fontSize: 12.5, color: "var(--dim)", whiteSpace: "nowrap" }}>
          {explainedTotal} / {player.points} pts
        </span>
      </div>
      {loading ? (
        <div style={{ fontSize: 13, color: "var(--dim)", marginTop: 14 }}>Loading scoring events…</div>
      ) : (
        <div style={{ display: "flex", flexDirection: "column", gap: 10, marginTop: 14 }}>
          {rows.map(({ team, events, explained }) => (
            <div key={`${team.tier}-${team.code}`} style={{ border: "1px solid var(--line)", borderRadius: 12, overflow: "hidden", background: "var(--surface-2)" }}>
              <div style={{ display: "flex", alignItems: "center", gap: 10, padding: "10px 12px", borderBottom: events.length ? "1px solid var(--line)" : "none" }}>
                <TeamEntityLink team={team}>
                  <span className={"wc-flag " + (team.alive ? "alive" : "out")} style={{ width: 26, height: 26, fontSize: 17 }}>
                    {team.flag}
                  </span>
                </TeamEntityLink>
                <TeamEntityLink team={team} style={{ flex: 1, minWidth: 0, display: "block" }}>
                  <div style={{ fontSize: 13.5, fontWeight: 700, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>
                    {team.name}
                  </div>
                  <div className="wc-eyebrow" style={{ marginTop: 2 }}>Tier {team.tier}</div>
                </TeamEntityLink>
                <div className="wc-num" style={{ fontSize: 15, fontWeight: 700 }}>
                  {explained}<span className="wc-eyebrow" style={{ marginLeft: 3 }}>pts</span>
                </div>
              </div>
              {events.length ? (
                <div>
                  {events.map((event, index) => (
                    <div
                      key={`${event.id}-${index}`}
                      style={{
                        display: "grid",
                        gridTemplateColumns: "1fr auto",
                        gap: 10,
                        padding: "9px 12px",
                        borderTop: index === 0 ? "none" : "1px solid var(--line)",
                      }}
                    >
                      <div style={{ minWidth: 0 }}>
                        <Link href={fixtureHref(event.id)} style={{ color: "var(--text)", textDecoration: "none", fontSize: 12.5, fontWeight: 650 }}>
                          {event.label}
                        </Link>
                        <div style={{ fontSize: 12, color: "var(--dim)", marginTop: 2, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>
                          vs{" "}
                          <TeamEntityLink code={event.opponentCode} stopPropagation={false}>
                            {event.opponentFlag} {event.opponentName}
                          </TeamEntityLink>{" "}
                          · {event.detail}
                        </div>
                      </div>
                      <span
                        className="wc-num"
                        style={{
                          fontSize: 13,
                          fontWeight: 800,
                          color: event.tone === "earned" ? "var(--lime-ink)" : event.tone === "lost" ? "var(--down)" : "var(--dim)",
                          alignSelf: "center",
                        }}
                      >
                        {event.points > 0 ? `+${event.points}` : "0"}
                      </span>
                    </div>
                  ))}
                </div>
              ) : (
                <div style={{ padding: "9px 12px", fontSize: 12.5, color: "var(--dim)" }}>
                  No fixtures found yet.
                </div>
              )}
              {explained !== team.pts && (
                <div style={{ padding: "8px 12px", fontSize: 11.5, color: "var(--gold)", borderTop: "1px solid var(--line)" }}>
                  Standing total is {team.pts}; path currently shows {explained}.
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

// ======================= MY PICKS ======================= //
export function MyPicksScreen() {
  const router = useRouter();
  const { user, approvalStatus } = useAuth();
  const { player, loading } = useMyData();
  const { players: standingsPlayers, scaleMax, loading: standingsLoading } = useStandings(user?.uid, approvalStatus !== "pending");
  const countdown = useCountdown();
  const [editingName, setEditingName] = useState(false);
  const [nameDraft, setNameDraft] = useState("");
  const [nameSaving, setNameSaving] = useState(false);
  const [nameError, setNameError] = useState<string | null>(null);

  const standingPlayer = standingsPlayers.find((p) => p.uid === user?.uid || p.me);
  const teams: PlayerTeam[] = standingPlayer?.teams ?? enrichPlayerTeams(player).map((t) => ({ ...t, alive: t.alive }));

  const alive = teams.filter((t) => t.alive).sort(sortByPts);
  const out = teams.filter((t) => !t.alive).sort(sortByPts);
  const share = () => router.push("/share");
  const edit = () => router.push("/draft");
  const canEdit = countdown.ready && !countdown.isLocked;

  // Standing strip uses computed standings first; the player doc only fills account-level fields.
  const derivedPoints = teams.reduce((sum, team) => sum + team.pts, 0);
  const derivedCeiling = derivedPoints + teams.reduce((sum, team) => sum + (team.alive ? team.rem : 0), 0);
  const standing = {
    rank: standingPlayer?.rank ?? player?.rank ?? 0,
    mover: standingPlayer?.mover ?? player?.mover ?? 0,
    points: standingPlayer?.points ?? (player?.points || derivedPoints),
    ceiling: standingPlayer?.ceiling ?? (player?.ceiling || derivedCeiling),
    payout: standingPlayer?.payout ?? player?.payout ?? 0,
    name: standingPlayer?.name ?? player?.name ?? user?.displayName ?? "You",
    short: standingPlayer?.short ?? player?.short ?? "ME",
    paid: standingPlayer?.paid ?? player?.paid ?? false,
    teams,
    me: true,
  };

  const aliveCount = alive.length;
  const finalGoals = player?.finalGoals ?? standingPlayer?.finalGoals ?? null;
  const maxRemaining = alive.reduce((max, t) => Math.max(max, t.rem), 0);
  const hasEntry = teams.length > 0;

  const currentName = player?.name ?? user?.displayName ?? "You";
  const contactLabel = player?.phone ? displayPhone(player.phone) : user?.email ?? "";
  const startNameEdit = () => {
    setNameDraft(currentName);
    setNameError(null);
    setEditingName(true);
  };
  const saveName = async () => {
    if (!user) return;
    const nextName = nameDraft.replace(/\s+/g, " ").trim();
    if (nextName.length < 2) {
      setNameError("Use at least 2 characters.");
      return;
    }
    setNameSaving(true);
    setNameError(null);
    try {
      const token = await user.getIdToken();
      const res = await fetch("/api/profile", {
        method: "POST",
        headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
        body: JSON.stringify({ name: nextName }),
      });
      const data = await res.json().catch(() => null);
      if (!res.ok) throw new Error(data?.error ?? "Could not update name.");
      setEditingName(false);
    } catch (error) {
      setNameError((error as Error).message);
    } finally {
      setNameSaving(false);
    }
  };

  if (loading || standingsLoading) {
    return <div style={{ display: "flex", alignItems: "center", justifyContent: "center", padding: 64, color: "var(--faint)", fontSize: 14 }}>Loading…</div>;
  }

  // Edge state: all six teams eliminated
  const allEliminated = teams.length > 0 && alive.length === 0;

  const StatRow = (
    <div style={{ display: "flex", gap: 10 }}>
      <div className="wc-card" style={{ flex: 1, padding: "12px 14px" }}>
        <div className="wc-num" style={{ fontSize: 22, fontWeight: 600, color: "var(--lime-ink)" }}>
          {aliveCount}<span className="wc-eyebrow" style={{ marginLeft: 5 }}>alive</span>
        </div>
        <div className="wc-eyebrow" style={{ marginTop: 4 }}>Max remaining: {maxRemaining}</div>
      </div>
      <div className="wc-card" style={{ flex: 1, padding: "12px 14px" }}>
        <div className="wc-num" style={{ fontSize: 22, fontWeight: 600 }}>
          +{standing.ceiling - standing.points}<span className="wc-eyebrow" style={{ marginLeft: 5 }}>left</span>
        </div>
        <div className="wc-eyebrow" style={{ marginTop: 4 }}>Ceiling {standing.ceiling}</div>
      </div>
    </div>
  );

  const TieCard = (
    <div className="wc-card" style={{ padding: "15px 16px", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
      <div>
        <SectionLabel>Your tie-breaker</SectionLabel>
        <div style={{ fontSize: 14, fontWeight: 600, marginTop: 4 }}>Goals in the Final</div>
      </div>
      <div className="wc-num" style={{ fontSize: 26, fontWeight: 600, color: "var(--lime-ink)" }}>
        {finalGoals ?? "—"}
      </div>
    </div>
  );

  const ProfileCard = (
    <div className="wc-card" style={{ padding: "15px 16px" }}>
      <SectionLabel>Profile</SectionLabel>
      {editingName ? (
        <div style={{ marginTop: 10, display: "flex", flexDirection: "column", gap: 10 }}>
          <input
            value={nameDraft}
            onChange={(e) => setNameDraft(e.target.value)}
            maxLength={40}
            style={{
              width: "100%",
              boxSizing: "border-box",
              border: "1px solid var(--line-2)",
              borderRadius: 8,
              background: "var(--surface-2)",
              color: "var(--text)",
              padding: "11px 12px",
              fontFamily: "inherit",
              fontSize: 14,
              fontWeight: 600,
            }}
          />
          {nameError && <div style={{ color: "var(--red)", fontSize: 12.5 }}>{nameError}</div>}
          <div style={{ display: "flex", gap: 8 }}>
            <Btn onClick={saveName} disabled={nameSaving}>{nameSaving ? "Saving..." : "Save name"}</Btn>
            <Btn kind="ghost" onClick={() => setEditingName(false)} disabled={nameSaving}>Cancel</Btn>
          </div>
        </div>
      ) : (
        <div style={{ display: "flex", justifyContent: "space-between", gap: 12, alignItems: "center", marginTop: 8 }}>
          <div style={{ minWidth: 0 }}>
            <div style={{ fontSize: 15.5, fontWeight: 800, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>
              {currentName}
            </div>
            <div className="wc-eyebrow" style={{ marginTop: 4 }}>{contactLabel}</div>
          </div>
          <button
            className="wc-iconbtn"
            onClick={startNameEdit}
            aria-label="Edit profile"
            title="Edit profile"
            style={{ width: 36, height: 36, flex: "none" }}
          >
            <svg width="16" height="16" viewBox="0 0 18 18" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round">
              <path d="M3 13.8V15h1.2L13.7 5.5l-1.2-1.2L3 13.8z" />
              <path d="M11.8 3l1.2-1.2a1.4 1.4 0 0 1 2 2L13.8 5" />
            </svg>
          </button>
        </div>
      )}
    </div>
  );

  const DesktopActions = (
    <div style={{ display: "flex", gap: 10, width: 330 }}>
      {canEdit && <Btn kind="ghost" onClick={edit}>{hasEntry ? "Edit picks" : "Draft entry"}</Btn>}
      {hasEntry && <Btn kind="gold" onClick={share}>Share my standing</Btn>}
    </div>
  );

  const EmptyEntry = (
    <div className="wc-card" style={{ padding: "22px 20px", textAlign: "center" }}>
      <SectionLabel>{canEdit ? "Entry open" : "Entry missing"}</SectionLabel>
      <div style={{ fontSize: 18, fontWeight: 800, letterSpacing: "-0.01em", marginTop: 8 }}>
        No picks saved yet
      </div>
      <div style={{ fontSize: 13.5, color: "var(--dim)", marginTop: 6, lineHeight: 1.5 }}>
        {canEdit ? "Draft one team from each tier before the World Cup kicks off." : "The draft window has closed."}
      </div>
      {canEdit && (
        <div style={{ marginTop: 16 }}>
          <Btn onClick={edit}>Draft my entry</Btn>
        </div>
      )}
    </div>
  );

  return (
    <>
      {allEliminated && (
        <div style={{ maxWidth: 1080, margin: "0 auto", padding: "16px 28px 0" }}>
          <EdgeBanner
            tone="down"
            title={`Your run is over — locked at ${standing.points} pts`}
            body="All six of your teams are out, so your ceiling is final. You can still watch the rest play out."
          />
        </div>
      )}

      {/* desktop */}
      <div className="wc-desktop-only" style={{ maxWidth: 1080, margin: "0 auto", padding: "26px 28px 64px" }}>
        <PageHead
          title="My Picks"
          sub="Your six nations, alive vs eliminated."
          right={DesktopActions}
        />
        <div style={{ display: "grid", gridTemplateColumns: "1fr 320px", gap: 20, alignItems: "start" }}>
          <div>
            {hasEntry ? (
              <>
                <SectionLabel style={{ marginBottom: 8, color: "var(--lime-ink)" }}>● Still alive · {aliveCount}</SectionLabel>
                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
                  {alive.map((t) => (<div key={t.code} className="wc-card" style={{ padding: "4px 14px" }}><TeamLine t={t} showRem last /></div>))}
                </div>
                <SectionLabel style={{ margin: "22px 0 8px" }}>✕ Eliminated · {out.length}</SectionLabel>
                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
                  {out.map((t) => (<div key={t.code} className="wc-card" style={{ padding: "4px 14px" }}><TeamLine t={t} last /></div>))}
                </div>
              </>
            ) : EmptyEntry}
          </div>
          <div>
            <div className="wc-eyebrow" aria-hidden style={{ visibility: "hidden", marginBottom: 8 }}>·</div>
            <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
              <MiniStanding p={standing} scaleMax={scaleMax} />
              {ProfileCard}
              {StatRow}
              {TieCard}
            </div>
          </div>
        </div>
      </div>

      {/* mobile */}
      <div className="wc-mobile-only" style={{ padding: "8px 18px 22px" }}>
        <PageHead
          title="My Picks"
          right={
            <div style={{ display: "flex", gap: 8 }}>
              {canEdit && (
                <button className="wc-iconbtn" onClick={edit} style={{ width: 36, height: 36 }} aria-label={hasEntry ? "Edit picks" : "Draft entry"} title={hasEntry ? "Edit picks" : "Draft entry"}>
                  <svg width="16" height="16" viewBox="0 0 18 18" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M3 13.8V15h1.2L13.7 5.5l-1.2-1.2L3 13.8z" />
                    <path d="M11.8 3l1.2-1.2a1.4 1.4 0 0 1 2 2L13.8 5" />
                  </svg>
                </button>
              )}
              {hasEntry && (
                <button className="wc-iconbtn" onClick={share} style={{ width: 36, height: 36 }} aria-label="Share" title="Share">
                  <svg width="16" height="16" viewBox="0 0 18 18" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round">
                    <circle cx="13.5" cy="3.5" r="2.2" /><circle cx="4.5" cy="9" r="2.2" /><circle cx="13.5" cy="14.5" r="2.2" />
                    <path d="M6.5 7.9l5-3.2M6.5 10.1l5 3.2" />
                  </svg>
                </button>
              )}
            </div>
          }
        />
        <MiniStanding p={standing} scaleMax={scaleMax} />
        <div style={{ marginTop: 12 }}>{ProfileCard}</div>
        <div style={{ marginTop: 12 }}>{StatRow}</div>
        {hasEntry ? (
          <>
            <SectionLabel style={{ marginTop: 22, marginBottom: 6, color: "var(--lime-ink)" }}>● Still alive · {aliveCount}</SectionLabel>
            <div className="wc-card" style={{ padding: "2px 14px" }}>
              {alive.map((t, i) => <TeamLine key={t.code} t={t} showRem last={i === alive.length - 1} />)}
            </div>
            <SectionLabel style={{ marginTop: 20, marginBottom: 6 }}>✕ Eliminated · {out.length}</SectionLabel>
            <div className="wc-card" style={{ padding: "2px 14px" }}>
              {out.map((t, i) => <TeamLine key={t.code} t={t} last={i === out.length - 1} />)}
            </div>
          </>
        ) : (
          <div style={{ marginTop: 18 }}>{EmptyEntry}</div>
        )}
        <div style={{ marginTop: 18 }}>{TieCard}</div>
        {canEdit && <div style={{ marginTop: 14 }}><Btn kind="ghost" onClick={edit}>{hasEntry ? "Edit picks" : "Draft entry"}</Btn></div>}
        {hasEntry && <div style={{ marginTop: 14 }}><Btn kind="gold" onClick={share}>Share my standing</Btn></div>}
      </div>
    </>
  );
}

// ======================= PLAYER DETAIL ======================= //
type ProfileTeam = SerializedPlayer["teams"][number];
type ProfilePlayer = SerializedPlayer & {
  inMoney: boolean;
  winnable: number;
  aliveSorted: ProfileTeam[];
  outSorted: ProfileTeam[];
  toMoney: number;
  gapToLeader: number;
  canReachFirst: boolean;
};

type ProfileStage = { key: string; short: string; state: "done" | "current" | "upcoming" };

const PROFILE_STAGES = [
  ["GRP", "Grp"],
  ["R32", "R32"],
  ["R16", "R16"],
  ["QF", "QF"],
  ["SF", "SF"],
  ["F", "Final"],
] as const;

function profileRoundIndex(round: string) {
  const value = round.toLowerCase();
  if (value.includes("final")) return 5;
  if (value.includes("semi")) return 4;
  if (value.includes("quarter")) return 3;
  if (value.includes("16")) return 2;
  if (value.includes("32")) return 1;
  return 0;
}

function profileStageState(round: string): { stages: ProfileStage[]; roundsLeft: number } {
  const current = profileRoundIndex(round);
  return {
    stages: PROFILE_STAGES.map(([key, short], index) => ({
      key,
      short,
      state: index < current ? "done" : index === current ? "current" : "upcoming",
    })),
    roundsLeft: Math.max(0, PROFILE_STAGES.length - current - 1),
  };
}

function profileFixtureStage(fixture: FixtureWithId) {
  if (fixture.round.toLowerCase().includes("group") && fixture.group) return `Group ${fixture.group}`;
  return fixture.round;
}

function profileTeamNextLabel(team: ProfileTeam, fixtures: FixtureWithId[]) {
  const now = Date.now();
  const next = fixtures
    .filter((fixture) => fixture.a === team.code || fixture.b === team.code)
    .filter((fixture) => fixture.status !== "finished")
    .sort((a, b) => fixtureSortMs(a) - fixtureSortMs(b))
    .find((fixture) => fixture.status === "live" || fixtureSortMs(fixture) >= now);

  if (!next) return "Next · TBD";
  const opponentCode = next.a === team.code ? next.b : next.a;
  const opponentName = next.a === team.code ? next.bName : next.aName;
  const opponent = opponentCode ? T[opponentCode] : null;
  const stage = profileFixtureStage(next).replace(/^Round of /, "R");
  return `${stage} · vs ${opponent?.n ?? opponentName ?? "TBD"}`;
}

function profileTeamOutLabel(team: ProfileTeam, results: ResultWithId[]) {
  const last = [...results]
    .filter((result) => result.a === team.code || result.b === team.code)
    .sort((a, b) => resultSortKey(b) - resultSortKey(a))[0];
  return `Out · ${last?.round ?? "Group"}`;
}

function makeProfilePlayer(
  player: SerializedPlayer,
  rankedPlayers: SerializedPlayer[],
  moneyCutoffPoints: number | null,
): ProfilePlayer {
  const leaderPoints = rankedPlayers[0]?.points ?? player.points;
  const aliveSorted = [...player.teams]
    .filter((team) => team.alive)
    .sort((a, b) => b.rem - a.rem || b.pts - a.pts || a.name.localeCompare(b.name));
  const outSorted = [...player.teams]
    .filter((team) => !team.alive)
    .sort((a, b) => b.pts - a.pts || a.name.localeCompare(b.name));
  const inMoney = player.rank > 0 && player.rank <= 3;

  return {
    ...player,
    inMoney,
    winnable: Math.max(0, player.ceiling - player.points),
    aliveSorted,
    outSorted,
    toMoney: player.rank > 3 && typeof moneyCutoffPoints === "number"
      ? Math.max(1, moneyCutoffPoints - player.points + 1)
      : 0,
    gapToLeader: Math.max(0, leaderPoints - player.points),
    canReachFirst: player.ceiling >= leaderPoints,
  };
}

function ProfileHero({ player, big }: { player: ProfilePlayer; big?: boolean }) {
  const rankLabel = player.rank > 0 ? `Rank #${player.rank}` : "Unranked";
  return (
    <div style={{ display: "flex", alignItems: "center", gap: 14 }}>
      <div
        className="wc-avatar"
        style={{
          width: big ? 60 : 54,
          height: big ? 60 : 54,
          borderRadius: 17,
          fontSize: big ? 20 : 18,
          background: player.me ? "var(--lime)" : "var(--surface-3)",
          color: player.me ? "var(--on-lime)" : "var(--dim)",
        }}
      >
        {player.short}
      </div>
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
          <span style={{ fontSize: big ? 24 : 20, fontWeight: 800, letterSpacing: "-0.02em", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>
            {player.me ? "You" : player.name}
          </span>
          {player.me && <span className="wc-tag-you">You</span>}
        </div>
        <div style={{ display: "flex", alignItems: "center", gap: 9, marginTop: 6 }}>
          <span className="wc-num" style={{ fontSize: 14, fontWeight: 600, color: player.inMoney ? "var(--gold)" : "var(--dim)" }}>
            {rankLabel}
          </span>
          {player.rank > 0 && <Mover value={player.mover} />}
          {!player.paid && (
            <span className="wc-num" style={{ fontSize: 9.5, color: "var(--down)", background: "var(--down-soft)", padding: "1px 6px", borderRadius: 4 }}>
              UNPAID
            </span>
          )}
        </div>
      </div>
      <div style={{ textAlign: "right", flex: "none" }}>
        <div className="wc-num" style={{ fontSize: big ? 34 : 30, fontWeight: 600, lineHeight: 1 }}>{player.points}</div>
        <div className="wc-eyebrow" style={{ marginTop: 4 }}>points</div>
        <div className="wc-num" style={{ fontSize: 13, fontWeight: 600, color: player.inMoney ? "var(--gold)" : "var(--faint)", marginTop: 9, whiteSpace: "nowrap" }}>
          {player.inMoney ? fmtKES(player.payout) : "Out of money"}
        </div>
      </div>
    </div>
  );
}

function ProfileStageTracker({ round }: { round: string }) {
  const tracker = profileStageState(round);
  const color = (state: ProfileStage["state"]) => {
    if (state === "done") return "var(--lime-ink)";
    if (state === "current") return "var(--gold)";
    return "var(--faint)";
  };
  const barColor = (state: ProfileStage["state"]) => {
    if (state === "done") return "var(--lime)";
    if (state === "current") return "var(--gold)";
    return "var(--track)";
  };
  return (
    <div>
      <div style={{ display: "flex", alignItems: "center", gap: 5 }}>
        {tracker.stages.map((stage) => (
          <div key={stage.key} style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 5, flex: 1 }}>
            <div style={{ width: "100%", height: 4, borderRadius: 2, background: barColor(stage.state) }} />
            <span className="wc-num" style={{ fontSize: 9, color: color(stage.state), fontWeight: stage.state === "current" ? 700 : 500, whiteSpace: "nowrap" }}>{stage.short}</span>
          </div>
        ))}
      </div>
      <div style={{ fontSize: 11.5, color: "var(--dim)", marginTop: 8 }}>
        <span style={{ color: "var(--lime-ink)", fontWeight: 600 }}>{tracker.roundsLeft} rounds left</span> your alive teams can still score in
      </div>
    </div>
  );
}

function ProfilePointsPathCard({ player, scaleMax, round }: { player: ProfilePlayer; scaleMax: number; round: string }) {
  return (
    <div className="wc-card" style={{ padding: "17px 18px" }}>
      <SectionLabel>Points path</SectionLabel>
      <div style={{ fontSize: 14.5, lineHeight: 1.55, marginTop: 10, color: "var(--text)" }}>
        Banked <b className="wc-num" style={{ color: "var(--lime-ink)" }}>{player.points}</b>.{" "}
        Up to <b className="wc-num">{player.winnable}</b> more {player.winnable === 0 ? "is" : "are"} still winnable from your{" "}
        <b>{player.aliveSorted.length} alive {player.aliveSorted.length === 1 ? "team" : "teams"}</b> — a ceiling of <b className="wc-num">{player.ceiling}</b>.
      </div>
      <div style={{ marginTop: 15 }}>
        <CeilingBar points={player.points} ceiling={player.ceiling} scaleMax={scaleMax} />
      </div>
      <div style={{ display: "flex", alignItems: "center", gap: 16, marginTop: 11 }}>
        <span style={{ display: "inline-flex", alignItems: "center", gap: 6 }}>
          <span style={{ width: 11, height: 11, borderRadius: 3, background: "var(--lime)" }} />
          <span className="wc-eyebrow">Banked {player.points}</span>
        </span>
        <span style={{ display: "inline-flex", alignItems: "center", gap: 6 }}>
          <span style={{ width: 11, height: 11, borderRadius: 3, background: "var(--track-2)" }} />
          <span className="wc-eyebrow">Winnable +{player.winnable}</span>
        </span>
      </div>
      <div style={{ marginTop: 17, paddingTop: 15, borderTop: "1px solid var(--line)" }}>
        <SectionLabel style={{ marginBottom: 11 }}>Scoring rounds left</SectionLabel>
        <ProfileStageTracker round={round} />
      </div>
    </div>
  );
}

function signedPoints(points: number) {
  return points > 0 ? `+${points}` : `${points}`;
}

function winPointsForRound(round: string, tier: Tier) {
  const normalized = roundLabel(round);
  const key = normalized === "Final" ? "Final · Champion" : `${normalized} · Win`;
  return pointsForResult(key, tier);
}

function teamResultPoints(team: ProfileTeam, result: ResultWithId) {
  const pointRow = (result.pts ?? [])
    .map(pointEventTuple)
    .filter((entry): entry is PointEventTuple => Boolean(entry))
    .find((entry) => entry[0] === team.code && entry[1] === team.tier);
  return pointRow?.[2] ?? 0;
}

function resultForTeam(team: ProfileTeam, result: ResultWithId) {
  const side = result.a === team.code ? "a" : "b";
  const opponentCode = side === "a" ? result.b : result.a;
  const gf = side === "a" ? result.sa : result.sb;
  const ga = side === "a" ? result.sb : result.sa;
  const didDraw = result.win === "draw";
  const didWin = result.win === team.code;
  return {
    opponentCode,
    opponentName: T[opponentCode]?.n ?? opponentCode,
    opponentFlag: T[opponentCode]?.f ?? "🏳",
    outcome: didWin ? "beat" : didDraw ? "drew" : "lost to",
    resultMark: didWin ? "W" : didDraw ? "D" : "L",
    score: gf == null || ga == null ? "Result entered" : `${gf}-${ga}${result.pens ? ` · pens ${result.pens}` : ""}`,
    points: teamResultPoints(team, result),
    round: result.round,
  };
}

function resultDotStyle(mark: string) {
  if (mark === "W" || mark === "✓") return { color: "var(--up)", background: "var(--up-soft)" };
  if (mark === "L") return { color: "var(--down)", background: "var(--down-soft)" };
  return { color: "var(--flat)", background: "var(--surface-3)" };
}

function ResultDot({ mark }: { mark: string }) {
  const tone = resultDotStyle(mark);
  return (
    <span
      style={{
        width: 19,
        height: 19,
        flex: "none",
        borderRadius: 6,
        fontFamily: "var(--mono)",
        fontSize: 9.5,
        fontWeight: 700,
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        color: tone.color,
        background: tone.background,
      }}
    >
      {mark}
    </span>
  );
}

function TeamPathDrawer({
  team,
  alive,
  fixtures,
  liveState,
  results,
}: {
  team: ProfileTeam;
  alive: boolean;
  fixtures: FixtureWithId[];
  liveState: LiveStateWithId[];
  results: ResultWithId[];
}) {
  const banked = [...results]
    .filter((result) => result.a === team.code || result.b === team.code)
    .sort((a, b) => resultSortKey(a) - resultSortKey(b))
    .map((result) => resultForTeam(team, result));
  const feedPoints = banked.reduce((sum, result) => sum + result.points, 0);
  const reconciliation = team.pts - feedPoints;
  const liveByFixture = new Map(liveState.map((state) => [state.fixtureId, state]));
  const resultIds = new Set(results.map((result) => result.id));
  const future = alive ? fixtures
    .filter((fixture) => fixture.a === team.code || fixture.b === team.code)
    .filter((fixture) => !resultIds.has(fixture.id))
    .filter((fixture) => fixture.status !== "finished")
    .sort((a, b) => {
      const aLive = liveByFixture.get(a.id)?.status === "live" || liveByFixture.get(a.id)?.status === "paused" || a.status === "live";
      const bLive = liveByFixture.get(b.id)?.status === "live" || liveByFixture.get(b.id)?.status === "paused" || b.status === "live";
      if (aLive !== bLive) return aLive ? -1 : 1;
      return fixtureSortMs(a) - fixtureSortMs(b);
    })
    .map((fixture) => {
      const live = liveByFixture.get(fixture.id);
      const isLive = fixture.status === "live" || live?.status === "live" || live?.status === "paused";
      const home = fixture.a === team.code;
      const opponentCode = home ? fixture.b : fixture.a;
      const opponentName = home ? fixture.bName : fixture.aName;
      const teamScore = live ? (home ? live.sa : live.sb) : null;
      const opponentScore = live ? (home ? live.sb : live.sa) : null;
      return {
        id: fixture.id,
        label: profileFixtureStage(fixture),
        opponent: `${opponentCode ? T[opponentCode]?.f ?? "" : ""} ${opponentCode ? T[opponentCode]?.n ?? opponentName : opponentName ?? "TBD"}`.trim(),
        live: isLive,
        score: teamScore == null || opponentScore == null ? undefined : `${teamScore}-${opponentScore}`,
        minute: live?.minute ?? null,
        kickoffAt: fixture.kickoffAt,
        points: winPointsForRound(fixture.round, team.tier),
      };
    }) : [];
  const drawerRowStyle = {
    display: "grid",
    gridTemplateColumns: "19px minmax(0, 1fr) minmax(42px, auto)",
    alignItems: "center",
    columnGap: 10,
    minWidth: 0,
  } as const;
  const pointsStyle = {
    fontSize: 13,
    fontWeight: 600,
    flex: "none",
    minWidth: 0,
    textAlign: "right",
    whiteSpace: "normal",
    lineHeight: 1.18,
  } as const;
  const futurePointsStyle = {
    ...pointsStyle,
    maxWidth: 76,
    justifySelf: "end",
    fontSize: 12,
    lineHeight: 1.12,
  } as const;

  return (
    <div style={{ margin: "2px 0 12px", padding: "13px 12px", borderRadius: 12, background: "var(--surface-2)", border: "1px solid var(--line)", minWidth: 0, overflow: "hidden" }}>
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 8, marginBottom: 10, flexWrap: "wrap" }}>
        <span className="wc-eyebrow" style={{ minWidth: 0, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>How {team.name} earned</span>
        <span className="wc-num" style={{ fontSize: 10.5, color: "var(--faint)", whiteSpace: "nowrap" }}>
          Tier {team.tier}
        </span>
      </div>

      <div style={{ display: "flex", flexDirection: "column", gap: 2 }}>
        {reconciliation !== 0 && (
          <div style={{ ...drawerRowStyle, padding: "7px 0" }}>
            <ResultDot mark="✓" />
            <div style={{ minWidth: 0 }}>
              <div style={{ fontSize: 13, fontWeight: 600, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>Group stage &amp; earlier</div>
              <div className="wc-eyebrow" style={{ marginTop: 1, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>reconciles to the standing total</div>
            </div>
            <span className="wc-num" style={{ ...pointsStyle, color: reconciliation > 0 ? "var(--lime-ink)" : "var(--down)" }}>
              {signedPoints(reconciliation)}
            </span>
          </div>
        )}
        {banked.map((match, index) => (
          <div key={`${match.round}-${match.opponentCode}-${index}`} style={{ ...drawerRowStyle, padding: "7px 0" }}>
            <ResultDot mark={match.resultMark} />
            <div style={{ minWidth: 0 }}>
              <div style={{ fontSize: 13, fontWeight: 600, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>
                <span style={{ marginRight: 5 }}>{match.opponentFlag}</span>{match.outcome} {match.opponentName}
              </div>
              <div className="wc-eyebrow" style={{ marginTop: 1, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{match.round} · {match.score}</div>
            </div>
            <span className="wc-num" style={{ ...pointsStyle, color: match.points > 0 ? "var(--lime-ink)" : "var(--faint)" }}>
              {signedPoints(match.points)}
            </span>
          </div>
        ))}
      </div>

      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "8px 0 4px", marginTop: 2, borderTop: "1px solid var(--line)" }}>
        <span className="wc-eyebrow" style={{ color: "var(--lime-ink)" }}>Banked so far</span>
        <span className="wc-num" style={{ fontSize: 14, fontWeight: 600, color: "var(--lime-ink)" }}>{team.pts} pts</span>
      </div>

      {alive && future.length > 0 && (
        <div style={{ marginTop: 10, paddingTop: 11, borderTop: "1px solid var(--line)" }}>
          <span className="wc-eyebrow" style={{ display: "block", marginBottom: 8 }}>Still to play</span>
          <div style={{ display: "flex", flexDirection: "column", gap: 2 }}>
            {future.map((match, index) => (
              <div
                key={match.id}
                style={{
                  ...drawerRowStyle,
                  alignItems: "center",
                  padding: match.live ? "8px 9px" : "7px 0",
                  borderRadius: match.live ? 9 : undefined,
                  background: match.live ? "var(--lime-soft)" : undefined,
                  border: match.live ? "1px solid var(--lime-line)" : undefined,
                  gridTemplateColumns: "19px minmax(0, 1fr) minmax(54px, 76px)",
                }}
              >
                {match.live ? (
                  <span className="wc-live-dot" style={{ width: 7, height: 7 }} />
                ) : (
                  <span style={{ width: 19, height: 19, flex: "none", borderRadius: "50%", border: "1.5px dashed var(--line-2)", display: "flex", alignItems: "center", justifyContent: "center" }}>
                    <span className="wc-num" style={{ fontSize: 8.5, color: "var(--faint)" }}>{index + 1}</span>
                  </span>
                )}
                <div style={{ minWidth: 0 }}>
                  <div style={{ fontSize: 13, fontWeight: 600, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>
                    {match.live ? "Live" : match.label}
                    {match.opponent ? <span style={{ color: "var(--dim)", fontWeight: 500 }}> · vs {match.opponent}</span> : null}
                    {match.score ? <span className="wc-num" style={{ color: "var(--faint)", marginLeft: 5 }}>{match.score}</span> : null}
                  </div>
                  <div className="wc-eyebrow" style={{ marginTop: 1, color: match.live ? "var(--lime-ink)" : undefined }}>
                    {match.live ? `${match.minute ?? "Live"}′` : localFixtureTime(match.kickoffAt)}
                  </div>
                </div>
                <span className="wc-num" style={{ ...futurePointsStyle, color: match.live ? "var(--lime-ink)" : "var(--gold)" }}>
                  +{match.points}{match.live ? " if it holds" : " if they win"}
                </span>
              </div>
            ))}
          </div>
        </div>
      )}

      {!alive && (
        <div style={{ marginTop: 10, paddingTop: 11, borderTop: "1px solid var(--line)", display: "flex", alignItems: "center", gap: 8, minWidth: 0 }}>
          <span style={{ color: "var(--down)", fontSize: 12 }}>✕</span>
          <span style={{ minWidth: 0, fontSize: 12.5, color: "var(--dim)", lineHeight: 1.35 }}>
            Eliminated at {profileTeamOutLabel(team, results).replace(/^Out · /, "")} — nothing more to earn.
          </span>
        </div>
      )}

      <TeamEntityLink team={team} style={{ marginTop: 12, width: "100%", minWidth: 0, boxSizing: "border-box", display: "flex", alignItems: "center", justifyContent: "center", gap: 6, padding: 8, borderRadius: 9, background: "transparent", border: "1px solid var(--line-2)", color: "var(--dim)", fontSize: 12, fontWeight: 600 }}>
        View full team
        <svg width="13" height="13" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round"><path d="M3 8h9M8 4l4 4-4 4" /></svg>
      </TeamEntityLink>
    </div>
  );
}

function ProfileLedgerRow({
  team,
  alive,
  last,
  fixtures,
  liveState,
  results,
}: {
  team: ProfileTeam;
  alive: boolean;
  last: boolean;
  fixtures: FixtureWithId[];
  liveState: LiveStateWithId[];
  results: ResultWithId[];
}) {
  const [open, setOpen] = useState(false);
  const line = alive ? profileTeamNextLabel(team, fixtures) : profileTeamOutLabel(team, results);
  return (
    <div style={{ borderBottom: last && !open ? "none" : "1px solid var(--line)" }}>
      <button
        type="button"
        onClick={() => setOpen((value) => !value)}
        aria-expanded={open}
        style={{
          width: "100%",
          display: "flex",
          alignItems: "center",
          gap: 12,
          padding: "11px 2px",
          opacity: alive ? 1 : 0.7,
          cursor: "pointer",
          background: "transparent",
          border: 0,
          color: "inherit",
          font: "inherit",
          textAlign: "left",
        }}
      >
        <TierBadge tier={team.tier} size={30} />
        <span className={"wc-flag " + (alive ? "alive" : "out")} style={{ width: 24, height: 24, fontSize: 15, flex: "none" }}>{team.flag}</span>
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 7, minWidth: 0 }}>
            <div style={{ fontSize: 14, fontWeight: 600, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{team.name}</div>
            <svg
              width="12"
              height="12"
              viewBox="0 0 16 16"
              fill="none"
              stroke="var(--faint)"
              strokeWidth="1.8"
              strokeLinecap="round"
              strokeLinejoin="round"
              style={{ transform: open ? "rotate(180deg)" : "none", transition: "transform .15s", flex: "none" }}
            >
              <path d="M4 6l4 4 4-4" />
            </svg>
          </div>
          <div className="wc-num" style={{ fontSize: 10.5, color: "var(--faint)", marginTop: 2, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>
            {line}
          </div>
        </div>
        <div style={{ textAlign: "right", width: 52, flex: "none" }}>
          <div className="wc-num" style={{ fontSize: 15, fontWeight: 600 }}>{team.pts}</div>
          <div className="wc-eyebrow" style={{ fontSize: 8 }}>earned</div>
        </div>
        <div style={{ textAlign: "right", width: 58, flex: "none" }}>
          {alive && team.rem > 0 ? (
            <>
              <div className="wc-num" style={{ fontSize: 15, fontWeight: 600, color: "var(--lime-ink)" }}>+{team.rem}</div>
              <div className="wc-eyebrow" style={{ fontSize: 8 }}>winnable</div>
            </>
          ) : (
            <div className="wc-num" style={{ fontSize: 14, color: "var(--faint)" }}>—</div>
          )}
        </div>
      </button>
      {open && <TeamPathDrawer team={team} alive={alive} fixtures={fixtures} liveState={liveState} results={results} />}
    </div>
  );
}

function ProfileCeilingLedger({
  player,
  fixtures,
  liveState,
  results,
}: {
  player: ProfilePlayer;
  fixtures: FixtureWithId[];
  liveState: LiveStateWithId[];
  results: ResultWithId[];
}) {
  return (
    <div className="wc-card" style={{ padding: "17px 18px" }}>
      <SectionLabel>How your ceiling is built</SectionLabel>
      <div style={{ fontSize: 13, color: "var(--dim)", marginTop: 9, lineHeight: 1.5 }}>
        Everything you&apos;ve banked, plus the most each <b style={{ color: "var(--text)" }}>alive</b> team can still win.
      </div>

      <div style={{ marginTop: 14 }}>
        <div style={{ display: "flex", alignItems: "center", gap: 7, marginBottom: 4 }}>
          <span style={{ width: 7, height: 7, borderRadius: "50%", background: "var(--lime)" }} />
          <SectionLabel style={{ color: "var(--lime-ink)" }}>Alive · {player.aliveSorted.length}</SectionLabel>
        </div>
        {player.aliveSorted.map((team, index) => (
          <ProfileLedgerRow key={team.code} team={team} alive last={index === player.aliveSorted.length - 1} fixtures={fixtures} liveState={liveState} results={results} />
        ))}
      </div>

      {player.outSorted.length > 0 && (
        <div style={{ marginTop: 16 }}>
          <SectionLabel style={{ marginBottom: 4 }}>✕ Eliminated · {player.outSorted.length} · banked, nothing left</SectionLabel>
          {player.outSorted.map((team, index) => (
            <ProfileLedgerRow key={team.code} team={team} alive={false} last={index === player.outSorted.length - 1} fixtures={fixtures} liveState={liveState} results={results} />
          ))}
        </div>
      )}

      <div style={{ display: "flex", gap: 10, marginTop: 16 }}>
        {([
          ["Banked", player.points, "var(--lime-ink)"],
          ["Winnable", `+${player.winnable}`, "var(--text)"],
          ["Ceiling", player.ceiling, "var(--text)"],
        ] as Array<[string, string | number, string]>).map(([label, value, color]) => (
          <div key={label} style={{ flex: 1, padding: "11px 13px", borderRadius: 12, background: "var(--surface-2)", border: "1px solid var(--line)" }}>
            <div className="wc-num" style={{ fontSize: 20, fontWeight: 600, color, lineHeight: 1 }}>{value}</div>
            <div className="wc-eyebrow" style={{ marginTop: 6, fontSize: 9 }}>{label}</div>
          </div>
        ))}
      </div>
    </div>
  );
}

function ProfileWhereYouStand({
  player,
  rankedPlayers,
}: {
  player: ProfilePlayer;
  rankedPlayers: ProfilePlayer[];
}) {
  const ahead = rankedPlayers.find((entry) => entry.rank === player.rank - 1);
  const behind = rankedPlayers.find((entry) => entry.rank === player.rank + 1);
  const subject = player.me ? "you" : player.name.split(" ")[0];
  const Line = ({ label, val, tone }: { label: string; val: string; tone?: string }) => (
    <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 14, padding: "10px 0", borderBottom: "1px solid var(--line)" }}>
      <span style={{ fontSize: 13, color: "var(--dim)" }}>{label}</span>
      <span className="wc-num" style={{ fontSize: 13.5, fontWeight: 600, color: tone || "var(--text)", textAlign: "right" }}>{val}</span>
    </div>
  );

  return (
    <div className="wc-card" style={{ padding: "17px 18px" }}>
      <SectionLabel>Where {subject} stand{player.me ? "" : "s"}</SectionLabel>
      <div style={{ marginTop: 8 }}>
        {!player.inMoney && player.toMoney > 0 && <Line label="To the money (3rd)" val={`${player.toMoney} pts back`} tone="var(--down)" />}
        {player.rank > 1 && <Line label="To the leader" val={`${player.gapToLeader} pts back`} />}
        {ahead && <Line label={`Catch ${ahead.me ? "you" : ahead.name} (#${ahead.rank})`} val={`+${Math.max(0, ahead.points - player.points)} to pass`} tone="var(--lime-ink)" />}
        {behind && <Line label={`${behind.me ? "You" : behind.name} (#${behind.rank}) chasing`} val={`${Math.max(0, player.points - behind.points)} pts behind`} />}
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 14, paddingTop: 10 }}>
          <span style={{ fontSize: 13, color: "var(--dim)" }}>Can still reach 1st?</span>
          <span className="wc-num" style={{ fontSize: 13.5, fontWeight: 600, color: player.canReachFirst ? "var(--lime-ink)" : "var(--faint)", textAlign: "right" }}>
            {player.canReachFirst ? "Yes — ceiling clears it" : "No longer possible"}
          </span>
        </div>
      </div>
    </div>
  );
}

function cmpSummarize(teams: ProfileTeam[]) {
  return teams.reduce(
    (summary, team) => ({
      earned: summary.earned + team.pts,
      winnable: summary.winnable + (team.alive ? Math.max(0, team.rem - team.pts) : 0),
      count: summary.count + 1,
    }),
    { earned: 0, winnable: 0, count: 0 },
  );
}

function CmpTeamRow({ t, accent, last }: { t: ProfileTeam; accent: string; last: boolean }) {
  const winnable = t.alive ? Math.max(0, t.rem - t.pts) : 0;
  return (
    <div style={{ display: "flex", alignItems: "center", gap: 10, padding: "8px 0", borderBottom: last ? "none" : "1px solid var(--line)", opacity: t.alive ? 1 : 0.6 }}>
      <span className={"wc-flag " + (t.alive ? "alive" : "out")} style={{ width: 22, height: 22, fontSize: 14, flex: "none" }}>{t.flag}</span>
      <TierBadge tier={t.tier} size={22} />
      <span style={{ flex: 1, minWidth: 0, fontSize: 13.5, fontWeight: 600, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{t.name}</span>
      <span className="wc-num" style={{ fontSize: 13, fontWeight: 600, width: 26, textAlign: "right", flex: "none" }}>{t.pts}</span>
      <span className="wc-num" style={{ fontSize: 12, fontWeight: 600, color: winnable > 0 ? accent : "var(--faint)", width: 34, textAlign: "right", flex: "none" }}>
        {winnable > 0 ? `+${winnable}` : "—"}
      </span>
    </div>
  );
}

function ProfileCompareCard({ me, them }: { me: ProfilePlayer; them: ProfilePlayer }) {
  const theirCodes = new Set(them.teams.map((team) => team.code));
  const mineCodes = new Set(me.teams.map((team) => team.code));
  const shared = me.teams.filter((team) => theirCodes.has(team.code));
  const yourEdge = me.teams
    .filter((team) => !theirCodes.has(team.code))
    .sort((a, b) => (b.pts + b.rem) - (a.pts + a.rem));
  const theirEdge = them.teams
    .filter((team) => !mineCodes.has(team.code))
    .sort((a, b) => (b.pts + b.rem) - (a.pts + a.rem));
  const yourSummary = cmpSummarize(yourEdge);
  const theirSummary = cmpSummarize(theirEdge);
  const gap = me.points - them.points;
  const netSwing = yourSummary.winnable - theirSummary.winnable;
  const youLead = gap > 0;
  const level = gap === 0;
  const [open, setOpen] = useState(false);
  const youAccent = "var(--lime-ink)";
  const themAccent = "var(--violet)";
  const themName = them.name.split(" ")[0];

  const Side = ({ player, accent, align }: { player: ProfilePlayer; accent: string; align: "l" | "r" }) => (
    <div style={{ flex: 1, minWidth: 0, display: "flex", flexDirection: "column", alignItems: align === "r" ? "flex-end" : "flex-start", gap: 7 }}>
      <div style={{ display: "flex", alignItems: "center", gap: 8, flexDirection: align === "r" ? "row-reverse" : "row", minWidth: 0 }}>
        <div
          className="wc-avatar"
          style={{
            width: 30,
            height: 30,
            borderRadius: 9,
            fontSize: 11,
            background: player.me ? "var(--lime)" : "var(--violet-soft)",
            color: player.me ? "var(--on-lime)" : accent,
          }}
        >
          {player.short}
        </div>
        <span style={{ minWidth: 0, fontSize: 14, fontWeight: 700, letterSpacing: "-0.01em", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>
          {player.me ? "You" : player.name.split(" ")[0]}
        </span>
      </div>
      <span className="wc-num" style={{ fontSize: 30, fontWeight: 600, lineHeight: 1, color: accent }}>{player.points}</span>
      <span className="wc-eyebrow" style={{ fontSize: 8.5 }}>#{player.rank} · {player.points} pts</span>
    </div>
  );

  const EdgeBlock = ({
    label,
    sub,
    teams,
    accent,
    soft,
  }: {
    label: string;
    sub: string;
    teams: ProfileTeam[];
    accent: string;
    soft: string;
  }) => (
    <div style={{ padding: "12px 14px", borderRadius: 12, background: soft, border: `1px solid ${accent}33` }}>
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 10, marginBottom: 6 }}>
        <span className="wc-eyebrow" style={{ color: accent }}>{label}</span>
        <span className="wc-num" style={{ fontSize: 10, color: "var(--faint)", textAlign: "right" }}>{sub}</span>
      </div>
      {teams.length === 0 ? (
        <div style={{ fontSize: 12.5, color: "var(--faint)", padding: "4px 0" }}>None — no differential here.</div>
      ) : (
        teams.map((team, index) => <CmpTeamRow key={team.code} t={team} accent={accent} last={index === teams.length - 1} />)
      )}
    </div>
  );

  return (
    <div className="wc-card" style={{ padding: "17px 18px" }}>
      <SectionLabel>Head to head</SectionLabel>

      <div style={{ display: "flex", alignItems: "center", gap: 10, marginTop: 13 }}>
        <Side player={me} accent={youAccent} align="l" />
        <div style={{ flex: "none", display: "flex", flexDirection: "column", alignItems: "center", gap: 3 }}>
          <span className="wc-eyebrow" style={{ fontSize: 8 }}>gap</span>
          <span className="wc-num" style={{ fontSize: 18, fontWeight: 600, color: level ? "var(--faint)" : youLead ? youAccent : themAccent }}>
            {level ? "—" : Math.abs(gap)}
          </span>
        </div>
        <Side player={them} accent={themAccent} align="r" />
      </div>

      <div style={{ fontSize: 13, color: "var(--dim)", marginTop: 14, lineHeight: 1.5, textAlign: "center" }}>
        {level ? (
          <>Dead level with <b style={{ color: "var(--text)" }}>{themName}</b>.</>
        ) : youLead ? (
          <>You lead <b style={{ color: "var(--text)" }}>{themName}</b> by <b className="wc-num" style={{ color: youAccent }}>{gap}</b>.</>
        ) : (
          <><b style={{ color: "var(--text)" }}>{themName}</b> leads you by <b className="wc-num" style={{ color: themAccent }}>{-gap}</b>.</>
        )}
        {" "}Shared picks cancel.
      </div>

      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 12, marginTop: 14, padding: "10px 12px", borderRadius: 12, background: "var(--surface-2)", border: "1px solid var(--line)" }}>
        <span className="wc-eyebrow" style={{ color: "var(--dim)" }}>Differential left</span>
        <span style={{ display: "inline-flex", alignItems: "center", gap: 8, minWidth: 0 }}>
          <span className="wc-num" style={{ color: youAccent, fontSize: 13, fontWeight: 600 }}>+{yourSummary.winnable}</span>
          <span className="wc-num" style={{ color: themAccent, fontSize: 13, fontWeight: 600 }}>+{theirSummary.winnable}</span>
          <span
            className="wc-num"
            style={{
              padding: "2px 7px",
              borderRadius: 999,
              background: "var(--surface-3)",
              color: netSwing > 0 ? youAccent : netSwing < 0 ? themAccent : "var(--faint)",
              fontSize: 11,
              fontWeight: 600,
              whiteSpace: "nowrap",
            }}
          >
            {netSwing === 0 ? "even" : netSwing > 0 ? `you +${netSwing}` : `them +${-netSwing}`}
          </span>
        </span>
      </div>

      <button
        type="button"
        onClick={() => setOpen((value) => !value)}
        aria-expanded={open}
        style={{ marginTop: 11, width: "100%", display: "flex", alignItems: "center", justifyContent: "center", gap: 7, padding: 9, borderRadius: 10, background: "transparent", border: "1px solid var(--line-2)", color: "var(--dim)", cursor: "pointer", fontFamily: "inherit", fontSize: 12.5, fontWeight: 600 }}
      >
        {open ? "Hide the differential" : "Show the differential"}
        {!open && <span style={{ color: "var(--faint)" }}>·</span>}
        {!open && <span className="wc-num" style={{ fontSize: 10.5, color: "var(--faint)" }}>{yourSummary.count}+{theirSummary.count} teams</span>}
        <svg width="13" height="13" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" style={{ transform: open ? "rotate(180deg)" : "none", transition: "transform .15s" }}><path d="M4 6l4 4 4-4" /></svg>
      </button>

      {open && (
        <div style={{ marginTop: 12 }}>
          <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
            <EdgeBlock label="Your edge" sub={`only you · ${yourSummary.count} · +${yourSummary.winnable} left`} teams={yourEdge} accent={youAccent} soft="var(--lime-soft)" />
            <EdgeBlock label={`${themName}'s edge`} sub={`only them · ${theirSummary.count} · +${theirSummary.winnable} left`} teams={theirEdge} accent={themAccent} soft="var(--violet-soft)" />
          </div>

          {shared.length > 0 && (
            <div style={{ display: "flex", alignItems: "center", gap: 10, marginTop: 12, padding: "10px 13px", borderRadius: 11, background: "var(--surface-2)", border: "1px solid var(--line)" }}>
              <span className="wc-eyebrow" style={{ flex: "none" }}>Shared · cancel</span>
              <div style={{ display: "flex", gap: 4, flex: 1, minWidth: 0, flexWrap: "wrap" }}>
                {shared.map((team) => <span key={team.code} className={"wc-flag " + (team.alive ? "alive" : "out")} style={{ width: 20, height: 20, fontSize: 13 }}>{team.flag}</span>)}
              </div>
              <span className="wc-num" style={{ fontSize: 11, color: "var(--faint)", flex: "none" }}>{shared.length}</span>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

function ProfileTieBreaker({ player, canViewPicks }: { player: ProfilePlayer; canViewPicks: boolean }) {
  return (
    <div className="wc-card" style={{ padding: "15px 18px", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
      <div>
        <SectionLabel>Tie-breaker</SectionLabel>
        <div style={{ fontSize: 13.5, fontWeight: 600, marginTop: 4 }}>Goals in the Final</div>
      </div>
      <span className="wc-num" style={{ fontSize: 24, fontWeight: 600, color: "var(--lime-ink)" }}>{canViewPicks ? player.finalGoals ?? "—" : "—"}</span>
    </div>
  );
}

export function PlayerScreen({ name }: { name: string }) {
  const router = useRouter();
  const { user, approvalStatus } = useAuth();
  const { round: poolRound } = usePool();
  // Use live standings so player data is real. useStandings only returns mock data
  // when Firebase is not configured at all.
  const { players: livePlayers, scaleMax: liveScaleMax, round, loading } = useStandings(user?.uid);
  const { player: myPlayer, loading: myPlayerLoading } = useMyData();
  const { results } = useResults();
  const { fixtures, liveState } = useFixtures();
  const countdown = useCountdown();

  const myTeams = enrichPlayerTeams(myPlayer).map((t) => ({ ...t, alive: t.alive }));
  const myPoints = myTeams.reduce((sum, team) => sum + team.pts, 0);
  const myCeiling = myPoints + myTeams.reduce((sum, team) => sum + (team.alive ? team.rem : 0), 0);
  const mySerialized: SerializedPlayer | null = user && myPlayer ? {
    uid: user.uid,
    name: myPlayer.name,
    short: myPlayer.short,
    phone: myPlayer.phone,
    paid: myPlayer.paid,
    approvalStatus: myPlayer.approvalStatus ?? approvalStatus,
    passwordSet: myPlayer.passwordSet,
    hasDrafted: myPlayer.hasDrafted,
    finalGoals: myPlayer.finalGoals,
    points: myPlayer.points || myPoints,
    ceiling: myPlayer.ceiling || myCeiling,
    rank: myPlayer.rank,
    prevRank: myPlayer.prevRank,
    mover: myPlayer.mover,
    payout: myPlayer.payout,
    aliveCount: myPlayer.aliveCount || myTeams.filter((team) => team.alive).length,
    teams: myTeams,
    me: true,
  } : null;
  const liveMe = user ? livePlayers.find((player) => player.uid === user.uid || player.me) : null;
  const players = mySerialized && !liveMe
    ? [mySerialized, ...livePlayers.filter((player) => player.uid !== mySerialized.uid)]
    : livePlayers;
  const scaleMax = liveScaleMax || 100;

  if (loading || (user && myPlayerLoading)) {
    return <div style={{ display: "flex", alignItems: "center", justifyContent: "center", padding: 64, color: "var(--faint)", fontSize: 14 }}>Loading…</div>;
  }

  const p = players.find((x) => x.name === name);
  if (!p) {
    return (
      <div style={{ maxWidth: 720, margin: "0 auto", padding: "40px 28px", color: "var(--dim)" }}>
        <button
          onClick={() => router.push("/")}
          style={{ display: "flex", alignItems: "center", gap: 7, background: "none", border: "none", color: "var(--dim)", cursor: "pointer", fontFamily: "inherit", fontSize: 13.5, padding: 0, marginBottom: 18 }}
        >
          <svg width="15" height="15" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round"><path d="M10 3L5 8l5 5" /></svg>
          Back to leaderboard
        </button>
        <div className="wc-card" style={{ padding: 22 }}>
          <SectionLabel>Player not found</SectionLabel>
          <div style={{ fontSize: 18, fontWeight: 800, color: "var(--text)", marginTop: 8 }}>
            No live standings entry for {name}
          </div>
        </div>
      </div>
    );
  }

  const isMe = !!p.me;
  const canViewPicks = isMe || (countdown.ready && countdown.isLocked);
  const rankedBase = players.filter((entry) => entry.rank > 0).sort((a, b) => a.rank - b.rank);
  const moneyCutoffPoints = rankedBase[2]?.points ?? null;
  const profilePlayers = rankedBase.map((entry) => makeProfilePlayer(entry, rankedBase, moneyCutoffPoints));
  const profile = makeProfilePlayer(p, rankedBase, moneyCutoffPoints);
  const compareBase = players.find((entry) => entry.me);
  const compareMe = compareBase ? makeProfilePlayer(compareBase, rankedBase, moneyCutoffPoints) : null;
  const profileRound = round === "—" ? poolRound : round;

  const PrivatePicks = (
    <div className="wc-card" style={{ padding: "22px 20px", textAlign: "center" }}>
      <SectionLabel>Entry private</SectionLabel>
      <div style={{ fontSize: 18, fontWeight: 800, letterSpacing: "-0.01em", marginTop: 8 }}>
        Picks unlock when drafting locks
      </div>
      <div style={{ maxWidth: 420, margin: "7px auto 0", fontSize: 13.5, color: "var(--dim)", lineHeight: 1.5 }}>
        Other players&apos; teams, ceilings, and tie-breakers stay hidden until the first World Cup match kicks off.
      </div>
      <div className="wc-pill" style={{ marginTop: 14 }}>
        {countdown.ready ? `Locks in ${countdown.label}` : "Locks at kickoff"}
      </div>
    </div>
  );

  const BackLink = (
    <button
      onClick={() => router.push("/")}
      style={{ display: "flex", alignItems: "center", gap: 7, background: "none", border: "none", color: "var(--dim)", cursor: "pointer", fontFamily: "inherit", fontSize: 13.5, padding: 0, marginBottom: 18 }}
    >
      <svg width="15" height="15" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round"><path d="M10 3L5 8l5 5" /></svg>
      Back to leaderboard
    </button>
  );

  return (
    <>
      {/* desktop */}
      <div className="wc-desktop-only" style={{ maxWidth: 1040, margin: "0 auto", padding: "24px 28px 56px" }}>
        {BackLink}
        <div className="wc-card" style={{ padding: "22px 24px" }}>
          <ProfileHero player={profile} big />
        </div>
        {canViewPicks && !profile.me && compareMe && (
          <div style={{ marginTop: 20 }}>
            <ProfileCompareCard me={compareMe} them={profile} />
          </div>
        )}
        {canViewPicks ? (
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 20, marginTop: 20, alignItems: "start" }}>
            <div style={{ display: "flex", flexDirection: "column", gap: 20 }}>
              <ProfilePointsPathCard player={profile} scaleMax={scaleMax} round={profileRound} />
              <ProfileWhereYouStand player={profile} rankedPlayers={profilePlayers} />
              <ProfileTieBreaker player={profile} canViewPicks={canViewPicks} />
            </div>
              <ProfileCeilingLedger player={profile} fixtures={fixtures} liveState={liveState} results={results} />
          </div>
        ) : (
          <div style={{ marginTop: 20 }}>{PrivatePicks}</div>
        )}
      </div>

      {/* mobile */}
      <div className="wc-mobile-only" style={{ padding: "16px 16px 24px", display: "flex", flexDirection: "column", gap: 16 }}>
        {BackLink}
        {canViewPicks ? (
          <>
            <ProfileHero player={profile} />
            {!profile.me && compareMe && <ProfileCompareCard me={compareMe} them={profile} />}
            <ProfilePointsPathCard player={profile} scaleMax={scaleMax} round={profileRound} />
            <ProfileCeilingLedger player={profile} fixtures={fixtures} liveState={liveState} results={results} />
            <ProfileWhereYouStand player={profile} rankedPlayers={profilePlayers} />
            <ProfileTieBreaker player={profile} canViewPicks={canViewPicks} />
          </>
        ) : (
          <>
            <ProfileHero player={profile} />
            {PrivatePicks}
          </>
        )}
      </div>
    </>
  );
}
