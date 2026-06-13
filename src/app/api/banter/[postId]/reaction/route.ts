import { NextRequest, NextResponse } from "next/server";
import { FieldValue } from "firebase-admin/firestore";
import { adminAuth, adminDb } from "@/lib/firebase-admin";
import { POOL_ID } from "@/lib/config";
import { isBanterReactionKey, type BanterReactionKey } from "@/lib/banter";

type ReactionMap = Partial<Record<BanterReactionKey, string[]>>;

function authToken(req: NextRequest) {
  return req.headers.get("Authorization")?.replace(/^Bearer\s+/i, "");
}

export async function POST(
  req: NextRequest,
  context: { params: Promise<{ postId: string }> },
) {
  if (!adminAuth || !adminDb) {
    return NextResponse.json({ error: "Admin SDK not configured" }, { status: 503 });
  }

  const token = authToken(req);
  if (!token) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  try {
    const [{ postId }, body, decoded] = await Promise.all([
      context.params,
      req.json() as Promise<{ reaction?: unknown }>,
      adminAuth.verifyIdToken(token),
    ]);
    if (!decoded.isAdmin && decoded.poolId !== POOL_ID) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }
    if (!isBanterReactionKey(body.reaction)) {
      return NextResponse.json({ error: "Unknown reaction" }, { status: 400 });
    }

    const playerSnap = await adminDb.doc(`pools/${POOL_ID}/players/${decoded.uid}`).get();
    if (!playerSnap.exists) {
      return NextResponse.json({ error: "Join the pool before reacting." }, { status: 403 });
    }

    const postRef = adminDb.doc(`pools/${POOL_ID}/banter/${postId}`);
    const reaction = body.reaction;
    await adminDb.runTransaction(async (tx) => {
      const snap = await tx.get(postRef);
      if (!snap.exists) throw new Error("Post not found");

      const reactions = ((snap.get("reactions") ?? {}) as ReactionMap);
      const current = Array.isArray(reactions[reaction]) ? reactions[reaction] ?? [] : [];
      const next = current.includes(decoded.uid)
        ? current.filter((uid) => uid !== decoded.uid)
        : [...current, decoded.uid];
      tx.set(postRef, {
        reactions: { ...reactions, [reaction]: next },
        updatedAt: FieldValue.serverTimestamp(),
      }, { merge: true });
    });

    return NextResponse.json({ ok: true });
  } catch (error) {
    const message = (error as Error).message;
    return NextResponse.json({ error: message }, { status: message === "Post not found" ? 404 : 500 });
  }
}
