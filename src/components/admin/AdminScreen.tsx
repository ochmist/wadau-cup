"use client";

/* Screen 13 — Admin · Match Results. Ported from wadau-admin.jsx (AdminApp).
   Interactive: pick the team that advanced, see needs-recompute, recompute,
   Rendered inside PageShell. */

import { useState, useCallback, useEffect, useMemo } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Btn, ConfirmDialog, SectionLabel } from "@/components/ui";
import { TeamPick } from "@/components/admin/parts";
import { useAuth } from "@/lib/auth";
import { auth } from "@/lib/firebase";
import { useResults } from "@/hooks/useResults";
import { useStandings } from "@/hooks/useStandings";
import { useFixtures } from "@/hooks/useFixtures";
import { useSyncStatus } from "@/hooks/useSyncStatus";

type AdminFixture = {
  id: string;
  label: string;
  round: string;
  a: string;
  b: string;
};

/* match card — desktop side-by-side, mobile stacked (per README) */
function MatchCard({
  m,
  winner,
  onPick,
  onClear,
}: {
  m: AdminFixture;
  winner?: string;
  onPick: (code: string) => void;
  onClear: () => void;
}) {
  const entered = !!winner;
  return (
    <div className="wc-card" style={{ padding: "13px 16px" }}>
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 10 }}>
        <span className="wc-eyebrow">{m.round} · {m.label}</span>
        {entered ? (
          <button
            onClick={onClear}
            style={{
              display: "flex",
              alignItems: "center",
              gap: 5,
              background: "none",
              border: "none",
              cursor: "pointer",
              color: "var(--dim)",
              fontFamily: "inherit",
              fontSize: 11.5,
              fontWeight: 600,
              whiteSpace: "nowrap",
            }}
          >
            <span className="wc-num" style={{ color: "var(--lime-ink)" }}>
              ✓ Entered
            </span>{" "}
            · Edit
          </button>
        ) : (
          <span className="wc-num" style={{ fontSize: 10.5, color: "var(--faint)", textTransform: "uppercase", letterSpacing: "0.1em" }}>
            Awaiting result
          </span>
        )}
      </div>

      {/* desktop: side by side */}
      <div className="wc-desktop-only" style={{ alignItems: "center", gap: 8, display: "flex" }}>
        <TeamPick code={m.a} selected={winner === m.a} dimmed={entered && winner !== m.a} onClick={() => onPick(m.a)} align="left" />
        <div className="wc-num" style={{ fontSize: 11, color: "var(--faint)", flex: "none", width: 26, textAlign: "center" }}>
          vs
        </div>
        <TeamPick code={m.b} selected={winner === m.b} dimmed={entered && winner !== m.b} onClick={() => onPick(m.b)} align="right" />
      </div>

      {/* mobile: stacked */}
      <div className="wc-mobile-only" style={{ flexDirection: "column", gap: 8, display: "flex" }}>
        <TeamPick code={m.a} selected={winner === m.a} dimmed={entered && winner !== m.a} onClick={() => onPick(m.a)} align="left" />
        <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
          <div style={{ flex: 1, height: 1, background: "var(--line)" }} />
          <span className="wc-num" style={{ fontSize: 10.5, color: "var(--faint)" }}>
            vs
          </span>
          <div style={{ flex: 1, height: 1, background: "var(--line)" }} />
        </div>
        <TeamPick code={m.b} selected={winner === m.b} dimmed={entered && winner !== m.b} onClick={() => onPick(m.b)} align="left" />
      </div>

      {!entered && (
        <div style={{ marginTop: 9, fontSize: 11.5, color: "var(--faint)", textAlign: "center" }}>
          Tap the team that advanced
        </div>
      )}
    </div>
  );
}

async function authHeader(): Promise<Record<string, string>> {
  const token = await auth.currentUser?.getIdToken();
  if (!token) return { "Content-Type": "application/json" };
  return { Authorization: `Bearer ${token}`, "Content-Type": "application/json" };
}

export function AdminScreen() {
  const { ready, isAdmin } = useAuth();
  const router = useRouter();
  const { results } = useResults();
  const { players: standingsPlayers } = useStandings();
  const { fixtures } = useFixtures();
  const { status: syncStatus } = useSyncStatus();

  // All hooks must run before any early return (Rules of Hooks).
  const [resultsUnlocked, setResultsUnlocked] = useState(false);
  const [confirmResults, setConfirmResults] = useState(true);
  const [res, setRes] = useState<Record<string, string>>({});
  const [dirty, setDirty] = useState(false);
  const [recomputing, setRecomputing] = useState(false);

  useEffect(() => {
    if (dirty) return;
    setRes(Object.fromEntries(results.filter((result) => result.win).map((result) => [result.id, result.win as string])));
  }, [dirty, results]);

  // Redirect non-admins after hooks (API routes also enforce this server-side).
  useEffect(() => {
    if (ready && !isAdmin) router.replace("/");
  }, [ready, isAdmin, router]);

  const resultFixtures = useMemo<AdminFixture[]>(() => fixtures
    .filter((fixture): fixture is typeof fixture & { a: string; b: string } => Boolean(fixture.a && fixture.b))
    .map((fixture) => ({
      id: fixture.id,
      label: fixture.label,
      round: fixture.round,
      a: fixture.a,
      b: fixture.b,
    })), [fixtures]);
  const rounds = useMemo(() => Array.from(new Set(resultFixtures.map((fixture) => fixture.round))), [resultFixtures]);

  const pending = resultFixtures.filter((m) => !res[m.id]).length;
  const entered = resultFixtures.length - pending;

  const pick = useCallback(async (id: string, code: string) => {
    setRes((r) => ({ ...r, [id]: code }));
    setDirty(true);
    const m = resultFixtures.find((f) => f.id === id);
    if (!m) return;
    const headers = await authHeader();
    await fetch("/api/admin/result", {
      method: "POST",
      headers,
      body: JSON.stringify({ matchId: id, round: m.round, a: m.a, b: m.b, win: code, pts: [], held: 0, note: "" }),
    }).catch(() => null);
  }, [resultFixtures]);

  const clear = useCallback(async (id: string) => {
    setRes((r) => { const n = { ...r }; delete n[id]; return n; });
    setDirty(true);
    const headers = await authHeader();
    await fetch("/api/admin/result", { method: "DELETE", headers, body: JSON.stringify({ matchId: id }) }).catch(() => null);
  }, []);

  const recompute = useCallback(async () => {
    setRecomputing(true);
    const headers = await authHeader();
    const res = await fetch("/api/admin/recompute", { method: "POST", headers }).catch(() => null);
    if (res?.ok) setDirty(false);
    setRecomputing(false);
  }, []);

  if (ready && !isAdmin) return null;

  const topThree = standingsPlayers.filter((player) => player.rank > 0).sort((a, b) => a.rank - b.rank).slice(0, 3);

  const RoundChips = (
    <div className="wc-chiprow" style={{ overflowX: "auto", paddingBottom: 2 }}>
      {(rounds.length ? rounds : ["Round of 16"]).map((c) => (
        <span
          key={c}
          className="wc-chip on"
        >
          {c}
        </span>
      ))}
    </div>
  );

  const Recompute = (
    <div className="wc-card" style={{ padding: "16px 18px" }}>
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
        <SectionLabel>Standings</SectionLabel>
        <span className="wc-num" style={{ fontSize: 11.5, color: dirty ? "var(--down)" : "var(--lime-ink)", whiteSpace: "nowrap" }}>
          {dirty ? "● Needs recompute" : "● Up to date"}
        </span>
      </div>
      <div style={{ marginTop: 12, display: "flex", flexDirection: "column", gap: 8 }}>
        {topThree.map((p) => (
          <div key={p.name} style={{ display: "flex", alignItems: "center", gap: 10 }}>
            <span className="wc-num" style={{ fontSize: 12, color: p.rank <= 3 ? "var(--gold)" : "var(--faint)", width: 14, fontWeight: 600 }}>
              {p.rank}
            </span>
            <span style={{ fontSize: 13, fontWeight: 500, flex: 1 }}>{p.name}</span>
            <span className="wc-num" style={{ fontSize: 13, fontWeight: 600 }}>
              {p.points}
            </span>
          </div>
        ))}
        {topThree.length === 0 && (
          <div style={{ fontSize: 12.5, color: "var(--dim)", lineHeight: 1.45 }}>
            No ranked players yet. Recompute after entries/results are available.
          </div>
        )}
      </div>
      <div style={{ marginTop: 14 }}>
        <Btn onClick={recompute} disabled={!dirty || recomputing}>
          {recomputing ? "Recomputing…" : dirty ? "Recompute standings" : "Standings up to date"}
        </Btn>
      </div>
    </div>
  );

  const DataSync = (
    <div className="wc-card" style={{ padding: "16px 18px" }}>
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 10 }}>
        <SectionLabel>Data sync</SectionLabel>
        <span className="wc-num" style={{ fontSize: 11, color: "var(--faint)", whiteSpace: "nowrap" }}>
          {syncStatus?.fixtureCount ?? resultFixtures.length} fixtures
        </span>
      </div>
      <div style={{ marginTop: 10, display: "flex", flexDirection: "column", gap: 7 }}>
        <div style={{ display: "flex", justifyContent: "space-between", gap: 10, fontSize: 12.5, color: "var(--dim)" }}>
          <span>football-data</span>
          <span className="wc-num" style={{ color: syncStatus?.providerConfigured?.footballData ? "var(--lime-ink)" : "var(--faint)" }}>
            {syncStatus?.providerConfigured?.footballData ? "configured" : "missing key"}
          </span>
        </div>
        <div style={{ display: "flex", justifyContent: "space-between", gap: 10, fontSize: 12.5, color: "var(--dim)" }}>
          <span>Live layer</span>
          <span className="wc-num" style={{ color: syncStatus?.providerConfigured?.apiFootball ? "var(--lime-ink)" : "var(--faint)" }}>
            {syncStatus?.providerConfigured?.apiFootball ? "on" : "off"}
          </span>
        </div>
      </div>
      {(syncStatus?.warnings?.length ?? 0) > 0 ? (
        <div style={{ marginTop: 12, display: "flex", flexDirection: "column", gap: 7 }}>
          <div className="wc-eyebrow" style={{ color: "var(--gold)" }}>
            {syncStatus?.warnings?.length} warnings
          </div>
          {syncStatus?.warnings?.slice(0, 3).map((warning, index) => (
            <div key={`${warning.provider}-${warning.matchId ?? index}`} style={{ fontSize: 11.5, color: "var(--dim)", lineHeight: 1.35 }}>
              <span className="wc-num" style={{ color: "var(--gold)" }}>
                {warning.provider}
              </span>{" "}
              {warning.message}
            </div>
          ))}
        </div>
      ) : (
        <div style={{ marginTop: 12, fontSize: 12.5, color: "var(--lime-ink)" }}>
          No provider warnings.
        </div>
      )}
    </div>
  );

  const matchList = (
    <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
      {resultFixtures.map((m) => (
        <MatchCard key={m.id} m={m} winner={res[m.id]} onPick={(c) => pick(m.id, c)} onClear={() => clear(m.id)} />
      ))}
      {resultFixtures.length === 0 && (
        <div className="wc-card" style={{ padding: "24px 18px", color: "var(--dim)", fontSize: 13.5, lineHeight: 1.45 }}>
          No synced fixtures with known teams yet. Run the sync after provider keys are configured, or wait for football-data to publish the bracket.
        </div>
      )}
    </div>
  );

  return (
    <div style={{ maxWidth: 1320, margin: "0 auto", padding: "24px 28px 56px" }}>
      <div style={{ display: "flex", alignItems: "flex-end", justifyContent: "space-between", marginBottom: 18, gap: 14, flexWrap: "wrap" }}>
        <div>
          <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
            <div style={{ fontSize: 22, fontWeight: 800, letterSpacing: "-0.02em" }}>Manual match results</div>
            <span className="wc-pill" style={{ color: "var(--violet)", borderColor: "var(--violet)" }}>
              Admin
            </span>
          </div>
          <div style={{ fontSize: 13.5, color: "var(--dim)", marginTop: 4 }}>
            Backup path for entering outcomes by hand when automatic updates fail.
          </div>
        </div>
        <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
          <Link href="/admin" className="wc-nav-link" style={{ color: "var(--lime-ink)", fontWeight: 600 }}>
            ← Data control
          </Link>
        </div>
      </div>

      {resultsUnlocked ? (
        <>
          {/* desktop: results + rail */}
          <div className="wc-desktop-only" style={{ gridTemplateColumns: "1fr 340px", gap: 24, alignItems: "start", display: "grid" }}>
            <div>
              <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 14 }}>
                {RoundChips}
                <span className="wc-eyebrow" style={{ whiteSpace: "nowrap", marginLeft: 14 }}>
                  {entered}/{resultFixtures.length} entered
                </span>
              </div>
              {matchList}
            </div>
            <div style={{ display: "flex", flexDirection: "column", gap: 16, position: "sticky", top: 20 }}>
              {DataSync}
              {Recompute}
              <div className="wc-card" style={{ padding: "16px 18px" }}>
                <SectionLabel>Admin tools</SectionLabel>
                <div style={{ fontSize: 12.5, color: "var(--dim)", marginTop: 8, lineHeight: 1.45 }}>
                  Pool settings and account management now live behind setup.
                </div>
                <Link href="/admin/setup" className="wc-nav-link" style={{ display: "inline-flex", marginTop: 12, color: "var(--lime-ink)", fontWeight: 600 }}>
                  Open pool setup →
                </Link>
              </div>
            </div>
          </div>

          {/* mobile: chips + recompute + matches */}
          <div className="wc-mobile-only" style={{ flexDirection: "column", gap: 12, display: "flex" }}>
            {RoundChips}
            {DataSync}
            {Recompute}
            {matchList}
          </div>
        </>
      ) : (
        <div className="wc-card" style={{ padding: "18px 20px", color: "var(--dim)", fontSize: 13.5 }}>
          Confirm before opening manual match results.
        </div>
      )}
      {confirmResults && (
        <ConfirmDialog
          title="Open manual results?"
          body="This is the backup path for entering match outcomes by hand. Use it only when the automatic update is unavailable or needs correction."
          confirmLabel="Open results"
          cancelLabel="Stay here"
          tone="gold"
          onConfirm={() => {
            setResultsUnlocked(true);
            setConfirmResults(false);
          }}
          onClose={() => router.replace("/admin")}
        >
          <div style={{ padding: "12px 13px", marginTop: 16, background: "var(--surface-2)", border: "1px solid var(--gold-line)", borderRadius: 12 }}>
            <div className="wc-eyebrow wc-gold-text">Manual fallback</div>
            <div style={{ fontSize: 12.5, color: "var(--dim)", lineHeight: 1.45, marginTop: 6 }}>
              Changes here can affect standings after recompute.
            </div>
          </div>
        </ConfirmDialog>
      )}
    </div>
  );
}
