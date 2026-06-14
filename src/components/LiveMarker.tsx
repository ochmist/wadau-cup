"use client";

export function liveClockLabel(input?: {
  minute?: number | null;
  extra?: number | null;
  statusShort?: string | null;
  statusLong?: string | null;
}) {
  if (!input) return "LIVE";
  if (input.statusShort === "HT") return "HT";
  if (input.statusShort === "FT") return "FT";
  if (typeof input.minute === "number") {
    return `${input.minute}${typeof input.extra === "number" && input.extra > 0 ? `+${input.extra}` : ""}'`;
  }
  return input.statusShort ?? input.statusLong ?? "LIVE";
}

export function LiveMarker({
  minute,
  extra,
  statusShort,
  statusLong,
  compact = false,
  fixture = false,
  label,
  order = "clock-first",
}: {
  minute?: number | null;
  extra?: number | null;
  statusShort?: string | null;
  statusLong?: string | null;
  compact?: boolean;
  fixture?: boolean;
  label?: string;
  order?: "clock-first" | "live-first";
}) {
  const clock = label ?? liveClockLabel({ minute, extra, statusShort, statusLong });
  const showLiveWord = clock.toUpperCase() !== "LIVE";
  const content = order === "live-first" && showLiveWord
    ? (
      <>
        <span>LIVE</span>
        <span aria-hidden="true">·</span>
        <span>{clock}</span>
      </>
    )
    : (
      <>
        <span>{clock}</span>
        {showLiveWord && <span>LIVE</span>}
      </>
    );
  return (
    <span className={"wc-live-marker" + (compact ? " compact" : "") + (fixture ? " fixture" : "")}>
      <span className="wc-live-marker-dot" />
      {content}
    </span>
  );
}
