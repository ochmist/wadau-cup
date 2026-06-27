"use client";

/* Leaderboard — the canonical screen and source of the whole visual system.
   Ported from DesktopLeaderboard + MobileLeaderboard (wadau-components.jsx /
   wadau-desktop.jsx). The top bar / status bar / bottom nav now live in
   PageShell; this renders only the screen body for both layouts. */

import { Fragment, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  CeilingBar,
  FlagRow,
  fmtK,
  fmtKES,
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
import { TeamEntityLink } from "@/components/entity-links";
import { SectionLabel } from "@/components/ui";

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

type RankStage = { key: string; short: string; state: "done" | "current" | "future" };

type RankPlayer = SerializedPlayer & {
  inMoney: boolean;
  winnable: number;
  toMoney: number;
  canReachMoney: boolean;
  ceilingParts: { code: string; flag: string; name: string; tier: SerializedPlayer["teams"][number]["tier"]; winnable: number }[];
};

const RANK_STAGES = [
  ["group", "Grp"],
  ["round-32", "R32"],
  ["round-16", "R16"],
  ["quarter", "QF"],
  ["semi", "SF"],
  ["final", "Final"],
] as const;

function roundStageIndex(round: string) {
  const value = round.toLowerCase();
  if (value.includes("final")) return 5;
  if (value.includes("semi")) return 4;
  if (value.includes("quarter")) return 3;
  if (value.includes("16")) return 2;
  if (value.includes("32")) return 1;
  return 0;
}

function rankStages(round: string): { stages: RankStage[]; roundsLeft: number } {
  const current = roundStageIndex(round);
  return {
    stages: RANK_STAGES.map(([key, short], index) => ({
      key,
      short,
      state: index < current ? "done" : index === current ? "current" : "future",
    })),
    roundsLeft: Math.max(0, RANK_STAGES.length - current - 1),
  };
}

function rankPlayer(player: SerializedPlayer, moneyCutoffPoints: number | null): RankPlayer {
  const inMoney = player.rank > 0 && player.rank <= 3;
  const toMoney = player.rank > 0 && player.rank > 3 && typeof moneyCutoffPoints === "number"
    ? Math.max(1, moneyCutoffPoints - player.points + 1)
    : 0;
  return {
    ...player,
    inMoney,
    winnable: Math.max(0, player.ceiling - player.points),
    toMoney,
    canReachMoney: typeof moneyCutoffPoints === "number" ? player.ceiling >= moneyCutoffPoints : true,
    ceilingParts: player.teams
      .filter((team) => team.alive && team.rem > 0)
      .map((team) => ({ code: team.code, flag: team.flag, name: team.name, tier: team.tier, winnable: team.rem })),
  };
}

function StageTracker({ round, compact }: { round: string; compact?: boolean }) {
  const tracker = rankStages(round);
  const color = (state: RankStage["state"]) => {
    if (state === "done") return "var(--lime-ink)";
    if (state === "current") return "var(--gold)";
    return "var(--faint)";
  };
  const barColor = (state: RankStage["state"]) => {
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
            {!compact && <span className="wc-num" style={{ fontSize: 9, color: color(stage.state), fontWeight: stage.state === "current" ? 700 : 500, whiteSpace: "nowrap" }}>{stage.short}</span>}
          </div>
        ))}
      </div>
      {!compact && (
        <div style={{ fontSize: 11.5, color: "var(--dim)", marginTop: 8 }}>
          <span style={{ color: "var(--lime-ink)", fontWeight: 600 }}>{tracker.roundsLeft} rounds left</span> your alive teams can still score in
        </div>
      )}
    </div>
  );
}

function CeilingExplain({ player, scaleMax }: { player: RankPlayer; scaleMax: number }) {
  return (
    <div>
      <div style={{ fontSize: 13, color: "var(--dim)", lineHeight: 1.5 }}>
        <span className="wc-num" style={{ color: "var(--lime-ink)", fontWeight: 700 }}>{player.points}</span> banked
        <span style={{ margin: "0 6px", color: "var(--faint)" }}>+</span>
        <span className="wc-num" style={{ color: "var(--text)", fontWeight: 700 }}>{player.winnable}</span> still winnable
        <span style={{ margin: "0 6px", color: "var(--faint)" }}>=</span>
        <span className="wc-num" style={{ color: "var(--text)", fontWeight: 700 }}>{player.ceiling}</span> ceiling
      </div>
      <div style={{ marginTop: 11 }}>
        <CeilingBar points={player.points} ceiling={player.ceiling} scaleMax={scaleMax} showCaption={false} />
      </div>
      <div style={{ display: "flex", alignItems: "center", gap: 14, marginTop: 9 }}>
        <span style={{ display: "inline-flex", alignItems: "center", gap: 6 }}>
          <span style={{ width: 10, height: 10, borderRadius: 3, background: "var(--lime)" }} />
          <span className="wc-eyebrow">Banked</span>
        </span>
        <span style={{ display: "inline-flex", alignItems: "center", gap: 6 }}>
          <span style={{ width: 10, height: 10, borderRadius: 3, background: "var(--track-2)" }} />
          <span className="wc-eyebrow">Still winnable</span>
        </span>
      </div>
    </div>
  );
}

function MoneyContext({ player }: { player: RankPlayer }) {
  if (player.inMoney) {
    return <div className="wc-num wc-gold-fill" style={{ fontSize: 13, fontWeight: 600, whiteSpace: "nowrap" }}>{fmtKES(player.payout)}</div>;
  }
  if (player.toMoney > 0 && player.toMoney <= 2) {
    return <div className="wc-num" style={{ fontSize: 11.5, color: "var(--down)", fontWeight: 600, whiteSpace: "nowrap" }}>{player.toMoney} {player.toMoney === 1 ? "pt" : "pts"} from money</div>;
  }
  return (
    <div className="wc-num" style={{ fontSize: 11.5, color: player.canReachMoney ? "var(--dim)" : "var(--faint)", whiteSpace: "nowrap" }}>
      {player.toMoney > 0 ? `${player.toMoney} pts back` : player.canReachMoney ? "outside money" : "out of contention"}
    </div>
  );
}

function ContribChips({ player, max }: { player: RankPlayer; max?: number }) {
  const parts = player.ceilingParts.slice(0, max ?? 6);
  return (
    <div style={{ display: "flex", flexWrap: "wrap", gap: 6 }}>
      {parts.length ? parts.map((part) => (
        <TeamEntityLink key={part.code} team={{ code: part.code, name: part.name, flag: part.flag }}>
          <span style={{ display: "inline-flex", alignItems: "center", gap: 6, padding: "4px 9px 4px 5px", borderRadius: 999, background: "var(--surface-2)", border: "1px solid var(--line)" }}>
            <span className="wc-flag alive" style={{ width: 18, height: 18, fontSize: 12 }}>{part.flag}</span>
            <span style={{ fontSize: 11.5, fontWeight: 600 }}>{part.name}</span>
            <span className="wc-num" style={{ fontSize: 10.5, color: "var(--lime-ink)", fontWeight: 600 }}>+{part.winnable}</span>
          </span>
        </TeamEntityLink>
      )) : <div style={{ fontSize: 12.5, color: "var(--faint)" }}>No teams can add more points.</div>}
    </div>
  );
}

function RowDrawer({
  player,
  scaleMax,
  round,
  onProfile,
}: {
  player: RankPlayer;
  scaleMax: number;
  round: string;
  onProfile: () => void;
}) {
  return (
    <div style={{ padding: "2px 2px 4px" }}>
      <div style={{ display: "grid", gridTemplateColumns: "1fr", gap: 16 }}>
        <div>
          <SectionLabel style={{ marginBottom: 10 }}>Points vs ceiling</SectionLabel>
          <CeilingExplain player={player} scaleMax={scaleMax} />
        </div>
        <div>
          <SectionLabel style={{ marginBottom: 10 }}>Still winnable from</SectionLabel>
          <ContribChips player={player} />
        </div>
        <div>
          <SectionLabel style={{ marginBottom: 10 }}>Scoring rounds left</SectionLabel>
          <StageTracker round={round} />
        </div>
      </div>
      <button
        className="wc-btn wc-btn-ghost"
        onClick={(event) => {
          event.stopPropagation();
          onProfile();
        }}
        style={{ marginTop: 16, padding: "10px 14px", fontSize: 13, width: "100%" }}
        type="button"
      >
        <span style={{ display: "inline-flex", alignItems: "center", justifyContent: "center", gap: 8 }}>
          View full profile
          <svg width="14" height="14" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round"><path d="M3 8h9M8 4l4 4-4 4" /></svg>
        </span>
      </button>
    </div>
  );
}

function LeanRowMobile({
  player,
  scaleMax,
  round,
  last,
  open,
  rowId,
  onRowClick,
  onChevron,
  onProfile,
  showCeilingHint,
}: {
  player: RankPlayer;
  scaleMax: number;
  round: string;
  last?: boolean;
  open: boolean;
  rowId?: string;
  onRowClick: () => void;
  onChevron: () => void;
  onProfile: () => void;
  showCeilingHint?: boolean;
}) {
  const money = player.inMoney;
  return (
    <div id={rowId} className={`wc-rk-row${money ? " money" : ""}`} style={{ borderBottom: last && !open ? "none" : "1px solid var(--line)", background: money ? "var(--gold-soft)" : "transparent" }}>
      {money && <div style={{ position: "absolute", left: 0, top: 0, bottom: 0, width: 4, background: "linear-gradient(180deg,#F6E7A6,#E7C56A 55%,#C99A38)" }} />}
      <div onClick={onRowClick} style={{ display: "flex", alignItems: "center", gap: 12, padding: "13px 16px 13px 18px" }}>
        <div style={{ width: 26, flex: "none", display: "flex", flexDirection: "column", alignItems: "flex-start", gap: 4 }}>
          <span className="wc-num" style={{ fontSize: 20, fontWeight: 600, lineHeight: 1, color: money ? "var(--gold)" : "var(--text)" }}>{player.rank > 0 ? player.rank : "—"}</span>
          <Mover value={player.mover} showZero={false} />
        </div>
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 7, marginBottom: 7 }}>
            <span style={{ fontSize: 15.5, fontWeight: 600, letterSpacing: "-0.01em", whiteSpace: "nowrap" }}>{player.me ? "You" : player.name}</span>
            {player.me && <span className="wc-tag-you">You</span>}
          </div>
          <FlagRow teams={player.teams} size={20} />
        </div>
        <div style={{ flex: "none", display: "flex", alignItems: "center", gap: 10 }}>
          <div style={{ textAlign: "right" }}>
            <div style={{ display: "flex", alignItems: "baseline", justifyContent: "flex-end", gap: 3 }}>
              <span className="wc-num" style={{ fontSize: 23, fontWeight: 600, lineHeight: 1 }}>{player.points}</span>
              <span className="wc-eyebrow" style={{ fontSize: 9 }}>pts</span>
            </div>
            <div style={{ marginTop: 6, display: "flex", alignItems: "center", justifyContent: "flex-end", gap: 6 }}>
              {showCeilingHint && <span className="wc-num" style={{ fontSize: 10.5, color: "var(--faint)" }}>↗{player.ceiling}</span>}
              <MoneyContext player={player} />
            </div>
          </div>
          <span onClick={(event) => { event.stopPropagation(); onChevron(); }} style={{ display: "flex", padding: 4, margin: -4 }}>
            <svg className={`wc-rk-chev${open ? " open" : ""}`} width="16" height="16" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><path d="M4 6l4 4 4-4" /></svg>
          </span>
        </div>
      </div>
      {open && (
        <div className="wc-rk-drawer" style={{ padding: "0 16px 16px 18px" }}>
          <div style={{ borderTop: "1px solid var(--line)", paddingTop: 14 }}>
            <RowDrawer player={player} scaleMax={scaleMax} round={round} onProfile={onProfile} />
          </div>
        </div>
      )}
    </div>
  );
}

function LeanRowDesktop({
  player,
  scaleMax,
  round,
  last,
  open,
  rowId,
  onRowClick,
  onChevron,
  onProfile,
  showCeilingHint,
}: {
  player: RankPlayer;
  scaleMax: number;
  round: string;
  last?: boolean;
  open: boolean;
  rowId?: string;
  onRowClick: () => void;
  onChevron: () => void;
  onProfile: () => void;
  showCeilingHint?: boolean;
}) {
  const money = player.inMoney;
  return (
    <div id={rowId} className={`wc-rk-row${money ? " money" : ""}`} style={{ borderBottom: last && !open ? "none" : "1px solid var(--line)", background: money ? "var(--gold-soft)" : "transparent" }}>
      {money && <div style={{ position: "absolute", left: 0, top: 0, bottom: 0, width: 4, background: "linear-gradient(180deg,#F6E7A6,#E7C56A 55%,#C99A38)" }} />}
      <div onClick={onRowClick} style={{ display: "grid", gridTemplateColumns: "52px 1fr 92px 150px 60px 28px", alignItems: "center", gap: 16, padding: "13px 22px" }}>
        <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
          <span className="wc-num" style={{ fontSize: 19, fontWeight: 600, color: money ? "var(--gold)" : "var(--text)" }}>{player.rank > 0 ? player.rank : "—"}</span>
        </div>
        <div style={{ display: "flex", alignItems: "center", gap: 13, minWidth: 0 }}>
          <div className="wc-avatar" style={{ background: player.me ? "var(--lime)" : "var(--surface-3)", color: player.me ? "var(--on-lime)" : "var(--dim)" }}>{player.short}</div>
          <div style={{ minWidth: 0 }}>
            <div style={{ display: "flex", alignItems: "center", gap: 7 }}>
              <span style={{ fontSize: 15.5, fontWeight: 600, letterSpacing: "-0.01em" }}>{player.me ? "You" : player.name}</span>
              {player.me && <span className="wc-tag-you">You</span>}
            </div>
            <div style={{ marginTop: 7 }}><FlagRow teams={player.teams} size={19} /></div>
          </div>
        </div>
        <div style={{ textAlign: "right" }}>
          <span className="wc-num" style={{ fontSize: 21, fontWeight: 600 }}>{player.points}</span>
          <span className="wc-eyebrow" style={{ fontSize: 9, marginLeft: 4 }}>pts</span>
          {showCeilingHint && <div className="wc-num" style={{ fontSize: 10.5, color: "var(--faint)", marginTop: 3 }}>↗ {player.ceiling}</div>}
        </div>
        <div style={{ textAlign: "right" }}><MoneyContext player={player} /></div>
        <div style={{ display: "flex", justifyContent: "flex-end" }}><Mover value={player.mover} /></div>
        <div style={{ display: "flex", justifyContent: "flex-end" }}>
          <span onClick={(event) => { event.stopPropagation(); onChevron(); }} style={{ display: "flex", padding: 4, margin: -4, cursor: "pointer" }}>
            <svg className={`wc-rk-chev${open ? " open" : ""}`} width="16" height="16" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><path d="M4 6l4 4 4-4" /></svg>
          </span>
        </div>
      </div>
      {open && (
        <div className="wc-rk-drawer" style={{ padding: "0 22px 18px 22px" }}>
          <div style={{ borderTop: "1px solid var(--line)", paddingTop: 16, display: "grid", gridTemplateColumns: "1.3fr 1fr", gap: 28 }}>
            <div>
              <SectionLabel style={{ marginBottom: 10 }}>Points vs ceiling</SectionLabel>
              <CeilingExplain player={player} scaleMax={scaleMax} />
              <div style={{ marginTop: 16 }}>
                <SectionLabel style={{ marginBottom: 10 }}>Scoring rounds left</SectionLabel>
                <StageTracker round={round} />
              </div>
            </div>
            <div>
              <SectionLabel style={{ marginBottom: 10 }}>Still winnable from</SectionLabel>
              <ContribChips player={player} />
              <button
                className="wc-btn wc-btn-ghost"
                onClick={(event) => {
                  event.stopPropagation();
                  onProfile();
                }}
                style={{ marginTop: 16, padding: "10px 14px", fontSize: 13, width: "100%" }}
                type="button"
              >
                <span style={{ display: "inline-flex", alignItems: "center", justifyContent: "center", gap: 8 }}>
                  View full profile
                  <svg width="14" height="14" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round"><path d="M3 8h9M8 4l4 4-4 4" /></svg>
                </span>
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function YouAnchor({
  player,
  moneyCutoffPoints,
  onJump,
  compact,
}: {
  player: SerializedPlayer;
  moneyCutoffPoints?: number | null;
  onJump: () => void;
  compact?: boolean;
}) {
  const ranked = player.rank > 0;
  const me = rankPlayer(player, moneyCutoffPoints ?? null);
  return (
    <div style={{ display: "flex", alignItems: "center", gap: 12, padding: compact ? "10px 14px" : "12px 16px", background: "var(--surface)", border: "1px solid var(--lime-line)", borderRadius: 14, boxShadow: "0 -6px 24px -16px rgba(0,0,0,0.5), 0 0 0 1px var(--lime-line)" }}>
      <div style={{ display: "flex", alignItems: "center", gap: 10, flex: 1, minWidth: 0 }}>
        <span className="wc-num" style={{ fontSize: 18, fontWeight: 600, color: me.inMoney ? "var(--gold)" : "var(--text)" }}>{ranked ? me.rank : "—"}</span>
        <div className="wc-avatar" style={{ width: 28, height: 28, borderRadius: 8, background: "var(--lime)", color: "var(--on-lime)" }}>{me.short}</div>
        <div style={{ minWidth: 0 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
            <span style={{ fontSize: 14, fontWeight: 700 }}>You</span>
            <Mover value={me.mover} showZero={false} />
          </div>
          <div className="wc-num" style={{ fontSize: 10.5, color: "var(--dim)", marginTop: 1 }}>
            {me.points} pts · {me.inMoney ? "in the money" : me.toMoney > 0 ? `${me.toMoney} from money` : "outside money"}
          </div>
        </div>
      </div>
      <button className="wc-rk-jump" onClick={onJump} type="button">
        Jump to me
        <svg width="12" height="12" viewBox="0 0 14 14" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M7 11V3M3.5 6.5L7 3l3.5 3.5" /></svg>
      </button>
    </div>
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
  const [openPlayerKey, setOpenPlayerKey] = useState<string | null>(null);
  const picksArePublic = countdown.ready && countdown.isLocked;
  const router = useRouter();
  const goToPlayer = (name: string) => router.push(`/player/${encodeURIComponent(name)}`);
  const togglePlayer = (p: SerializedPlayer, scope: string, index: number) => {
    const key = playerKey(p, scope, index);
    setOpenPlayerKey((current) => current === key ? null : key);
  };
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
  const showMyJump = Boolean(currentVisiblePlayer && !viewerPending);
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
        {showMyJump && currentVisiblePlayer && <YouAnchor player={currentVisiblePlayer} moneyCutoffPoints={moneyCutoffPoints} onJump={jumpToMyRow} />}
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
            <Link href="/world-cup" style={{ color: "var(--lime-ink)", fontSize: 12.5, fontWeight: 800, textDecoration: "none", whiteSpace: "nowrap" }}>
              World Cup table →
            </Link>
          </div>
          {/* column header */}
          <div
            style={{
              display: "grid",
              gridTemplateColumns: "52px 1fr 92px 150px 60px 28px",
              gap: 12,
              padding: "0 18px 10px",
              borderBottom: "1px solid var(--line)",
            }}
          >
            {["Rank", "Player", "Pts", "Payout", "Move", ""].map((h, i) => (
              <span
                key={h}
                className="wc-eyebrow"
                style={{ textAlign: i >= 2 ? "right" : "left", fontSize: 9.5 }}
              >
                {h}
              </span>
            ))}
          </div>
          {noPlayers ? (
            <LeaderboardEmptyState />
          ) : (
            W.players.map((p, i) => {
              const rowKey = playerKey(p, "desktop", i);
              const hidden = (viewerPending && !p.me) || (!picksArePublic && !p.me);
              const display = rankPlayer(hidden ? { ...p, teams: [], points: 0, ceiling: 0, mover: 0, payout: 0, rank: 0 } : p, moneyCutoffPoints);
              const open = !hidden && openPlayerKey === rowKey;
              return (
              <Fragment key={rowKey}>
                <LeanRowDesktop
                  player={display}
                  scaleMax={W.scaleMax}
                  round={W.round}
                  last={i === W.players.length - 1}
                  rowId={p.me ? "leaderboard-me-row-desktop" : undefined}
                  open={open}
                  onRowClick={hidden ? () => undefined : () => togglePlayer(p, "desktop", i)}
                  onChevron={hidden ? () => undefined : () => togglePlayer(p, "desktop", i)}
                  onProfile={() => goToPlayer(p.name)}
                  showCeilingHint
                />
                {picksArePublic && p.rank === 3 && <MoneyLine />}
              </Fragment>
            );})
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
          <Link href="/world-cup" className="wc-card" style={{ padding: "14px 18px", color: "var(--lime-ink)", textDecoration: "none", fontSize: 13.5, fontWeight: 800 }}>
            World Cup table →
          </Link>

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
          <Link href="/world-cup" className="wc-card" style={{ display: "block", marginTop: 12, padding: "12px 14px", color: "var(--lime-ink)", textDecoration: "none", fontSize: 13, fontWeight: 800 }}>
            World Cup table →
          </Link>

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
        <div style={{ padding: "0 18px" }}>
          {noPlayers ? (
            <div className="wc-card">
              <LeaderboardEmptyState />
            </div>
          ) : (
            <div className="wc-card" style={{ overflow: "hidden", padding: 0 }}>
              {W.players.map((p, i) => {
              const rowKey = playerKey(p, "mobile", i);
              const hidden = (viewerPending && !p.me) || (!picksArePublic && !p.me);
              const display = rankPlayer(hidden ? { ...p, teams: [], points: 0, ceiling: 0, mover: 0, payout: 0, rank: 0 } : p, moneyCutoffPoints);
              const open = !hidden && openPlayerKey === rowKey;
              return (
              <Fragment key={rowKey}>
                <LeanRowMobile
                  player={display}
                  scaleMax={W.scaleMax}
                  round={W.round}
                  last={i === W.players.length - 1}
                  rowId={p.me ? "leaderboard-me-row-mobile" : undefined}
                  open={open}
                  onRowClick={hidden ? () => undefined : () => togglePlayer(p, "mobile", i)}
                  onChevron={hidden ? () => undefined : () => togglePlayer(p, "mobile", i)}
                  onProfile={() => goToPlayer(p.name)}
                  showCeilingHint
                />
                {picksArePublic && p.rank === 3 && <MoneyLine />}
              </Fragment>
            );})}
            </div>
          )}
        </div>
        {showMyJump && currentVisiblePlayer && (
          <>
            <div style={{ height: 88 }} aria-hidden />
            <div
              style={{
                position: "fixed",
                left: 14,
                right: 14,
                bottom: 84,
                zIndex: 38,
                background: "linear-gradient(180deg, transparent, var(--bg) 42%)",
                paddingTop: 18,
              }}
            >
              <YouAnchor player={currentVisiblePlayer} moneyCutoffPoints={moneyCutoffPoints} onJump={jumpToMyRow} compact />
            </div>
          </>
        )}
      </div>
      <style jsx global>{`
        @keyframes wc-rk-flash { 0%{ background:var(--lime-soft); } 100%{ background:transparent; } }
        .wc-rk-row { position:relative; cursor:pointer; transition:background .14s; }
        .wc-rk-row:hover { background:var(--surface-2); }
        .wc-rk-row.money:hover { background:var(--gold-soft); }
        .wc-rk-flash { animation:wc-rk-flash 1.8s ease-out; }
        .wc-rk-chev { transition:transform .2s ease; color:var(--faint); flex:none; }
        .wc-rk-chev.open { transform:rotate(180deg); }
        .wc-rk-drawer { overflow:hidden; }
        .wc-rk-seg { display:inline-flex; gap:2px; padding:2px; background:var(--surface-2); border:1px solid var(--line); border-radius:9px; }
        .wc-rk-jump { display:inline-flex; align-items:center; gap:6px; font-family:var(--mono); font-size:11px; font-weight:600; letter-spacing:0.04em;
                      text-transform:uppercase; color:var(--on-lime); background:var(--lime); border:none; border-radius:999px; padding:7px 13px; cursor:pointer;
                      box-shadow:0 6px 18px -8px var(--lime-line); }
        .wc-rk-pip { flex:1; height:4px; border-radius:2px; }
        @media (max-width: 720px) {
          .wc-rk-jump { padding:7px 11px; }
        }
      `}</style>
    </>
  );
}
