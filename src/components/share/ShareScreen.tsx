"use client";

/* Screen 15 — Share Card. Ported from wadau-screens-post.jsx (ScreenShare).
   The card is a fixed "broadcast" dark asset (screenshot-ready for WhatsApp),
   so it's wrapped in its own .wc-dark stage regardless of the app theme. */

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Crest, Mover } from "@/components/ds";
import { Btn, SectionLabel } from "@/components/ui";
import { fmtKES } from "@/lib/data";
import { useAuth } from "@/lib/auth";
import { usePool } from "@/hooks/usePool";
import { useStandings } from "@/hooks/useStandings";
import { enrichPlayerTeams, useMyData } from "@/hooks/useMyData";

export function ShareScreen() {
  const router = useRouter();
  const { user, approvalStatus } = useAuth();
  const { round } = usePool();
  const { player, loading: playerLoading } = useMyData();
  const { players, scaleMax, loading } = useStandings(user?.uid, approvalStatus !== "pending");
  const fallbackTeams = enrichPlayerTeams(player).map((t) => ({ ...t, alive: t.alive }));
  const fallbackPoints = fallbackTeams.reduce((sum, team) => sum + team.pts, 0);
  const fallbackCeiling = fallbackPoints + fallbackTeams.reduce((sum, team) => sum + (team.alive ? team.rem : 0), 0);
  const fallbackMe = user && player ? {
    uid: user.uid,
    name: player.name,
    short: player.short,
    paid: player.paid,
    rank: player.rank,
    mover: player.mover,
    points: player.points || fallbackPoints,
    ceiling: player.ceiling || fallbackCeiling,
    payout: player.payout,
    teams: fallbackTeams,
    me: true,
  } : null;
  const me = players.find((p) => p.uid === user?.uid || p.me) ?? fallbackMe;
  const alive = me?.teams.filter((t) => t.alive) ?? [];
  const [toast, setToast] = useState<string | null>(null);
  const fire = (m: string) => {
    setToast(m);
    window.setTimeout(() => setToast(null), 1800);
  };

  if (loading || playerLoading) {
    return <div style={{ display: "flex", alignItems: "center", justifyContent: "center", padding: 64, color: "var(--faint)", fontSize: 14 }}>Loading…</div>;
  }

  if (!me) {
    return (
      <div style={{ maxWidth: 440, margin: "0 auto", padding: "32px 18px" }}>
        <button
          onClick={() => router.push("/my-picks")}
          style={{ display: "flex", alignItems: "center", gap: 7, background: "none", border: "none", color: "var(--dim)", cursor: "pointer", fontFamily: "inherit", fontSize: 13.5, padding: 0, marginBottom: 16 }}
        >
          <svg width="15" height="15" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round">
            <path d="M10 3L5 8l5 5" />
          </svg>
          Back to My Picks
        </button>
        <div className="wc-card" style={{ padding: 20 }}>
          <SectionLabel>No share card yet</SectionLabel>
          <div style={{ fontSize: 18, fontWeight: 800, marginTop: 8 }}>Save your picks first.</div>
        </div>
      </div>
    );
  }

  return (
    <div style={{ maxWidth: 440, margin: "0 auto", padding: "16px 18px 28px" }}>
      <button
        onClick={() => router.push("/my-picks")}
        style={{
          display: "flex",
          alignItems: "center",
          gap: 7,
          background: "none",
          border: "none",
          color: "var(--dim)",
          cursor: "pointer",
          fontFamily: "inherit",
          fontSize: 13.5,
          padding: 0,
          marginBottom: 16,
        }}
      >
        <svg width="15" height="15" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round">
          <path d="M10 3L5 8l5 5" />
        </svg>
        Back to My Picks
      </button>

      {/* dark broadcast stage */}
      <div
        className="wc wc-dark"
        style={{
          position: "relative",
          borderRadius: 24,
          padding: "24px 22px 22px",
          background: "radial-gradient(120% 80% at 50% 0%, #16203A 0%, #0A0E13 60%)",
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          border: "1px solid rgba(255,255,255,0.08)",
        }}
      >
        {/* the card */}
        <div
          style={{
            width: "100%",
            maxWidth: 330,
            borderRadius: 22,
            overflow: "hidden",
            position: "relative",
            background: "linear-gradient(165deg, #141B26 0%, #0B0F16 100%)",
            border: "1px solid rgba(255,255,255,0.10)",
            boxShadow: "0 30px 80px -30px rgba(0,0,0,0.9)",
          }}
        >
          <div
            style={{
              position: "absolute",
              top: -60,
              right: -40,
              width: 200,
              height: 200,
              borderRadius: "50%",
              background: "radial-gradient(circle, rgba(198,255,58,0.18), transparent 70%)",
            }}
          />
          <div style={{ padding: "20px 22px 22px", position: "relative" }}>
            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
              <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                <Crest size={26} />
                <span style={{ fontSize: 14, fontWeight: 800, letterSpacing: "-0.01em", color: "#fff" }}>Wadau Cup</span>
              </div>
              <span className="wc-eyebrow" style={{ color: "rgba(255,255,255,0.5)" }}>
                {round}
              </span>
            </div>

            <div style={{ marginTop: 22, display: "flex", alignItems: "flex-end", justifyContent: "space-between" }}>
              <div>
                <div className="wc-eyebrow" style={{ color: "rgba(255,255,255,0.5)" }}>
                  My standing
                </div>
                <div style={{ display: "flex", alignItems: "baseline", gap: 6, marginTop: 6 }}>
                  <span className="wc-num" style={{ fontSize: 46, fontWeight: 600, color: "#fff", letterSpacing: "-0.03em", lineHeight: 1 }}>
                    {me.rank > 0 ? `#${me.rank}` : "—"}
                  </span>
                  <Mover value={me.mover} />
                </div>
                <div style={{ fontSize: 17, fontWeight: 700, color: "#fff", marginTop: 8 }}>{me.name}</div>
              </div>
              <div style={{ textAlign: "right" }}>
                <div className="wc-num" style={{ fontSize: 30, fontWeight: 600, color: "#C6FF3A", lineHeight: 1 }}>
                  {me.points}
                </div>
                <div className="wc-eyebrow" style={{ color: "rgba(255,255,255,0.5)", marginTop: 4 }}>
                  points
                </div>
                <div className="wc-num" style={{ fontSize: 15, fontWeight: 600, color: "#E7C56A", marginTop: 12 }}>
                  {me.payout ? fmtKES(me.payout) : "—"}
                </div>
                <div className="wc-eyebrow" style={{ color: "rgba(255,255,255,0.5)", marginTop: 3 }}>
                  proj. payout
                </div>
              </div>
            </div>

            <div style={{ marginTop: 20 }}>
              <div style={{ height: 7, borderRadius: 4, background: "rgba(255,255,255,0.09)", position: "relative", overflow: "hidden" }}>
                <div style={{ position: "absolute", inset: "0 auto 0 0", width: Math.min(100, (me.ceiling / scaleMax) * 100) + "%", background: "rgba(255,255,255,0.22)", borderRadius: 4 }} />
                <div style={{ position: "absolute", inset: "0 auto 0 0", width: Math.min(100, (me.points / scaleMax) * 100) + "%", background: "#C6FF3A", borderRadius: 4 }} />
              </div>
              <div className="wc-num" style={{ fontSize: 10.5, color: "rgba(255,255,255,0.5)", marginTop: 6 }}>
                {me.points} now · ceiling {me.ceiling}
              </div>
            </div>

            <div style={{ marginTop: 18, paddingTop: 16, borderTop: "1px solid rgba(255,255,255,0.08)" }}>
              <div className="wc-eyebrow" style={{ color: "rgba(255,255,255,0.5)", marginBottom: 9 }}>
                Still alive · {alive.length}
              </div>
              <div style={{ display: "flex", gap: 6 }}>
                {alive.map((t) => (
                  <span key={t.code} className="wc-flag alive" style={{ width: 30, height: 30, fontSize: 20 }}>
                    {t.flag}
                  </span>
                ))}
              </div>
            </div>
          </div>
          <div
            style={{
              padding: "11px 22px",
              background: "rgba(255,255,255,0.03)",
              borderTop: "1px solid rgba(255,255,255,0.06)",
              display: "flex",
              justifyContent: "space-between",
              alignItems: "center",
            }}
          >
            <span className="wc-eyebrow" style={{ color: "rgba(255,255,255,0.4)" }}>
              Catch me if you can 😤
            </span>
            <span className="wc-eyebrow" style={{ color: "rgba(255,255,255,0.4)" }}>
              wadau.cup
            </span>
          </div>
        </div>

        {/* actions */}
        <div style={{ width: "100%", maxWidth: 330, marginTop: 20, display: "flex", flexDirection: "column", gap: 10 }}>
          <button className="wc-btn" onClick={() => fire("Opening WhatsApp…")} style={{ background: "#25D366", color: "#06301B" }}>
            <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor">
              <path d="M12 2a10 10 0 0 0-8.6 15l-1.3 4.7 4.8-1.3A10 10 0 1 0 12 2zm0 2a8 8 0 1 1-4.1 14.9l-.3-.2-2.8.7.8-2.7-.2-.3A8 8 0 0 1 12 4zm4.6 10c-.2-.1-1.4-.7-1.6-.8s-.4-.1-.5.1-.6.8-.8 1-.3.2-.5.1a6.5 6.5 0 0 1-3.2-2.8c-.2-.4.2-.4.6-1.2.1-.2 0-.3 0-.5l-.7-1.7c-.2-.4-.4-.4-.5-.4h-.5a1 1 0 0 0-.7.3c-.2.3-.9.9-.9 2.1s.9 2.5 1 2.6 1.8 2.7 4.3 3.8c1.6.7 2.2.7 3 .6.5 0 1.4-.6 1.6-1.1s.2-1 .1-1.1-.3-.2-.5-.3z" />
            </svg>
            Share to WhatsApp
          </button>
          <div style={{ display: "flex", gap: 10 }}>
            <Btn kind="ghost" onClick={() => fire("Image saved")} style={{ flex: 1 }}>
              Save image
            </Btn>
            <Btn kind="ghost" onClick={() => fire("Link copied")} style={{ flex: 1 }}>
              Copy link
            </Btn>
          </div>
        </div>

        {toast && (
          <div
            style={{
              position: "absolute",
              bottom: 22,
              left: "50%",
              transform: "translateX(-50%)",
              background: "#fff",
              color: "#0A0E13",
              padding: "10px 18px",
              borderRadius: 999,
              fontSize: 13,
              fontWeight: 600,
              boxShadow: "0 10px 30px rgba(0,0,0,0.4)",
              zIndex: 50,
            }}
          >
            {toast}
          </div>
        )}
      </div>
    </div>
  );
}
