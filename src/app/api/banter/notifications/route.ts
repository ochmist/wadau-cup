import { NextRequest, NextResponse } from "next/server";
import { Timestamp } from "firebase-admin/firestore";
import { adminAuth, adminDb } from "@/lib/firebase-admin";
import { POOL_ID } from "@/lib/config";

function authToken(req: NextRequest) {
  return req.headers.get("Authorization")?.replace(/^Bearer\s+/i, "");
}

function timestampMs(value: unknown) {
  if (value instanceof Timestamp) return value.toMillis();
  if (value && typeof value === "object" && "toMillis" in value && typeof value.toMillis === "function") {
    return value.toMillis();
  }
  if (value && typeof value === "object" && "toDate" in value && typeof value.toDate === "function") {
    return value.toDate().getTime();
  }
  return 0;
}

export async function GET(req: NextRequest) {
  if (!adminAuth || !adminDb) {
    return NextResponse.json({ error: "Admin SDK not configured" }, { status: 503 });
  }

  const token = authToken(req);
  if (!token) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  try {
    const decoded = await adminAuth.verifyIdToken(token);
    if (!decoded.isAdmin && decoded.poolId !== POOL_ID) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const [playerSnap, seenSnap, recentPostsSnap] = await Promise.all([
      adminDb.doc(`pools/${POOL_ID}/players/${decoded.uid}`).get(),
      adminDb.doc(`pools/${POOL_ID}/banterMeta/seen-${decoded.uid}`).get(),
      adminDb.collection(`pools/${POOL_ID}/banter`).orderBy("createdAt", "desc").limit(80).get(),
    ]);
    if (!playerSnap.exists) {
      return NextResponse.json({ count: 0 });
    }

    const lastSeenMs = timestampMs(seenSnap.get("lastSeenAt"));
    let count = recentPostsSnap.docs.filter((post) => (
      post.get("uid") !== decoded.uid && timestampMs(post.get("createdAt")) > lastSeenMs
    )).length;
    await Promise.all(recentPostsSnap.docs.map(async (post) => {
      const mentions = post.get("mentions");
      if (
        post.get("uid") !== decoded.uid &&
        Array.isArray(mentions) &&
        mentions.includes(decoded.uid) &&
        timestampMs(post.get("createdAt")) > lastSeenMs
      ) {
        count += 1;
      }
      const repliesSnap = await post.ref.collection("replies").orderBy("createdAt", "desc").limit(20).get();
      const userParticipated =
        post.get("uid") === decoded.uid ||
        (Array.isArray(mentions) && mentions.includes(decoded.uid)) ||
        repliesSnap.docs.some((reply) => reply.get("uid") === decoded.uid && timestampMs(reply.get("createdAt")) <= lastSeenMs);
      count += repliesSnap.docs.filter((reply) => {
        const replyMentions = reply.get("mentions");
        const isNew = reply.get("uid") !== decoded.uid && timestampMs(reply.get("createdAt")) > lastSeenMs;
        return isNew && (userParticipated || (Array.isArray(replyMentions) && replyMentions.includes(decoded.uid)));
      }).length;
    }));

    const eventThreadsSnap = await adminDb.collection(`pools/${POOL_ID}/banterEventReplies`).limit(80).get();
    await Promise.all(eventThreadsSnap.docs.map(async (thread) => {
      const repliesSnap = await thread.ref.collection("replies").orderBy("createdAt", "desc").limit(20).get();
      const userParticipated = repliesSnap.docs.some((reply) => reply.get("uid") === decoded.uid && timestampMs(reply.get("createdAt")) <= lastSeenMs);
      count += repliesSnap.docs.filter((reply) => {
        const mentions = reply.get("mentions");
        const isNew = reply.get("uid") !== decoded.uid && timestampMs(reply.get("createdAt")) > lastSeenMs;
        return isNew && (userParticipated || (Array.isArray(mentions) && mentions.includes(decoded.uid)));
      }).length;
    }));

    return NextResponse.json({ count });
  } catch (error) {
    return NextResponse.json({ error: (error as Error).message }, { status: 500 });
  }
}
