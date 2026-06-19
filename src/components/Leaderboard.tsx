"use client";

/* Leaderboard — the canonical screen and source of the whole visual system.
   Ported from DesktopLeaderboard + MobileLeaderboard (wadau-components.jsx /
   wadau-desktop.jsx). The top bar / status bar / bottom nav now live in
   PageShell; this renders only the screen body for both layouts. */

import { Fragment, useState } from "react";
import { useRouter } from "next/navigation";
import {
  CeilingBar,
  DESKTOP_GRID,
  DesktopRow,
  fmtK,
  fmtKES,
  MobileRow,
  MoneyLine,
  Mover,
} from "@/components/ds";
import { useStandings } from "@/hooks/useStandings";
import { enrichPlayerTeams, useMyData } from "@/hooks/useMyData";
import { useAuth } from "@/lib/auth";
import { EdgeBanner } from "@/components/edge/EdgeBanner";
import type { SerializedPlayer } from "@/lib/types";
import { usePool } from "@/hooks/usePool";
import { useCountdown } from "@/lib/countdown";
import { PAYMENT_RECIPIENTS, PAYMENT_WHATSAPP } from "@/lib/payment";

function playerKey(p: { uid?: string; name: string }, scope: string, index: number) {
  return `${scope}-${p.uid ?? p.name}-${index}`;
}

function playerPhoneKey(p: Pick<SerializedPlayer, "uid" | "phone">) {
  return p.phone?.replace(/\D/g, "") || p.uid;
}

function preferDisplayPlayer(existing: SerializedPlayer, next: SerializedPlayer) {
  if (next.me && !existing.me) return next;
  if (next.hasDrafted !== existing.hasDrafted) return next.hasDrafted ? next : existing;
  if (next.paid !== existing.paid) return next.paid ? next : existing;
  if ((next.rank > 0) !== (existing.rank > 0)) return next.rank > 0 ? next : existing;
  if (next.teams.length !== existing.teams.length) return next.teams.length > existing.teams.length ? next : existing;
  if (existing.stageGamesLeft == null && next.stageGamesLeft != null) return next;
  return next.points > existing.points ? next : existing;
}

function uniquePlayersByPhone(players: SerializedPlayer[]) {
  const byPhone = new Map<string, SerializedPlayer>();
  for (const player of players) {
    const key = playerPhoneKey(player);
    const existing = byPhone.get(key);
    byPhone.set(key, existing ? preferDisplayPlayer(existing, player) : player);
  }
  return Array.from(byPhone.values());
}

function pendingPlaceholder(index: number): SerializedPlayer {
  return {
    uid: `pending-placeholder-${index}`,
    name: `Player ${index}`,
    short: "??",
    phone: "",
    paid: false,
    approvalStatus: "pending",
    passwordSet: true,
    hasDrafted: false,
    finalGoals: null,
    points: 0,
    ceiling: 0,
    stageGamesLeft: 0,
    stagePossiblePoints: 0,
    rank: 0,
    prevRank: 0,
    mover: 0,
    payout: 0,
    aliveCount: 0,
    teams: [],
  };
}

function dateFromTimestamp(value: unknown): Date | null {
  if (!value) return null;
  if (value instanceof Date) return value;
  if (typeof value === "object" && "toDate" in value && typeof value.toDate === "function") {
    return value.toDate();
  }
  if (typeof value === "object" && "seconds" in value && typeof value.seconds === "number") {
    return new Date(value.seconds * 1000);
  }
  return null;
}

function formatUpdated(value: unknown) {
  const date = dateFromTimestamp(value);
  if (!date) return "not computed";
  const diffMs = Date.now() - date.getTime();
  if (diffMs < 60_000) return "just now";
  const mins = Math.floor(diffMs / 60_000);
  if (mins < 60) return `${mins}m ago`;
  const hours = Math.floor(mins / 60);
  if (hours < 24) return `${hours}h ago`;
  return date.toLocaleDateString([], { month: "short", day: "numeric" });
}

function LeaderboardEmptyState() {
  return (
    <div style={{ padding: "34px 24px 38px", textAlign: "center" }}>
      <div
        className="wc-avatar"
        style={{
          width: 54,
          height: 54,
          borderRadius: 16,
          margin: "0 auto 14px",
          fontSize: 18,
        }}
      >
        WC
      </div>
      <div style={{ fontSize: 19, fontWeight: 800, letterSpacing: "-0.02em" }}>
        No leaderboard yet
      </div>
      <div style={{ maxWidth: 420, margin: "8px auto 0", fontSize: 13.5, color: "var(--dim)", lineHeight: 1.5 }}>
        Player accounts and locked entries will appear here once the pool has participants.
      </div>
    </div>
  );
}

function PaymentInfoCard({ buyin }: { buyin: number }) {
  return (
    <div className="wc-card" style={{ padding: "15px 16px", background: "var(--surface-2)", marginBottom: 14 }}>
      <div className="wc-eyebrow wc-gold-text">Payment details</div>
      <div style={{ fontSize: 13.5, color: "var(--dim)", marginTop: 8, lineHeight: 1.5 }}>
        Send your {fmtKES(buyin)} buy-in to either account, then follow up on WhatsApp.
      </div>
      <div style={{ display: "flex", flexDirection: "column", gap: 9, marginTop: 12 }}>
        {PAYMENT_RECIPIENTS.map((recipient) => (
          <div key={recipient.name} style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline", gap: 12 }}>
            <span style={{ fontSize: 13, color: "var(--dim)" }}>M-Pesa · {recipient.name}</span>
            <span className="wc-num" style={{ fontSize: 13, fontWeight: 700, whiteSpace: "nowrap" }}>{recipient.phone}</span>
          </div>
        ))}
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline", gap: 12 }}>
          <span style={{ fontSize: 13, color: "var(--dim)" }}>WhatsApp follow-up</span>
          <span className="wc-num" style={{ fontSize: 13, fontWeight: 700, whiteSpace: "nowrap" }}>{PAYMENT_WHATSAPP}</span>
        </div>
      </div>
    </div>
  );
}

function MyStandingJump({ player, onJump }: { player: SerializedPlayer; onJump: () => void }) {
  return (
    <button
      type="button"
      onClick={onJump}
      className="wc-card"
      style={{
        width: "100%",
        borderColor: "var(--lime-line)",
        background: "var(--lime-soft)",
        color: "var(--text)",
        padding: "11px 14px",
        display: "flex",
        alignItems: "center",
        justifyContent: "space-between",
        gap: 12,
        cursor: "pointer",
        fontFamily: "inherit",
        textAlign: "left",
      }}
    >
      <span style={{ display: "flex", alignItems: "center", gap: 10, minWidth: 0 }}>
        <span className="wc-avatar" style={{ width: 30, height: 30, borderRadius: 9 }}>{player.short}</span>
        <span style={{ minWidth: 0 }}>
          <span style={{ display: "block", fontSize: 13.5, fontWeight: 700, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>
            Your spot · {player.rank > 0 ? `P${player.rank}` : "unranked"}
          </span>
          <span className="wc-num" style={{ display: "block", marginTop: 2, fontSize: 11, color: "var(--dim)" }}>
            {player.points} pts · ceiling {player.ceiling}
          </span>
        </span>
      </span>
      <span className="wc-num" style={{ fontSize: 11, fontWeight: 700, color: "var(--lime-ink)", whiteSpace: "nowrap" }}>
        Jump to row ↓
      </span>
    </button>
  );
}

export function Leaderboard() {
  const { user, approvalStatus } = useAuth();
  const { players, scaleMax, round, computedAt, loading } = useStandings(user?.uid, approvalStatus !== "pending");
  const { player: myPlayer, loading: myPlayerLoading } = useMyData();
  const { buyin, payoutPct, round: poolRound } = usePool();
  const countdown = useCountdown();
  const [showPaymentInfo, setShowPaymentInfo] = useState(false);
  const [prizeExpanded, setPrizeExpanded] = useState(false);
  const picksArePublic = countdown.ready && countdown.isLocked;
  const router = useRouter();
  const goToPlayer = (name: string) => router.push(`/player/${encodeURIComponent(name)}`);
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
    stageGamesLeft: undefined,
    stagePossiblePoints: undefined,
    rank: myPlayer.rank,
    prevRank: myPlayer.prevRank,
    mover: myPlayer.mover,
    payout: myPlayer.payout,
    aliveCount: myPlayer.aliveCount || myTeams.filter((team) => team.alive).length,
    teams: myTeams,
    me: true,
  } : null;
  const viewerPending = (mySerialized?.approvalStatus ?? approvalStatus) === "pending";
  const displayPlayers = (() => {
    const base = uniquePlayersByPhone(mySerialized ? [mySerialized, ...players] : players);
    if (!viewerPending) return base;
    const me = base.find((p) => p.me) ?? mySerialized;
    const others = base.filter((p) => !p.me).length;
    const placeholders = Array.from({ length: Math.max(3, others) }, (_, i) => pendingPlaceholder(i + 1));
    return me ? [me, ...placeholders] : placeholders;
  })();
  const paidEntries = displayPlayers.filter((p) => p.paid).length;
  const orderedPlayers = [...displayPlayers].sort((a, b) => {
    if (!picksArePublic) {
      if (!!a.me !== !!b.me) return a.me ? -1 : 1;
      if (a.paid !== b.paid) return a.paid ? -1 : 1;
      return a.name.localeCompare(b.name);
    }
    const aRanked = a.rank > 0;
    const bRanked = b.rank > 0;
    if (aRanked !== bRanked) return aRanked ? -1 : 1;
    if (aRanked && bRanked) return a.rank - b.rank;
    return b.points - a.points || b.ceiling - a.ceiling;
  }).map((p, index) => {
    const privateRank = !picksArePublic || viewerPending;
    const base = privateRank ? { ...p, rank: 0, mover: 0, payout: 0 } : p;
    if (viewerPending && !base.me) {
      return {
        ...base,
        name: `Player ${index}`,
        short: "??",
        phone: "",
        points: 0,
        ceiling: 0,
        aliveCount: 0,
        teams: [],
      };
    }
    return base;
  });
  const rankedPlayers = orderedPlayers.filter((p) => p.rank > 0);
  const moneyCutoffPoints = rankedPlayers[2]?.points ?? null;
  const leader = rankedPlayers[0] ?? null;
  const contentionPlayers = leader
    ? rankedPlayers.filter((p) => p.ceiling >= leader.points).sort((a, b) => b.ceiling - a.ceiling || a.rank - b.rank)
    : [];
  const biggestMover = rankedPlayers.filter((player) => player.mover !== 0).reduce<SerializedPlayer | null>((best, player) => {
    if (!best) return player;
    if (Math.abs(player.mover) !== Math.abs(best.mover)) return Math.abs(player.mover) > Math.abs(best.mover) ? player : best;
    return player.points > best.points ? player : best;
  }, null);
  const payouts = [
    Math.round(paidEntries * buyin * payoutPct[0] / 100),
    Math.round(paidEntries * buyin * payoutPct[1] / 100),
    Math.round(paidEntries * buyin * payoutPct[2] / 100),
  ] as [number, number, number];

  const W = {
    players: orderedPlayers,
    scaleMax,
    round: round === "—" ? poolRound : round,
    payouts,
    entries: displayPlayers.length,
    pot: paidEntries * buyin,
    buyin,
    updated: formatUpdated(computedAt),
  };
  const currentVisiblePlayer = user ? W.players.find((p) => p.uid === user.uid || p.me) : null;
  const showMyJump = Boolean(currentVisiblePlayer && !viewerPending && currentVisiblePlayer.rank > 3);
  const jumpToMyRow = () => {
    const rows = [
      document.getElementById("leaderboard-me-row-desktop"),
      document.getElementById("leaderboard-me-row-mobile"),
    ].filter(Boolean) as HTMLElement[];
    const visibleRow = rows.find((row) => row.offsetParent !== null) ?? rows[0];
    visibleRow?.scrollIntoView({ behavior: "smooth", block: "center" });
  };

  if (loading || (user && myPlayerLoading)) {
    return (
      <div style={{ display: "flex", alignItems: "center", justifyContent: "center", padding: 64, color: "var(--faint)", fontSize: 14 }}>
        Loading standings…
      </div>
    );
  }

  // Edge state: current player's payment status
  const currentPlayer = user ? displayPlayers.find((p) => p.uid === user.uid || p.me) : null;
  const approvalPending = currentPlayer?.approvalStatus === "pending" || approvalStatus === "pending";
  const paymentPending = currentPlayer && !currentPlayer.paid && !approvalPending;
  // Edge state: pre-results (no one has any points yet)
  const noPlayers = W.players.length === 0;
  return (
    <>
      {/* ============ EDGE BANNERS (both layouts) ============ */}
      {(!picksArePublic || paymentPending || approvalPending) && (
        <div className="wc-leaderboard-notices">
          {approvalPending && (
            <EdgeBanner
              tone="gold"
              title="Approval pending"
              body="Your entry is saved. The full leaderboard unlocks after the admin approves your account."
            />
          )}
          {!picksArePublic && (
            <EdgeBanner
              tone="lime"
              title="Drafts private until team picks are locked"
              body={`Ranks, payouts, and other players' ceilings unlock when picks lock in ${countdown.label}.`}
            />
          )}
          {paymentPending && (
            <>
              <EdgeBanner
                tone="gold"
                title="Payment pending"
                body="You can draft and watch now. You’ll be ranked once the admin confirms payment."
                action={showPaymentInfo ? "Hide payment details" : "Tap for payment details"}
                onClick={() => setShowPaymentInfo((value) => !value)}
              />
              {showPaymentInfo && <PaymentInfoCard buyin={buyin} />}
            </>
          )}
        </div>
      )}

      {/* ============ DESKTOP ============ */}
      <div
        className="wc-desktop-only"
        style={{
          gridTemplateColumns: "minmax(0, 1fr) minmax(260px, 312px)",
          gap: 24,
          padding: "24px 28px",
          alignItems: "start",
          maxWidth: 1320,
          margin: "0 auto",
          display: "grid",
        }}
      >
        {/* main table */}
        <div style={{ display: "flex", flexDirection: "column", gap: 12, minWidth: 0 }}>
        {showMyJump && currentVisiblePlayer && <MyStandingJump player={currentVisiblePlayer} onJump={jumpToMyRow} />}
        <div className="wc-card" style={{ overflow: "hidden", minWidth: 0 }}>
          <div
            style={{
              display: "flex",
              alignItems: "center",
              justifyContent: "space-between",
              padding: "18px 24px 16px",
            }}
          >
            <div style={{ display: "flex", alignItems: "baseline", gap: 11 }}>
              <span style={{ fontSize: 18, fontWeight: 700, letterSpacing: "-0.01em" }}>
                Standings
              </span>
              <span className="wc-eyebrow">Updated {W.updated}</span>
            </div>
            <span className="wc-pill" style={{ color: "var(--text)", borderColor: "var(--line-2)" }}>
              {W.round}
            </span>
          </div>
          {/* column header */}
          <div
            style={{
              display: "grid",
              gridTemplateColumns: DESKTOP_GRID,
              gap: 12,
              padding: "0 18px 10px",
              borderBottom: "1px solid var(--line)",
            }}
          >
            {["Rank", "Player", "Ceiling", "Pts", "Payout", "Move"].map((h, i) => (
              <span
                key={h}
                className="wc-eyebrow"
                style={{ textAlign: i >= 3 ? "right" : "left", fontSize: 9.5 }}
              >
                {h}
              </span>
            ))}
          </div>
          {noPlayers ? (
            <LeaderboardEmptyState />
          ) : (
            W.players.map((p, i) => (
              <Fragment key={playerKey(p, "desktop", i)}>
                <DesktopRow
                  p={p}
                  scaleMax={W.scaleMax}
                  last={i === W.players.length - 1}
                  moneyCutoffPoints={moneyCutoffPoints}
                  hidePicks={(viewerPending && !p.me) || (!picksArePublic && !p.me)}
                  rowId={p.me ? "leaderboard-me-row-desktop" : undefined}
                  onClick={viewerPending && !p.me ? undefined : () => goToPlayer(p.name)}
                />
                {picksArePublic && p.rank === 3 && <MoneyLine />}
              </Fragment>
            ))
          )}
        </div>
        </div>

        {/* right rail */}
        <div style={{ display: "flex", flexDirection: "column", gap: 16, minWidth: 0 }}>
          {/* pot */}
          <div className="wc-card" style={{ padding: "20px", position: "relative", overflow: "hidden" }}>
            <div
              style={{
                position: "absolute",
                top: -50,
                right: -40,
                width: 180,
                height: 180,
                borderRadius: "50%",
                background: "radial-gradient(circle, var(--lime-soft), transparent 70%)",
              }}
            />
            <div className="wc-eyebrow">Prize pool</div>
            <button
              type="button"
              onClick={() => setPrizeExpanded((value) => !value)}
              style={{
                width: "100%",
                padding: 0,
                border: "none",
                background: "transparent",
                color: "inherit",
                cursor: "pointer",
                fontFamily: "inherit",
                textAlign: "left",
                position: "relative",
              }}
            >
              <div style={{ display: "flex", alignItems: "baseline", justifyContent: "space-between", gap: 12 }}>
                <div className="wc-num" style={{ fontSize: 34, fontWeight: 600, letterSpacing: "-0.03em", marginTop: 8 }}>
                  {fmtKES(W.pot)}
                </div>
                <span className="wc-num" style={{ fontSize: 11, color: "var(--lime-ink)", fontWeight: 700 }}>
                  {prizeExpanded ? "Hide" : "Details"}
                </span>
              </div>
            </button>
            {prizeExpanded && <div className="wc-eyebrow" style={{ marginTop: 6, color: "var(--dim)" }}>
              {paidEntries} paid of {W.entries} players · {fmtKES(W.buyin)} buy-in
            </div>}
            {prizeExpanded && <div style={{ marginTop: 18, display: "flex", flexDirection: "column", gap: 10 }}>
              {(
                [
                  ["1st place", W.payouts[0], payoutPct[0]],
                  ["2nd place", W.payouts[1], payoutPct[1]],
                  ["3rd place", W.payouts[2], payoutPct[2]],
                ] as [string, number, number][]
              ).map(([k, v, pct]) => (
                <div key={k}>
                  <div
                    style={{
                      display: "flex",
                      justifyContent: "space-between",
                      alignItems: "baseline",
                      marginBottom: 5,
                    }}
                  >
                    <span className="wc-eyebrow wc-gold-text" style={{ fontSize: 10 }}>
                      {k}
                    </span>
                    <span className="wc-num wc-gold-fill" style={{ fontSize: 14, fontWeight: 600 }}>
                      {fmtKES(v)}
                    </span>
                  </div>
                  <div style={{ height: 5, borderRadius: 3, background: "var(--track)" }}>
                    <div
                      style={{ height: "100%", width: pct + "%", borderRadius: 3, background: "var(--gold-grad)" }}
                    />
                  </div>
                </div>
              ))}
            </div>}
          </div>

          {/* biggest mover */}
          <div className="wc-card" style={{ padding: "18px 20px" }}>
            <div className="wc-eyebrow">Biggest mover</div>
            <div style={{ display: "flex", alignItems: "center", gap: 11, marginTop: 12 }}>
              <div className="wc-avatar">{biggestMover?.short ?? "—"}</div>
              <div style={{ flex: 1 }}>
                <div style={{ display: "flex", alignItems: "center", gap: 7 }}>
                  <span style={{ fontSize: 15, fontWeight: 600 }}>{biggestMover?.name ?? "No movement yet"}</span>
                  {biggestMover && <Mover value={biggestMover.mover} />}
                </div>
                <div style={{ fontSize: 12.5, color: "var(--dim)", marginTop: 3 }}>
                  {biggestMover ? (
                    <>
                      <span style={{ color: biggestMover.mover > 0 ? "var(--up)" : biggestMover.mover < 0 ? "var(--down)" : "var(--dim)", fontWeight: 600 }}>
                        {biggestMover.points} pts
                      </span>{" "}
                      · ceiling {biggestMover.ceiling}
                    </>
                  ) : (
                    picksArePublic ? "Recompute after match results to see movement." : "Movement unlocks when drafts lock."
                  )}
                </div>
              </div>
            </div>
          </div>

          {/* contention */}
          <div className="wc-card" style={{ padding: "18px 20px" }}>
            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
              <div className="wc-eyebrow">Still alive for 1st</div>
              <span className="wc-num" style={{ fontSize: 13, fontWeight: 600, color: "var(--lime-ink)" }}>
                {contentionPlayers.length} of {rankedPlayers.length}
              </span>
            </div>
            <div style={{ fontSize: 12.5, color: "var(--dim)", marginTop: 9, lineHeight: 1.5 }}>
              {picksArePublic ? (
                <>
                  Anyone whose <span style={{ color: "var(--text)", fontWeight: 600 }}>ceiling</span> can still
                  reach the leader&apos;s pace. Eliminations narrow this every round.
                </>
              ) : (
                "Ceiling-based contention stays hidden until every entry is locked."
              )}
            </div>
            <div style={{ marginTop: 14, display: "flex", flexDirection: "column", gap: 9 }}>
              {contentionPlayers.slice(0, 3).map((p, i) => (
                <div key={playerKey(p, "contention", i)} style={{ display: "flex", alignItems: "center", gap: 10 }}>
                  <span className="wc-num" style={{ fontSize: 11, color: "var(--faint)", width: 14 }}>
                    {p.rank > 0 ? p.rank : "—"}
                  </span>
                  <span style={{ fontSize: 12.5, fontWeight: 500, width: 62 }}>{p.name}</span>
                  <div style={{ flex: 1 }}>
                    <CeilingBar
                      points={p.points}
                      ceiling={p.ceiling}
                      scaleMax={W.scaleMax}
                      showCaption={false}
                    />
                  </div>
                  <span
                    className="wc-num"
                    style={{ fontSize: 11, color: "var(--faint)", width: 30, textAlign: "right" }}
                  >
                    {p.ceiling}
                  </span>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* ============ MOBILE ============ */}
      <div className="wc-mobile-only" style={{ display: "block" }}>
        <div style={{ padding: "0 18px" }}>
          {showMyJump && currentVisiblePlayer && (
            <div style={{ marginTop: 14 }}>
              <MyStandingJump player={currentVisiblePlayer} onJump={jumpToMyRow} />
            </div>
          )}
          {/* pot card */}
          <div
            className="wc-card"
            style={{ marginTop: 14, padding: "16px 18px", position: "relative", overflow: "hidden" }}
          >
            <div
              style={{
                position: "absolute",
                top: -40,
                right: -30,
                width: 160,
                height: 160,
                borderRadius: "50%",
                background: "radial-gradient(circle, var(--lime-soft), transparent 70%)",
                pointerEvents: "none",
              }}
            />
            <div
              style={{
                display: "flex",
                justifyContent: "space-between",
                alignItems: "flex-start",
                position: "relative",
              }}
            >
              <div>
                <div className="wc-eyebrow">Prize pool</div>
                <button
                  type="button"
                  onClick={() => setPrizeExpanded((value) => !value)}
                  style={{
                    padding: 0,
                    border: "none",
                    background: "transparent",
                    color: "inherit",
                    cursor: "pointer",
                    fontFamily: "inherit",
                    textAlign: "left",
                  }}
                >
                  <span
                    className="wc-num"
                    style={{
                      display: "block",
                      fontSize: 31,
                      fontWeight: 600,
                      letterSpacing: "-0.03em",
                      lineHeight: 1,
                      marginTop: 7,
                      whiteSpace: "nowrap",
                    }}
                  >
                    {fmtKES(W.pot)}
                  </span>
                  <span className="wc-num" style={{ display: "block", marginTop: 6, fontSize: 10.5, color: "var(--lime-ink)", fontWeight: 700 }}>
                    {prizeExpanded ? "Hide details" : "Show payout"}
                  </span>
                </button>
              </div>
              {prizeExpanded && <div style={{ textAlign: "right", display: "flex", flexDirection: "column", gap: 6 }}>
                <div style={{ whiteSpace: "nowrap" }}>
                  <span className="wc-num" style={{ fontSize: 15, fontWeight: 600 }}>
                    {paidEntries}
                  </span>
                  <span className="wc-eyebrow" style={{ marginLeft: 5 }}>
                    paid
                  </span>
                </div>
                <div style={{ whiteSpace: "nowrap" }}>
                  <span className="wc-num" style={{ fontSize: 15, fontWeight: 600 }}>
                    {fmtK(W.buyin)}
                  </span>
                  <span className="wc-eyebrow" style={{ marginLeft: 5 }}>
                    buy-in
                  </span>
                </div>
              </div>}
            </div>
            {/* payout split */}
            {prizeExpanded && <div style={{ display: "flex", gap: 7, marginTop: 15, position: "relative" }}>
              {(
                [
                  ["1st", W.payouts[0], payoutPct[0]],
                  ["2nd", W.payouts[1], payoutPct[1]],
                  ["3rd", W.payouts[2], payoutPct[2]],
                ] as [string, number, number][]
              ).map(([k, v, pct], i) => (
                <div
                  key={k}
                  style={{
                    flex: 1,
                    padding: "8px 10px",
                    borderRadius: 9,
                    background: "var(--surface-2)",
                    border: "1px solid var(--gold-line)",
                  }}
                >
                  <div className="wc-eyebrow wc-gold-text" style={{ fontSize: 9 }}>
                    {k}
                  </div>
                  <div className="wc-num wc-gold-fill" style={{ fontSize: 13.5, fontWeight: 600, marginTop: 3 }}>
                    {fmtK(v)}
                  </div>
                  <div className="wc-eyebrow" style={{ fontSize: 8.5, marginTop: 2 }}>
                    {pct}%
                  </div>
                </div>
              ))}
            </div>}
          </div>

          {/* round status row */}
          <div
            style={{
              display: "flex",
              alignItems: "center",
              justifyContent: "space-between",
              margin: "16px 2px 10px",
            }}
          >
            <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
              <span style={{ fontSize: 15, fontWeight: 700, letterSpacing: "-0.01em" }}>Standings</span>
              <span className="wc-pill" style={{ padding: "3px 8px" }}>
                {W.round}
              </span>
            </div>
            <span className="wc-eyebrow">Updated {W.updated}</span>
          </div>
        </div>

        {/* list */}
        <div>
          {noPlayers ? (
            <div style={{ padding: "0 18px 22px" }}>
              <div className="wc-card">
                <LeaderboardEmptyState />
              </div>
            </div>
          ) : (
            W.players.map((p, i) => (
              <Fragment key={playerKey(p, "mobile", i)}>
                <MobileRow
                  p={p}
                  scaleMax={W.scaleMax}
                  last={i === W.players.length - 1}
                  moneyCutoffPoints={moneyCutoffPoints}
                  hidePicks={(viewerPending && !p.me) || (!picksArePublic && !p.me)}
                  rowId={p.me ? "leaderboard-me-row-mobile" : undefined}
                  onClick={viewerPending && !p.me ? undefined : () => goToPlayer(p.name)}
                />
                {picksArePublic && p.rank === 3 && <MoneyLine />}
              </Fragment>
            ))
          )}
        </div>
      </div>
    </>
  );
}
