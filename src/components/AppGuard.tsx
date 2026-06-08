"use client";

/* Gated flow guard — uses Firebase Auth state from AuthProvider.
   Login → Reset Password → Draft → Leaderboard.
   Renders a splash while auth state is loading to avoid flashes. */

import { useEffect, type ReactNode } from "react";
import { usePathname, useRouter } from "next/navigation";
import { Crest } from "@/components/ds";
import { useAuth } from "@/lib/auth";

const UNDRAFTED_ALLOWED = new Set(["/draft", "/rules"]);

function Splash() {
  return (
    <div style={{ minHeight: "60vh", display: "flex", alignItems: "center", justifyContent: "center" }}>
      <div style={{ opacity: 0.5 }}>
        <Crest size={40} />
      </div>
    </div>
  );
}

export function AppGuard({ children }: { children: ReactNode }) {
  const { ready, user, hasResetPassword, hasDrafted, playerExists, logout } = useAuth();
  const router = useRouter();
  const pathname = usePathname() || "/";

  let destination: string | null = null;
  if (ready) {
    if (!user) destination = "/login";
    else if (playerExists === false) destination = "/landing";
    else if (!hasResetPassword) destination = "/reset-password";
    else if (!hasDrafted && !UNDRAFTED_ALLOWED.has(pathname)) destination = "/draft";
  }

  useEffect(() => {
    if (!destination || destination === pathname) return;
    if (playerExists === false) {
      void logout().finally(() => router.replace(destination));
      return;
    }
    router.replace(destination);
  }, [destination, logout, pathname, playerExists, router]);

  if (!ready || destination) return <Splash />;
  return <>{children}</>;
}
