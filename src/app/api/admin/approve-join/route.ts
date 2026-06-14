// Admin: approve or decline a join request.
// POST body: { requestId, action: "approve" | "decline" }
import { NextRequest, NextResponse } from "next/server";
import { randomInt } from "crypto";
import { adminAuth, adminDb } from "@/lib/firebase-admin";
import { FieldValue } from "firebase-admin/firestore";
import { POOL_ID } from "@/lib/config";
import { recomputeStandings } from "@/lib/server/recompute-standings";
import { canonicalPhone, phoneToPoolEmail } from "@/lib/phone";
import type { JoinRequestDoc, PlayerDoc } from "@/lib/types";

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

function playerDocFromRequest(request: JoinRequestDoc, passwordSet?: boolean): Omit<PlayerDoc, "joinedAt" | "passwordSet"> & { passwordSet?: boolean; joinedAt: unknown } {
  const doc: Omit<PlayerDoc, "joinedAt" | "passwordSet"> & { passwordSet?: boolean; joinedAt: unknown } = {
    name: request.name,
    short: initials(request.name),
    phone: canonicalPhone(request.cc, request.phone),
    isAdmin: false,
    paid: false,
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
  if (typeof passwordSet === "boolean") doc.passwordSet = passwordSet;
  return doc;
}

export async function POST(req: NextRequest) {
  if (!adminAuth || !adminDb) {
    return NextResponse.json({ error: "Admin SDK not configured" }, { status: 503 });
  }
  const token = req.headers.get("Authorization")?.replace("Bearer ", "");
  if (!token) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  try {
    const decoded = await adminAuth.verifyIdToken(token);
    if (!decoded.isAdmin) return NextResponse.json({ error: "Not admin" }, { status: 403 });

    const { requestId, action } = (await req.json()) as { requestId: string; action: "approve" | "decline" };
    const requestRef = adminDb.doc(`joinRequests/${requestId}`);
    const requestSnap = await requestRef.get();
    if (!requestSnap.exists) {
      return NextResponse.json({ error: "Join request not found" }, { status: 404 });
    }

    const request = requestSnap.data() as JoinRequestDoc;
    if (request.poolId !== POOL_ID) {
      return NextResponse.json({ error: "Join request belongs to another pool" }, { status: 400 });
    }

    if (action === "decline") {
      if (request.playerUid) {
        await adminDb.doc(`pools/${POOL_ID}/players/${request.playerUid}`).delete().catch(() => null);
        await adminAuth.deleteUser(request.playerUid).catch((e: { code?: string }) => {
          if (e.code !== "auth/user-not-found") throw e;
        });
      }
      await requestRef.update({ status: "declined", decidedAt: FieldValue.serverTimestamp() });
      await recomputeStandings(adminDb).catch(() => null);
      return NextResponse.json({ ok: true, action });
    }

    if (request.playerUid) {
      const user = await adminAuth.getUser(request.playerUid);
      const existingClaims = user.customClaims ?? {};
      await adminAuth.setCustomUserClaims(request.playerUid, {
        poolId: POOL_ID,
        isAdmin: !!existingClaims.isAdmin,
        passwordSet: true,
        approvalStatus: "approved",
      });
      await adminDb.doc(`pools/${POOL_ID}/players/${request.playerUid}`).set(
        {
          approvalStatus: "approved",
          updatedAt: FieldValue.serverTimestamp(),
        },
        { merge: true },
      );
      await requestRef.update({
        status: "approved",
        decidedAt: FieldValue.serverTimestamp(),
        playerUid: request.playerUid,
      });
      await recomputeStandings(adminDb).catch(() => null);
      return NextResponse.json({
        ok: true,
        action,
        uid: request.playerUid,
        accountExisted: true,
        tempPassword: null,
      });
    }

    const email = phoneToEmail(request.cc, request.phone);
    const tempPassword = genTempPassword();
    let accountExisted = false;
    let userRecord;
    try {
      userRecord = await adminAuth.createUser({
        email,
        password: tempPassword,
        displayName: request.name,
      });
    } catch (e: unknown) {
      const err = e as { code?: string };
      if (err.code !== "auth/email-already-exists") throw e;
      userRecord = await adminAuth.getUserByEmail(email);
      accountExisted = true;
    }

    const existingClaims = userRecord.customClaims ?? {};
    await adminAuth.setCustomUserClaims(userRecord.uid, {
      poolId: POOL_ID,
      isAdmin: accountExisted ? !!existingClaims.isAdmin : false,
      passwordSet: accountExisted ? !!existingClaims.passwordSet : false,
      approvalStatus: "approved",
    });

    await adminDb.doc(`pools/${POOL_ID}/players/${userRecord.uid}`).set(
      { ...playerDocFromRequest(request, accountExisted ? undefined : false), approvalStatus: "approved" },
      { merge: true },
    );
    await requestRef.update({
      status: "approved",
      decidedAt: FieldValue.serverTimestamp(),
      playerUid: userRecord.uid,
    });
    await recomputeStandings(adminDb).catch(() => null);

    return NextResponse.json({
      ok: true,
      action,
      uid: userRecord.uid,
      accountExisted,
      tempPassword: accountExisted ? null : tempPassword,
    });
  } catch (e: unknown) {
    const err = e as { code?: string; message?: string };
    return NextResponse.json({ error: err.message ?? "Failed to update join request" }, { status: 500 });
  }
}
