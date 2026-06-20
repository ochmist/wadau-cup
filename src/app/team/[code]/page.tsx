import { PageShell } from "@/components/PageShell";
import { TeamScreen } from "@/components/team/TeamScreen";

export default async function TeamPage({
  params,
}: {
  params: Promise<{ code: string }>;
}) {
  const { code } = await params;
  return (
    <PageShell>
      <TeamScreen code={decodeURIComponent(code)} />
    </PageShell>
  );
}

