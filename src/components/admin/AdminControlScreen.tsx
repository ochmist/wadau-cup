"use client";

import { useCallback, useEffect, useMemo, useState, type CSSProperties, type ReactNode } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { TeamEntityLink } from "@/components/entity-links";
import { EmailAuthProvider, reauthenticateWithCredential } from "firebase/auth";
import { LiveMarker } from "@/components/LiveMarker";
import { ConfirmDialog, PageHead, SectionLabel } from "@/components/ui";
import { useAuth } from "@/lib/auth";
import { auth } from "@/lib/firebase";
import { T } from "@/lib/data";
import { useFixtures } from "@/hooks/useFixtures";
import { useResults } from "@/hooks/useResults";
import { useStandings } from "@/hooks/useStandings";
import { useSyncStatus } from "@/hooks/useSyncStatus";
import type { FixtureWithId, LiveStateWithId, ResultWithId } from "@/lib/firestore";

type AdminAction = "live" | "results" | "recompute" | "backup";
type PillTone = "live" | "neutral" | "busy" | "warn";

function adminActionLabel(action: AdminAction) {
  if (action === "live") return "Sync live scores";
  if (action === "results") return "Sync results";
  if (action === "recompute") return "Recompute points";
  return "Backup picks";
}

async function authHeaders(): Promise<Record<string, string>> {
  const token = await auth.currentUser?.getIdToken();
  return token
    ? { Authorization: `Bearer ${token}`, "Content-Type": "application/json" }
    : { "Content-Type": "application/json" };
}

function timestampDate(value: unknown): Date | null {
  if (typeof value === "string") {
    const date = new Date(value);
    return Number.isNaN(date.getTime()) ? null : date;
  }
  if (!value || typeof value !== "object") return null;
  if ("toDate" in value && typeof value.toDate === "function") return value.toDate();
  if ("seconds" in value && typeof value.seconds === "number") return new Date(value.seconds * 1000);
  return null;
}

function timeAgo(date: Date | null) {
  if (!date) return "never";
  const diff = Date.now() - date.getTime();
  if (diff < 0) return "just now";
  const seconds = Math.floor(diff / 1000);
  if (seconds < 45) return "just now";
  const mins = Math.floor(seconds / 60);
  if (mins < 60) return `${mins}m ago`;
  const hours = Math.floor(mins / 60);
  if (hours < 48) return `${hours}h ago`;
  return `${Math.floor(hours / 24)}d ago`;
}

function localKickoffLabel(iso: string) {
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return "Time TBD";
  return new Intl.DateTimeFormat(undefined, {
    hour: "numeric",
    minute: "2-digit",
    timeZoneName: "short",
  }).format(date);
}

function sameLocalDay(iso: string, now = new Date()) {
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return false;
  return date.getFullYear() === now.getFullYear() &&
    date.getMonth() === now.getMonth() &&
    date.getDate() === now.getDate();
}

function fixtureInLivePollingWindow(fixture: FixtureWithId, now = Date.now()) {
  if (fixture.status === "live") return true;
  const kickoff = Date.parse(fixture.kickoffAt);
  if (Number.isNaN(kickoff)) return false;
  return now >= kickoff - 20 * 60_000 && now <= kickoff + 150 * 60_000;
}

function teamFlag(codeOrName?: string) {
  if (!codeOrName) return "•";
  if (T[codeOrName]?.f) return T[codeOrName].f;
  const hit = Object.values(T).find((team) => team.n.toLowerCase() === codeOrName.toLowerCase());
  return hit?.f ?? "•";
}

function statusColors(tone: PillTone) {
  if (tone === "live") return {
    color: "var(--up)",
    background: "var(--up-soft)",
    borderColor: "var(--up)",
  };
  if (tone === "busy") return {
    color: "var(--gold)",
    background: "var(--gold-soft)",
    borderColor: "var(--gold-line)",
  };
  if (tone === "warn") return {
    color: "var(--down)",
    background: "var(--down-soft)",
    borderColor: "var(--down)",
  };
  return {
    color: "var(--dim)",
    background: "transparent",
    borderColor: "var(--line-2)",
  };
}

function StatusPill({
  tone = "neutral",
  dot,
  pulse,
  children,
}: {
  tone?: PillTone;
  dot?: boolean;
  pulse?: boolean;
  children: ReactNode;
}) {
  const colors = statusColors(tone);
  return (
    <span
      className="wc-pill"
      style={{
        padding: "5px 11px",
        color: colors.color,
        background: colors.background,
        borderColor: colors.borderColor,
      }}
    >
      {dot && (
        <span
          style={{
            width: 6,
            height: 6,
            borderRadius: 99,
            background: colors.color,
            animation: pulse ? "wc-dc-pulse 1.6s ease-out infinite" : undefined,
          }}
        />
      )}
      {children}
    </span>
  );
}

function DataCard({
  title,
  right,
  children,
  style,
}: {
  title?: string;
  right?: ReactNode;
  children: ReactNode;
  style?: CSSProperties;
}) {
  return (
    <section className="wc-card" style={{ overflow: "hidden", ...style }}>
      {(title || right) && (
        <div
          style={{
            display: "flex",
            alignItems: "center",
            justifyContent: title ? "space-between" : "flex-end",
            gap: 14,
            padding: "18px 18px 12px",
          }}
        >
          {title && <SectionLabel style={{ color: "var(--faint)" }}>{title}</SectionLabel>}
          {right}
        </div>
      )}
      {children}
    </section>
  );
}

function SourceRow({
  name,
  detail,
  status,
  tone,
  dot,
  pulse,
  last,
}: {
  name: string;
  detail: string;
  status: string;
  tone: PillTone;
  dot?: boolean;
  pulse?: boolean;
  last?: boolean;
}) {
  return (
    <div
      style={{
        display: "flex",
        alignItems: "center",
        gap: 13,
        padding: "15px 18px",
        borderBottom: last ? "none" : "1px solid var(--line)",
      }}
    >
      <div style={{ display: "flex", alignItems: "center", gap: 13, minWidth: 0, flex: 1 }}>
        <div
          style={{
            width: 34,
            height: 34,
            borderRadius: 9,
            display: "grid",
            placeItems: "center",
            color: tone === "live" ? "var(--up)" : "var(--dim)",
            background: tone === "live" ? "var(--up-soft)" : "var(--surface-3)",
            border: `1px solid ${tone === "live" ? "var(--up)" : "var(--line-2)"}`,
            flex: "0 0 auto",
          }}
        >
          <DatabaseIcon />
        </div>
        <div style={{ minWidth: 0 }}>
          <div style={{ fontSize: 14.5, fontWeight: 600 }}>{name}</div>
          <div className="wc-num" style={{ marginTop: 3, fontSize: 11.5, color: "var(--faint)" }}>
            {detail}
          </div>
        </div>
      </div>
      <StatusPill tone={tone} dot={dot} pulse={pulse}>
        {status}
      </StatusPill>
    </div>
  );
}

function sourceHealth({
  configured,
  hasRecords,
  stale,
  active,
  readyLabel = "ready",
}: {
  configured?: boolean;
  hasRecords?: boolean;
  stale?: boolean;
  active?: boolean;
  readyLabel?: string;
}) {
  if (!configured) return { status: "off", tone: "warn" as PillTone };
  if (stale) return { status: "stale", tone: "busy" as PillTone };
  if (active) return { status: "online", tone: "live" as PillTone, dot: true, pulse: true };
  if (hasRecords === false) return { status: "empty", tone: "busy" as PillTone };
  return { status: readyLabel, tone: "neutral" as PillTone };
}

function MetricTile({
  label,
  value,
  tone = "neutral",
}: {
  label: string;
  value: string | number;
  tone?: PillTone;
}) {
  const colors = statusColors(tone);
  return (
    <div
      style={{
        minWidth: 0,
        padding: "12px 13px",
        borderRadius: 13,
        border: "1px solid var(--line)",
        background: "var(--surface-2)",
      }}
    >
      <div className="wc-eyebrow" style={{ fontSize: 9.5, letterSpacing: "0.13em" }}>
        {label}
      </div>
      <div className="wc-num" style={{ marginTop: 8, fontSize: 22, fontWeight: 850, color: colors.color }}>
        {value}
      </div>
    </div>
  );
}

function ControlButton({
  icon,
  label,
  sub,
  primary,
  busy,
  onClick,
}: {
  icon: ReactNode;
  label: string;
  sub: string;
  primary?: boolean;
  busy?: boolean;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={busy}
      className="wc-admin-control-tile"
      style={{
        width: "100%",
        display: "flex",
        alignItems: "center",
        gap: 12,
        minHeight: 0,
        padding: "13px 15px",
        borderRadius: 13,
        border: `1px solid ${primary ? "var(--lime-line)" : "var(--line-2)"}`,
        background: primary ? "var(--lime-soft)" : "var(--surface-2)",
        color: "var(--text)",
        cursor: busy ? "default" : "pointer",
        opacity: busy ? 0.7 : 1,
        fontFamily: "inherit",
        textAlign: "left",
      }}
    >
      <span
        style={{
          width: 34,
          height: 34,
          borderRadius: 9,
          display: "grid",
          placeItems: "center",
          color: primary ? "var(--on-lime)" : "var(--dim)",
          background: primary ? "var(--lime)" : "var(--surface-3)",
          flex: "0 0 auto",
        }}
      >
        {busy ? <span className="wc-dc-spin" style={{ width: 15, height: 15 }} /> : icon}
      </span>
      <span style={{ minWidth: 0 }}>
        <span className="wc-admin-control-label">
          {busy ? "Working..." : label}
        </span>
        <span className="wc-num wc-admin-control-sub">
          {sub}
        </span>
      </span>
    </button>
  );
}

function ControlPanel({
  busy,
  message,
  runAction,
  style,
}: {
  busy: AdminAction | null;
  message: string | null;
  runAction: (action: AdminAction) => void;
  style?: CSSProperties;
}) {
  return (
    <section style={{ marginTop: 24, ...style }}>
      <SectionLabel style={{ marginBottom: 14 }}>Manual controls</SectionLabel>
      <div className="wc-admin-control-grid">
        <ControlButton
          icon={<RefreshIcon />}
          label="Sync live scores"
          sub="from API-Football"
          busy={busy === "live"}
          onClick={() => runAction("live")}
        />
        <ControlButton
          icon={<ResultsIcon />}
          label="Sync results"
          sub="finalize finished matches"
          busy={busy === "results"}
          onClick={() => runAction("results")}
        />
        <ControlButton
          icon={<TrendIcon />}
          label="Recompute points"
          sub="rebuild standings"
          primary
          busy={busy === "recompute"}
          onClick={() => runAction("recompute")}
        />
        <ControlButton
          icon={<BackupIcon />}
          label="Backup picks"
          sub="snapshot all entries"
          busy={busy === "backup"}
          onClick={() => runAction("backup")}
        />
      </div>
      <div style={{ display: "flex", justifyContent: "flex-end", marginTop: 12 }}>
        <Link
          href="/admin/results"
          className="wc-nav-link"
          style={{ color: "var(--lime-ink)", fontWeight: 800 }}
        >
          Match results editor →
        </Link>
      </div>
      {message && (
        <div
          style={{
            marginTop: 10,
            fontSize: 12.5,
            color: message.toLowerCase().includes("failed") || message.toLowerCase().includes("unauthorized") ? "var(--down)" : "var(--lime-ink)",
            lineHeight: 1.45,
          }}
        >
          {message}
        </div>
      )}
    </section>
  );
}

function StatusStrip({
  busy,
  allGood,
  liveActive,
  lastSyncAt,
  standingsCurrent,
}: {
  busy: boolean;
  allGood: boolean;
  liveActive: boolean;
  lastSyncAt: Date | null;
  standingsCurrent: boolean;
}) {
  const statusLabel = liveActive ? "All systems live" : "All systems ready";
  return (
    <div style={{ display: "flex", gap: 8, flexWrap: "wrap", marginBottom: 18 }}>
      {busy ? (
        <StatusPill tone="busy" dot pulse>Syncing data</StatusPill>
      ) : (
        <StatusPill tone={allGood ? "live" : "busy"} dot pulse={allGood}>
          {allGood ? statusLabel : "Review signals"}
        </StatusPill>
      )}
      <StatusPill>Last sync {timeAgo(lastSyncAt)}</StatusPill>
      <StatusPill tone={standingsCurrent ? "neutral" : "warn"}>
        {standingsCurrent ? "Standings current" : "Standings stale"}
      </StatusPill>
    </div>
  );
}

function matchStatus(fixture: FixtureWithId, live?: LiveStateWithId, result?: ResultWithId) {
  if (result?.manualOverride) return { label: "manual", tone: "busy" as PillTone };
  if (live?.status === "live") return {
    label: live.minute != null ? `${live.minute}${live.extra ? `+${live.extra}` : ""}' live` : "live",
    tone: "live" as PillTone,
  };
  if (live?.status === "paused") return { label: live.statusShort ?? "paused", tone: "busy" as PillTone };
  if (result || fixture.status === "finished" || live?.status === "finished") {
    return { label: result ? "result synced" : "needs result", tone: result ? "neutral" as PillTone : "warn" as PillTone };
  }
  return { label: localKickoffLabel(fixture.kickoffAt), tone: "neutral" as PillTone };
}

function liveMarkerLabel(fixture: FixtureWithId, live?: LiveStateWithId) {
  if (typeof live?.minute === "number") {
    return `${live.minute}${typeof live.extra === "number" && live.extra > 0 ? `+${live.extra}` : ""}'`;
  }
  const kickoff = Date.parse(fixture.kickoffAt);
  if (!Number.isNaN(kickoff)) {
    const elapsed = Math.max(1, Math.floor((Date.now() - kickoff) / 60_000) + 1);
    if (elapsed > 0 && elapsed < 130) return `${elapsed}'`;
  }
  return live?.statusShort ?? live?.statusLong ?? "LIVE";
}

function MatchSyncRow({
  fixture,
  live,
  result,
  onSyncLive,
  busy,
  fallbackUpdatedAt,
}: {
  fixture: FixtureWithId;
  live?: LiveStateWithId;
  result?: ResultWithId;
  onSyncLive: () => void;
  busy: boolean;
  fallbackUpdatedAt: Date | null;
}) {
  const a = fixture.aName || fixture.a || "TBD";
  const b = fixture.bName || fixture.b || "TBD";
  const sa = live?.sa ?? result?.sa;
  const sb = live?.sb ?? result?.sb;
  const status = matchStatus(fixture, live, result);
  const updatedAt = timestampDate(live?.updatedAt ?? fixture.lastSyncedAt ?? result?.enteredAt) ?? fallbackUpdatedAt;
  const scoreText = sa != null && sb != null ? `${sa} – ${sb}` : "vs";
  const aLabel = fixture.a || a;
  const bLabel = fixture.b || b;
  return (
    <div
      style={{
        display: "flex",
        alignItems: "center",
        gap: 16,
        padding: "15px 18px",
        borderTop: "1px solid var(--line)",
      }}
    >
      <div style={{ display: "flex", alignItems: "center", gap: 8, flex: "0 0 auto" }}>
        <TeamEntityLink code={fixture.a} stopPropagation={false}>
          <span className="wc-flag alive" style={{ width: 28, height: 28, fontSize: 17 }}>
            {teamFlag(fixture.a || fixture.aName)}
          </span>
        </TeamEntityLink>
        <TeamEntityLink code={fixture.b} stopPropagation={false}>
          <span className="wc-flag alive" style={{ width: 28, height: 28, fontSize: 17 }}>
            {teamFlag(fixture.b || fixture.bName)}
          </span>
        </TeamEntityLink>
      </div>
      <div style={{ minWidth: 0, flex: 1 }}>
        <div style={{ display: "flex", alignItems: "baseline", gap: 8, minWidth: 0, flexWrap: "wrap" }}>
          <TeamEntityLink code={fixture.a} stopPropagation={false} style={{ fontSize: 16, fontWeight: 850 }}>
            {aLabel}
          </TeamEntityLink>
          <span className="wc-num" style={{ fontSize: 17, fontWeight: 800, color: "var(--text)" }}>
            {scoreText}
          </span>
          <TeamEntityLink code={fixture.b} stopPropagation={false} style={{ fontSize: 16, fontWeight: 850 }}>
            {bLabel}
          </TeamEntityLink>
        </div>
        <div style={{ display: "flex", alignItems: "center", gap: 11, marginTop: 8, flexWrap: "wrap" }}>
          {status.tone === "live" ? (
            <LiveMarker
              fixture
              order="live-first"
              label={liveMarkerLabel(fixture, live)}
              minute={live?.minute}
              extra={live?.extra}
              statusShort={live?.statusShort}
              statusLong={live?.statusLong}
            />
          ) : (
            <StatusPill tone={status.tone}>{status.label}</StatusPill>
          )}
          <span className="wc-num" style={{ fontSize: 11.5, lineHeight: 1.25, color: "var(--faint)" }}>
            updated<br />{timeAgo(updatedAt)}
          </span>
        </div>
      </div>
      <div style={{ display: "flex", gap: 8, flex: "0 0 auto" }}>
        <button
          type="button"
          onClick={onSyncLive}
          disabled={busy}
          className="wc-btn wc-btn-ghost"
          style={{ width: "auto", padding: "9px 14px", borderRadius: 999, fontSize: 13 }}
        >
          {busy ? "Syncing" : "Re-sync"}
        </button>
        <Link
          href={`/fixtures/${encodeURIComponent(fixture.id)}`}
          className="wc-btn wc-btn-dark"
          style={{ width: "auto", padding: "9px 16px", borderRadius: 14, fontSize: 13, textDecoration: "none" }}
        >
          View
        </Link>
      </div>
    </div>
  );
}

function DatabaseIcon() {
  return (
    <svg viewBox="0 0 20 20" width="16" height="16" aria-hidden="true" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
      <ellipse cx="10" cy="5" rx="6.5" ry="2.6" />
      <path d="M3.5 5v5c0 1.4 2.9 2.6 6.5 2.6s6.5-1.2 6.5-2.6V5" />
      <path d="M3.5 10v5c0 1.4 2.9 2.6 6.5 2.6s6.5-1.2 6.5-2.6v-5" />
    </svg>
  );
}

function RefreshIcon() {
  return (
    <svg viewBox="0 0 20 20" width="17" height="17" aria-hidden="true" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round">
      <path d="M3 10a7 7 0 0 1 12-5" />
      <path d="M17 10a7 7 0 0 1-12 5" />
      <path d="M15 3v3h-3" />
      <path d="M5 17v-3h3" />
    </svg>
  );
}

function ResultsIcon() {
  return (
    <svg viewBox="0 0 20 20" width="17" height="17" aria-hidden="true" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round">
      <path d="M4 4h12v12H4z" />
      <path d="M7 8h6" />
      <path d="M7 11h6" />
    </svg>
  );
}

function TrendIcon() {
  return (
    <svg viewBox="0 0 20 20" width="17" height="17" aria-hidden="true" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round">
      <path d="M3 14l4-4 3 3 6-7" />
      <path d="M14 3h3v3" />
    </svg>
  );
}

function BackupIcon() {
  return (
    <svg viewBox="0 0 20 20" width="17" height="17" aria-hidden="true" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round">
      <path d="M10 3v9" />
      <path d="m6.5 8.5 3.5 3.5 3.5-3.5" />
      <path d="M4 14v2h12v-2" />
    </svg>
  );
}

export function AdminControlScreen() {
  const { ready, isAdmin } = useAuth();
  const router = useRouter();
  const { fixtures, liveState } = useFixtures();
  const { results } = useResults();
  const { players, computedAt } = useStandings();
  const { status: syncStatus } = useSyncStatus();
  const [busy, setBusy] = useState<AdminAction | null>(null);
  const [message, setMessage] = useState<string | null>(null);
  const [pendingAction, setPendingAction] = useState<AdminAction | null>(null);
  const [adminPassword, setAdminPassword] = useState("");
  const [passwordError, setPasswordError] = useState<string | null>(null);
  const [checkingPassword, setCheckingPassword] = useState(false);

  useEffect(() => {
    if (ready && !isAdmin) router.replace("/");
  }, [ready, isAdmin, router]);

  const liveByFixture = useMemo(() => new Map(liveState.map((live) => [live.fixtureId, live])), [liveState]);
  const resultByFixture = useMemo(() => new Map(results.map((result) => [result.id, result])), [results]);
  const todayMatches = useMemo(() => fixtures
    .filter((fixture) => sameLocalDay(fixture.kickoffAt) || liveByFixture.get(fixture.id)?.status === "live")
    .sort((a, b) => Date.parse(a.kickoffAt) - Date.parse(b.kickoffAt)), [fixtures, liveByFixture]);

  const lastSyncAt = timestampDate(syncStatus?.syncedAt);
  const lastFixtureSyncAt = timestampDate(syncStatus?.fixtureSyncedAt ?? syncStatus?.syncedAt);
  const computedDate = timestampDate(computedAt);
  const latestResultAt = results.reduce<Date | null>((latest, result) => {
    const entered = timestampDate(result.enteredAt);
    if (!entered) return latest;
    return !latest || entered > latest ? entered : latest;
  }, null);

  const livePollSeconds = syncStatus?.livePollSeconds ?? 30;
  const livePollMs = Math.max(livePollSeconds * 3 * 1000, 5 * 60_000);
  const hasActiveLiveState = liveState.some((live) => live.status === "live" || live.status === "paused");
  const hasLivePollingWindow = hasActiveLiveState || fixtures.some((fixture) => fixtureInLivePollingWindow(fixture));
  const liveSyncAgeMs = lastSyncAt ? Date.now() - lastSyncAt.getTime() : Number.POSITIVE_INFINITY;
  const liveStale = Boolean(syncStatus?.providerConfigured?.apiFootball && hasLivePollingWindow && liveSyncAgeMs > livePollMs);
  const liveConfigured = Boolean(syncStatus?.providerConfigured?.apiFootball);
  const footballDataConfigured = Boolean(syncStatus?.providerConfigured?.footballData);
  const openfootballConfigured = Boolean(syncStatus?.providerConfigured?.openfootball);
  const fixtureCount = syncStatus?.fixtureCount ?? fixtures.length;
  const hasFixtureData = fixtureCount > 0;
  const fixturesStale = Boolean(lastFixtureSyncAt && Date.now() - lastFixtureSyncAt.getTime() > 26 * 60 * 60_000);
  const standingsStale = Boolean(latestResultAt && (!computedDate || computedDate < latestResultAt));
  const missingResults = fixtures.filter((fixture) => {
    if (resultByFixture.has(fixture.id)) return false;
    if (fixture.status === "finished") return true;
    const kickoff = Date.parse(fixture.kickoffAt);
    return !Number.isNaN(kickoff) && Date.now() > kickoff + 130 * 60_000;
  }).length;
  const warnings = syncStatus?.warnings ?? [];
  const allGood = liveConfigured && hasFixtureData && !liveStale && !fixturesStale && !standingsStale && missingResults === 0;
  const liveLayerHealth = sourceHealth({
    configured: liveConfigured,
    hasRecords: undefined,
    stale: liveStale,
    active: liveConfigured && !liveStale,
    readyLabel: "ready",
  });

  const runAction = useCallback(async (action: AdminAction) => {
    setBusy(action);
    setMessage(null);
    try {
      const headers = await authHeaders();
      const target =
        action === "live" ? "/api/admin/sync-results?mode=live" :
        action === "results" ? "/api/admin/sync-results?mode=live" :
        action === "recompute" ? "/api/admin/recompute" :
        "/api/admin/backup-picks";
      const res = await fetch(target, { method: "POST", headers });
      const data = await res.json().catch(() => null);
      if (!res.ok) throw new Error(data?.error ?? "Action failed.");
      const label =
        action === "live" ? "Live sync complete." :
        action === "results" ? "Result sync complete." :
        action === "recompute" ? "Standings recomputed." :
        data?.storagePath ? `Picks backup saved to ${data.storagePath}.` : "Picks backup saved.";
      setMessage(label);
    } catch (error) {
      setMessage((error as Error).message);
    } finally {
      setBusy(null);
    }
  }, []);

  const confirmAction = useCallback(async () => {
    if (!pendingAction || !auth.currentUser?.email) return;
    if (!adminPassword) {
      setPasswordError("Enter your admin password.");
      return;
    }
    setCheckingPassword(true);
    setPasswordError(null);
    try {
      const credential = EmailAuthProvider.credential(auth.currentUser.email, adminPassword);
      await reauthenticateWithCredential(auth.currentUser, credential);
      await auth.currentUser.getIdToken(true);
      const action = pendingAction;
      setPendingAction(null);
      setAdminPassword("");
      await runAction(action);
    } catch (error) {
      const code = (error as { code?: string }).code;
      setPasswordError(
        code === "auth/invalid-credential" || code === "auth/wrong-password"
          ? "Incorrect admin password."
          : (error as Error).message,
      );
    } finally {
      setCheckingPassword(false);
    }
  }, [adminPassword, pendingAction, runAction]);

  if (ready && !isAdmin) return null;

  return (
    <div style={{ maxWidth: 1240, margin: "0 auto", padding: "24px 28px 56px" }}>
      <PageHead
        title="Data control pane"
        sub="Live feeds, sources, and the points engine — at a glance."
        right={(
          <div style={{ display: "flex", gap: 12, flexWrap: "wrap", justifyContent: "flex-end" }}>
            <Link href="/admin/setup" className="wc-nav-link" style={{ color: "var(--dim)", fontWeight: 700 }}>Pool setup</Link>
            <Link href="/admin/results" className="wc-nav-link" style={{ color: "var(--lime-ink)", fontWeight: 800 }}>Match results →</Link>
          </div>
        )}
      />

      <StatusStrip
        busy={Boolean(busy)}
        allGood={allGood}
        liveActive={liveLayerHealth.status === "online"}
        lastSyncAt={lastSyncAt}
        standingsCurrent={!standingsStale}
      />

      <div
        style={{
          display: "grid",
          gridTemplateColumns: "minmax(0, 1fr) 380px",
          gap: 24,
          alignItems: "start",
        }}
        className="wc-admin-control-layout"
      >
        <div style={{ display: "flex", flexDirection: "column", gap: 40, minWidth: 0 }}>
          <div>
            <SectionLabel style={{ marginBottom: 14 }}>Data sources</SectionLabel>
            <DataCard>
              <SourceRow
                name="football-data"
                detail={`fixture sync: ${timeAgo(lastFixtureSyncAt)}`}
                status={footballDataConfigured ? (!hasFixtureData ? "empty" : fixturesStale ? "stale" : "online") : "off"}
                tone={footballDataConfigured ? (!hasFixtureData || fixturesStale ? "busy" : "live") : "warn"}
                dot={footballDataConfigured && hasFixtureData}
                pulse={footballDataConfigured && hasFixtureData && !fixturesStale}
              />
              <SourceRow
                name="API-Football / live"
                detail={`score sync: ${timeAgo(lastSyncAt)}`}
                {...liveLayerHealth}
              />
              <SourceRow
                name="openfootball fallback"
                detail="static schedule fallback"
                status={openfootballConfigured ? "available" : "off"}
                tone={openfootballConfigured ? "neutral" : "warn"}
                dot={openfootballConfigured}
                last
              />
            </DataCard>
          </div>

          <div>
            <SectionLabel style={{ marginBottom: 14 }}>Points engine</SectionLabel>
            <DataCard
              title=""
              right={(
                <StatusPill tone={standingsStale ? "warn" : "live"} dot={!standingsStale}>
                  {standingsStale ? "stale" : "current"}
                </StatusPill>
              )}
            >
              <div style={{ display: "grid", gridTemplateColumns: "repeat(3, minmax(0, 1fr))", gap: 10, padding: "4px 18px 18px" }}>
                <MetricTile label="players" value={players.length} tone="neutral" />
                <MetricTile label="missing" value={missingResults} tone={missingResults ? "warn" : "live"} />
                <MetricTile label="warnings" value={warnings.length} tone={warnings.length ? "busy" : "neutral"} />
              </div>
              <div style={{ padding: "0 18px 18px", color: "var(--dim)", fontSize: 13, lineHeight: 1.45 }}>
                Last computed <span className="wc-num">{timeAgo(computedDate)}</span>. Result docs:{" "}
                <span className="wc-num">{results.length}</span>.
              </div>
              {warnings.length > 0 && (
                <div style={{ borderTop: "1px solid var(--line)", padding: "13px 18px 16px" }}>
                  <div className="wc-eyebrow wc-gold-text">{warnings.length} warnings</div>
                  <div style={{ display: "flex", flexDirection: "column", gap: 7, marginTop: 9 }}>
                    {warnings.slice(0, 4).map((warning, index) => (
                      <div key={`${warning.provider}-${warning.matchId ?? index}`} style={{ fontSize: 12.5, color: "var(--dim)", lineHeight: 1.4 }}>
                        <span className="wc-num wc-gold-text">{warning.provider}</span> {warning.message}
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </DataCard>
          </div>
        </div>

        <ControlPanel busy={busy} message={message} runAction={setPendingAction} style={{ marginTop: 0 }} />
      </div>

      <div style={{ marginTop: 24 }}>
        <DataCard
          title="Today"
          right={<span className="wc-num" style={{ fontSize: 11, color: "var(--faint)" }}>{todayMatches.length} matches</span>}
        >
          {todayMatches.map((fixture) => (
            <MatchSyncRow
              key={fixture.id}
              fixture={fixture}
              live={liveByFixture.get(fixture.id)}
              result={resultByFixture.get(fixture.id)}
              onSyncLive={() => runAction("live")}
              busy={busy === "live"}
              fallbackUpdatedAt={lastSyncAt}
            />
          ))}
          {todayMatches.length === 0 && (
            <div style={{ padding: "14px 18px 18px", color: "var(--dim)", fontSize: 13.5, lineHeight: 1.5 }}>
              No matches are scheduled for today in your local timezone, and no live match is currently reported.
            </div>
          )}
        </DataCard>
      </div>
      {pendingAction && (
        <ConfirmDialog
          title="Confirm admin action"
          body={`${adminActionLabel(pendingAction)} can change live data, standings, or backups. Enter your admin password to continue.`}
          confirmLabel={checkingPassword ? "Checking…" : "Continue"}
          cancelLabel="Cancel"
          tone="gold"
          onConfirm={confirmAction}
          onClose={() => {
            if (checkingPassword) return;
            setPendingAction(null);
            setAdminPassword("");
            setPasswordError(null);
          }}
        >
          <div style={{ marginTop: 14 }}>
            <div className="wc-eyebrow" style={{ marginBottom: 7 }}>Admin password</div>
            <input
              value={adminPassword}
              onChange={(event) => setAdminPassword(event.target.value)}
              type="password"
              autoComplete="current-password"
              autoFocus
              onKeyDown={(event) => {
                if (event.key === "Enter") {
                  event.preventDefault();
                  void confirmAction();
                }
              }}
              style={{
                width: "100%",
                fontFamily: "var(--mono)",
                fontSize: 14,
                fontWeight: 600,
                color: "var(--text)",
                background: "var(--surface-2)",
                border: "1px solid var(--line-2)",
                borderRadius: 10,
                padding: "10px 10px",
                outline: "none",
              }}
            />
            {passwordError && (
              <div style={{ fontSize: 12.5, color: "var(--down)", marginTop: 8 }}>
                {passwordError}
              </div>
            )}
          </div>
        </ConfirmDialog>
      )}
    </div>
  );
}
