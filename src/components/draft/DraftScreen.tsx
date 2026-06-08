"use client";

/* Screen 4 — Draft / Team Picking + Screen 5 — Entry-Saved Success.
   Ported from wadau-webdraft.jsx (DraftBody, TierSlot, TieBreakerCard) and
   wadau-screens-pre.jsx (ScreenLocked). Explicit picks only — no auto-pick.
   Saving marks the entry drafted (completes the gated flow) and shows the
   success state; "Go to the leaderboard" unlocks the rest of the app. */

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/lib/auth";
import { savePicks } from "@/lib/firestore";
import { useMyData } from "@/hooks/useMyData";
import {
  Btn,
  BottomSheet,
  ConfirmDialog,
  SectionLabel,
  Stepper,
  TierBadge,
} from "@/components/ui";
import { useCountdown } from "@/lib/countdown";
import { byTier, GROUPS, T, tierMeta, type Tier } from "@/lib/data";

const TIERS: Tier[] = ["A", "B", "C", "D", "E", "F"];
type Picks = Record<Tier, string | null>;
const EMPTY_PICKS: Picks = { A: null, B: null, C: null, D: null, E: null, F: null };

/* ---------- tier slot ---------- */
function TierSlot({ t, code, onClick }: { t: Tier; code: string | null; onClick: () => void }) {
  const m = tierMeta[t];
  return (
    <button
      onClick={onClick}
      className="wc-card"
      style={{
        display: "flex",
        alignItems: "center",
        gap: 13,
        padding: "12px 14px",
        cursor: "pointer",
        textAlign: "left",
        width: "100%",
        border: "1px solid " + (code ? "var(--line-2)" : "var(--line)"),
        background: "var(--surface)",
      }}
    >
      <TierBadge tier={t} />
      {code ? (
        <>
          <div style={{ flex: 1, minWidth: 0 }}>
            <div style={{ display: "flex", alignItems: "center", gap: 9 }}>
              <span className="wc-flag alive" style={{ width: 24, height: 24, fontSize: 16 }}>
                {T[code].f}
              </span>
              <span style={{ fontSize: 15.5, fontWeight: 600 }}>{T[code].n}</span>
            </div>
            <div className="wc-eyebrow" style={{ marginTop: 6 }}>
              Tier {t} · {m.label} · Grp {GROUPS[code]}
            </div>
          </div>
          <span className="wc-num" style={{ fontSize: 12, color: "var(--lime-ink)", fontWeight: 600 }}>
            Win +{m.win}
          </span>
          <svg width="16" height="16" viewBox="0 0 16 16" fill="none" stroke="var(--faint)" strokeWidth="1.6" strokeLinecap="round">
            <path d="M6 3l5 5-5 5" />
          </svg>
        </>
      ) : (
        <>
          <div style={{ flex: 1 }}>
            <div style={{ fontSize: 15, fontWeight: 600, color: "var(--dim)" }}>
              Tier {t} · {m.label}
            </div>
            <div className="wc-eyebrow" style={{ marginTop: 5 }}>
              Win +{m.win} · tap to pick
            </div>
          </div>
          <div
            style={{
              width: 26,
              height: 26,
              borderRadius: "50%",
              border: "1.5px dashed var(--line-2)",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              color: "var(--faint)",
              fontSize: 18,
            }}
          >
            +
          </div>
        </>
      )}
    </button>
  );
}

/* ---------- tie-breaker ---------- */
function TieBreakerCard({ goals, setGoals }: { goals: number; setGoals: (n: number) => void }) {
  return (
    <div className="wc-card" style={{ padding: "18px" }}>
      <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
        <SectionLabel>Tie-breaker</SectionLabel>
        <span className="wc-pill" style={{ padding: "2px 7px", fontSize: 9 }}>
          Locks with picks
        </span>
      </div>
      <div style={{ fontSize: 15, fontWeight: 600, marginTop: 9 }}>Total goals scored in the Final</div>
      <div style={{ fontSize: 12.5, color: "var(--dim)", marginTop: 3 }}>
        Closest guess wins level points. One shot.
      </div>
      <div style={{ marginTop: 16 }}>
        <Stepper value={goals} set={setGoals} />
      </div>
    </div>
  );
}

/* ---------- team picker sheet ---------- */
function TeamPickerSheet({
  tier,
  current,
  onPick,
  onClose,
}: {
  tier: Tier;
  current: string | null;
  onPick: (code: string) => void;
  onClose: () => void;
}) {
  const m = tierMeta[tier];
  return (
    <BottomSheet title={`Tier ${tier} · ${m.label}`} subtitle={`Win +${m.win} per round · ${m.blurb}`} onClose={onClose}>
      <div style={{ display: "flex", flexDirection: "column" }}>
        {byTier[tier].map((code) => {
          const sel = code === current;
          return (
            <button
              key={code}
              onClick={() => onPick(code)}
              style={{
                display: "flex",
                alignItems: "center",
                gap: 13,
                padding: "12px 20px",
                background: sel ? "var(--lime-soft)" : "transparent",
                border: "none",
                borderBottom: "1px solid var(--line)",
                cursor: "pointer",
                textAlign: "left",
              }}
            >
              <span className="wc-flag alive" style={{ width: 30, height: 30, fontSize: 20 }}>
                {T[code].f}
              </span>
              <div style={{ flex: 1 }}>
                <div style={{ fontSize: 15.5, fontWeight: 600, color: "var(--text)" }}>{T[code].n}</div>
                <div className="wc-eyebrow" style={{ marginTop: 4 }}>
                  Group {GROUPS[code]}
                </div>
              </div>
              {sel ? (
                <div
                  style={{
                    width: 22,
                    height: 22,
                    borderRadius: "50%",
                    background: "var(--lime)",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                  }}
                >
                  <svg width="13" height="13" viewBox="0 0 14 14" fill="none" stroke="#0A0E13" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M2.5 7.5l3 3 6-6.5" />
                  </svg>
                </div>
              ) : (
                <div style={{ width: 22, height: 22, borderRadius: "50%", border: "1.5px solid var(--line-2)" }} />
              )}
            </button>
          );
        })}
      </div>
    </BottomSheet>
  );
}

/* ---------- entry-saved success (Screen 5) ---------- */
function SavedSuccess({ picks, goals, playerName, isLocked }: { picks: Picks; goals: number; playerName?: string | null; isLocked: boolean }) {
  const router = useRouter();
  return (
    <div style={{ maxWidth: 480, margin: "0 auto", padding: "28px 18px 40px", textAlign: "center" }}>
      <div
        style={{
          width: 74,
          height: 74,
          borderRadius: "50%",
          margin: "14px auto 0",
          background: "var(--lime)",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          boxShadow: "0 0 40px -8px var(--lime-line)",
        }}
      >
        <svg width="38" height="38" viewBox="0 0 24 24" fill="none" stroke="#0A0E13" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round">
          <path d="M4 12.5l5 5 11-12" />
        </svg>
      </div>
      <div style={{ fontSize: 26, fontWeight: 800, letterSpacing: "-0.02em", marginTop: 20 }}>
        You&apos;re in{playerName ? `, ${playerName}` : ""}.
      </div>
      <div style={{ fontSize: 14.5, color: "var(--dim)", marginTop: 8, lineHeight: 1.5, padding: "0 10px" }}>
        Six nations drafted and your tie-breaker is set. You can edit this entry until the World Cup kicks off.
      </div>

      <div className="wc-card" style={{ marginTop: 24, padding: "8px 0", textAlign: "left" }}>
        {TIERS.map((t, i) => {
          const code = picks[t];
          if (!code) return null;
          return (
            <div
              key={t}
              style={{
                display: "flex",
                alignItems: "center",
                gap: 12,
                padding: "11px 16px",
                borderBottom: i < 5 ? "1px solid var(--line)" : "none",
              }}
            >
              <TierBadge tier={t} size={30} />
              <span className="wc-flag alive" style={{ width: 24, height: 24, fontSize: 16 }}>
                {T[code].f}
              </span>
              <span style={{ fontSize: 15, fontWeight: 600, flex: 1 }}>{T[code].n}</span>
              <span className="wc-eyebrow">Tier {t}</span>
            </div>
          );
        })}
        <div
          style={{
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            padding: "13px 16px 11px",
            borderTop: "1px solid var(--line)",
          }}
        >
          <span style={{ fontSize: 13.5, color: "var(--dim)" }}>Final goals tie-breaker</span>
          <span className="wc-num" style={{ fontSize: 18, fontWeight: 600, color: "var(--lime-ink)" }}>
            {goals}
          </span>
        </div>
      </div>

      <div style={{ marginTop: 22 }}>
        <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
          {!isLocked && <Btn kind="ghost" onClick={() => router.push("/draft")}>Edit my entry</Btn>}
          <Btn onClick={() => router.push("/")}>Go to the leaderboard</Btn>
        </div>
      </div>
    </div>
  );
}

/* ---------- draft screen ---------- */
export function DraftScreen() {
  const { user, markDrafted } = useAuth();
  const { player } = useMyData();
  const c = useCountdown();
  const [picks, setPicks] = useState<Picks>(EMPTY_PICKS);
  const [goals, setGoals] = useState(5);
  const [hydratedUid, setHydratedUid] = useState<string | null>(null);
  const [sheet, setSheet] = useState<Tier | null>(null);
  const [confirm, setConfirm] = useState(false);
  const [saved, setSaved] = useState(false);
  const [saving, setSaving] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);

  useEffect(() => {
    if (!user || hydratedUid === user.uid || !player?.picks) return;
    setPicks({
      A: player.picks.A?.code ?? null,
      B: player.picks.B?.code ?? null,
      C: player.picks.C?.code ?? null,
      D: player.picks.D?.code ?? null,
      E: player.picks.E?.code ?? null,
      F: player.picks.F?.code ?? null,
    });
    if (typeof player.finalGoals === "number") setGoals(player.finalGoals);
    setHydratedUid(user.uid);
  }, [hydratedUid, player?.finalGoals, player?.picks, user]);

  const count = TIERS.filter((t) => picks[t]).length;
  const done = count === 6;
  const hasExistingEntry = !!player?.hasDrafted;
  const canEdit = c.ready && !c.isLocked;

  const doSave = async () => {
    if (!done || !canEdit) return;
    setSaving(true);
    setSaveError(null);
    try {
      if (user) {
        // Write picks to Firestore — this also sets hasDrafted:true on the doc.
        // The AuthProvider's real-time listener will pick that up and update
        // hasDrafted in context, which clears AppGuard's draft gate.
        await savePicks(user.uid, picks as Record<Tier, string>, goals);
        markDrafted();
      }
      setConfirm(false);
      setSaved(true);
    } catch {
      setSaveError(c.isLocked ? "Picks are locked now." : "Failed to save picks. Please try again.");
    } finally {
      setSaving(false);
    }
  };

  if (saved) return <SavedSuccess picks={picks} goals={goals} playerName={player?.name ?? user?.displayName} isLocked={c.isLocked} />;

  const Intro = (
    <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", gap: 14, flexWrap: "wrap" }}>
      <div>
        <div style={{ fontSize: 22, fontWeight: 800, letterSpacing: "-0.02em" }}>{hasExistingEntry ? "Edit your six" : "Select your six"}</div>
        <div style={{ fontSize: 13.5, color: "var(--dim)", marginTop: 5, maxWidth: 440, lineHeight: 1.5 }}>
          One team from each tier A–F. You can save changes until the World Cup kicks off.
        </div>
      </div>
      <span className="wc-pill" style={{ padding: "5px 10px" }}>
        {c.isLocked ? "Picks locked" : `⏱ Locks in ${c.label}`}
      </span>
    </div>
  );

  const Progress = (
    <div className="wc-card" style={{ padding: "16px 18px" }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline" }}>
        <SectionLabel>Entry progress</SectionLabel>
        <span className="wc-num" style={{ fontSize: 13, fontWeight: 600, color: done ? "var(--lime)" : "var(--text)" }}>
          {count}/6
        </span>
      </div>
      <div style={{ height: 6, borderRadius: 3, background: "var(--track)", marginTop: 10, overflow: "hidden" }}>
        <div style={{ height: "100%", width: (count / 6) * 100 + "%", background: "var(--lime)", borderRadius: 3, transition: "width .25s" }} />
      </div>
      <div style={{ display: "flex", gap: 5, marginTop: 12 }}>
        {TIERS.map((t) => {
          const code = picks[t];
          return (
            <div
              key={t}
              title={code ? `Tier ${t} · ${T[code].n}` : `Tier ${t}`}
              style={{
                flex: 1,
                height: 30,
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                borderRadius: 7,
                fontFamily: "var(--mono)",
                fontSize: code ? 16 : 11,
                lineHeight: 1,
                fontWeight: 600,
                background: code ? "var(--lime-soft)" : "var(--surface-2)",
                color: code ? "var(--lime)" : "var(--faint)",
              }}
            >
              {code ? T[code].f : t}
            </div>
          );
        })}
      </div>
    </div>
  );

  const lockBtn = (
    <>
      {c.isLocked && (
        <div style={{ fontSize: 12.5, color: "var(--dim)", padding: "8px 12px", borderRadius: 9, background: "var(--surface-2)", marginBottom: 8 }}>
          Drafting closed at the first World Cup kickoff.
        </div>
      )}
      {saveError && (
        <div style={{ fontSize: 12.5, color: "var(--down)", padding: "8px 12px", borderRadius: 9, background: "var(--down-soft)", marginBottom: 8 }}>
          {saveError}
        </div>
      )}
      <Btn onClick={() => setConfirm(true)} disabled={!done || saving || !canEdit}>
        {done ? (hasExistingEntry ? "Save changes" : "Save my entry") : `Pick ${6 - count} more team${6 - count > 1 ? "s" : ""}`}
      </Btn>
    </>
  );

  const slots = TIERS.map((t) => <TierSlot key={t} t={t} code={picks[t]} onClick={() => canEdit && setSheet(t)} />);

  return (
    <>
      {/* desktop */}
      <div className="wc-desktop-only" style={{ maxWidth: 1040, margin: "0 auto", padding: "26px 28px 64px" }}>
        {Intro}
        <div style={{ display: "grid", gridTemplateColumns: "1fr 320px", gap: 20, marginTop: 22, alignItems: "start" }}>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>{slots}</div>
          <div style={{ display: "flex", flexDirection: "column", gap: 14, position: "sticky", top: 20 }}>
            {Progress}
            <TieBreakerCard goals={goals} setGoals={setGoals} />
            {lockBtn}
          </div>
        </div>
      </div>

      {/* mobile */}
      <div className="wc-mobile-only" style={{ padding: "10px 18px 24px" }}>
        {Intro}
        <div style={{ marginTop: 16 }}>{Progress}</div>
        <div style={{ display: "flex", flexDirection: "column", gap: 10, marginTop: 14 }}>{slots}</div>
        <div style={{ marginTop: 16 }}>
          <TieBreakerCard goals={goals} setGoals={setGoals} />
        </div>
        <div style={{ marginTop: 18 }}>{lockBtn}</div>
      </div>

      {sheet && (
        <TeamPickerSheet
          tier={sheet}
          current={picks[sheet]}
          onPick={(code) => {
            setPicks({ ...picks, [sheet]: code });
            setSheet(null);
          }}
          onClose={() => setSheet(null)}
        />
      )}

      {confirm && (
        <ConfirmDialog
          title={hasExistingEntry ? "Save changes?" : "Save your entry?"}
          tone="primary"
          confirmLabel={saving ? "Saving…" : "Save entry"}
          cancelLabel="Keep editing"
          body="You can keep editing this entry until the first World Cup match kicks off. After that, picks are locked."
          onConfirm={doSave}
          onClose={() => setConfirm(false)}
        >
          <div style={{ display: "flex", gap: 6, marginTop: 16, flexWrap: "wrap" }}>
            {TIERS.map((t) => {
              const code = picks[t];
              return (
                <div
                  key={t}
                  style={{
                    display: "flex",
                    alignItems: "center",
                    gap: 6,
                    padding: "6px 9px",
                    borderRadius: 9,
                    background: "var(--surface-2)",
                    border: "1px solid var(--line)",
                  }}
                >
                  <span className="wc-num" style={{ fontSize: 10, fontWeight: 600, color: "var(--dim)" }}>
                    {t}
                  </span>
                  <span className="wc-flag alive" style={{ width: 20, height: 20, fontSize: 13 }}>
                    {code ? T[code].f : ""}
                  </span>
                </div>
              );
            })}
          </div>
          <div
            style={{
              display: "flex",
              justifyContent: "space-between",
              alignItems: "center",
              marginTop: 14,
              paddingTop: 12,
              borderTop: "1px solid var(--line)",
            }}
          >
            <span style={{ fontSize: 13, color: "var(--dim)" }}>Final-goals tie-breaker</span>
            <span className="wc-num" style={{ fontSize: 16, fontWeight: 600, color: "var(--lime-ink)" }}>
              {goals}
            </span>
          </div>
        </ConfirmDialog>
      )}
    </>
  );
}
