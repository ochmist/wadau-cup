"use client";

/* Shared parts for the player views. Ported from wadau-screens-post.jsx
   (TeamLine, ResultRow, CalloutCard). */

import { TierBadge } from "@/components/ui";
import { T, type PlayerTeam, type ResultMatch, type ResultCallout } from "@/lib/data";

/* team line — used in My Picks + Player Detail */
export function TeamLine({
  t,
  showRem,
  last,
}: {
  t: PlayerTeam;
  showRem?: boolean;
  last?: boolean;
}) {
  const statusLine = t.alive ? `${t.rem} pts still available` : "Eliminated";
  return (
    <div
      style={{
        display: "flex",
        alignItems: "center",
        gap: 12,
        padding: "11px 4px",
        borderBottom: last ? "none" : "1px solid var(--line)",
      }}
    >
      <TierBadge tier={t.tier} size={34} />
      <span className={"wc-flag " + (t.alive ? "alive" : "out")} style={{ width: 26, height: 26, fontSize: 17 }}>
        {t.flag}
      </span>
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ fontSize: 15, fontWeight: 600 }}>{t.name}</div>
        <div className="wc-num" style={{ fontSize: 11, marginTop: 3, color: t.alive ? "var(--dim)" : "var(--faint)" }}>
          {t.alive ? (
            <span>
              <span style={{ color: "var(--lime-ink)" }}>●</span> {statusLine}
            </span>
          ) : (
            <span>✕ {statusLine}</span>
          )}
        </div>
      </div>
      <div style={{ textAlign: "right" }}>
        <div className="wc-num" style={{ fontSize: 16, fontWeight: 600 }}>
          {t.pts}
          <span className="wc-eyebrow" style={{ fontSize: 8, marginLeft: 3 }}>
            pts
          </span>
        </div>
        {showRem && (
          <div className="wc-num" style={{ fontSize: 10.5, color: t.alive ? "var(--faint)" : "transparent", marginTop: 2 }}>
            {t.alive ? `+${t.rem} left` : "—"}
          </div>
        )}
      </div>
    </div>
  );
}

/* result row — two teams, score, winner bold, per-tier point chips */
export function ResultRow({ r }: { r: ResultMatch }) {
  const draw = r.win === "draw";
  const aWon = !draw && r.win === r.a;
  const bWon = !draw && r.win === r.b;
  return (
    <div className="wc-card" style={{ padding: "13px 15px", marginBottom: 10 }}>
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 10 }}>
        <span className="wc-eyebrow">{r.round}</span>
        <span className="wc-num" style={{ fontSize: 11, color: "var(--faint)" }}>
          held by {r.held}
        </span>
      </div>
      <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
        {/* side a */}
        <div style={{ display: "flex", alignItems: "center", gap: 9, flex: 1, opacity: draw ? 1 : aWon ? 1 : 0.5 }}>
          <span className={"wc-flag " + (!draw && !aWon ? "out" : "alive")} style={{ width: 26, height: 26, fontSize: 17 }}>
            {T[r.a].f}
          </span>
          <span style={{ fontSize: 14.5, fontWeight: aWon ? 700 : 600, whiteSpace: "nowrap" }}>{T[r.a].n}</span>
        </div>
        {/* score */}
        <div style={{ textAlign: "center", flex: "none" }}>
          <div className="wc-num" style={{ fontSize: 18, fontWeight: 600 }}>
            {r.sa}
            <span style={{ color: "var(--faint)", margin: "0 4px" }}>–</span>
            {r.sb}
          </div>
          {r.pens && (
            <div className="wc-num" style={{ fontSize: 9.5, color: "var(--faint)" }}>
              pens {r.pens}
            </div>
          )}
        </div>
        {/* side b */}
        <div style={{ flex: 1, display: "flex", justifyContent: "flex-end" }}>
          <div
            style={{
              display: "flex",
              alignItems: "center",
              gap: 9,
              opacity: draw ? 1 : bWon ? 1 : 0.5,
              flexDirection: "row-reverse",
            }}
          >
            <span className={"wc-flag " + (!draw && !bWon ? "out" : "alive")} style={{ width: 26, height: 26, fontSize: 17 }}>
              {T[r.b].f}
            </span>
            <span style={{ fontSize: 14.5, fontWeight: bWon ? 700 : 600, whiteSpace: "nowrap" }}>{T[r.b].n}</span>
          </div>
        </div>
      </div>
      <div
        style={{
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          marginTop: 11,
          paddingTop: 11,
          borderTop: "1px solid var(--line)",
        }}
      >
        <span style={{ fontSize: 12.5, color: "var(--dim)" }}>{r.note}</span>
        <div style={{ display: "flex", gap: 5 }}>
          {r.pts
            .filter(([, , v]) => v > 0)
            .map(([code, tier, v]) => (
              <span
                key={code}
                className="wc-num"
                style={{
                  fontSize: 10.5,
                  fontWeight: 600,
                  color: "var(--lime-ink)",
                  background: "var(--lime-soft)",
                  padding: "2px 7px",
                  borderRadius: 6,
                }}
              >
                {tier} +{v}
              </span>
            ))}
        </div>
      </div>
    </div>
  );
}

/* callout card — tinted narrative blurb */
export function CalloutCard({ r }: { r: ResultCallout }) {
  const upset = r.tone === "upset";
  const col = upset ? "var(--down)" : "var(--lime)";
  const soft = upset ? "var(--down-soft)" : "var(--lime-soft)";
  return (
    <div className="wc-card" style={{ padding: "15px 16px", marginBottom: 10, borderColor: soft, background: soft }}>
      <div style={{ display: "flex", alignItems: "center", gap: 7, marginBottom: 8 }}>
        <span style={{ color: col, fontSize: 14 }}>{upset ? "⚡" : "▲"}</span>
        <span className="wc-eyebrow" style={{ color: col }}>
          {r.tag}
        </span>
      </div>
      <div style={{ fontSize: 16, fontWeight: 700, letterSpacing: "-0.01em" }}>{r.title}</div>
      <div style={{ fontSize: 13, color: "var(--dim)", marginTop: 5, lineHeight: 1.5 }}>{r.body}</div>
    </div>
  );
}
