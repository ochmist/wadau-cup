"use client";

import { useEffect, useState } from "react";
import { subscribeSyncStatus } from "@/lib/firestore";
import type { SyncStatusDoc } from "@/lib/types";

const FIREBASE_CONFIGURED = !!process.env.NEXT_PUBLIC_FIREBASE_API_KEY;

export function useSyncStatus() {
  const [status, setStatus] = useState<SyncStatusDoc | null>(null);
  const [loading, setLoading] = useState(FIREBASE_CONFIGURED);

  useEffect(() => {
    if (!FIREBASE_CONFIGURED) {
      setLoading(false);
      return;
    }
    return subscribeSyncStatus(
      (doc) => {
        setStatus(doc);
        setLoading(false);
      },
      () => setLoading(false),
    );
  }, []);

  return { status, loading };
}

