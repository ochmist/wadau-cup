"use client";

/* Shared app chrome — desktop top-nav + mobile status/app-bar/bottom-nav.
   Ported from the prototype's per-screen headers (wadau-chrome PageShell /
   the headers inside DesktopLeaderboard & MobileLeaderboard). The browser/phone
   harness frames from the prototype are intentionally NOT ported. */

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useEffect, useMemo, useState, type ReactNode } from "react";
import { Crest, ThemeToggle } from "@/components/ds";
import { AppGuard } from "@/components/AppGuard";
import { LiveMarker } from "@/components/LiveMarker";
import { useAuth } from "@/lib/auth";
import { useMyData } from "@/hooks/useMyData";
import { usePool } from "@/hooks/usePool";
import { useFixtures } from "@/hooks/useFixtures";
import { stageLabel } from "@/lib/fixtures";

function LogoutButton({ compact = false }: { compact?: boolean }) {
  const { logout } = useAuth();
  const router = useRouter();
  const handleLogout = async () => {
    await logout();
    router.replace("/login");
  };
  if (compact) {
    // Mobile: icon-only button in the app bar
    return (
      <button className="wc-icon-btn" onClick={handleLogout} title="Log out" aria-label="Log out">
        <svg width="15" height="15" viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round">
          <path d="M8 17H4a1 1 0 0 1-1-1V4a1 1 0 0 1 1-1h4M13 14l4-4-4-4M17 10H8" />
        </svg>
      </button>
    );
  }
  // Desktop: text link in the top nav
  return (
    <button
      onClick={handleLogout}
      style={{ background: "none", border: "none", cursor: "pointer", fontFamily: "inherit", fontSize: 14, fontWeight: 500, color: "var(--dim)", padding: 0 }}
    >
      Log out
    </button>
  );
}

type NavItem = { label: string; href: string };

// Desktop top-nav targets (order matches the prototype).
const DESKTOP_NAV: NavItem[] = [
  { label: "Leaderboard", href: "/" },
  { label: "Fixtures", href: "/fixtures" },
  { label: "Banter", href: "/banter" },
  { label: "Rules", href: "/rules" },
  { label: "Draft", href: "/draft" },
  { label: "My Picks", href: "/my-picks" },
  { label: "Admin", href: "/admin" },
];

// Mobile bottom-nav (icon path, label, href).
const BOTTOM_NAV: { label: string; href: string; d: string }[] = [
  { label: "Table", href: "/", d: "M3 5h14M3 10h14M3 15h14" },
  { label: "Fixtures", href: "/fixtures", d: "M4 5h12M6 3v4M14 3v4M5 9h3M11 9h4M5 13h3M11 13h4" },
  { label: "Banter", href: "/banter", d: "M3 5a2 2 0 0 1 2-2h10a2 2 0 0 1 2 2v6a2 2 0 0 1-2 2H8l-4 4V5z" },
  { label: "Rules", href: "/rules", d: "M5 3h8l2 2v12H5zM8 8h4M8 11h4M8 14h3" },
  { label: "Draft", href: "/draft", d: "M10 3v14M3 10h14" },
  { label: "Picks", href: "/my-picks", d: "M5 4h10v12l-5-3-5 3z" },
  { label: "Admin", href: "/admin", d: "M10 3l5 2v4c0 3.3-2 6.2-5 8-3-1.8-5-4.7-5-8V5z" },
];

function isActive(pathname: string, href: string) {
  if (href === "/") return pathname === "/";
  return pathname === href || pathname.startsWith(href + "/");
}

function stageStatus(round: string, group?: string | null) {
  if (round === "Group" && group) return group;
  return stageLabel(round);
}

function liveStatusLabel(fixture: { kickoffAt: string }, live?: { minute?: number | null; extra?: number | null; statusShort?: string | null; statusLong?: string | null }) {
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

export function PageShell({ children }: { children: ReactNode }) {
  const pathname = usePathname() || "/";
  const { user, isAdmin, hasDrafted } = useAuth();
  const [banterCount, setBanterCount] = useState(0);
  const { player } = useMyData();
  const { round } = usePool();
  const { fixtures, liveState } = useFixtures();
  const allowedForUndrafted = (item: NavItem | { href: string }) => item.href === "/draft" || item.href === "/rules";
  const desktopNav = (isAdmin ? DESKTOP_NAV : DESKTOP_NAV.filter((item) => item.href !== "/admin"))
    .filter((item) => hasDrafted || allowedForUndrafted(item));
  const mobileNav = (isAdmin ? BOTTOM_NAV : BOTTOM_NAV.filter((item) => item.href !== "/admin"))
    .filter((item) => hasDrafted || allowedForUndrafted(item));
  const fallbackInitials = (user?.displayName ?? "WC")
    .trim()
    .split(/\s+/)
    .map((part) => part[0])
    .join("")
    .slice(0, 2)
    .toUpperCase();
  const avatar = player?.short ?? fallbackInitials;
  const status = useMemo(() => {
    const liveByFixture = new Map(liveState.map((state) => [state.fixtureId, state]));
    const liveFixture = fixtures.find((fixture) => {
      const live = liveByFixture.get(fixture.id);
      return fixture.status === "live" || live?.status === "live" || live?.status === "paused";
    });
    if (liveFixture) {
      return {
        kind: "live" as const,
        label: stageStatus(liveFixture.round, liveFixture.group),
        live: liveByFixture.get(liveFixture.id),
        clock: liveStatusLabel(liveFixture, liveByFixture.get(liveFixture.id)),
        href: `/fixtures/${encodeURIComponent(liveFixture.id)}`,
      };
    }

    const now = Date.now();
    const nextFixture = fixtures
      .filter((fixture) => {
        const kickoff = Date.parse(fixture.kickoffAt);
        return !Number.isNaN(kickoff) && kickoff >= now && fixture.status !== "finished";
      })
      .sort((a, b) => Date.parse(a.kickoffAt) - Date.parse(b.kickoffAt))[0];
    if (nextFixture) return { kind: "text" as const, label: `Next · ${stageStatus(nextFixture.round, nextFixture.group)}` };

    return { kind: "text" as const, label: round ? `Status · ${stageLabel(round)}` : "Status · Fixtures" };
  }, [fixtures, liveState, round]);

  useEffect(() => {
    let cancelled = false;
    async function loadBanterNotifications() {
      if (!user || !hasDrafted) {
        setBanterCount(0);
        return;
      }
      try {
        const token = await user.getIdToken();
        const res = await fetch("/api/banter/notifications", {
          headers: { Authorization: `Bearer ${token}` },
        });
        const data = await res.json();
        if (!cancelled && res.ok) setBanterCount(Number(data.count) || 0);
      } catch {
        if (!cancelled) setBanterCount(0);
      }
    }
    loadBanterNotifications();
    const id = setInterval(loadBanterNotifications, 30_000);
    return () => {
      cancelled = true;
      clearInterval(id);
    };
  }, [hasDrafted, user, pathname]);

  return (
    <div style={{ background: "var(--bg)", minHeight: "100vh" }}>
      {/* ---------- DESKTOP top bar ---------- */}
      <div
        className="wc-desktop-only"
        style={{
          position: "fixed",
          top: 0,
          left: 0,
          right: 0,
          zIndex: 50,
          alignItems: "center",
          justifyContent: "space-between",
          padding: "18px 28px",
          borderBottom: "1px solid var(--line)",
          display: "flex",
          background: "var(--bg)",
          boxSizing: "border-box",
        }}
      >
        <Link
          href="/"
          style={{
            display: "flex",
            alignItems: "center",
            gap: 11,
            textDecoration: "none",
            color: "var(--text)",
          }}
        >
          <Crest size={34} />
          <div>
            <div style={{ fontSize: 18, fontWeight: 800, letterSpacing: "-0.02em", lineHeight: 1 }}>
              Wadau Cup
            </div>
            <div className="wc-eyebrow" style={{ marginTop: 3 }}>
              World Cup 2026
            </div>
          </div>
        </Link>
        <div style={{ display: "flex", gap: 24, alignItems: "center" }}>
          {desktopNav.map((item) => (
            <Link
              key={item.href}
              href={item.href}
              className={"wc-nav-link" + (isActive(pathname, item.href) ? " active" : "")}
            >
              {item.label}
              {item.href === "/banter" && banterCount > 0 && (
                <span className="wc-nav-badge">{banterCount > 9 ? "9+" : banterCount}</span>
              )}
            </Link>
          ))}
        </div>
        <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
          {status.kind === "live" ? (
            <Link href={status.href} style={{ textDecoration: "none", display: "inline-flex" }} title="Open live match">
              <LiveMarker
                compact
                label={status.clock}
                minute={status.live?.minute}
                extra={status.live?.extra}
                statusShort={status.live?.statusShort}
                statusLong={status.live?.statusLong}
              />
            </Link>
          ) : (
            <span className="wc-pill">{status.label}</span>
          )}
          <ThemeToggle />
          <LogoutButton />
          <div className="wc-avatar">{avatar}</div>
        </div>
      </div>

      {/* ---------- MOBILE status + app bar ---------- */}
      <div className="wc-mobile-only" style={{ display: "block", position: "fixed", top: 0, left: 0, right: 0, zIndex: 50, background: "var(--bg)", borderBottom: "1px solid var(--line)" }}>
        {/* app bar */}
        <div style={{ padding: "14px 18px 0" }}>
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
            <Link
              href="/"
              style={{
                display: "flex",
                alignItems: "center",
                gap: 9,
                textDecoration: "none",
                color: "var(--text)",
              }}
            >
              <Crest />
              <div>
                <div style={{ fontSize: 16, fontWeight: 800, letterSpacing: "-0.02em", lineHeight: 1 }}>
                  Wadau Cup
                </div>
                <div className="wc-eyebrow" style={{ marginTop: 3, whiteSpace: "nowrap" }}>
                  World Cup 2026 · Pool
                </div>
              </div>
            </Link>
            <div style={{ display: "flex", alignItems: "center", gap: 6, flex: "none" }}>
              <ThemeToggle />
              <LogoutButton compact />
              <div className="wc-avatar" style={{ width: 30, height: 30, borderRadius: 9 }}>
                {avatar}
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* ---------- page body (gated) ---------- */}
      <div className="wc-desktop-only" style={{ height: 71 }} aria-hidden />
      <div className="wc-mobile-only" style={{ height: 66 }} aria-hidden />
      <AppGuard>{children}</AppGuard>

      {/* ---------- MOBILE bottom nav (fixed) ---------- */}
      <div
        className="wc-mobile-only"
        style={{
          position: "fixed",
          left: 0,
          right: 0,
          bottom: 0,
          boxSizing: "border-box",
          width: "100%",
          maxWidth: "100vw",
          contain: "paint",
          zIndex: 40,
          display: "grid",
          gridTemplateColumns: `repeat(${mobileNav.length}, minmax(0, 1fr))`,
          gap: 2,
          overflow: "hidden",
          borderTop: "1px solid var(--line)",
          background: "var(--surface)",
          padding: "10px 6px 22px",
        }}
      >
        {mobileNav.map((item) => {
          const active = isActive(pathname, item.href);
          return (
            <Link
              key={item.href}
              href={item.href}
              style={{
                position: "relative",
                minWidth: 0,
                display: "flex",
                flexDirection: "column",
                alignItems: "center",
                gap: 5,
                textDecoration: "none",
                color: active ? "var(--text)" : "var(--faint)",
              }}
            >
              <svg
                width="20"
                height="20"
                viewBox="0 0 20 20"
                fill="none"
                stroke="currentColor"
                strokeWidth="1.6"
                strokeLinecap="round"
                strokeLinejoin="round"
              >
                <path d={item.d} />
              </svg>
              <span style={{ fontSize: 10, fontWeight: active ? 600 : 500, letterSpacing: "0.01em", maxWidth: "100%", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                {item.label}
              </span>
              {item.href === "/banter" && banterCount > 0 && (
                <span className="wc-nav-badge mobile">{banterCount > 9 ? "9+" : banterCount}</span>
              )}
            </Link>
          );
        })}
      </div>
      {/* spacer so fixed bottom nav doesn't cover content on mobile */}
      <div className="wc-mobile-only" style={{ height: 78 }} aria-hidden />
    </div>
  );
}
