import { PageShell } from "@/components/PageShell";
import { BanterScreen } from "@/components/banter/BanterScreen";

// Banter — authenticated pool chat backed by Firestore.
export default function BanterPage() {
  return (
    <PageShell>
      <BanterScreen />
    </PageShell>
  );
}
