import { PageShell } from "@/components/PageShell";
import { PlayerScreen } from "@/components/player/screens";

// Screen 8 — Player Detail (wadau-webscreens → PlayerBody).
export default async function PlayerPage({
  params,
}: {
  params: Promise<{ name: string }>;
}) {
  const { name } = await params;
  return (
    <PageShell>
      <PlayerScreen name={decodeURIComponent(name)} />
    </PageShell>
  );
}
