import { PageShell } from "@/components/PageShell";
import { AdminSetupScreen } from "@/components/admin/AdminSetupScreen";

// Screen 14 — Admin · Pool Setup & Accounts (wadau-adminsetup → AdminSetupApp).
export default function AdminSetupPage() {
  return (
    <PageShell>
      <AdminSetupScreen />
    </PageShell>
  );
}
