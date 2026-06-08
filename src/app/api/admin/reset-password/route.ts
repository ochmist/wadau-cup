import { NextRequest, NextResponse } from "next/server";
import { randomInt } from "crypto";
import { adminAuth, adminDb } from "@/lib/firebase-admin";
import { POOL_ID } from "@/lib/config";

function genTempPassword() {
  const chars = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
  return Array.from({ length: 6 }, () => chars[randomInt(chars.length)]).join("");
}

export async function POST(req: NextRequest) {
  if (!adminAuth || !adminDb) {
    return NextResponse.json({ error: "Admin SDK not configured" }, { status: 503 });
  }

  const token = req.headers.get("Authorization")?.replace("Bearer ", "");
  if (!token) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  try {
    const decoded = await adminAuth.verifyIdToken(token);
    if (!decoded.isAdmin) return NextResponse.json({ error: "Not admin" }, { status: 403 });

    const { uid } = (await req.json()) as { uid?: string };
    if (!uid) return NextResponse.json({ error: "Missing uid" }, { status: 400 });

    const user = await adminAuth.getUser(uid);
    const claims = user.customClaims ?? {};
    const tempPassword = genTempPassword();

    await adminAuth.updateUser(uid, { password: tempPassword });
    await adminAuth.setCustomUserClaims(uid, {
      poolId: (claims.poolId as string | undefined) ?? POOL_ID,
      isAdmin: !!claims.isAdmin,
      passwordSet: false,
      approvalStatus: (claims.approvalStatus as "pending" | "approved" | undefined) ?? "approved",
    });
    await adminDb.doc(`pools/${POOL_ID}/players/${uid}`).set({ passwordSet: false }, { merge: true });

    return NextResponse.json({ ok: true, tempPassword });
  } catch (e: unknown) {
    return NextResponse.json({ error: (e as Error).message }, { status: 500 });
  }
}
