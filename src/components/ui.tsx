"use client";

/* Wadau Cup — shared UI kit. Ported from wadau-ui.jsx (the button/select CSS
   lives in globals.css). */

import { useEffect, useState, type CSSProperties, type ReactNode } from "react";
import type { Tier } from "@/lib/data";

export const inputStyle: CSSProperties = {
  width: "100%",
  fontFamily: "inherit",
  fontSize: 15,
  fontWeight: 500,
  color: "var(--text)",
  background: "var(--surface-2)",
  border: "1px solid var(--line-2)",
  borderRadius: 12,
  padding: "13px 14px",
  outline: "none",
};

type BtnKind = "primary" | "ghost" | "gold" | "dark";

export function Btn({
  kind = "primary",
  children,
  onClick,
  disabled,
  type = "button",
  style,
}: {
  kind?: BtnKind;
  children: ReactNode;
  onClick?: () => void;
  disabled?: boolean;
  type?: "button" | "submit";
  style?: CSSProperties;
}) {
  return (
    <button
      type={type}
      className={"wc-btn wc-btn-" + kind}
      onClick={onClick}
      disabled={disabled}
      style={style}
    >
      {children}
    </button>
  );
}

export function Field({ label, children }: { label: string; children: ReactNode }) {
  return (
    <label style={{ display: "block" }}>
      <div className="wc-eyebrow" style={{ marginBottom: 8 }}>
        {label}
      </div>
      {children}
    </label>
  );
}

export function SectionLabel({ children, style }: { children: ReactNode; style?: CSSProperties }) {
  return (
    <div className="wc-eyebrow" style={{ padding: "0 2px", ...style }}>
      {children}
    </div>
  );
}

// page header (ported from wadau-webscreens.jsx PageHead)
export function PageHead({ title, sub, right }: { title: string; sub?: string; right?: ReactNode }) {
  return (
    <div style={{ display: "flex", alignItems: "flex-end", justifyContent: "space-between", marginBottom: 18 }}>
      <div>
        <div style={{ fontSize: 22, fontWeight: 800, letterSpacing: "-0.02em" }}>{title}</div>
        {sub && <div style={{ fontSize: 13.5, color: "var(--dim)", marginTop: 4 }}>{sub}</div>}
      </div>
      {right}
    </div>
  );
}

// tier-colored letter badge (ported from wadau-ui.jsx TierBadge)
const TIER_BADGE_COLORS: Record<Tier, [string, string]> = {
  A: ["#A074FF", "rgba(160,116,255,0.16)"],
  B: ["#5BC8FF", "rgba(91,200,255,0.16)"],
  C: ["#36D399", "rgba(54,211,153,0.16)"],
  D: ["#C6FF3A", "rgba(198,255,58,0.16)"],
  E: ["#FFB23E", "rgba(255,178,62,0.16)"],
  F: ["#FF6A4D", "rgba(255,106,77,0.16)"],
};

export function TierBadge({ tier, size }: { tier: Tier; size?: number }) {
  const [fg, bg] = TIER_BADGE_COLORS[tier];
  return (
    <div
      className="wc-tier-badge"
      style={{
        color: fg,
        background: bg,
        ...(size ? { width: size, height: size, fontSize: size * 0.46, borderRadius: size * 0.29 } : {}),
      }}
    >
      {tier}
    </div>
  );
}

// modal bottom sheet with slide-up enter (ported from wadau-ui.jsx BottomSheet)
export function BottomSheet({
  title,
  subtitle,
  onClose,
  children,
}: {
  title?: string;
  subtitle?: string;
  onClose: () => void;
  children: ReactNode;
}) {
  const [enter, setEnter] = useState(false);
  useEffect(() => {
    const t = setTimeout(() => setEnter(true), 20);
    return () => clearTimeout(t);
  }, []);
  return (
    <div
      onClick={onClose}
      style={{
        position: "fixed",
        inset: 0,
        zIndex: 60,
        display: "flex",
        alignItems: "flex-end",
        background: `rgba(3,6,10,${enter ? 0.62 : 0})`,
        backdropFilter: "blur(3px)",
        transition: "background .2s ease",
      }}
    >
      <div
        onClick={(e) => e.stopPropagation()}
        style={{
          width: "100%",
          maxWidth: 520,
          margin: "0 auto",
          background: "var(--surface)",
          borderRadius: "22px 22px 0 0",
          borderTop: "1px solid var(--line-2)",
          maxHeight: "88%",
          display: "flex",
          flexDirection: "column",
          boxShadow: "0 -20px 50px -20px rgba(0,0,0,.6)",
          transform: enter ? "translateY(0)" : "translateY(26px)",
          transition: "transform .30s cubic-bezier(.2,.8,.25,1)",
        }}
      >
        <div className="wc-sheet-grip" />
        {(title || subtitle) && (
          <div style={{ padding: "8px 20px 14px", borderBottom: "1px solid var(--line)" }}>
            {title && <div style={{ fontSize: 18, fontWeight: 700, letterSpacing: "-0.01em" }}>{title}</div>}
            {subtitle && <div style={{ fontSize: 13, color: "var(--dim)", marginTop: 3 }}>{subtitle}</div>}
          </div>
        )}
        <div style={{ overflowY: "auto", padding: "8px 0 14px" }}>{children}</div>
      </div>
    </div>
  );
}

// centered confirm dialog (ported from wadau-ui.jsx ConfirmDialog)
export function ConfirmDialog({
  title,
  body,
  confirmLabel,
  cancelLabel = "Cancel",
  tone = "primary",
  onConfirm,
  onClose,
  children,
}: {
  title: string;
  body: string;
  confirmLabel: string;
  cancelLabel?: string;
  tone?: BtnKind;
  onConfirm: () => void;
  onClose: () => void;
  children?: ReactNode;
}) {
  const [enter, setEnter] = useState(false);
  useEffect(() => {
    const t = setTimeout(() => setEnter(true), 20);
    return () => clearTimeout(t);
  }, []);
  return (
    <div
      onClick={onClose}
      style={{
        position: "fixed",
        inset: 0,
        zIndex: 70,
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        padding: 22,
        background: `rgba(3,6,10,${enter ? 0.62 : 0})`,
        backdropFilter: "blur(3px)",
        transition: "background .2s ease",
      }}
    >
      <div
        onClick={(e) => e.stopPropagation()}
        className="wc-card"
        style={{
          width: "100%",
          maxWidth: 384,
          padding: "22px 22px 20px",
          transform: enter ? "scale(1)" : "scale(0.96)",
          transition: "transform .2s cubic-bezier(.2,.8,.25,1)",
        }}
      >
        <div style={{ fontSize: 18, fontWeight: 700, letterSpacing: "-0.01em" }}>{title}</div>
        <div style={{ fontSize: 13.5, color: "var(--dim)", marginTop: 8, lineHeight: 1.5 }}>{body}</div>
        {children}
        <div style={{ display: "flex", gap: 10, marginTop: 20 }}>
          <Btn kind="ghost" onClick={onClose}>
            {cancelLabel}
          </Btn>
          <Btn kind={tone} onClick={onConfirm}>
            {confirmLabel}
          </Btn>
        </div>
      </div>
    </div>
  );
}

// +/- stepper (ported from wadau-ui.jsx Stepper)
export function Stepper({
  value,
  set,
  min = 0,
  max = 12,
}: {
  value: number;
  set: (n: number) => void;
  min?: number;
  max?: number;
}) {
  const Bt = ({ d, on, label }: { d: boolean; on: () => void; label: string }) => (
    <button
      className="wc-iconbtn"
      onClick={on}
      aria-label={label}
      style={{ width: 48, height: 48, borderRadius: 14, fontSize: 22, opacity: d ? 0.4 : 1, pointerEvents: d ? "none" : "auto" }}
    >
      {label}
    </button>
  );
  return (
    <div style={{ display: "flex", alignItems: "center", gap: 18, justifyContent: "center" }}>
      <Bt d={value <= min} on={() => set(Math.max(min, value - 1))} label="−" />
      <div className="wc-num" style={{ fontSize: 46, fontWeight: 600, minWidth: 64, textAlign: "center", letterSpacing: "-0.03em" }}>
        {value}
      </div>
      <Bt d={value >= max} on={() => set(Math.min(max, value + 1))} label="+" />
    </div>
  );
}

// Full 193-country dial-code list (ISO2, dial). Flags generated from the ISO
// code at runtime so every flag is valid. Default selection is Kenya (+254).
export const COUNTRY_CODES: [string, string][] = [
  ["KE", "254"], ["US", "1"], ["GB", "44"], ["TZ", "255"], ["UG", "256"], ["NG", "234"], ["ZA", "27"], ["GH", "233"], ["RW", "250"], ["ET", "251"],
  ["AF", "93"], ["AL", "355"], ["DZ", "213"], ["AD", "376"], ["AO", "244"], ["AR", "54"], ["AM", "374"], ["AU", "61"], ["AT", "43"], ["AZ", "994"],
  ["BS", "1242"], ["BH", "973"], ["BD", "880"], ["BB", "1246"], ["BY", "375"], ["BE", "32"], ["BZ", "501"], ["BJ", "229"], ["BT", "975"], ["BO", "591"],
  ["BA", "387"], ["BW", "267"], ["BR", "55"], ["BN", "673"], ["BG", "359"], ["BF", "226"], ["BI", "257"], ["KH", "855"], ["CM", "237"], ["CA", "1"],
  ["CV", "238"], ["CF", "236"], ["TD", "235"], ["CL", "56"], ["CN", "86"], ["CO", "57"], ["KM", "269"], ["CG", "242"], ["CD", "243"], ["CR", "506"],
  ["CI", "225"], ["HR", "385"], ["CU", "53"], ["CY", "357"], ["CZ", "420"], ["DK", "45"], ["DJ", "253"], ["DM", "1767"], ["DO", "1809"], ["EC", "593"],
  ["EG", "20"], ["SV", "503"], ["GQ", "240"], ["ER", "291"], ["EE", "372"], ["SZ", "268"], ["FJ", "679"], ["FI", "358"], ["FR", "33"], ["GA", "241"],
  ["GM", "220"], ["GE", "995"], ["DE", "49"], ["GR", "30"], ["GD", "1473"], ["GT", "502"], ["GN", "224"], ["GW", "245"], ["GY", "592"], ["HT", "509"],
  ["HN", "504"], ["HU", "36"], ["IS", "354"], ["IN", "91"], ["ID", "62"], ["IR", "98"], ["IQ", "964"], ["IE", "353"], ["IL", "972"], ["IT", "39"],
  ["JM", "1876"], ["JP", "81"], ["JO", "962"], ["KZ", "7"], ["KI", "686"], ["KW", "965"], ["KG", "996"], ["LA", "856"], ["LV", "371"], ["LB", "961"],
  ["LS", "266"], ["LR", "231"], ["LY", "218"], ["LI", "423"], ["LT", "370"], ["LU", "352"], ["MG", "261"], ["MW", "265"], ["MY", "60"], ["MV", "960"],
  ["ML", "223"], ["MT", "356"], ["MH", "692"], ["MR", "222"], ["MU", "230"], ["MX", "52"], ["FM", "691"], ["MD", "373"], ["MC", "377"], ["MN", "976"],
  ["ME", "382"], ["MA", "212"], ["MZ", "258"], ["MM", "95"], ["NA", "264"], ["NR", "674"], ["NP", "977"], ["NL", "31"], ["NZ", "64"], ["NI", "505"],
  ["NE", "227"], ["KP", "850"], ["MK", "389"], ["NO", "47"], ["OM", "968"], ["PK", "92"], ["PW", "680"], ["PA", "507"], ["PG", "675"], ["PY", "595"],
  ["PE", "51"], ["PH", "63"], ["PL", "48"], ["PT", "351"], ["QA", "974"], ["RO", "40"], ["RU", "7"], ["KN", "1869"], ["LC", "1758"], ["VC", "1784"],
  ["WS", "685"], ["SM", "378"], ["ST", "239"], ["SA", "966"], ["SN", "221"], ["RS", "381"], ["SC", "248"], ["SL", "232"], ["SG", "65"], ["SK", "421"],
  ["SI", "386"], ["SB", "677"], ["SO", "252"], ["KR", "82"], ["SS", "211"], ["ES", "34"], ["LK", "94"], ["SD", "249"], ["SR", "597"], ["SE", "46"],
  ["CH", "41"], ["SY", "963"], ["TW", "886"], ["TJ", "992"], ["TH", "66"], ["TL", "670"], ["TG", "228"], ["TO", "676"], ["TT", "1868"], ["TN", "216"],
  ["TR", "90"], ["TM", "993"], ["TV", "688"], ["UA", "380"], ["AE", "971"], ["UY", "598"], ["UZ", "998"], ["VU", "678"], ["VE", "58"], ["VN", "84"],
  ["YE", "967"], ["ZM", "260"], ["ZW", "263"],
];

export function flagEmoji(iso: string): string {
  return iso
    .toUpperCase()
    .replace(/./g, (c) => String.fromCodePoint(127397 + c.charCodeAt(0)));
}

export function CountryCodeSelect({
  value,
  onChange,
}: {
  value: string;
  onChange: (v: string) => void;
}) {
  return (
    <div
      style={{
        position: "relative",
        display: "flex",
        alignItems: "center",
        borderRight: "1px solid var(--line)",
      }}
    >
      <select
        value={value}
        onChange={(e) => onChange(e.target.value)}
        style={{
          fontFamily: "var(--mono)",
          fontSize: 15,
          fontWeight: 500,
          color: "var(--dim)",
          background: "transparent",
          border: "none",
          outline: "none",
          padding: "13px 26px 13px 12px",
          cursor: "pointer",
          appearance: "none",
          WebkitAppearance: "none",
          MozAppearance: "none",
        }}
      >
        {COUNTRY_CODES.map(([iso, dial], i) => (
          <option key={i} value={"+" + dial} style={{ color: "#111" }}>
            {flagEmoji(iso)} +{dial}
          </option>
        ))}
      </select>
      <svg
        width="10"
        height="10"
        viewBox="0 0 12 12"
        fill="none"
        stroke="currentColor"
        strokeWidth="1.6"
        strokeLinecap="round"
        style={{ position: "absolute", right: 9, color: "var(--faint)", pointerEvents: "none" }}
      >
        <path d="M2 4l4 4 4-4" />
      </svg>
    </div>
  );
}
