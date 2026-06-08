"use client";

/* Screen 1 — Landing & Request to Join. Ported from wadau-landing.jsx
   (LandingBody), responsive desktop/mobile. Public, pre-auth. */

import Link from "next/link";
import { useEffect, useState } from "react";
import { submitJoinRequest } from "@/lib/firestore";
import { Crest, ThemeToggle } from "@/components/ds";
import { Btn, CountryCodeSelect, Field, inputStyle, SectionLabel } from "@/components/ui";
import { useCountdown } from "@/lib/countdown";
import { fmtKES } from "@/lib/data";
import { PAYMENT_RECIPIENTS, PAYMENT_WHATSAPP } from "@/lib/payment";
import { canonicalPhone } from "@/lib/phone";

type PublicPoolSummary = {
  buyin: number;
  entries: number;
  paidEntries: number;
  pot: number;
  payoutPct: [number, number, number];
};

const DEFAULT_SUMMARY: PublicPoolSummary = {
  buyin: 1000,
  entries: 0,
  paidEntries: 0,
  pot: 0,
  payoutPct: [50, 30, 20],
};

const PUBLIC_STATS_REVEAL_POT = 10_000;

export function LandingScreen() {
  const c = useCountdown();
  const [summary, setSummary] = useState<PublicPoolSummary>(DEFAULT_SUMMARY);
  const [sent, setSent] = useState(false);
  const [name, setName] = useState("");
  const [cc, setCc] = useState("+254");
  const [phone, setPhone] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [joinLoading, setJoinLoading] = useState(false);
  const [joinError, setJoinError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    fetch("/api/public/pool-summary")
      .then((res) => res.ok ? res.json() : null)
      .then((data: PublicPoolSummary | null) => {
        if (!cancelled && data) setSummary(data);
      })
      .catch(() => null);
    return () => {
      cancelled = true;
    };
  }, []);

  const handleJoin = async () => {
    setJoinError(null);
    if (password.length < 8) {
      setJoinError("Use at least 8 characters for your password.");
      return;
    }
    if (password !== confirmPassword) {
      setJoinError("Passwords do not match.");
      return;
    }
    setJoinLoading(true);
    try {
      await submitJoinRequest(name, cc, phone, password);
      setSent(true);
    } catch (error) {
      setJoinError((error as Error).message || "Failed to submit. Please try again.");
    } finally {
      setJoinLoading(false);
    }
  };

  const TopBar = (
    <div
      style={{
        display: "flex",
        alignItems: "center",
        justifyContent: "space-between",
        padding: "16px 28px",
        borderBottom: "1px solid var(--line)",
      }}
    >
      <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
        <Crest size={30} />
        <span style={{ fontSize: 17, fontWeight: 800, letterSpacing: "-0.02em", whiteSpace: "nowrap" }}>
          Wadau Cup
        </span>
      </div>
      <div style={{ display: "flex", alignItems: "center", gap: 14 }}>
        <ThemeToggle />
        <Link
          href="/login"
          style={{ fontSize: 13.5, fontWeight: 600, color: "var(--dim)", whiteSpace: "nowrap", textDecoration: "none" }}
        >
          Log in
        </Link>
      </div>
    </div>
  );

  const Hero = (
    <div>
      <div className="wc-eyebrow">World Cup 2026 · Private pool</div>
      <div
        style={{
          fontWeight: 800,
          letterSpacing: "-0.03em",
          lineHeight: 1.04,
          marginTop: 10,
        }}
        className="wc-hero-headline"
      >
        Draft six nations.
        <br />
        Outlast the wadau.
      </div>
      <div style={{ fontSize: 15, color: "var(--dim)", marginTop: 12, lineHeight: 1.5, maxWidth: 440 }}>
        A private World Cup pool among friends. Pick one team from each strength tier, score as they win,
        and take the pot if you finish on top.
      </div>
    </div>
  );

  const revealPublicStats = summary.pot >= PUBLIC_STATS_REVEAL_POT;
  const Stats = (
    <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 }}>
      {(
        [
          ["Prize pool", revealPublicStats ? fmtKES(summary.pot) : "KES --,---"],
          ["Buy-in", fmtKES(summary.buyin)],
          ["Players in", revealPublicStats ? String(summary.entries) : "--"],
          ["Locks in", c.label],
        ] as [string, string][]
      ).map(([k, v]) => (
        <div key={k} className="wc-card" style={{ padding: "13px 15px" }}>
          <div className="wc-eyebrow">{k}</div>
          <div
            className="wc-num"
            style={{ fontSize: k === "Locks in" ? 15 : 20, fontWeight: 600, letterSpacing: "-0.02em", marginTop: 5, whiteSpace: "nowrap" }}
          >
            {v}
          </div>
        </div>
      ))}
    </div>
  );

  const Steps = (
    <div>
      <SectionLabel>How it works</SectionLabel>
      <div style={{ display: "flex", flexDirection: "column", gap: 13, marginTop: 12 }}>
        {(
          [
            ["01", "Request a spot", "Create your login and wait for admin approval."],
            ["02", "Draft six teams", "You can draft immediately. Other entries stay hidden until approval."],
            ["03", "Outlast the rest", `Points bank as your teams win. Pot pays ${summary.payoutPct.join(" / ")}.`],
          ] as [string, string, string][]
        ).map(([n, t, b]) => (
          <div key={n} style={{ display: "flex", gap: 13, alignItems: "flex-start" }}>
            <div className="wc-num" style={{ fontSize: 13, fontWeight: 600, color: "var(--lime-ink)", paddingTop: 1 }}>
              {n}
            </div>
            <div>
              <div style={{ fontSize: 15, fontWeight: 600 }}>{t}</div>
              <div style={{ fontSize: 13, color: "var(--dim)", marginTop: 2, lineHeight: 1.45 }}>{b}</div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );

  const JoinCard = (
    <div className="wc-card" style={{ padding: "22px 20px" }}>
      {sent ? (
        <div style={{ textAlign: "center", padding: "6px 0" }}>
          <div
            style={{
              width: 56,
              height: 56,
              borderRadius: "50%",
              margin: "0 auto",
              background: "var(--lime)",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
            }}
          >
            <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="#0A0E13" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round">
              <path d="M4 12.5l5 5 11-12" />
            </svg>
          </div>
          <div style={{ fontSize: 20, fontWeight: 800, letterSpacing: "-0.02em", marginTop: 16 }}>
            You&apos;re on the list
          </div>
          <div style={{ fontSize: 13.5, color: "var(--dim)", marginTop: 8, lineHeight: 1.5 }}>
            Your account is ready for{" "}
            <span className="wc-num" style={{ color: "var(--text)", whiteSpace: "nowrap" }}>
              {canonicalPhone(cc, phone)}
            </span>
            . Log in, draft your six, and wait for admin approval for the full leaderboard.
          </div>
          <div
            className="wc-card"
            style={{ padding: "14px 15px", marginTop: 16, background: "var(--surface-2)", textAlign: "left" }}
          >
            <SectionLabel>Send your {fmtKES(summary.buyin)} buy-in</SectionLabel>
            <div style={{ display: "flex", flexDirection: "column", gap: 11, marginTop: 12 }}>
              {PAYMENT_RECIPIENTS.map((recipient, index) => (
                <div key={recipient.name} style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 10 }}>
                  <span style={{ fontSize: 13, color: "var(--dim)" }}>
                    {index === 0 ? "1" : "or"} · M-Pesa to {recipient.name}
                  </span>
                  <span className="wc-num" style={{ fontSize: 14, fontWeight: 600, whiteSpace: "nowrap" }}>
                    {recipient.phone}
                  </span>
                </div>
              ))}
              <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 10 }}>
                <span style={{ fontSize: 13, color: "var(--dim)" }}>2 · Follow up on WhatsApp</span>
                <span className="wc-num" style={{ fontSize: 14, fontWeight: 600, whiteSpace: "nowrap" }}>
                  {PAYMENT_WHATSAPP}
                </span>
              </div>
            </div>
          </div>
          <div style={{ display: "flex", alignItems: "center", justifyContent: "center", gap: 18, flexWrap: "wrap", marginTop: 18 }}>
            <button
              onClick={() => {
                setSent(false);
                setPassword("");
                setConfirmPassword("");
              }}
              style={{
                background: "none",
                border: "none",
                color: "var(--lime-ink)",
                fontFamily: "inherit",
                fontSize: 13,
                fontWeight: 600,
                cursor: "pointer",
              }}
            >
              Request another spot
            </button>
            <Link
              href="/login"
              style={{ display: "inline-flex", color: "var(--text)", fontSize: 13, fontWeight: 700, textDecoration: "none" }}
            >
              Log in and draft →
            </Link>
          </div>
        </div>
      ) : (
        <>
          <div style={{ fontSize: 18, fontWeight: 700, letterSpacing: "-0.01em" }}>Request to join</div>
          <div style={{ fontSize: 13, color: "var(--dim)", marginTop: 5, lineHeight: 1.5 }}>
            Create your login now. The admin approves full leaderboard access.
          </div>
          <div style={{ display: "flex", flexDirection: "column", gap: 13, marginTop: 18 }}>
            <Field label="Your name">
              <input value={name} onChange={(e) => setName(e.target.value)} placeholder="e.g. Brayo" style={inputStyle} />
            </Field>
            <Field label="Phone number">
              <div
                style={{
                  display: "flex",
                  alignItems: "center",
                  background: "var(--surface-2)",
                  border: "1px solid var(--line-2)",
                  borderRadius: 12,
                  overflow: "hidden",
                }}
              >
                <CountryCodeSelect value={cc} onChange={setCc} />
                <input
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                  placeholder="712 345 678"
                  inputMode="tel"
                  style={{ ...inputStyle, border: "none", borderRadius: 0, background: "transparent" }}
                />
              </div>
            </Field>
            <Field label="Password">
              <input
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="At least 8 characters"
                type="password"
                autoComplete="new-password"
                style={inputStyle}
              />
            </Field>
            <Field label="Confirm password">
              <input
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                placeholder="Repeat password"
                type="password"
                autoComplete="new-password"
                style={inputStyle}
              />
            </Field>
            {joinError && (
              <div style={{ fontSize: 12.5, color: "var(--down)", padding: "8px 12px", borderRadius: 9, background: "var(--down-soft)" }}>
                {joinError}
              </div>
            )}
            <Btn onClick={handleJoin} disabled={!name || phone.length < 6 || password.length < 8 || !confirmPassword || joinLoading}>
              {joinLoading ? "Creating…" : "Create account & request"}
            </Btn>
          </div>
        </>
      )}
    </div>
  );

  return (
    <div style={{ background: "var(--bg)", minHeight: "100vh" }}>
      {TopBar}
      {/* desktop */}
      <div
        className="wc-desktop-only"
        style={{
          maxWidth: 1080,
          margin: "0 auto",
          padding: "48px 32px 64px",
          gridTemplateColumns: "1fr 380px",
          gap: 56,
          alignItems: "start",
          display: "grid",
        }}
      >
        <div style={{ display: "flex", flexDirection: "column", gap: 34 }}>
          {Hero}
          {Stats}
          {Steps}
        </div>
        <div style={{ position: "sticky", top: 32 }}>{JoinCard}</div>
      </div>
      {/* mobile */}
      <div
        className="wc-mobile-only"
        style={{ padding: "28px 18px 40px", flexDirection: "column", gap: 26, display: "flex" }}
      >
        {Hero}
        {Stats}
        {JoinCard}
        {Steps}
      </div>
    </div>
  );
}
