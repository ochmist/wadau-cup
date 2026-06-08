"use client";

import { useEffect, useState } from "react";
import { subscribeStandings } from "@/lib/firestore";
import type { StandingsDoc, SerializedPlayer } from "@/lib/types";
import { WADAU } from "@/lib/data";

const FIREBASE_CONFIGURED = !!process.env.NEXT_PUBLIC_FIREBASE_API_KEY;

type UseStandingsResult = {
  players: SerializedPlayer[];
  scaleMax: number;
  round: string;
  computedAt: StandingsDoc["computedAt"] | null;
  loading: boolean;
};

// Mock players shaped as SerializedPlayer for fallback
function mockStandings(): UseStandingsResult {
  const players = WADAU.players.map((p) => ({
    uid: p.short,
    name: p.name,
    short: p.short,
    phone: "",
    paid: p.paid,
    hasDrafted: true,
    finalGoals: p.finalGoals,
    picks: null,
    points: p.points,
    ceiling: p.ceiling,
    rank: p.rank,
    prevRank: p.prevRank,
    mover: p.mover,
    payout: p.payout,
    aliveCount: p.aliveCount,
    teams: p.teams,
    me: p.me,
  })) as SerializedPlayer[];
  return { players, scaleMax: WADAU.scaleMax, round: WADAU.round, computedAt: null, loading: false };
}

export function useStandings(currentUid?: string, enabled = true): UseStandingsResult {
  const [data, setData] = useState<StandingsDoc | null>(null);
  const [loading, setLoading] = useState(FIREBASE_CONFIGURED);

  useEffect(() => {
    if (!FIREBASE_CONFIGURED) return;
    if (!enabled) {
      setData(null);
      setLoading(false);
      return;
    }
    setLoading(true);
    const unsub = subscribeStandings(
      (snap) => {
        setData(snap);
        setLoading(false);
      },
      () => {
        setLoading(false);
      },
    );
    return unsub;
  }, [enabled]);

  if (!FIREBASE_CONFIGURED) {
    return mockStandings();
  }

  if (loading) {
    return { players: [], scaleMax: 100, round: "—", computedAt: null, loading: true };
  }

  const players = (data?.players ?? []).map((p) => ({
    ...p,
    me: p.uid === currentUid,
  }));

  return { players, scaleMax: data?.scaleMax ?? 100, round: data?.round ?? "—", computedAt: data?.computedAt ?? null, loading: false };
}
