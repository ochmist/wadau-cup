import { NextRequest, NextResponse } from "next/server";
import { adminAuth, adminDb } from "@/lib/firebase-admin";
import { POOL_ID } from "@/lib/config";
import { recomputeStandings } from "@/lib/server/recompute-standings";

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
    if (uid === decoded.uid) {
      return NextResponse.json({ error: "You cannot delete your own admin account while signed in." }, { status: 400 });
    }

    await adminDb.doc(`pools/${POOL_ID}/players/${uid}`).delete();
    await adminAuth.deleteUser(uid).catch((e: { code?: string }) => {
      if (e.code !== "auth/user-not-found") throw e;
    });
    await recomputeStandings(adminDb).catch(() => null);

    return NextResponse.json({ ok: true });
  } catch (e: unknown) {
    return NextResponse.json({ error: (e as Error).message }, { status: 500 });
  }
}
