"use client";

import { useEffect, useState } from "react";
import { subscribeResults, type ResultWithId } from "@/lib/firestore";

const FIREBASE_CONFIGURED = !!process.env.NEXT_PUBLIC_FIREBASE_API_KEY;

export function useResults() {
  const [results, setResults] = useState<ResultWithId[]>([]);
  const [loading, setLoading] = useState(FIREBASE_CONFIGURED);

  useEffect(() => {
    if (!FIREBASE_CONFIGURED) {
      setLoading(false);
      return;
    }
    const unsub = subscribeResults(
      (data) => {
        setResults(data);
        setLoading(false);
      },
      () => setLoading(false),
    );
    return unsub;
  }, []);

  return { results, loading };
}
