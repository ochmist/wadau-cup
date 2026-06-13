import { NextRequest, NextResponse } from "next/server";
import { FieldValue, Timestamp } from "firebase-admin/firestore";
import { adminAuth, adminDb } from "@/lib/firebase-admin";
import { POOL_ID } from "@/lib/config";
import {
  BANTER_REACTIONS,
  cleanBanterBody,
  initials,
  type BanterFeedView,
  type BanterPostView,
  type BanterReactionKey,
} from "@/lib/banter";
import type { PlayerDoc } from "@/lib/types";

type ReactionMap = Partial<Record<BanterReactionKey, string[]>>;

type BanterPostDoc = {
  uid: string;
  name: string;
  short: string;
  body: string;
  createdAt?: Timestamp;
  updatedAt?: Timestamp;
  reactions?: ReactionMap;
};

function timestampIso(value: unknown) {
  if (value instanceof Timestamp) return value.toDate().toISOString();
  if (value && typeof value === "object" && "toDate" in value && typeof value.toDate === "function") {
    return value.toDate().toISOString();
  }
  return new Date().toISOString();
}

function authToken(req: NextRequest) {
  return req.headers.get("Authorization")?.replace(/^Bearer\s+/i, "");
}

async function requireBanterUser(req: NextRequest) {
  if (!adminAuth || !adminDb) {
    return { error: NextResponse.json({ error: "Admin SDK not configured" }, { status: 503 }) };
  }

  const token = authToken(req);
  if (!token) return { error: NextResponse.json({ error: "Unauthorized" }, { status: 401 }) };

  const decoded = await adminAuth.verifyIdToken(token);
  if (!decoded.isAdmin && decoded.poolId !== POOL_ID) {
    return { error: NextResponse.json({ error: "Forbidden" }, { status: 403 }) };
  }

  const playerSnap = await adminDb.doc(`pools/${POOL_ID}/players/${decoded.uid}`).get();
  if (!playerSnap.exists) {
    return { error: NextResponse.json({ error: "Join the pool before posting banter." }, { status: 403 }) };
  }

  const player = playerSnap.data() as PlayerDoc;
  return {
    uid: decoded.uid,
    isAdmin: !!decoded.isAdmin,
    player,
  };
}

function serializePost(doc: FirebaseFirestore.QueryDocumentSnapshot, uid: string, isAdmin: boolean): BanterPostView {
  const data = doc.data() as BanterPostDoc;
  const reactions = BANTER_REACTIONS.map((reaction) => {
    const voters = Array.isArray(data.reactions?.[reaction.key]) ? data.reactions[reaction.key] ?? [] : [];
    return {
      ...reaction,
      count: voters.length,
      mine: voters.includes(uid),
    };
  });
  return {
    id: doc.id,
    uid: data.uid,
    name: data.name,
    short: data.short,
    body: data.body,
    createdAt: timestampIso(data.createdAt),
    updatedAt: data.updatedAt ? timestampIso(data.updatedAt) : null,
    reactions,
    reactionTotal: reactions.reduce((sum, reaction) => sum + reaction.count, 0),
    isMine: data.uid === uid,
    canDelete: isAdmin || data.uid === uid,
  };
}

export async function GET(req: NextRequest) {
  try {
    const session = await requireBanterUser(req);
    if ("error" in session) return session.error;

    const [postsSnap, playersSnap] = await Promise.all([
      adminDb!
        .collection(`pools/${POOL_ID}/banter`)
        .orderBy("createdAt", "desc")
        .limit(80)
        .get(),
      adminDb!.collection(`pools/${POOL_ID}/players`).get(),
    ]);

    const posts = postsSnap.docs
      .map((doc) => serializePost(doc, session.uid, session.isAdmin))
      .reverse();

    const body: BanterFeedView = {
      posts,
      memberCount: playersSnap.size,
      me: {
        uid: session.uid,
        name: session.player.name,
        short: session.player.short || initials(session.player.name),
        isAdmin: session.isAdmin,
      },
    };
    return NextResponse.json(body);
  } catch (error) {
    return NextResponse.json({ error: (error as Error).message }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const session = await requireBanterUser(req);
    if ("error" in session) return session.error;

    const body = cleanBanterBody((await req.json())?.body);
    if (!body) return NextResponse.json({ error: "Write something first." }, { status: 400 });
    if (body.length > 280) return NextResponse.json({ error: "Keep banter under 280 characters." }, { status: 400 });

    const rateRef = adminDb!.doc(`pools/${POOL_ID}/banterMeta/rate-${session.uid}`);
    const rateSnap = await rateRef.get();
    const lastPostAt = rateSnap.get("lastPostAt");
    const lastPostMs = lastPostAt instanceof Timestamp ? lastPostAt.toMillis() : 0;
    if (lastPostMs && Date.now() - lastPostMs < 4_000) {
      return NextResponse.json({ error: "Give it a few seconds before posting again." }, { status: 429 });
    }

    const postRef = adminDb!.collection(`pools/${POOL_ID}/banter`).doc();
    const post: BanterPostDoc = {
      uid: session.uid,
      name: session.player.name,
      short: session.player.short || initials(session.player.name),
      body,
      reactions: {},
    };

    const batch = adminDb!.batch();
    batch.set(postRef, {
      ...post,
      createdAt: FieldValue.serverTimestamp(),
      updatedAt: FieldValue.serverTimestamp(),
    });
    batch.set(rateRef, { lastPostAt: FieldValue.serverTimestamp() }, { merge: true });
    await batch.commit();

    const saved = await postRef.get();
    return NextResponse.json({ post: serializePost(saved as FirebaseFirestore.QueryDocumentSnapshot, session.uid, session.isAdmin) });
  } catch (error) {
    return NextResponse.json({ error: (error as Error).message }, { status: 500 });
  }
}
