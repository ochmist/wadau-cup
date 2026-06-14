import { NextRequest, NextResponse } from "next/server";
import { FieldValue } from "firebase-admin/firestore";
import { adminAuth, adminDb } from "@/lib/firebase-admin";
import { POOL_ID } from "@/lib/config";
import { AdminAuthError, verifyAdminToken } from "@/lib/server/admin-guard";
import type { PlayerDoc } from "@/lib/types";

export async function POST(req: NextRequest) {
  if (!adminAuth || !adminDb) {
    return NextResponse.json({ error: "Admin SDK not configured" }, { status: 503 });
  }

  try {
    const actor = await verifyAdminToken(req, { requireRecent: true });
    const { uid, isAdmin } = (await req.json()) as { uid?: string; isAdmin?: boolean };
    if (!uid || typeof isAdmin !== "boolean") {
      return NextResponse.json({ error: "Missing uid or admin state." }, { status: 400 });
    }
    if (uid === actor.uid && !isAdmin) {
      return NextResponse.json({ error: "You cannot demote your own signed-in admin account." }, { status: 400 });
    }

    const playerRef = adminDb.doc(`pools/${POOL_ID}/players/${uid}`);
    const [user, playerSnap] = await Promise.all([
      adminAuth.getUser(uid),
      playerRef.get(),
    ]);
    if (!playerSnap.exists) {
      return NextResponse.json({ error: "Player not found." }, { status: 404 });
    }
    const player = playerSnap.data() as PlayerDoc;
    const claims = user.customClaims ?? {};
    await adminAuth.setCustomUserClaims(uid, {
      poolId: POOL_ID,
      isAdmin,
      passwordSet: claims.passwordSet ?? player.passwordSet ?? true,
      approvalStatus: claims.approvalStatus ?? player.approvalStatus ?? "approved",
    });

    const batch = adminDb.batch();
    batch.set(playerRef, { isAdmin, updatedAt: FieldValue.serverTimestamp() }, { merge: true });
    batch.set(
      adminDb.doc(`pools/${POOL_ID}`),
      {
        adminUids: isAdmin ? FieldValue.arrayUnion(uid) : FieldValue.arrayRemove(uid),
      },
      { merge: true },
    );
    batch.set(adminDb.collection(`pools/${POOL_ID}/adminAudit`).doc(), {
      action: isAdmin ? "admin-promote" : "admin-demote",
      targetType: "player",
      targetId: uid,
      poolId: POOL_ID,
      adminUid: actor.uid,
      adminEmail: actor.email ?? null,
      adminName: actor.name ?? null,
      createdAt: FieldValue.serverTimestamp(),
      after: { isAdmin },
    });
    await batch.commit();

    return NextResponse.json({ ok: true, uid, isAdmin });
  } catch (error) {
    if (error instanceof AdminAuthError) {
      return NextResponse.json({ error: error.message }, { status: error.status });
    }
    return NextResponse.json({ error: (error as Error).message }, { status: 500 });
  }
}
