"use client";

/* Player views — My Picks and Player Detail. */

import { useState } from "react";
import { useRouter } from "next/navigation";
import { CeilingBar, MiniStanding, Mover, fmtKES } from "@/components/ds";
import { Btn, PageHead, SectionLabel } from "@/components/ui";
import { TeamLine } from "@/components/player/parts";
import { T } from "@/lib/data";
import { useStandings } from "@/hooks/useStandings";
import { useMyData, enrichPlayerTeams } from "@/hooks/useMyData";
import { useResults } from "@/hooks/useResults";
import { useFixtures } from "@/hooks/useFixtures";
import { useAuth } from "@/lib/auth";
import { useCountdown } from "@/lib/countdown";
import { EdgeBanner } from "@/components/edge/EdgeBanner";
import { displayPhone } from "@/lib/phone";
import type { FixtureWithId, ResultWithId } from "@/lib/firestore";
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
                <span className={"wc-flag " + (team.alive ? "alive" : "out")} style={{ width: 26, height: 26, fontSize: 17 }}>
                  {team.flag}
                </span>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ fontSize: 13.5, fontWeight: 700, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>
                    {team.name}
                  </div>
                  <div className="wc-eyebrow" style={{ marginTop: 2 }}>Tier {team.tier}</div>
                </div>
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
                        <div style={{ fontSize: 12.5, fontWeight: 650 }}>
                          {event.label}
                        </div>
                        <div style={{ fontSize: 12, color: "var(--dim)", marginTop: 2, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>
                          vs {event.opponentFlag} {event.opponentName} · {event.detail}
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
export function PlayerScreen({ name }: { name: string }) {
  const router = useRouter();
  const { user, approvalStatus } = useAuth();
  // Use live standings so player data is real. useStandings only returns mock data
  // when Firebase is not configured at all.
  const { players: livePlayers, scaleMax: liveScaleMax, loading } = useStandings(user?.uid);
  const { player: myPlayer, loading: myPlayerLoading } = useMyData();
  const { results, loading: resultsLoading } = useResults();
  const { fixtures, loading: fixturesLoading } = useFixtures();
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
  const players = mySerialized
    ? [mySerialized, ...livePlayers.filter((player) => player.uid !== mySerialized.uid)]
    : livePlayers;
  const scaleMax = liveScaleMax || 100;
  const me = players.find((p) => p.me);

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
  const alive = canViewPicks ? p.teams.filter((t) => t.alive).sort(sortByPts) : [];
  const out = canViewPicks ? p.teams.filter((t) => !t.alive).sort(sortByPts) : [];
  const gap = me ? me.points - p.points : 0;
  const ranked = p.rank > 0;
  const moneyCutoffPoints = players.filter((x) => x.rank > 0).sort((a, b) => a.rank - b.rank)[2]?.points ?? null;
  const moneyLabel = (() => {
    if (p.payout) return "Proj. " + fmtKES(p.payout);
    if (!ranked) return "Unranked";
    if (typeof moneyCutoffPoints !== "number") return "1 pt from money";
    const moneyGap = Math.max(1, moneyCutoffPoints - p.points + 1);
    return `${moneyGap} ${moneyGap === 1 ? "pt" : "pts"} from money`;
  })();

  const Header = (
    <div style={{ display: "flex", alignItems: "center", gap: 14 }}>
      <div className="wc-avatar" style={{ width: 54, height: 54, borderRadius: 16, fontSize: 18 }}>{p.short}</div>
      <div style={{ flex: 1 }}>
        <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
          <span style={{ fontSize: 20, fontWeight: 800, letterSpacing: "-0.02em" }}>{p.name}</span>
          {isMe && <span className="wc-tag-you">You</span>}
        </div>
        <div style={{ display: "flex", alignItems: "center", gap: 8, marginTop: 5 }}>
          <span className="wc-num" style={{ fontSize: 13, color: ranked && p.rank <= 3 ? "var(--gold)" : "var(--dim)", fontWeight: 600 }}>
            {ranked ? `#${p.rank}` : "Unranked"}
          </span>
          {ranked && <Mover value={p.mover} />}
        </div>
      </div>
      <div style={{ textAlign: "right" }}>
        <div className="wc-num" style={{ fontSize: 30, fontWeight: 600, lineHeight: 1 }}>{p.points}</div>
        <div className="wc-eyebrow" style={{ marginTop: 4 }}>points</div>
      </div>
    </div>
  );

  const Ceiling = (
    <div className="wc-card" style={{ padding: "15px 16px" }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline" }}>
        <SectionLabel>Points vs ceiling</SectionLabel>
        <span className="wc-num" style={{ fontSize: 13, fontWeight: 600, color: p.payout ? "var(--gold)" : "var(--dim)" }}>
          {moneyLabel}
        </span>
      </div>
      <div style={{ marginTop: 12 }}><CeilingBar points={p.points} ceiling={p.ceiling} scaleMax={scaleMax} /></div>
    </div>
  );

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

  const Gap = !isMe && me ? (
    <div style={{ display: "flex", alignItems: "center", justifyContent: "center", gap: 8, padding: "10px", borderRadius: 12, background: "var(--surface-2)", border: "1px solid var(--line)" }}>
      <span style={{ fontSize: 13, color: "var(--dim)" }}>
        {gap > 0 ? `${gap} pts ahead of you` : gap < 0 ? `${-gap} pts behind you` : "Level with you"}
      </span>
    </div>
  ) : null;

  const Tie = (
    <div className="wc-card" style={{ padding: "15px 16px", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
      <span style={{ fontSize: 13.5, color: "var(--dim)" }}>Final-goals tie-breaker</span>
      <span className="wc-num" style={{ fontSize: 18, fontWeight: 600 }}>{canViewPicks ? p.finalGoals ?? "—" : "—"}</span>
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
      <div className="wc-desktop-only" style={{ maxWidth: 900, margin: "0 auto", padding: "26px 28px 64px" }}>
        {BackLink}
        {Header}
        <div style={{ display: "grid", gridTemplateColumns: "1fr 300px", gap: 18, marginTop: 18, alignItems: "start" }}>
          {canViewPicks ? (
            <div>
              <SectionLabel style={{ marginBottom: 8, color: "var(--lime-ink)" }}>● Still alive · {alive.length}</SectionLabel>
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
                {alive.map((t) => (<div key={t.code} className="wc-card" style={{ padding: "4px 14px" }}><TeamLine t={t} showRem last /></div>))}
              </div>
              <SectionLabel style={{ margin: "22px 0 8px" }}>✕ Eliminated · {out.length}</SectionLabel>
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
                {out.map((t) => (<div key={t.code} className="wc-card" style={{ padding: "4px 14px" }}><TeamLine t={t} last /></div>))}
              </div>
            </div>
          ) : PrivatePicks}
          <div>
            <div className="wc-eyebrow" aria-hidden style={{ visibility: "hidden", marginBottom: 8 }}>·</div>
            <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
              {canViewPicks && Ceiling}{Gap}{canViewPicks && Tie}
              {canViewPicks && <PointsPath player={p} results={results} fixtures={fixtures} loading={resultsLoading || fixturesLoading} />}
            </div>
          </div>
        </div>
      </div>

      {/* mobile */}
      <div className="wc-mobile-only" style={{ padding: "16px 18px 22px" }}>
        {BackLink}
        {Header}
        {canViewPicks && <div style={{ marginTop: 16 }}>{Ceiling}</div>}
        {Gap && <div style={{ marginTop: 14 }}>{Gap}</div>}
        {canViewPicks ? (
          <>
            <SectionLabel style={{ marginTop: 22, marginBottom: 6, color: "var(--lime-ink)" }}>● Still alive · {alive.length}</SectionLabel>
            <div className="wc-card" style={{ padding: "2px 14px" }}>
              {alive.map((t, i) => <TeamLine key={t.code} t={t} showRem last={i === alive.length - 1} />)}
            </div>
            <SectionLabel style={{ marginTop: 20, marginBottom: 6 }}>✕ Eliminated · {out.length}</SectionLabel>
            <div className="wc-card" style={{ padding: "2px 14px" }}>
              {out.map((t, i) => <TeamLine key={t.code} t={t} last={i === out.length - 1} />)}
            </div>
            <div style={{ marginTop: 18 }}>{Tie}</div>
            <div style={{ marginTop: 18 }}>
              <PointsPath player={p} results={results} fixtures={fixtures} loading={resultsLoading || fixturesLoading} />
            </div>
          </>
        ) : (
          <div style={{ marginTop: 18 }}>{PrivatePicks}</div>
        )}
      </div>
    </>
  );
}
