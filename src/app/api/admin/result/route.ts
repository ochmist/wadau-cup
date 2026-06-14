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

function adminAuditIdentity(decoded: Awaited<ReturnType<typeof verifyAdmin>>) {
  return {
    uid: decoded.uid,
    email: typeof decoded.email === "string" ? decoded.email : null,
    name: typeof decoded.name === "string" ? decoded.name : null,
  };
}

export async function POST(req: NextRequest) {
  if (!adminAuth || !adminDb) {
    return NextResponse.json({ error: "Admin SDK not configured" }, { status: 503 });
  }
  const token = req.headers.get("Authorization")?.replace("Bearer ", "");
  if (!token) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  try {
    const decoded = await verifyAdmin(token);
    const admin = adminAuditIdentity(decoded);
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
    const resultRef = adminDb.doc(`pools/${POOL_ID}/results/${matchId}`);
    const auditRef = adminDb.collection(`pools/${POOL_ID}/adminAudit`).doc();
    const batch = adminDb.batch();
    const auditAt = FieldValue.serverTimestamp();
    batch.set(resultRef, {
      ...result,
      enteredAt: auditAt,
      lastEditedAt: auditAt,
      lastEditedByUid: admin.uid,
      lastEditedByEmail: admin.email,
      lastEditedByName: admin.name,
    });
    batch.set(auditRef, {
      action: "manual-result-set",
      targetType: "result",
      targetId: matchId,
      poolId: POOL_ID,
      adminUid: admin.uid,
      adminEmail: admin.email,
      adminName: admin.name,
      createdAt: auditAt,
      after: {
        round: result.round,
        a: result.a,
        b: result.b,
        sa: result.sa,
        sb: result.sb,
        win: result.win,
        pens: result.pens,
        source: result.source ?? null,
        manualOverride: result.manualOverride ?? false,
      },
    });
    await batch.commit();
    return NextResponse.json({ ok: true });
  } catch (e: unknown) {
    console.error("[admin/result]", e);
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
    const decoded = await verifyAdmin(token);
    const admin = adminAuditIdentity(decoded);
    const { matchId } = (await req.json()) as { matchId: string };
    const resultRef = adminDb.doc(`pools/${POOL_ID}/results/${matchId}`);
    const existing = await resultRef.get();
    const auditRef = adminDb.collection(`pools/${POOL_ID}/adminAudit`).doc();
    const batch = adminDb.batch();
    batch.set(auditRef, {
      action: "manual-result-clear",
      targetType: "result",
      targetId: matchId,
      poolId: POOL_ID,
      adminUid: admin.uid,
      adminEmail: admin.email,
      adminName: admin.name,
      createdAt: FieldValue.serverTimestamp(),
      before: existing.exists ? existing.data() : null,
    });
    batch.delete(resultRef);
    await batch.commit();
    return NextResponse.json({ ok: true });
  } catch (e: unknown) {
    return NextResponse.json({ error: (e as Error).message }, { status: 500 });
  }
}
