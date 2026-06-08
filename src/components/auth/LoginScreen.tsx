"use client";

import Link from "next/link";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { Crest, ThemeToggle } from "@/components/ds";
import { Btn, CountryCodeSelect, Field, inputStyle } from "@/components/ui";
import { useAuth } from "@/lib/auth";

export function LoginScreen() {
  const router = useRouter();
  const { login } = useAuth();
  const [cc, setCc] = useState("+254");
  const [phone, setPhone] = useState("");
  const [pw, setPw] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const onLogin = async () => {
    setError(null);
    setLoading(true);
    try {
      await login(cc, phone, pw);
      // Navigate to "/" — AppGuard there reads the updated auth state
      // and routes to the correct next step (reset-password / draft / leaderboard).
      router.push("/");
    } catch (e: unknown) {
      const code = (e as { code?: string })?.code;
      if (code === "auth/invalid-credential" || code === "auth/wrong-password" || code === "auth/user-not-found") {
        setError("Incorrect phone number or password.");
      } else if (code === "auth/too-many-requests") {
        setError("Too many attempts. Try again later.");
      } else {
        setError("Login failed. Check your details and try again.");
      }
      setLoading(false);
    }
  };

  const canSubmit = phone.length >= 6 && pw.length >= 1 && !loading;

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
            <div className="wc-eyebrow" style={{ marginTop: 3 }}>World Cup 2026 · Private pool</div>
          </div>
        </div>
        <div style={{ fontSize: 26, fontWeight: 800, letterSpacing: "-0.02em", marginTop: 30 }}>Welcome back</div>
        <div style={{ fontSize: 14, color: "var(--dim)", marginTop: 7 }}>Log in to your pool.</div>
        <div style={{ display: "flex", flexDirection: "column", gap: 18, marginTop: 26 }}>
          <Field label="Phone number">
            <div style={{ display: "flex", alignItems: "center", background: "var(--surface-2)", border: "1px solid var(--line-2)", borderRadius: 12, overflow: "hidden" }}>
              <CountryCodeSelect value={cc} onChange={setCc} />
              <input
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                placeholder="712 345 678"
                inputMode="tel"
                autoComplete="tel"
                style={{ ...inputStyle, border: "none", background: "transparent", borderRadius: 0 }}
              />
            </div>
          </Field>
          <Field label="Password">
            <input
              type="password"
              value={pw}
              onChange={(e) => setPw(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && canSubmit && onLogin()}
              placeholder="••••••••"
              autoComplete="current-password"
              style={inputStyle}
            />
          </Field>
          {error && (
            <div style={{ fontSize: 12.5, color: "var(--down)", padding: "8px 12px", borderRadius: 9, background: "var(--down-soft)" }}>
              {error}
            </div>
          )}
          <Btn onClick={onLogin} disabled={!canSubmit}>
            {loading ? "Logging in…" : "Log in"}
          </Btn>
        </div>
        <div style={{ marginTop: 20, fontSize: 12.5, color: "var(--faint)", textAlign: "center" }}>
          Accounts are issued by your pool admin.
        </div>
        <div style={{ marginTop: 10, fontSize: 12.5, textAlign: "center" }}>
          <Link href="/landing" style={{ color: "var(--lime-ink)", fontWeight: 600, textDecoration: "none" }}>
            New here? Request to join
          </Link>
        </div>
      </div>
    </div>
  );
}
