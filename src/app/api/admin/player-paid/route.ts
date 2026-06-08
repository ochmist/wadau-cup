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
    if (!decoded.isAdmin) return NextResponse.json({ error: "Not admin" }, { status: 403 });

    const { uid, paid } = (await req.json()) as { uid?: string; paid?: boolean };
    if (!uid || typeof paid !== "boolean") {
      return NextResponse.json({ error: "Missing uid or paid" }, { status: 400 });
    }

    await adminDb.doc(`pools/${POOL_ID}/players/${uid}`).set({ paid }, { merge: true });
    return NextResponse.json({ ok: true, uid, paid });
  } catch (e: unknown) {
    return NextResponse.json({ error: (e as Error).message }, { status: 500 });
  }
}
