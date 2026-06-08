"use client";

/* Screen 12 — Season Finale & Payout. Ported from wadau-payout.jsx
   (PayoutBody, PodiumCol, Settlement, Crown). The final table reuses the exact
   leaderboard rows so it matches the canonical standings. */

import { Fragment, useState } from "react";
import { DesktopRow, DESKTOP_GRID, fmtKES, MobileRow, MoneyLine } from "@/components/ds";
import { PageHead, SectionLabel } from "@/components/ui";
import { useStandings } from "@/hooks/useStandings";
import { usePool } from "@/hooks/usePool";
import { useAuth } from "@/lib/auth";
import type { SerializedPlayer } from "@/lib/types";

function Crown({ size = 18, color = "#0A0E13" }: { size?: number; color?: string }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill={color}>
      <path d="M3 8l4 4 5-7 5 7 4-4v9H3z" />
    </svg>
  );
}

const PODIUM_HEIGHTS: Record<number, number> = { 1: 128, 2: 100, 3: 84 };

function PodiumCol({ p, place }: { p: SerializedPlayer; place: 1 | 2 | 3 }) {
  const isFirst = place === 1;
  return (
    <div style={{ display: "flex", flexDirection: "column", alignItems: "center", flex: 1 }}>
      <div style={{ position: "relative", marginBottom: 12 }}>
        <div
          className="wc-avatar"
          style={{
            width: isFirst ? 58 : 48,
            height: isFirst ? 58 : 48,
            borderRadius: 16,
            fontSize: isFirst ? 18 : 15,
            border: "2px solid " + (isFirst ? "var(--gold)" : "var(--line-2)"),
          }}
        >
          {p.short}
        </div>
        {isFirst && (
          <div style={{ position: "absolute", top: -14, left: "50%", transform: "translateX(-50%)" }}>
            <Crown size={22} color="var(--gold)" />
          </div>
        )}
      </div>
      <div style={{ fontSize: isFirst ? 16 : 14, fontWeight: 700, whiteSpace: "nowrap" }}>{p.name}</div>
      <div className="wc-num" style={{ fontSize: 13, color: "var(--dim)", marginTop: 2 }}>
        {p.points} pts
      </div>
      <div
        style={{
          width: "100%",
          height: PODIUM_HEIGHTS[place],
          marginTop: 12,
          borderRadius: "12px 12px 0 0",
          background: isFirst ? "var(--gold-grad)" : "var(--surface-3)",
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          paddingTop: 12,
        }}
      >
        <div className="wc-num" style={{ fontSize: isFirst ? 20 : 17, fontWeight: 700, color: isFirst ? "#1a1206" : "var(--text)" }}>
          {place}
        </div>
        <div
          className="wc-num"
          style={{ fontSize: isFirst ? 14 : 12.5, fontWeight: 600, marginTop: 6, color: isFirst ? "#1a1206" : "var(--gold)", whiteSpace: "nowrap" }}
        >
          {fmtKES(p.payout)}
        </div>
      </div>
    </div>
  );
}

function Settlement({
  winners,
  pot,
  paidOut,
  setPaidOut,
}: {
  winners: SerializedPlayer[];
  pot: number;
  paidOut: boolean[];
  setPaidOut: (v: boolean[]) => void;
}) {
  return (
    <div className="wc-card" style={{ padding: "18px 20px" }}>
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
        <SectionLabel>Settlement</SectionLabel>
        <span className="wc-num" style={{ fontSize: 11.5, color: paidOut.every(Boolean) ? "var(--lime-ink)" : "var(--dim)" }}>
          {paidOut.filter(Boolean).length}/3 paid out
        </span>
      </div>
      <div style={{ display: "flex", alignItems: "baseline", gap: 8, marginTop: 12 }}>
        <span className="wc-eyebrow">Pot</span>
        <span className="wc-num" style={{ fontSize: 22, fontWeight: 600, whiteSpace: "nowrap" }}>
          {fmtKES(pot)}
        </span>
      </div>
      <div style={{ display: "flex", flexDirection: "column", gap: 10, marginTop: 14 }}>
        {winners.map((p, i) => (
          <div key={p.name} style={{ display: "flex", alignItems: "center", gap: 11 }}>
            <div className="wc-avatar" style={{ width: 30, height: 30, fontSize: 11 }}>
              {p.short}
            </div>
            <div style={{ flex: 1 }}>
              <div style={{ fontSize: 13.5, fontWeight: 600 }}>{p.name}</div>
              <div className="wc-num" style={{ fontSize: 11, color: "var(--gold)" }}>
                {fmtKES(p.payout)}
              </div>
            </div>
            <button
              onClick={() => setPaidOut(paidOut.map((v, j) => (j === i ? !v : v)))}
              style={{
                display: "flex",
                alignItems: "center",
                gap: 6,
                padding: "6px 11px",
                borderRadius: 9,
                cursor: "pointer",
                fontFamily: "inherit",
                fontSize: 11.5,
                fontWeight: 600,
                border: "1px solid " + (paidOut[i] ? "var(--lime-line)" : "var(--line-2)"),
                background: paidOut[i] ? "var(--lime-soft)" : "transparent",
                color: paidOut[i] ? "var(--lime-ink)" : "var(--dim)",
              }}
            >
              {paidOut[i] ? "✓ Paid out" : "Mark paid"}
            </button>
          </div>
        ))}
      </div>
    </div>
  );
}

export function FinaleScreen() {
  const { user } = useAuth();
  const { players, scaleMax, loading } = useStandings(user?.uid);
  const { buyin } = usePool();
  const [paidOut, setPaidOut] = useState<boolean[]>([true, false, false]);
  const rankedPlayers = players.filter((p) => p.rank > 0).sort((a, b) => a.rank - b.rank);
  const [p1, p2, p3] = rankedPlayers;
  const winners = rankedPlayers.slice(0, 3);
  const pot = players.filter((p) => p.paid).length * buyin;

  if (loading) {
    return <div style={{ display: "flex", alignItems: "center", justifyContent: "center", padding: 64, color: "var(--faint)", fontSize: 14 }}>Loading…</div>;
  }

  if (winners.length < 3) {
    return (
      <div style={{ maxWidth: 720, margin: "0 auto", padding: "32px 28px" }}>
        <PageHead title="Season finale" sub="The Cup is not ready for settlement yet." />
        <div className="wc-card" style={{ padding: 20 }}>
          <SectionLabel>Final standings unavailable</SectionLabel>
          <div style={{ fontSize: 14, color: "var(--dim)", marginTop: 8 }}>
            At least three ranked paid players are required before the payout screen can settle the pot.
          </div>
        </div>
      </div>
    );
  }

  const Podium = (
    <div className="wc-card wc-podium" style={{ position: "relative", overflow: "hidden" }}>
      <div
        style={{
          position: "absolute",
          top: -60,
          left: "50%",
          transform: "translateX(-50%)",
          width: 280,
          height: 200,
          borderRadius: "50%",
          background: "radial-gradient(circle, var(--gold-soft), transparent 70%)",
        }}
      />
      <div style={{ textAlign: "center", position: "relative" }}>
        <div className="wc-eyebrow wc-gold-text">Tournament complete · Final standings</div>
        <div className="wc-podium-title" style={{ fontWeight: 800, letterSpacing: "-0.02em", marginTop: 8 }}>
          {p1.name} takes the Wadau Cup
        </div>
      </div>
      <div style={{ display: "flex", alignItems: "flex-end", gap: 10, marginTop: 24, position: "relative" }}>
        <PodiumCol p={p2} place={2} />
        <PodiumCol p={p1} place={1} />
        <PodiumCol p={p3} place={3} />
      </div>
    </div>
  );

  const StandingsHeaderDesktop = (
    <div
      className="wc-desktop-only"
      style={{ gridTemplateColumns: DESKTOP_GRID, gap: 16, padding: "0 24px 10px", borderBottom: "1px solid var(--line)", display: "grid" }}
    >
      {["Rank", "Player", "Points vs ceiling", "Pts", "Payout", "Move"].map((h, i) => (
        <span key={h} className="wc-eyebrow" style={{ textAlign: i >= 3 ? "right" : "left", fontSize: 9.5 }}>
          {h}
        </span>
      ))}
    </div>
  );

  const Standings = (
    <div className="wc-card" style={{ overflow: "hidden", padding: 0 }}>
      <div style={{ padding: "16px 24px 14px" }}>
        <span style={{ fontSize: 18, fontWeight: 700, letterSpacing: "-0.01em" }}>Final table</span>
      </div>
      {StandingsHeaderDesktop}
      {rankedPlayers.map((p, i) => (
        <Fragment key={p.name}>
          {/* desktop + mobile rows; CSS hides the one that doesn't apply */}
          <div className="wc-desktop-only">
            <DesktopRow p={p} scaleMax={scaleMax} last={i === rankedPlayers.length - 1} />
          </div>
          <div className="wc-mobile-only">
            <MobileRow p={p} scaleMax={scaleMax} last={i === rankedPlayers.length - 1} />
          </div>
          {p.rank === 3 && <MoneyLine />}
        </Fragment>
      ))}
    </div>
  );

  return (
    <div style={{ maxWidth: 1280, margin: "0 auto", padding: "24px 28px 56px" }}>
      <PageHead title="Season finale" sub="The Cup is decided. Settle the pot." />

      {/* desktop: podium + settlement rail, then full-width table */}
      <div className="wc-desktop-only" style={{ gridTemplateColumns: "1fr 340px", gap: 20, alignItems: "start", display: "grid" }}>
        {Podium}
        <div style={{ position: "sticky", top: 20 }}>
          <Settlement winners={winners} pot={pot} paidOut={paidOut} setPaidOut={setPaidOut} />
        </div>
      </div>
      <div className="wc-desktop-only" style={{ marginTop: 20 }}>
        {Standings}
      </div>

      {/* mobile: stacked */}
      <div className="wc-mobile-only" style={{ flexDirection: "column", gap: 18, display: "flex" }}>
        {Podium}
        <Settlement winners={winners} pot={pot} paidOut={paidOut} setPaidOut={setPaidOut} />
        {Standings}
      </div>
    </div>
  );
}
