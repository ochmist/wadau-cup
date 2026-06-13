"use client";

/* Wadau Cup — leaderboard visual system + components.
   Ported from wadau-components.jsx. The CSS lives in globals.css; these
   components consume the `.wc-*` classes and the themed CSS variables. */

import { useEffect, useState, type CSSProperties } from "react";
import { fmtK, fmtKES, type PlayerTeam } from "@/lib/data";

// Display-only player shape — a strict subset used by leaderboard rows.
// Both the legacy Player (data.ts) and SerializedPlayer (types.ts) satisfy this.
export type DisplayPlayer = {
  name: string;
  short: string;
  me?: boolean;
  paid: boolean;
  rank: number;
  mover: number;
  points: number;
  ceiling: number;
  payout: number;
  teams: PlayerTeam[];
};
import { useTheme } from "@/lib/theme";

const TIER_ORDER = ["A", "B", "C", "D", "E", "F"];

function compareTeamsByTier(a: PlayerTeam, b: PlayerTeam) {
  return TIER_ORDER.indexOf(a.tier) - TIER_ORDER.indexOf(b.tier) || a.code.localeCompare(b.code);
}

function moneyGapLabel(p: DisplayPlayer, moneyCutoffPoints?: number | null) {
  if (p.rank <= 0) return "unranked";
  if (p.rank <= 3) return null;
  if (typeof moneyCutoffPoints !== "number") return "1 pt from money";
  const gap = Math.max(1, moneyCutoffPoints - p.points + 1);
  return `${gap} ${gap === 1 ? "pt" : "pts"} from money`;
}

/* ---------- icons ---------- */
function ArrowUp() {
  return (
    <svg viewBox="0 0 8 8" fill="none">
      <path
        d="M4 7V1M4 1L1.4 3.6M4 1l2.6 2.6"
        stroke="currentColor"
        strokeWidth={1.6}
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}
function ArrowDown() {
  return (
    <svg viewBox="0 0 8 8" fill="none">
      <path
        d="M4 1v6M4 7L1.4 4.4M4 7l2.6-2.6"
        stroke="currentColor"
        strokeWidth={1.6}
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

/* ---------- mover chip — direction + color, never color alone ---------- */
export function Mover({
  value,
  showZero = true,
}: {
  value: number;
  showZero?: boolean;
}) {
  if (value > 0)
    return (
      <span className="wc-mover up">
        <ArrowUp />
        {value}
      </span>
    );
  if (value < 0)
    return (
      <span className="wc-mover down">
        <ArrowDown />
        {Math.abs(value)}
      </span>
    );
  return showZero ? <span className="wc-mover flat">—</span> : null;
}

/* ---------- flag chips with tap tooltip ---------- */
export function FlagRow({
  teams,
  size,
  hidden = false,
}: {
  teams: PlayerTeam[];
  size?: number;
  hidden?: boolean;
}) {
  const [sel, setSel] = useState<number | null>(null);
  const orderedTeams = [...teams].sort(compareTeamsByTier);
  useEffect(() => {
    if (sel === null) return;
    const close = () => setSel(null);
    document.addEventListener("pointerdown", close);
    return () => document.removeEventListener("pointerdown", close);
  }, [sel]);
  if (hidden) {
    return (
      <div className="wc-flags" aria-label="Picks hidden until lock">
        {Array.from({ length: 6 }).map((_, i) => (
          <span
            key={i}
            className="wc-flag"
            style={{
              width: size ?? 22,
              height: size ?? 22,
              fontSize: size ? Math.round(size * 0.44) : 11,
              color: "var(--faint)",
              background: "var(--surface-2)",
              border: "1px solid var(--line)",
              cursor: "default",
            }}
          >
            ?
          </span>
        ))}
      </div>
    );
  }
  return (
    <div className="wc-flags">
      {orderedTeams.map((t, i) => (
        <span
          key={t.code + t.tier}
          className={"wc-flag " + (t.alive ? "alive" : "out")}
          onClick={(e) => e.stopPropagation()}
          onPointerDown={(e) => {
            e.stopPropagation();
            setSel(sel === i ? null : i);
          }}
          style={
            size
              ? { width: size, height: size, fontSize: Math.round(size * 0.66) }
              : undefined
          }
        >
          {t.flag}
          {sel === i && (
            <span
              className="wc-flag-tip"
              onPointerDown={(e) => e.stopPropagation()}
            >
              <span style={{ fontSize: 13, fontWeight: 600, color: "var(--tip-fg)" }}>
                {t.name}
              </span>
              <span
                className="wc-num"
                style={{
                  fontSize: 10.5,
                  color: t.alive ? "var(--lime)" : "var(--down)",
                }}
              >
                {t.tier} · {t.alive ? t.pts + " pts" : "out"}
              </span>
            </span>
          )}
        </span>
      ))}
    </div>
  );
}

/* ---------- theme toggle (sun / moon) ---------- */
export function ThemeToggle() {
  const { theme, toggle } = useTheme();
  return (
    <button
      className="wc-icon-btn"
      onClick={toggle}
      title="Switch theme"
      aria-label="Switch theme"
    >
      {theme === "dark" ? (
        <svg
          width="15"
          height="15"
          viewBox="0 0 20 20"
          fill="none"
          stroke="currentColor"
          strokeWidth="1.5"
          strokeLinecap="round"
        >
          <circle cx="10" cy="10" r="3.6" />
          <path d="M10 1.5v2M10 16.5v2M18.5 10h-2M3.5 10h-2M15.6 4.4l-1.4 1.4M5.8 14.2l-1.4 1.4M15.6 15.6l-1.4-1.4M5.8 5.8L4.4 4.4" />
        </svg>
      ) : (
        <svg width="15" height="15" viewBox="0 0 20 20" fill="currentColor">
          <path d="M16.5 12.4A7 7 0 0 1 7.6 3.5a.6.6 0 0 0-.8-.8 8.2 8.2 0 1 0 10.5 10.5.6.6 0 0 0-.8-.8z" />
        </svg>
      )}
    </button>
  );
}

/* ---------- ceiling bar — the core mechanic ---------- */
export function CeilingBar({
  points,
  ceiling,
  scaleMax,
  showCaption = true,
}: {
  points: number;
  ceiling: number;
  scaleMax: number;
  showCaption?: boolean;
}) {
  const cur = Math.max(0, Math.min(100, (points / scaleMax) * 100));
  const cl = Math.max(0, Math.min(100, (ceiling / scaleMax) * 100));
  const headroom = ceiling - points;
  return (
    <div style={{ width: "100%" }}>
      <div className="wc-bar">
        <div className="wc-bar-ceil" style={{ width: cl + "%" }} />
        <div className="wc-bar-cur" style={{ width: cur + "%" }} />
        <div className="wc-bar-tick" style={{ left: "calc(" + cl + "% - 1px)" }} />
      </div>
      {showCaption && (
        <div
          style={{
            display: "flex",
            justifyContent: "space-between",
            alignItems: "baseline",
            marginTop: 6,
          }}
        >
          <span className="wc-num" style={{ fontSize: 11, color: "var(--dim)" }}>
            <span style={{ color: "var(--lime-ink)", fontWeight: 600 }}>{points}</span> now
          </span>
          <span className="wc-num" style={{ fontSize: 11, color: "var(--faint)" }}>
            +{headroom} left · ceiling {ceiling}
          </span>
        </div>
      )}
    </div>
  );
}

function HiddenUntilLock() {
  return (
    <div
      className="wc-num"
      style={{
        width: "100%",
        minHeight: 27,
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        borderRadius: 7,
        border: "1px dashed var(--line-2)",
        color: "var(--faint)",
        fontSize: 10.5,
        letterSpacing: "0.08em",
        textTransform: "uppercase",
      }}
    >
      Hidden until draft/picks lock
    </div>
  );
}

/* ---------- money line divider ---------- */
export function MoneyLine() {
  return (
    <div className="wc-divider-money">
      <div className="ln" />
      <div className="lbl">◆ Money line · top 3 paid</div>
      <div className="ln" />
    </div>
  );
}

/* ---------- crest ---------- */
export function Crest({ size = 30 }: { size?: number }) {
  return (
    <div
      style={{
        width: size,
        height: size,
        borderRadius: 9,
        background: "var(--lime)",
        flex: "none",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        boxShadow: "0 0 16px -4px var(--lime-line)",
      }}
    >
      <svg width={size * 0.62} height={size * 0.62} viewBox="0 0 24 24" fill="none">
        <path
          d="M12 2l2.4 4.9 5.4.8-3.9 3.8.9 5.4L12 19l-4.8 2.5.9-5.4L4.2 8.7l5.4-.8z"
          fill="#0A0E13"
        />
      </svg>
    </div>
  );
}

/* ---------- MOBILE ROW ---------- */
export function MobileRow({
  p,
  scaleMax,
  last,
  moneyCutoffPoints,
  hidePicks = false,
  onClick,
}: {
  p: DisplayPlayer;
  scaleMax: number;
  last?: boolean;
  moneyCutoffPoints?: number | null;
  hidePicks?: boolean;
  onClick?: () => void;
}) {
  const ranked = p.rank > 0;
  const money = ranked && p.rank <= 3;
  const rowStyle: CSSProperties = {
    padding: "14px 18px 16px",
    borderBottom: last ? "none" : "1px solid var(--line)",
    background: money ? "var(--gold-soft)" : "transparent",
    position: "relative",
    cursor: onClick ? "pointer" : "default",
  };
  return (
    <div style={rowStyle} onClick={onClick}>
      {money && (
        <div
          style={{
            position: "absolute",
            left: 0,
            top: 0,
            bottom: 0,
            width: 4,
            background: "linear-gradient(180deg,#F6E7A6,#E7C56A 55%,#C99A38)",
            boxShadow: "0 0 12px -1px var(--gold-line)",
          }}
        />
      )}
      <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
        {/* rank + mover */}
        <div
          style={{
            width: 30,
            flex: "none",
            display: "flex",
            flexDirection: "column",
            alignItems: "flex-start",
            gap: 5,
          }}
        >
          <span
            className="wc-num"
            style={{
              fontSize: 21,
              fontWeight: 600,
              lineHeight: 1,
              color: money ? "var(--gold)" : "var(--text)",
            }}
          >
            {ranked ? p.rank : "—"}
          </span>
          {ranked && <Mover value={p.mover} />}
        </div>
        {/* name + flags */}
        <div style={{ flex: 1, minWidth: 0 }}>
          <div
            style={{
              display: "flex",
              alignItems: "center",
              gap: 7,
              marginBottom: 8,
            }}
          >
            <span
              style={{
                fontSize: 16,
                fontWeight: 600,
                letterSpacing: "-0.01em",
                whiteSpace: "nowrap",
              }}
            >
              {p.name}
            </span>
            {p.me && <span className="wc-tag-you">You</span>}
          </div>
          <FlagRow teams={p.teams} hidden={hidePicks} />
        </div>
        {/* points + payout */}
        <div style={{ flex: "none", textAlign: "right" }}>
          <div
            style={{
              display: "flex",
              alignItems: "baseline",
              justifyContent: "flex-end",
              gap: 3,
            }}
          >
            <span className="wc-num" style={{ fontSize: 24, fontWeight: 600, lineHeight: 1 }}>
              {hidePicks ? "—" : p.points}
            </span>
            <span className="wc-eyebrow" style={{ fontSize: 9 }}>
              pts
            </span>
          </div>
          {hidePicks ? (
            <div className="wc-num" style={{ fontSize: 11.5, color: "var(--faint)", marginTop: 6 }}>
              private
            </div>
          ) : money ? (
            <div
              className="wc-num wc-gold-fill"
              style={{ fontSize: 13, fontWeight: 600, marginTop: 6, whiteSpace: "nowrap" }}
            >
              {fmtKES(p.payout)}
            </div>
          ) : (
            <div className="wc-num" style={{ fontSize: 11.5, color: "var(--faint)", marginTop: 6 }}>
              {moneyGapLabel(p, moneyCutoffPoints)}
            </div>
          )}
        </div>
      </div>
      {/* ceiling bar full width */}
      <div style={{ marginTop: 13 }}>
        {hidePicks ? <HiddenUntilLock /> : <CeilingBar points={p.points} ceiling={p.ceiling} scaleMax={scaleMax} />}
      </div>
    </div>
  );
}

/* ---------- DESKTOP ROW ---------- */
export const DESKTOP_GRID = "46px minmax(140px,1fr) minmax(150px,220px) 58px 98px 50px";

export function DesktopRow({
  p,
  scaleMax,
  last,
  moneyCutoffPoints,
  hidePicks = false,
  onClick,
}: {
  p: DisplayPlayer;
  scaleMax: number;
  last?: boolean;
  moneyCutoffPoints?: number | null;
  hidePicks?: boolean;
  onClick?: () => void;
}) {
  const ranked = p.rank > 0;
  const money = ranked && p.rank <= 3;
  return (
    <div
      onClick={onClick}
      style={{
        display: "grid",
        gridTemplateColumns: DESKTOP_GRID,
        alignItems: "center",
        gap: 12,
        padding: "13px 18px",
        borderBottom: last ? "none" : "1px solid var(--line)",
        background: money ? "var(--gold-soft)" : "transparent",
        position: "relative",
        cursor: onClick ? "pointer" : "default",
      }}
    >
      {money && (
        <div
          style={{
            position: "absolute",
            left: 0,
            top: 0,
            bottom: 0,
            width: 4,
            background: "linear-gradient(180deg,#F6E7A6,#E7C56A 55%,#C99A38)",
            boxShadow: "0 0 12px -1px var(--gold-line)",
          }}
        />
      )}
      {/* rank */}
      <div style={{ display: "flex", alignItems: "center", gap: 9 }}>
        <span
          className="wc-num"
          style={{
            fontSize: 20,
            fontWeight: 600,
            color: money ? "var(--gold)" : "var(--text)",
            minWidth: 20,
          }}
        >
          {ranked ? p.rank : "—"}
        </span>
      </div>
      {/* player */}
      <div style={{ display: "flex", alignItems: "center", gap: 13, minWidth: 0 }}>
        <div className="wc-avatar">{p.short}</div>
        <div style={{ minWidth: 0 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 7 }}>
            <span style={{ fontSize: 15.5, fontWeight: 600, letterSpacing: "-0.01em" }}>
              {p.name}
            </span>
            {p.me && <span className="wc-tag-you">You</span>}
          </div>
          <div style={{ marginTop: 7 }}>
            <FlagRow teams={p.teams} size={19} hidden={hidePicks} />
          </div>
        </div>
      </div>
      {/* ceiling bar */}
      <div>
        {hidePicks ? <HiddenUntilLock /> : <CeilingBar points={p.points} ceiling={p.ceiling} scaleMax={scaleMax} />}
      </div>
      {/* points */}
      <div style={{ textAlign: "right" }}>
        <span className="wc-num" style={{ fontSize: 22, fontWeight: 600 }}>
          {hidePicks ? "—" : p.points}
        </span>
        <span className="wc-eyebrow" style={{ fontSize: 9, marginLeft: 4 }}>
          pts
        </span>
      </div>
      {/* payout */}
      <div style={{ textAlign: "right" }}>
        {hidePicks ? (
          <span className="wc-num" style={{ fontSize: 12.5, color: "var(--faint)" }}>
            private
          </span>
        ) : money ? (
          <span className="wc-num wc-gold-fill" style={{ fontSize: 16, fontWeight: 600 }}>
            {fmtKES(p.payout)}
          </span>
        ) : (
          <span className="wc-num" style={{ fontSize: 12.5, color: "var(--faint)" }}>
            {moneyGapLabel(p, moneyCutoffPoints)}
          </span>
        )}
      </div>
      {/* mover */}
      <div style={{ display: "flex", justifyContent: "flex-end" }}>
        {ranked ? <Mover value={p.mover} /> : <span className="wc-mover flat">—</span>}
      </div>
    </div>
  );
}

/* ---------- compact "my standing" strip (ported from wadau-ui.jsx MiniStanding) ---------- */
export function MiniStanding({ p, scaleMax = 100 }: { p: DisplayPlayer; scaleMax?: number }) {
  const ranked = p.rank > 0;
  return (
    <div className="wc-card" style={{ padding: "14px 16px", display: "flex", alignItems: "center", gap: 14 }}>
      <div style={{ textAlign: "center" }}>
        <div className="wc-num" style={{ fontSize: 11, color: "var(--faint)" }}>
          RANK
        </div>
        <div
          className="wc-num"
          style={{ fontSize: 26, fontWeight: 600, color: ranked && p.rank <= 3 ? "var(--gold)" : "var(--text)", lineHeight: 1.05 }}
        >
          {ranked ? p.rank : "—"}
        </div>
        <div style={{ marginTop: 3, display: "flex", justifyContent: "center" }}>
          {ranked ? <Mover value={p.mover} /> : <span className="wc-mover flat">—</span>}
        </div>
      </div>
      <div style={{ width: 1, alignSelf: "stretch", background: "var(--line)" }} />
      <div style={{ flex: 1 }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline" }}>
          <span style={{ fontSize: 11, color: "var(--faint)", fontFamily: "var(--mono)" }}>POINTS</span>
          <span style={{ fontSize: 11, color: "var(--faint)", fontFamily: "var(--mono)" }}>PROJ. PAYOUT</span>
        </div>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline", marginTop: 2 }}>
          <span className="wc-num" style={{ fontSize: 24, fontWeight: 600 }}>
            {p.points}
          </span>
          <span className="wc-num" style={{ fontSize: 16, fontWeight: 600, color: p.payout ? "var(--gold)" : "var(--dim)" }}>
            {p.payout ? fmtKES(p.payout) : "—"}
          </span>
        </div>
        <div style={{ marginTop: 10 }}>
          <CeilingBar points={p.points} ceiling={p.ceiling} scaleMax={scaleMax} />
        </div>
      </div>
    </div>
  );
}

export { fmtK, fmtKES };
