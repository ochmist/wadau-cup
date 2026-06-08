// Sets passwordSet:true custom claim after first-login password reset.
import { NextRequest, NextResponse } from "next/server";
import { adminAuth, adminDb } from "@/lib/firebase-admin";
import { POOL_ID } from "@/lib/config";

export async function POST(req: NextRequest) {
  if (!adminAuth || !adminDb) {
    return NextResponse.json({ error: "Admin SDK not configured" }, { status: 503 });
  }
  const token = req.headers.get("Authorization")?.replace("Bearer ", "");
  if (!token) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  try {
    const decoded = await adminAuth.verifyIdToken(token);
    // Only set the three app-specific claims — never spread the full JWT.
    await adminAuth.setCustomUserClaims(decoded.uid, {
      poolId: (decoded.poolId as string | undefined) ?? POOL_ID,
      isAdmin: (decoded.isAdmin as boolean | undefined) ?? false,
      passwordSet: true,
      approvalStatus: (decoded.approvalStatus as "pending" | "approved" | undefined) ?? "approved",
    });
    await adminDb.doc(`pools/${POOL_ID}/players/${decoded.uid}`).set({ passwordSet: true }, { merge: true });
    return NextResponse.json({ ok: true });
  } catch (e: unknown) {
    console.error("[set-password-claim]", e);
    return NextResponse.json({ error: "Failed to set claim" }, { status: 500 });
  }
}
