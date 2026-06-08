import { PageShell } from "@/components/PageShell";
import { AdminSetupScreen } from "@/components/admin/AdminSetupScreen";

// Admin defaults to Pool Setup & Accounts.
export default function AdminPage() {
  return (
    <PageShell>
      <AdminSetupScreen />
    </PageShell>
  );
}
