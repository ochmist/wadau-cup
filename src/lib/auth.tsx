"use client";

/* Firebase Auth context.
   Gated flow: Login → Reset Password (first login) → Draft → Leaderboard.

   Phone → Firebase email:  cc + phone digits → "254712345678@pool.wadau.app"
   Custom claims: { poolId, isAdmin, passwordSet } — set by API routes.
   hasDrafted is read from the Firestore player doc via a real-time listener.
*/

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useState,
  type ReactNode,
} from "react";
import {
  onAuthStateChanged,
  signInWithEmailAndPassword,
  updatePassword,
  signOut,
  connectAuthEmulator,
  type User,
} from "firebase/auth";
import { connectFirestoreEmulator } from "firebase/firestore";
import { auth, db } from "./firebase";
import { subscribePlayer } from "./firestore";
import { phoneToPoolEmail } from "./phone";
import type { WadauClaims } from "./types";

// ── Emulator connection (client-side, before any auth listener) ───────────
// This must happen before onAuthStateChanged is registered.
if (typeof window !== "undefined" && auth && db && process.env.NEXT_PUBLIC_USE_EMULATOR === "true") {
  const a = auth as unknown as Record<string, boolean>;
  if (!a.__emulatorConnected) {
    try {
      connectAuthEmulator(auth, "http://127.0.0.1:9099", { disableWarnings: true });
    } catch { /* already connected */ }
    try {
      connectFirestoreEmulator(db, "127.0.0.1", 8080);
    } catch { /* already connected */ }
    a.__emulatorConnected = true;
  }
}

export function phoneToEmail(cc: string, phone: string): string {
  return phoneToPoolEmail(cc, phone);
}

type AuthState = {
  ready: boolean;
  user: User | null;
  claims: WadauClaims | null;
  hasResetPassword: boolean;
  hasDrafted: boolean;
  isAdmin: boolean;
  playerExists: boolean | null;
  approvalStatus: "pending" | "approved";
};

type AuthActions = {
  login: (cc: string, phone: string, password: string) => Promise<void>;
  resetPassword: (newPassword: string) => Promise<void>;
  markDrafted: () => void;
  logout: () => Promise<void>;
};

const EMPTY: AuthState = {
  ready: false,
  user: null,
  claims: null,
  hasResetPassword: false,
  hasDrafted: false,
  isAdmin: false,
  playerExists: null,
  approvalStatus: "approved",
};

const AuthContext = createContext<(AuthState & AuthActions) | null>(null);

function withTimeout<T>(promise: Promise<T>, ms: number, label: string): Promise<T> {
  let timeoutId: ReturnType<typeof setTimeout>;
  const timeout = new Promise<never>((_, reject) => {
    timeoutId = setTimeout(() => reject(new Error(`${label} timed out`)), ms);
  });
  return Promise.race([promise, timeout]).finally(() => clearTimeout(timeoutId));
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const [state, setState] = useState<AuthState>(EMPTY);

  useEffect(() => {
    if (!auth) {
      setState({
        ...EMPTY,
        ready: true,
        user: { uid: "BR" } as User,
        hasResetPassword: true,
        hasDrafted: true,
        playerExists: true,
      });
      return;
    }
    let playerUnsub: (() => void) | null = null;
    let playerReadyTimeout: ReturnType<typeof setTimeout> | null = null;
    let mounted = true;
    const authReadyTimeout = setTimeout(() => {
      if (!mounted) return;
      setState((prev) => {
        if (prev.ready) return prev;
        const currentUser = auth.currentUser;
        console.error("[AuthProvider] Auth listener did not become ready; continuing with current session");
        return {
          ...prev,
          ready: true,
          user: currentUser ?? prev.user,
          hasResetPassword: currentUser ? true : prev.hasResetPassword,
          playerExists: currentUser ? prev.playerExists : null,
        };
      });
    }, 5_000);

    const authUnsub = onAuthStateChanged(auth, async (user) => {
      // Tear down previous player subscription
      playerUnsub?.();
      playerUnsub = null;
      if (playerReadyTimeout) {
        clearTimeout(playerReadyTimeout);
        playerReadyTimeout = null;
      }

      if (!user) {
        clearTimeout(authReadyTimeout);
        if (mounted) setState({ ...EMPTY, ready: true });
        return;
      }

      // Read custom claims from the ID token
      let claims: Partial<WadauClaims> = {};
      try {
        const tokenResult = await withTimeout(user.getIdTokenResult(), 4_000, "Auth token");
        claims = tokenResult.claims as Partial<WadauClaims>;
      } catch (err) {
        console.error("[AuthProvider] Failed to read token claims", err);
      }

      // Set initial state immediately (don't wait for Firestore)
      if (mounted) {
        clearTimeout(authReadyTimeout);
        const isAdmin = !!claims.isAdmin;
        setState({
          ready: false,
          user,
          claims: claims as WadauClaims,
          hasResetPassword: !!claims.passwordSet,
          hasDrafted: false, // will update from Firestore below
          isAdmin,
          playerExists: null,
          approvalStatus: (claims.approvalStatus as "pending" | "approved" | undefined) ?? "approved",
        });
      }

      // Subscribe to player doc for hasDrafted — fails gracefully
      const currentUid = user.uid;
      playerReadyTimeout = setTimeout(() => {
        if (!mounted || auth.currentUser?.uid !== currentUid) return;
        console.error("[AuthProvider] Player subscription did not become ready; continuing with token state");
        setState((prev) => (prev.user?.uid === currentUid ? { ...prev, ready: true } : prev));
      }, 4_000);
      playerUnsub = subscribePlayer(
        user.uid,
        async (playerDoc) => {
          if (playerReadyTimeout) {
            clearTimeout(playerReadyTimeout);
            playerReadyTimeout = null;
          }
          let refreshedClaims: Partial<WadauClaims> | null = null;
          if (playerDoc?.approvalStatus === "approved" && claims.approvalStatus === "pending") {
            try {
              const tokenResult = await user.getIdTokenResult(true);
              refreshedClaims = tokenResult.claims as Partial<WadauClaims>;
            } catch (err) {
              console.error("[AuthProvider] Failed to refresh approved token claims", err);
            }
          }
          if (mounted) {
            setState((prev) => ({
              ...prev,
              ready: true,
              claims: refreshedClaims ? refreshedClaims as WadauClaims : prev.claims,
              hasResetPassword: playerDoc?.passwordSet ?? (
                refreshedClaims?.passwordSet !== undefined ? !!refreshedClaims.passwordSet : prev.hasResetPassword
              ),
              hasDrafted: !!playerDoc?.hasDrafted,
              playerExists: !!playerDoc,
              approvalStatus: playerDoc?.approvalStatus ?? (refreshedClaims?.approvalStatus as "pending" | "approved" | undefined) ?? prev.approvalStatus,
            }));
          }
        },
        () => {
          if (playerReadyTimeout) {
            clearTimeout(playerReadyTimeout);
            playerReadyTimeout = null;
          }
          // Firestore error — set ready but hasDrafted stays false.
          // AppGuard will send unenrolled users to /draft; if the doc
          // truly exists we'll get it on next listener success.
          if (mounted) setState((prev) => ({ ...prev, ready: true }));
        },
      );
    });

    return () => {
      mounted = false;
      clearTimeout(authReadyTimeout);
      authUnsub();
      playerUnsub?.();
      if (playerReadyTimeout) clearTimeout(playerReadyTimeout);
    };
  }, []);

  const login = useCallback(async (cc: string, phone: string, password: string) => {
    if (!auth) throw new Error("Firebase auth is not configured");
    const email = phoneToEmail(cc, phone);
    await signInWithEmailAndPassword(auth, email, password);
    // onAuthStateChanged handles the state update
  }, []);

  const resetPassword = useCallback(async (newPassword: string) => {
    if (!auth) throw new Error("Firebase auth is not configured");
    if (!auth.currentUser) throw new Error("Not authenticated");
    const email = auth.currentUser.email;
    if (!email) throw new Error("No email on current user");

    // 1. Update the password in Firebase Auth
    await updatePassword(auth.currentUser, newPassword);

    // 2. Re-sign in with the new password so we have a fresh, non-revoked session.
    //    updatePassword revokes the existing refresh token in the Auth emulator,
    //    so getIdToken(true) on the old session returns a token the API rejects.
    await signInWithEmailAndPassword(auth, email, newPassword);

    // 3. Get a fresh token from the new session and call the API to set passwordSet claim.
    await new Promise((r) => setTimeout(r, 300));
    const token = await auth.currentUser.getIdToken(true);
    const res = await fetch("/api/auth/set-password-claim", {
      method: "POST",
      headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
    });
    if (!res.ok) throw new Error("Failed to set password claim");

    // 4. Force-refresh so the new claim is included in the local token cache.
    await new Promise((r) => setTimeout(r, 300));
    await auth.currentUser.getIdToken(true);
    const tokenResult = await auth.currentUser.getIdTokenResult(true);

    const claims = tokenResult.claims as Partial<WadauClaims>;
    setState((prev) => ({
      ...prev,
      hasResetPassword: !!claims.passwordSet,
      claims: claims as WadauClaims,
      approvalStatus: (claims.approvalStatus as "pending" | "approved" | undefined) ?? prev.approvalStatus,
    }));
  }, []);

  const markDrafted = useCallback(() => {
    setState((prev) => ({
      ...prev,
      hasDrafted: true,
    }));
  }, []);

  const logout = useCallback(async () => {
    if (!auth) return;
    await signOut(auth);
    // onAuthStateChanged fires with null → state resets to EMPTY + ready:true
  }, []);

  return (
    <AuthContext.Provider value={{ ...state, login, resetPassword, markDrafted, logout }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used within AuthProvider");
  return ctx;
}
