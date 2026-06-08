"use client";

/* Admin shared parts + data. Ported from wadau-admin.jsx / wadau-adminsetup.jsx. */

import type { CSSProperties } from "react";
import { GROUPS, players, T, type Tier } from "@/lib/data";
import { TEMP_FIXTURES } from "@/lib/fixtures";

// generated demo phone, matching the prototype's formula
export const playerPhone = (i: number) =>
  "+254 7" + (10 + i) + " " + String(200 + i * 7).slice(0, 3) + " " + String(100 + i * 3).slice(0, 3);

/* ---------- match results data ---------- */
export const R16_FIXTURES = [
  ...TEMP_FIXTURES.map(({ id, label, a, b, round }) => ({ id, label, a, b, round })),
] as const;
export const R16_PTS: Record<Tier, number> = { A: 1, B: 1, C: 1, D: 1, E: 2, F: 2 };

/* ---------- accounts + join requests ---------- */
export type AccountStatus = "pending" | "active" | "unpaid" | "drafted" | "undrafted";
export const ACCOUNTS = players.map((p, i) => ({
  name: p.name,
  short: p.short,
  paid: p.paid,
  phone: playerPhone(i),
  status: (p.paid ? "active" : "unpaid") as AccountStatus,
}));

export const PENDING_JOINS = [
  { name: "Mutua", phone: "+254 720 118 940", when: "2h ago" },
  { name: "Cynthia", phone: "+254 733 552 081", when: "5h ago" },
  { name: "Kev", phone: "+254 711 904 233", when: "yesterday" },
];

/* ---------- toggle ---------- */
export function AdminToggle({ on, onClick, label }: { on: boolean; onClick: () => void; label?: string }) {
  return (
    <button
      onClick={onClick}
      aria-pressed={on}
      aria-label={label}
      style={{
        width: 42,
        height: 25,
        borderRadius: 13,
        border: "none",
        cursor: "pointer",
        flex: "none",
        background: on ? "var(--lime)" : "var(--surface-3)",
        position: "relative",
        transition: "background .15s",
      }}
    >
      <span
        style={{
          position: "absolute",
          top: 3,
          left: on ? 20 : 3,
          width: 19,
          height: 19,
          borderRadius: "50%",
          background: on ? "#0A0E13" : "var(--faint)",
          transition: "left .15s",
        }}
      />
    </button>
  );
}

/* ---------- text input ---------- */
export function AdminInput({
  value,
  prefix,
  suffix,
  w,
}: {
  value: string;
  prefix?: string;
  suffix?: string;
  w?: CSSProperties["width"];
}) {
  return (
    <div
      style={{
        display: "flex",
        alignItems: "center",
        background: "var(--surface-2)",
        border: "1px solid var(--line-2)",
        borderRadius: 10,
        overflow: "hidden",
        width: w || "auto",
        minWidth: 0,
      }}
    >
      {prefix && (
        <span className="wc-num" style={{ padding: "10px 0 10px 12px", color: "var(--dim)", fontSize: 14, flex: "none" }}>
          {prefix}
        </span>
      )}
      <input
        defaultValue={value}
        style={{
          flex: 1,
          minWidth: 0,
          width: "100%",
          fontFamily: "var(--mono)",
          fontSize: 14,
          fontWeight: 600,
          color: "var(--text)",
          background: "transparent",
          border: "none",
          outline: "none",
          padding: "10px 10px",
        }}
      />
      {suffix && (
        <span className="wc-eyebrow" style={{ padding: "0 10px 0 0", flex: "none" }}>
          {suffix}
        </span>
      )}
    </div>
  );
}

/* ---------- status pill ---------- */
export function StatusPill({ status }: { status: AccountStatus }) {
  const map: Record<AccountStatus, [string, string, string]> = {
    pending: ["Pending", "var(--gold)", "var(--gold-soft)"],
    active: ["Active", "var(--lime-ink)", "var(--lime-soft)"],
    unpaid: ["Unpaid", "var(--down)", "var(--down-soft)"],
    drafted: ["Drafted", "var(--gold)", "var(--gold-soft)"],
    undrafted: ["Undrafted", "var(--dim)", "var(--surface-3)"],
  };
  const [label, c, bg] = map[status];
  return (
    <span
      className="wc-num"
      style={{
        display: "inline-flex",
        alignItems: "center",
        justifyContent: "center",
        width: 112,
        minHeight: 28,
        fontSize: 10,
        fontWeight: 600,
        color: c,
        background: bg,
        padding: "3px 9px",
        borderRadius: 6,
        whiteSpace: "nowrap",
      }}
    >
      {label}
    </span>
  );
}

/* ---------- team pick (results entry) ---------- */
export function TeamPick({
  code,
  selected,
  dimmed,
  onClick,
  align,
}: {
  code: string;
  selected: boolean;
  dimmed: boolean;
  onClick: () => void;
  align: "left" | "right";
}) {
  const t = T[code];
  const pts = R16_PTS[t.t];
  return (
    <button
      onClick={onClick}
      style={{
        flex: 1,
        display: "flex",
        alignItems: "center",
        gap: 11,
        justifyContent: align === "right" ? "flex-end" : "flex-start",
        flexDirection: align === "right" ? "row-reverse" : "row",
        padding: "11px 13px",
        borderRadius: 12,
        cursor: "pointer",
        border: "1px solid " + (selected ? "var(--lime-line)" : "var(--line-2)"),
        background: selected ? "var(--lime-soft)" : "transparent",
        opacity: dimmed ? 0.42 : 1,
        transition: "all .14s",
        textAlign: "left",
        fontFamily: "inherit",
      }}
    >
      <span className="wc-flag alive" style={{ width: 30, height: 30, fontSize: 20, flex: "none" }}>
        {t.f}
      </span>
      <div style={{ minWidth: 0 }}>
        <div style={{ display: "flex", alignItems: "center", gap: 6, flexDirection: align === "right" ? "row-reverse" : "row" }}>
          <span style={{ fontSize: 14.5, fontWeight: 600, whiteSpace: "nowrap", color: "var(--text)" }}>{t.n}</span>
          {selected && (
            <span
              className="wc-num"
              style={{ fontSize: 10, fontWeight: 600, color: "var(--on-lime)", background: "var(--lime)", padding: "1px 6px", borderRadius: 5 }}
            >
              +{pts}
            </span>
          )}
        </div>
        <div className="wc-eyebrow" style={{ marginTop: 4, textAlign: align === "right" ? "right" : "left" }}>
          Tier {t.t} · Grp {GROUPS[code]}
        </div>
      </div>
    </button>
  );
}
