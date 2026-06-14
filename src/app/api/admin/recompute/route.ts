// Admin: recompute standings from current picks + results, write to Firestore.
import { NextRequest, NextResponse } from "next/server";
import { adminAuth, adminDb } from "@/lib/firebase-admin";
import { AdminAuthError, verifyAdminToken } from "@/lib/server/admin-guard";

import { recomputeStandings } from "@/lib/server/recompute-standings";

export async function POST(req: NextRequest) {
  if (!adminAuth || !adminDb) {
    return NextResponse.json({ error: "Admin SDK not configured" }, { status: 503 });
  }
  try {
    await verifyAdminToken(req, { requireRecent: true });
    const result = await recomputeStandings(adminDb);
    return NextResponse.json({ ok: true, ...result });
  } catch (e: unknown) {
    if (e instanceof AdminAuthError) {
      return NextResponse.json({ error: e.message }, { status: e.status });
    }
    return NextResponse.json({ error: (e as Error).message }, { status: 500 });
  }
}
