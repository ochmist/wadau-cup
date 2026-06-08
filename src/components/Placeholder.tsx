/* Styled placeholder for screens documented in the handoff README but not yet
   built. Keeps the routing graph complete so nav works end-to-end. Each one
   names the README screen + source component it will become. */

import { Crest } from "@/components/ds";

export function Placeholder({
  title,
  screenRef,
  description,
}: {
  title: string;
  screenRef: string;
  description: string;
}) {
  return (
    <div
      style={{
        maxWidth: 640,
        margin: "0 auto",
        padding: "64px 24px",
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        textAlign: "center",
        gap: 18,
      }}
    >
      <Crest size={44} />
      <div className="wc-eyebrow">{screenRef}</div>
      <h1 style={{ fontSize: 30, fontWeight: 800, letterSpacing: "-0.03em", lineHeight: 1.04, margin: 0 }}>
        {title}
      </h1>
      <p style={{ color: "var(--dim)", fontSize: 15, lineHeight: 1.5, maxWidth: 440, margin: 0 }}>
        {description}
      </p>
      <span className="wc-pill" style={{ marginTop: 4 }}>
        Screen not yet built
      </span>
    </div>
  );
}
