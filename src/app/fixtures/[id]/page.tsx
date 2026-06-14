import { AppGuard } from "@/components/AppGuard";
import { FixtureDetailScreen } from "@/components/fixtures/FixtureDetailScreen";

export default async function FixtureDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  return (
    <AppGuard>
      <FixtureDetailScreen fixtureId={decodeURIComponent(id)} />
    </AppGuard>
  );
}
