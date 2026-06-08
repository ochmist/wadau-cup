"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { Crest, ThemeToggle } from "@/components/ds";
import { Btn, Field, inputStyle } from "@/components/ui";
import { useAuth } from "@/lib/auth";

export function ResetPasswordScreen() {
  const router = useRouter();
  const { user, resetPassword, hasResetPassword, hasDrafted } = useAuth();
  const [pw, setPw] = useState("");
  const [pw2, setPw2] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  // Navigate reactively once the claim is confirmed — avoids a race where
  // router.push fires before the hasResetPassword state update is committed.
  useEffect(() => {
    if (hasResetPassword) {
      router.replace(hasDrafted ? "/" : "/draft");
    }
  }, [hasResetPassword, hasDrafted, router]);

  const ok = pw.length >= 6 && pw === pw2;
  const mismatch = pw2.length > 0 && pw !== pw2;

  const onSave = async () => {
    if (!ok) return;
    setError(null);
    setLoading(true);
    try {
      await resetPassword(pw);
      // Navigation is handled reactively by the useEffect above once
      // hasResetPassword becomes true in the auth context.
    } catch (e: unknown) {
      const code = (e as { code?: string })?.code;
      if (code === "auth/requires-recent-login") {
        setError("Session expired. Please log in again.");
        router.replace("/login");
      } else {
        setError("Failed to set password. Try again.");
      }
      setLoading(false);
    }
  };

  if (!user) {
    router.replace("/login");
    return null;
  }

  return (
    <div style={{ background: "var(--bg)", minHeight: "100vh", display: "flex", alignItems: "center", justifyContent: "center", padding: 24, position: "relative", overflow: "hidden" }}>
      <div style={{ position: "absolute", top: 18, right: 18, zIndex: 2 }}>
        <ThemeToggle />
      </div>
      <div style={{ position: "absolute", top: "-10%", left: "50%", transform: "translateX(-50%)", width: 520, height: 360, borderRadius: "50%", background: "radial-gradient(circle, var(--lime-soft), transparent 70%)", pointerEvents: "none" }} />
      <div className="wc-card wc-auth-card" style={{ width: "100%", maxWidth: 392, position: "relative" }}>
        <div style={{ display: "flex", alignItems: "center", gap: 11 }}>
          <Crest size={34} />
          <div>
            <div style={{ fontSize: 18, fontWeight: 800, letterSpacing: "-0.02em", lineHeight: 1 }}>Wadau Cup</div>
            <div className="wc-eyebrow" style={{ marginTop: 3 }}>Secure your account</div>
          </div>
        </div>
        <div style={{ fontSize: 24, fontWeight: 800, letterSpacing: "-0.02em", marginTop: 26 }}>Set your password</div>
        <div style={{ fontSize: 13.5, color: "var(--dim)", marginTop: 6, lineHeight: 1.5 }}>
          Replace the temporary one from your admin.
        </div>
        <div style={{ display: "flex", flexDirection: "column", gap: 16, marginTop: 22 }}>
          <Field label="New password">
            <input
              type="password"
              value={pw}
              onChange={(e) => setPw(e.target.value)}
              placeholder="At least 6 characters"
              autoComplete="new-password"
              style={inputStyle}
            />
          </Field>
          <Field label="Confirm password">
            <input
              type="password"
              value={pw2}
              onChange={(e) => setPw2(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && ok && onSave()}
              placeholder="Re-enter password"
              autoComplete="new-password"
              style={inputStyle}
            />
          </Field>
          <div style={{ fontSize: 12, color: mismatch ? "var(--down)" : "var(--faint)" }}>
            {mismatch ? "Passwords don't match" : "Use 6+ characters"}
          </div>
          {error && (
            <div style={{ fontSize: 12.5, color: "var(--down)", padding: "8px 12px", borderRadius: 9, background: "var(--down-soft)" }}>
              {error}
            </div>
          )}
          <Btn onClick={onSave} disabled={!ok || loading}>
            {loading ? "Saving…" : "Save & continue"}
          </Btn>
        </div>
        <div style={{ marginTop: 20, fontSize: 12.5, color: "var(--faint)", textAlign: "center" }}>
          Your admin never sees this password.
        </div>
      </div>
    </div>
  );
}
