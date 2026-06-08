"use client";

import { useEffect, useState } from "react";
import { subscribePlayer } from "@/lib/firestore";
import { useAuth } from "@/lib/auth";
import type { PlayerDoc } from "@/lib/types";
import { draftRemainingByTier, me as mockMe, WADAU } from "@/lib/data";
import type { Tier } from "@/lib/data";

const FIREBASE_CONFIGURED = !!process.env.NEXT_PUBLIC_FIREBASE_API_KEY;

export function useMyData(): { player: PlayerDoc | null; loading: boolean } {
  const { user } = useAuth();
  const [player, setPlayer] = useState<PlayerDoc | null>(null);
  const [loading, setLoading] = useState(FIREBASE_CONFIGURED && !!user);

  useEffect(() => {
    if (!FIREBASE_CONFIGURED || !user) {
      setLoading(false);
      return;
    }
    setLoading(true);
    const unsub = subscribePlayer(
      user.uid,
      (doc) => {
        setPlayer(doc);
        setLoading(false);
      },
      () => {
        // Firestore error — fall back gracefully
        setLoading(false);
      },
    );
    return unsub;
  }, [user?.uid]); // eslint-disable-line react-hooks/exhaustive-deps

  if (!FIREBASE_CONFIGURED) {
    // Return mock player shaped as PlayerDoc
    const mock: PlayerDoc = {
      name: mockMe.name,
      short: mockMe.short,
      phone: "+254 712 000 001",
      paid: mockMe.paid,
      approvalStatus: "approved",
      hasDrafted: true,
      finalGoals: mockMe.finalGoals,
      picks: Object.fromEntries(
        mockMe.teams.map((t) => [t.tier, { code: t.code, pts: t.pts, rem: t.rem, alive: t.alive }]),
      ) as PlayerDoc["picks"],
      points: mockMe.points,
      ceiling: mockMe.ceiling,
      rank: mockMe.rank,
      prevRank: mockMe.prevRank,
      mover: mockMe.mover,
      payout: mockMe.payout,
      aliveCount: mockMe.aliveCount,
      joinedAt: null as unknown as import("firebase/firestore").Timestamp,
    };
    return { player: mock, loading: false };
  }

  return { player, loading };
}

// Enrich a PlayerDoc's picks with team name/flag from the team dictionary.
export function enrichPlayerTeams(player: PlayerDoc | null) {
  if (!player?.picks) return [];
  return Object.entries(player.picks).map(([tier, entry]) => {
    const teamInfo = WADAU.T[entry.code];
    return {
      tier: tier as Tier,
      code: entry.code,
      name: teamInfo?.n ?? entry.code,
      flag: teamInfo?.f ?? "🏳",
      pts: entry.pts ?? 0,
      rem: entry.rem || (entry.alive ? draftRemainingByTier[tier as Tier] ?? 0 : 0),
      alive: entry.alive,
    };
  });
}
