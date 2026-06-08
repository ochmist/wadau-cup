"use client";

import { useEffect, useState } from "react";
import { useAuth } from "@/lib/auth";
import type { FixtureWithId, LiveStateWithId } from "@/lib/firestore";
import { TEMP_FIXTURES } from "@/lib/fixtures";

const FIREBASE_CONFIGURED = !!process.env.NEXT_PUBLIC_FIREBASE_API_KEY;

type FixturesState = {
  fixtures: FixtureWithId[];
  liveState: LiveStateWithId[];
  loading: boolean;
};

const fallbackFixtures = TEMP_FIXTURES.map((fixture) => ({
  ...fixture,
  kickoffAt: new Date(`${fixture.date}T${fixture.time}:00Z`).toISOString(),
  venue: null,
  status: "scheduled" as const,
  group: fixture.group ?? null,
  aName: fixture.a ?? "TBD",
  bName: fixture.b ?? "TBD",
  source: "temporary" as const,
  sourceIds: {},
}));

export function useFixtures(): FixturesState {
  const { user } = useAuth();
  const [fixtures, setFixtures] = useState<FixtureWithId[]>(FIREBASE_CONFIGURED ? [] : fallbackFixtures);
  const [liveState, setLiveState] = useState<LiveStateWithId[]>([]);
  const [loading, setLoading] = useState(FIREBASE_CONFIGURED);

  useEffect(() => {
    if (!FIREBASE_CONFIGURED) {
      setFixtures(fallbackFixtures);
      setLiveState([]);
      setLoading(false);
      return;
    }
    if (!user) {
      setFixtures(fallbackFixtures);
      setLiveState([]);
      setLoading(false);
      return;
    }

    let cancelled = false;
    let intervalId: ReturnType<typeof setInterval> | null = null;

    const loadFixtures = async () => {
      try {
        const token = await user.getIdToken();
        const res = await fetch("/api/fixtures", {
          headers: { Authorization: `Bearer ${token}` },
          cache: "no-store",
        });
        if (!res.ok) throw new Error(`Fixture fetch failed: ${res.status}`);
        const data = (await res.json()) as Partial<FixturesState>;
        if (cancelled) return;
        setFixtures(data.fixtures?.length ? data.fixtures : fallbackFixtures);
        setLiveState(data.liveState ?? []);
        setLoading(false);
      } catch (err) {
        console.warn("[useFixtures]", err);
        if (cancelled) return;
        setFixtures(fallbackFixtures);
        setLiveState([]);
        setLoading(false);
      }
    };

    void loadFixtures();
    intervalId = setInterval(loadFixtures, 30_000);

    return () => {
      cancelled = true;
      if (intervalId) clearInterval(intervalId);
    };
  }, [user]);

  return { fixtures, liveState, loading };
}
