"use client";

import { useEffect, useState } from "react";
import { WORLD_CUP_FIRST_KICKOFF_ISO } from "@/lib/config";

const DEFAULT_LOCK_AT_MS = Date.parse(WORLD_CUP_FIRST_KICKOFF_ISO);

function pad2(n: number) {
  return String(n).padStart(2, "0");
}

function formatCountdown(days: number, hours: number, minutes: number, seconds: number) {
  if (days > 0) return `${days}d ${hours}h ${pad2(minutes)}m ${pad2(seconds)}s`;
  if (hours > 0) return `${hours}h ${pad2(minutes)}m ${pad2(seconds)}s`;
  return `${minutes}m ${pad2(seconds)}s`;
}

export function useCountdown() {
  const [now, setNow] = useState(0);
  const [lockAtMs, setLockAtMs] = useState(DEFAULT_LOCK_AT_MS);

  useEffect(() => {
    let timeout: ReturnType<typeof setTimeout>;
    const tick = () => {
      setNow(Date.now());
      timeout = setTimeout(tick, 1000 - (Date.now() % 1000));
    };
    tick();
    return () => clearTimeout(timeout);
  }, []);

  useEffect(() => {
    let cancelled = false;
    fetch("/api/pool-lock")
      .then((res) => res.ok ? res.json() : null)
      .then((data: { lockAt?: string } | null) => {
        if (cancelled || !data?.lockAt) return;
        const next = Date.parse(data.lockAt);
        if (!Number.isNaN(next)) setLockAtMs(next);
      })
      .catch(() => null);
    return () => {
      cancelled = true;
    };
  }, []);

  const ready = now > 0;
  const remaining = ready ? Math.max(0, lockAtMs - now) : 0;
  const s = Math.floor(remaining / 1000);
  const dd = Math.floor(s / 86400);
  const hh = Math.floor((s % 86400) / 3600);
  const mm = Math.floor((s % 3600) / 60);
  const ss = s % 60;

  return {
    ready,
    isLocked: ready && remaining <= 0,
    lockAt: new Date(lockAtMs),
    remainingMs: remaining,
    dd,
    hh,
    mm,
    ss,
    label: ready ? formatCountdown(dd, hh, mm, ss) : "—",
  };
}
