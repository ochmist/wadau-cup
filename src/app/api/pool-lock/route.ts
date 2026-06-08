import { NextResponse } from "next/server";
import { adminDb } from "@/lib/firebase-admin";
import { POOL_ID, WORLD_CUP_FIRST_KICKOFF_ISO } from "@/lib/config";

export async function GET() {
  if (!adminDb) {
    return NextResponse.json({ lockAt: WORLD_CUP_FIRST_KICKOFF_ISO });
  }

  const snap = await adminDb.doc(`pools/${POOL_ID}`).get();
  const lockAt = snap.get("lockAt");
  return NextResponse.json({
    lockAt: lockAt?.toDate ? lockAt.toDate().toISOString() : WORLD_CUP_FIRST_KICKOFF_ISO,
  });
}
