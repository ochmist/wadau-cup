// Admin: enter or clear a match result.
// POST body: { matchId, round, a, b, win, sa, sb, pens?, note, pts, held }
// DELETE body: { matchId }
import { NextRequest, NextResponse } from "next/server";
import { adminAuth, adminDb } from "@/lib/firebase-admin";
import { FieldValue } from "firebase-admin/firestore";

import { POOL_ID } from "@/lib/config";
import { buildResultDoc } from "@/lib/server/result-doc";
import type { PlayerDoc } from "@/lib/types";

async function verifyAdmin(token: string) {
  if (!adminAuth) throw new Error("Admin SDK not configured");
  const decoded = await adminAuth.verifyIdToken(token);
  if (!decoded.isAdmin) throw new Error("Not admin");
  return decoded;
}

export async function POST(req: NextRequest) {
  if (!adminAuth || !adminDb) {
    return NextResponse.json({ error: "Admin SDK not configured" }, { status: 503 });
  }
  const token = req.headers.get("Authorization")?.replace("Bearer ", "");
  if (!token) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  try {
    await verifyAdmin(token);
    const body = await req.json();
    const { matchId, ...rest } = body as { matchId: string; [k: string]: unknown };
    const playersSnap = await adminDb.collection(`pools/${POOL_ID}/players`).get();
    const players = playersSnap.docs.map((doc) => doc.data() as PlayerDoc);
    const result = buildResultDoc({
      id: matchId,
      round: String(rest.round ?? "Round of 16"),
      a: String(rest.a),
      b: String(rest.b),
      sa: typeof rest.sa === "number" ? rest.sa : null,
      sb: typeof rest.sb === "number" ? rest.sb : null,
      win: typeof rest.win === "string" ? rest.win : null,
      pens: typeof rest.pens === "string" ? rest.pens : null,
      note: typeof rest.note === "string" ? rest.note : "",
      players,
      source: "manual",
      manualOverride: true,
    });
    await adminDb.doc(`pools/${POOL_ID}/results/${matchId}`).set({
      ...result,
      enteredAt: FieldValue.serverTimestamp(),
    });
    return NextResponse.json({ ok: true });
  } catch (e: unknown) {
    return NextResponse.json({ error: (e as Error).message }, { status: 500 });
  }
}

export async function DELETE(req: NextRequest) {
  if (!adminAuth || !adminDb) {
    return NextResponse.json({ error: "Admin SDK not configured" }, { status: 503 });
  }
  const token = req.headers.get("Authorization")?.replace("Bearer ", "");
  if (!token) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  try {
    await verifyAdmin(token);
    const { matchId } = (await req.json()) as { matchId: string };
    await adminDb.doc(`pools/${POOL_ID}/results/${matchId}`).delete();
    return NextResponse.json({ ok: true });
  } catch (e: unknown) {
    return NextResponse.json({ error: (e as Error).message }, { status: 500 });
  }
}
