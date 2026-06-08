import { PageShell } from "@/components/PageShell";
import { Leaderboard } from "@/components/Leaderboard";

// Screen 6 — Leaderboard (HOME). The canonical screen / source of the system.
export default function LeaderboardPage() {
  return (
    <PageShell>
      <Leaderboard />
    </PageShell>
  );
}
