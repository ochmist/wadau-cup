"use client";

// Shared tinted banner for the three edge states.
// Imported by Leaderboard and MyPicksScreen to show contextual warnings.
type Tone = "lime" | "down" | "gold";

export function EdgeBanner({
  tone,
  title,
  body,
  action,
  onClick,
}: {
  tone: Tone;
  title: string;
  body: string;
  action?: string;
  onClick?: () => void;
}) {
  const c = tone === "down" ? "var(--down)" : tone === "gold" ? "var(--gold)" : "var(--lime-ink)";
  const bg = tone === "down" ? "var(--down-soft)" : tone === "gold" ? "var(--gold-soft)" : "var(--lime-soft)";
  const icon = tone === "down" ? "✕" : tone === "gold" ? "●" : "▲";
  const content = (
    <div style={{ display: "flex", gap: 11, alignItems: "flex-start" }}>
      <span style={{ color: c, fontSize: 14, marginTop: 1 }}>{icon}</span>
      <div style={{ flex: 1 }}>
        <div style={{ fontSize: 14, fontWeight: 700, letterSpacing: "-0.01em" }}>{title}</div>
        <div style={{ fontSize: 12.5, color: "var(--dim)", marginTop: 3, lineHeight: 1.5 }}>{body}</div>
        {action && (
          <div style={{ fontSize: 12.5, color: c, marginTop: 6, fontWeight: 700 }}>
            {action}
          </div>
        )}
      </div>
    </div>
  );
  const sharedStyle = {
    width: "100%",
    padding: "13px 15px",
    background: bg,
    borderColor: bg,
    marginBottom: 14,
    textAlign: "left" as const,
    fontFamily: "inherit",
    color: "var(--text)",
  };
  if (!onClick) {
    return (
      <div className="wc-card" style={sharedStyle}>
        {content}
      </div>
    );
  }
  return (
    <button
      type="button"
      onClick={onClick}
      className="wc-card"
      style={{
        ...sharedStyle,
        cursor: "pointer",
      }}
    >
      {content}
    </button>
  );
}
