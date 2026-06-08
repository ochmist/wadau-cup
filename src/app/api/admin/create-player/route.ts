// Admin: create a Firebase Auth user + Firestore player doc.
// Body: { name, phone, cc }
// Returns: { uid, tempPassword }
import { NextRequest, NextResponse } from "next/server";
import { randomInt } from "crypto";
import { adminAuth, adminDb } from "@/lib/firebase-admin";
import { FieldValue } from "firebase-admin/firestore";

import { POOL_ID } from "@/lib/config";
import { canonicalPhone, phoneToPoolEmail } from "@/lib/phone";
import type { PlayerDoc } from "@/lib/types";

function phoneToEmail(cc: string, phone: string) {
  return phoneToPoolEmail(cc, phone);
}

function genTempPassword() {
  const chars = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
  return Array.from({ length: 6 }, () => chars[randomInt(chars.length)]).join("");
}

function initials(name: string) {
  const parts = name.trim().split(/\s+/);
  return (parts[0][0] + (parts[1]?.[0] ?? parts[0][1] ?? "")).toUpperCase().slice(0, 2);
}

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
    const { name, phone, cc } = (await req.json()) as { name: string; phone: string; cc: string };
    if (!name || !phone || !cc) return NextResponse.json({ error: "Missing fields" }, { status: 400 });

    const email = phoneToEmail(cc, phone);
    const tempPassword = genTempPassword();

    // Create Firebase Auth user
    const userRecord = await adminAuth.createUser({ email, password: tempPassword, displayName: name });

    // Set custom claims
    await adminAuth.setCustomUserClaims(userRecord.uid, {
      poolId: POOL_ID,
      isAdmin: false,
      passwordSet: false,
      approvalStatus: "approved",
    });

    // Create Firestore player doc
    const playerDoc: Omit<PlayerDoc, "joinedAt"> & { joinedAt: unknown } = {
      name,
      short: initials(name),
      phone: canonicalPhone(cc, phone),
      paid: false,
      approvalStatus: "approved",
      passwordSet: false,
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

    return NextResponse.json({ uid: userRecord.uid, tempPassword });
  } catch (e: unknown) {
    const err = e as { code?: string; message?: string };
    if (err.code === "auth/email-already-exists") {
      return NextResponse.json({ error: "A player with that phone already exists." }, { status: 409 });
    }
    return NextResponse.json({ error: err.message ?? "Failed to create player" }, { status: 500 });
  }
}
