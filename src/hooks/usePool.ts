"use client";

import { useEffect, useState } from "react";
import { subscribePool } from "@/lib/firestore";
import type { PoolDoc } from "@/lib/types";
import { WADAU } from "@/lib/data";

const FIREBASE_CONFIGURED = !!process.env.NEXT_PUBLIC_FIREBASE_API_KEY;

export type PoolState = {
  pool: PoolDoc | null;
  buyin: number;
  payoutPct: [number, number, number];
  round: string;
  loading: boolean;
};

export function usePool(): PoolState {
  const [pool, setPool] = useState<PoolDoc | null>(null);
  const [loading, setLoading] = useState(FIREBASE_CONFIGURED);

  useEffect(() => {
    if (!FIREBASE_CONFIGURED) return;
    return subscribePool(
      (doc) => {
        setPool(doc);
        setLoading(false);
      },
      () => setLoading(false),
    );
  }, []);

  return {
    pool,
    buyin: pool?.buyin ?? WADAU.buyin,
    payoutPct: pool?.payoutPct ?? [50, 30, 20],
    round: pool?.round ?? WADAU.round,
    loading,
  };
}
