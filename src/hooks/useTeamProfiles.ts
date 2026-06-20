"use client";

import { useEffect, useState } from "react";
import { subscribeTeamProfiles, type TeamProfileWithId } from "@/lib/firestore";

const FIREBASE_CONFIGURED = !!process.env.NEXT_PUBLIC_FIREBASE_API_KEY;

export function useTeamProfiles() {
  const [teams, setTeams] = useState<TeamProfileWithId[]>([]);
  const [loading, setLoading] = useState(FIREBASE_CONFIGURED);

  useEffect(() => {
    if (!FIREBASE_CONFIGURED) {
      setTeams([]);
      setLoading(false);
      return;
    }
    setLoading(true);
    return subscribeTeamProfiles(
      (data) => {
        setTeams(data);
        setLoading(false);
      },
      () => setLoading(false),
    );
  }, []);

  return { teams, loading };
}

