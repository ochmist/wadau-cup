// Public: create a pending player account and submit a join request.
// POST body: { name, phone, cc, password }
import { NextRequest, NextResponse } from "next/server";
import { adminAuth, adminDb } from "@/lib/firebase-admin";
import { FieldValue } from "firebase-admin/firestore";
import { POOL_ID } from "@/lib/config";
import { canonicalPhone, phoneToPoolEmail } from "@/lib/phone";
import type { PlayerDoc } from "@/lib/types";

function phoneToEmail(cc: string, phone: string) {
  return phoneToPoolEmail(cc, phone);
}

function initials(name: string) {
  const parts = name.trim().split(/\s+/);
  return (parts[0][0] + (parts[1]?.[0] ?? parts[0][1] ?? "")).toUpperCase().slice(0, 2);
}

function cleanName(value: unknown) {
  return typeof value === "string" ? value.replace(/\s+/g, " ").trim() : "";
}

function cleanPhone(value: unknown) {
  return typeof value === "string" ? value.replace(/[^\d+\s]/g, "").replace(/\s+/g, " ").trim() : "";
}

export async function POST(req: NextRequest) {
  if (!adminAuth || !adminDb) {
    return NextResponse.json({ error: "Admin SDK not configured" }, { status: 503 });
  }
  try {
    const body = (await req.json()) as { name?: unknown; phone?: unknown; cc?: unknown; password?: unknown };
    const name = cleanName(body.name);
    const phone = cleanPhone(body.phone);
    const cc = typeof body.cc === "string" ? body.cc.trim() : "+254";
    const password = typeof body.password === "string" ? body.password : "";
    if (!name || !phone || !cc || !password) return NextResponse.json({ error: "Missing fields" }, { status: 400 });
    if (name.length < 2 || name.length > 40) return NextResponse.json({ error: "Use a name between 2 and 40 characters." }, { status: 400 });
    if ((cc + phone).replace(/\D/g, "").length < 10) return NextResponse.json({ error: "Use a valid phone number." }, { status: 400 });
    if (password.length < 8) return NextResponse.json({ error: "Password must be at least 8 characters." }, { status: 400 });

    const email = phoneToEmail(cc, phone);
    const userRecord = await adminAuth.createUser({ email, password, displayName: name });
    await adminAuth.setCustomUserClaims(userRecord.uid, {
      poolId: POOL_ID,
      isAdmin: false,
      passwordSet: true,
      approvalStatus: "pending",
    });

    const playerDoc: Omit<PlayerDoc, "joinedAt"> & { joinedAt: unknown } = {
      name,
      short: initials(name),
      phone: canonicalPhone(cc, phone),
      paid: false,
      approvalStatus: "pending",
      passwordSet: true,
      hasDrafted: false,
      finalGoals: null,
      picks: null,
      points: 0,
      ceiling: 0,
      rank: 0,
      prevRank: 0,
      mover: 0,
      payout: 0,
      aliveCount: 0,
      joinedAt: FieldValue.serverTimestamp(),
    };
    await adminDb.doc(`pools/${POOL_ID}/players/${userRecord.uid}`).set(playerDoc);

    const ref = adminDb.collection("joinRequests").doc();
    await ref.set({
      name,
      phone: canonicalPhone(cc, phone),
      cc,
      poolId: POOL_ID,
      playerUid: userRecord.uid,
      status: "pending",
      requestedAt: FieldValue.serverTimestamp(),
    });
    return NextResponse.json({ ok: true, id: ref.id, uid: userRecord.uid });
  } catch (e: unknown) {
    const err = e as { code?: string; message?: string };
    if (err.code === "auth/email-already-exists") {
      return NextResponse.json({ error: "An account with that phone already exists. Log in instead." }, { status: 409 });
    }
    return NextResponse.json({ error: err.message ?? "Failed to request access" }, { status: 500 });
  }
}
