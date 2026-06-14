import { PageShell } from "@/components/PageShell";
import { AdminControlScreen } from "@/components/admin/AdminControlScreen";

// Admin defaults to the live data control pane.
export default function AdminPage() {
  return (
    <PageShell>
      <AdminControlScreen />
    </PageShell>
  );
}
