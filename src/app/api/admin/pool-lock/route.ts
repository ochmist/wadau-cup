import { NextRequest, NextResponse } from "next/server";
import { Timestamp } from "firebase-admin/firestore";
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

    const { lockAt } = (await req.json()) as { lockAt?: string };
    if (!lockAt) return NextResponse.json({ error: "Missing lockAt" }, { status: 400 });

    const date = new Date(lockAt);
    if (Number.isNaN(date.getTime())) return NextResponse.json({ error: "Invalid lockAt" }, { status: 400 });

    await adminDb.doc(`pools/${POOL_ID}`).set({ lockAt: Timestamp.fromDate(date) }, { merge: true });
    return NextResponse.json({ ok: true, lockAt: date.toISOString() });
  } catch (e: unknown) {
    return NextResponse.json({ error: (e as Error).message }, { status: 500 });
  }
}
