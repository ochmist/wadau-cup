"use client";

/* Screen 10 — Rules & Scoring. Ported from wadau-rules.jsx
   (RulesBody, ScoringMatrix, HowItScores, TieBreakers). */

import { PageHead, SectionLabel } from "@/components/ui";
import type { Tier } from "@/lib/data";

// points per result type, by tier [A,B,C,D,E,F]
const SCORING: { label: string; short: [string, string?]; vals: number[] }[] = [
  { label: "Group · Win", short: ["Grp", "Win"], vals: [1, 1, 2, 2, 3, 4] },
  { label: "Group · Draw", short: ["Grp", "Draw"], vals: [0, 1, 1, 1, 2, 2] },
  { label: "Rnd of 32", short: ["R32"], vals: [1, 1, 2, 2, 2, 3] },
  { label: "Rnd of 16", short: ["R16"], vals: [1, 1, 1, 1, 2, 2] },
  { label: "Quarters", short: ["Qtrs"], vals: [1, 1, 1, 1, 1, 1] },
  { label: "Semis", short: ["Semis"], vals: [2, 2, 2, 2, 2, 2] },
  { label: "Third place", short: ["3P"], vals: [1, 1, 1, 1, 1, 1] },
  { label: "Final", short: ["Final"], vals: [3, 3, 3, 3, 3, 3] },
];

const TIER_COLORS: Record<Tier, string> = {
  A: "#A074FF",
  B: "#5BC8FF",
  C: "#36D399",
  D: "#C6FF3A",
  E: "#FFB23E",
  F: "#FF6A4D",
};

const TIERS: Tier[] = ["A", "B", "C", "D", "E", "F"];

function ScoringMatrix({ compact = false }: { compact?: boolean }) {
  const cols = compact ? "58px repeat(6, minmax(24px, 1fr))" : "1.4fr repeat(6, 1fr)";
  return (
    <div className="wc-card" style={{ overflow: "hidden", padding: 0, maxWidth: compact ? 520 : undefined, margin: compact ? "0 auto" : undefined }}>
      <div
        style={{
          display: "grid",
          gridTemplateColumns: cols,
          padding: compact ? "12px 14px 10px" : "14px 16px 12px",
          borderBottom: "1px solid var(--line)",
          alignItems: "end",
        }}
      >
        <span className="wc-eyebrow" style={{ fontSize: 9.5 }}>
          {compact ? "Rd" : "Round"}
        </span>
        {TIERS.map((t) => (
          <span key={t} className="wc-num" style={{ textAlign: "center", fontSize: 13, fontWeight: 700, color: TIER_COLORS[t] }}>
            {t}
          </span>
        ))}
      </div>
      {SCORING.map(({ label, short, vals }, ri) => {
        const max = Math.max(...vals);
        return (
          <div
            key={label}
            style={{
              display: "grid",
              gridTemplateColumns: cols,
              padding: compact ? "11px 14px" : "12px 16px",
              alignItems: "center",
              borderBottom: ri < SCORING.length - 1 ? "1px solid var(--line)" : "none",
              background: ri % 2 ? "transparent" : "var(--surface-2)",
            }}
          >
            {compact ? (
              <span title={label} aria-label={label} style={{ display: "flex", flexDirection: "column", gap: 1, minWidth: 0 }}>
                <span className="wc-num" style={{ fontSize: 12.5, fontWeight: 700, color: "var(--text)", lineHeight: 1.05, letterSpacing: "-0.02em" }}>
                  {short[0]}
                </span>
                {short[1] && (
                  <span className="wc-eyebrow" style={{ fontSize: 8.5, letterSpacing: "0.08em", lineHeight: 1.1 }}>
                    {short[1]}
                  </span>
                )}
              </span>
            ) : (
              <span style={{ fontSize: 13, fontWeight: 600, whiteSpace: "nowrap" }}>{label}</span>
            )}
            {vals.map((v, i) => (
              <span
                key={i}
                className="wc-num"
                style={{
                  textAlign: "center",
                  fontSize: compact ? 13.5 : 14,
                  fontWeight: v === max && max > 1 ? 700 : 500,
                  color: v === 0 ? "var(--faint)" : v === max && max > 1 ? "var(--lime-ink)" : "var(--text)",
                }}
              >
                {v}
              </span>
            ))}
          </div>
        );
      })}
    </div>
  );
}

function ScoringTableNote() {
  return (
    <div style={{ fontSize: 13.5, color: "var(--dim)", lineHeight: 1.55, marginTop: 2 }}>
      Each row is one way a team can score. Find your team&apos;s tier across the top, then read down for the points that
      result earns. Higher-risk tiers pay more early; late knockout wins are flatter.
    </div>
  );
}

const TIEBREAKERS: [string, string][] = [
  [
    "Deepest progression",
    "Whoever’s teams reached the furthest stage wins. Final is the top stage, so champion and runner-up both count as Final; third-place matches stay at Semi-final progression. Still level? More teams at that deepest stage.",
  ],
  ["Underdog points", "More points earned from the weakest tiers, compared Tier F first, then E, D, C, B."],
  ["Final-goals guess", "The pre-committed prediction of total goals in the Final. Closest wins."],
  ["Split the pot", "If still tied after all of the above, the tied positions split their combined payout equally."],
];

function TieBreakers() {
  return (
    <div className="wc-card" style={{ padding: "18px 20px" }}>
      <SectionLabel>If players are level on points</SectionLabel>
      <div style={{ fontSize: 13, color: "var(--dim)", marginTop: 6, lineHeight: 1.5 }}>
        Resolved in this order, top to bottom.
      </div>
      <div style={{ display: "flex", flexDirection: "column", gap: 16, marginTop: 16 }}>
        {TIEBREAKERS.map(([t, b], i) => (
          <div key={t} style={{ display: "flex", gap: 13, alignItems: "flex-start" }}>
            <div
              className="wc-num"
              style={{
                width: 24,
                height: 24,
                borderRadius: 8,
                flex: "none",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                fontSize: 12,
                fontWeight: 600,
                background: "var(--surface-3)",
                color: "var(--text)",
              }}
            >
              {i + 1}
            </div>
            <div>
              <div style={{ fontSize: 14.5, fontWeight: 600 }}>{t}</div>
              <div style={{ fontSize: 12.5, color: "var(--dim)", marginTop: 3, lineHeight: 1.5 }}>{b}</div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

function HowItScores() {
  return (
    <div className="wc-card" style={{ padding: "18px 20px" }}>
      <SectionLabel>The idea</SectionLabel>
      <div style={{ fontSize: 14.5, fontWeight: 500, marginTop: 8, lineHeight: 1.55 }}>
        Underdogs are worth more early — a Tier F win in the group stage pays{" "}
        <span style={{ color: "var(--lime-ink)", fontWeight: 700 }}>4×</span> a Tier A win. From the Quarters on, the
        tournament flattens: every win is worth the same. Pick a portfolio that can go the distance <em>and</em> spring a
        surprise.
      </div>
    </div>
  );
}

export function RulesScreen() {
  return (
    <>
      {/* desktop */}
      <div className="wc-desktop-only" style={{ maxWidth: 1080, margin: "0 auto", padding: "26px 28px 64px" }}>
        <PageHead title="Rules & Scoring" sub="How points are earned, and how ties are broken." />
        <div style={{ display: "grid", gridTemplateColumns: "1fr 360px", gap: 20, alignItems: "start" }}>
          <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
            <SectionLabel style={{ marginBottom: -2 }}>
              Points per result · per team · by tier (A strong → F longshot)
            </SectionLabel>
            <ScoringTableNote />
            <ScoringMatrix />
          </div>
          <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
            <HowItScores />
            <TieBreakers />
          </div>
        </div>
      </div>

      {/* mobile */}
      <div className="wc-mobile-only" style={{ padding: "12px 16px 24px" }}>
        <PageHead title="Rules & Scoring" sub="How points are earned, and how ties break." />
        <HowItScores />
        <SectionLabel style={{ margin: "20px 2px 8px", display: "block" }}>Points by tier · A strong → F longshot</SectionLabel>
        <div style={{ margin: "0 2px 10px" }}>
          <ScoringTableNote />
        </div>
        <ScoringMatrix compact />
        <div style={{ marginTop: 18 }}>
          <TieBreakers />
        </div>
      </div>
    </>
  );
}
