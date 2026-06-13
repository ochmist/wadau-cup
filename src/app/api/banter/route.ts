import { NextRequest, NextResponse } from "next/server";
import { FieldValue, Timestamp } from "firebase-admin/firestore";
import { adminAuth, adminDb } from "@/lib/firebase-admin";
import { POOL_ID } from "@/lib/config";
import {
  banterReactionMeta,
  cleanBanterBody,
  initials,
  type BanterEventView,
  type BanterFeedItem,
  type BanterFeedView,
  type BanterMessageView,
  type BanterReactionKey,
  type BanterReplyView,
} from "@/lib/banter";
import { T } from "@/lib/data";
import type { FixtureDoc, PlayerDoc, ResultDoc } from "@/lib/types";

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

type BanterReplyDoc = BanterPostDoc;

function timestampIso(value: unknown, fallback = new Date()) {
  if (value instanceof Timestamp) return value.toDate().toISOString();
  if (value && typeof value === "object" && "toDate" in value && typeof value.toDate === "function") {
    return value.toDate().toISOString();
  }
  if (typeof value === "string" && !Number.isNaN(Date.parse(value))) return new Date(value).toISOString();
  return fallback.toISOString();
}

function timestampMs(value: unknown) {
  if (value instanceof Timestamp) return value.toMillis();
  if (value && typeof value === "object" && "toMillis" in value && typeof value.toMillis === "function") {
    return value.toMillis();
  }
  if (value && typeof value === "object" && "toDate" in value && typeof value.toDate === "function") {
    return value.toDate().getTime();
  }
  if (typeof value === "string") {
    const ms = Date.parse(value);
    return Number.isNaN(ms) ? 0 : ms;
  }
  return 0;
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

function serializeReactions(reactions: ReactionMap | undefined, uid: string) {
  return Object.entries(reactions ?? {})
    .map(([key, voters]) => {
    const voterList = Array.isArray(voters) ? voters : [];
    const meta = banterReactionMeta(key);
    return {
      ...meta,
      count: voterList.length,
      mine: voterList.includes(uid),
    };
  }).filter((reaction) => reaction.count > 0)
    .sort((a, b) => b.count - a.count || a.label.localeCompare(b.label));
}

function reactionTotal(reactions: ReturnType<typeof serializeReactions>) {
  return reactions.reduce((sum, reaction) => sum + reaction.count, 0);
}

function docData<T>(snap: FirebaseFirestore.DocumentSnapshot) {
  return snap.data() as T;
}

function serializeReply(doc: FirebaseFirestore.QueryDocumentSnapshot, uid: string): BanterReplyView {
  const data = docData<BanterReplyDoc>(doc);
  const reactions = serializeReactions(data.reactions, uid);
  return {
    id: doc.id,
    uid: data.uid,
    name: data.name,
    short: data.short,
    body: data.body,
    createdAt: timestampIso(data.createdAt),
    reactions,
    reactionTotal: reactionTotal(reactions),
    isMine: data.uid === uid,
  };
}

async function serializePost(
  doc: FirebaseFirestore.QueryDocumentSnapshot,
  uid: string,
  isAdmin: boolean,
  lastSeenMs: number,
): Promise<BanterMessageView> {
  const data = docData<BanterPostDoc>(doc);
  const reactions = serializeReactions(data.reactions, uid);
  const repliesSnap = await doc.ref.collection("replies").orderBy("createdAt", "asc").limit(40).get();
  const replies = repliesSnap.docs.map((reply) => serializeReply(reply, uid));
  const unreadReplyCount = data.uid === uid
    ? repliesSnap.docs.filter((reply) => reply.get("uid") !== uid && timestampMs(reply.get("createdAt")) > lastSeenMs).length
    : 0;
  return {
    type: "message",
    id: doc.id,
    uid: data.uid,
    name: data.name,
    short: data.short,
    body: data.body,
    createdAt: timestampIso(data.createdAt),
    updatedAt: data.updatedAt ? timestampIso(data.updatedAt) : null,
    reactions,
    reactionTotal: reactionTotal(reactions),
    replies,
    replyCount: replies.length,
    unreadReplyCount,
    isMine: data.uid === uid,
    canDelete: isAdmin || data.uid === uid,
  };
}

function teamName(code: string | null | undefined, fallback?: string | null) {
  if (code && T[code]) return T[code].n;
  return fallback || "TBD";
}

function teamFlag(code: string | null | undefined) {
  return code && T[code] ? T[code].f : "";
}

function safeId(value: string) {
  return value.replace(/[^A-Za-z0-9_-]/g, "_").slice(0, 120);
}

function resultEvent(result: ResultDoc, fixture?: FixtureDoc): Omit<BanterEventView, "reactions" | "reactionTotal"> {
  const aName = teamName(result.a, fixture?.aName);
  const bName = teamName(result.b, fixture?.bName);
  const aFlag = teamFlag(result.a);
  const bFlag = teamFlag(result.b);
  const score = result.sa == null || result.sb == null ? `${aName} vs ${bName}` : `${aFlag} ${aName} ${result.sa}-${result.sb} ${bName} ${bFlag}`.trim();
  const points = (result.pts ?? [])
    .filter((row) => row.points > 0)
    .map((row) => `${teamName(row.code)} +${row.points}`)
    .join(" · ");
  const fallbackDate = fixture?.kickoffAt ? new Date(fixture.kickoffAt) : new Date();
  return {
    type: "event",
    id: safeId(`result-${result.id}`),
    icon: result.win === "draw" ? "🤝" : "🏁",
    accent: "gold",
    title: score,
    sub: points || result.round,
    occurredAt: timestampIso(result.enteredAt, fallbackDate),
  };
}

function topLevelFixtureEvent(fixture: FixtureDoc): Omit<BanterEventView, "reactions" | "reactionTotal"> | null {
  if (fixture.status !== "live" && fixture.status !== "finished") return null;
  const a = teamName(fixture.a, fixture.aName);
  const b = teamName(fixture.b, fixture.bName);
  const aFlag = teamFlag(fixture.a);
  const bFlag = teamFlag(fixture.b);
  const score = fixture.status === "finished" ? "FT" : "Live";
  return {
    type: "event",
    id: safeId(`fixture-state-${fixture.id}-${fixture.status}`),
    icon: fixture.status === "finished" ? "🏁" : "🟢",
    accent: fixture.status === "finished" ? "gold" : "lime",
    title: `${score} · ${aFlag} ${a} vs ${b} ${bFlag}`.trim(),
    sub: `${fixture.round}${fixture.group ? ` · Group ${fixture.group}` : ""}`,
    occurredAt: timestampIso(fixture.lastSyncedAt, fixture.kickoffAt ? new Date(fixture.kickoffAt) : new Date()),
  };
}

function hydrateEventReactions(
  event: Omit<BanterEventView, "reactions" | "reactionTotal">,
  reactionDocs: Map<string, ReactionMap>,
  uid: string,
): BanterEventView {
  const reactions = serializeReactions(reactionDocs.get(event.id), uid);
  return {
    ...event,
    reactions,
    reactionTotal: reactionTotal(reactions),
  };
}

export async function GET(req: NextRequest) {
  try {
    const session = await requireBanterUser(req);
    if ("error" in session) return session.error;

    const userMetaRef = adminDb!.doc(`pools/${POOL_ID}/banterMeta/seen-${session.uid}`);
    const [postsSnap, playersSnap, fixturesSnap, resultsSnap, eventReactionSnap, userMetaSnap] = await Promise.all([
      adminDb!
        .collection(`pools/${POOL_ID}/banter`)
        .orderBy("createdAt", "desc")
        .limit(80)
        .get(),
      adminDb!.collection(`pools/${POOL_ID}/players`).get(),
      adminDb!.collection(`pools/${POOL_ID}/fixtures`).get(),
      adminDb!.collection(`pools/${POOL_ID}/results`).get(),
      adminDb!.collection(`pools/${POOL_ID}/banterEventReactions`).get(),
      userMetaRef.get(),
    ]);

    const lastSeenMs = timestampMs(userMetaSnap.get("lastSeenAt"));
    const posts = (await Promise.all(postsSnap.docs.map((doc) => serializePost(doc, session.uid, session.isAdmin, lastSeenMs)))).reverse();
    const fixtures = new Map(fixturesSnap.docs.map((snap) => [snap.id, snap.data() as FixtureDoc]));
    const eventReactions = new Map(eventReactionSnap.docs.map((snap) => [snap.id, (snap.get("reactions") ?? {}) as ReactionMap]));
    const resultEvents = resultsSnap.docs.map((snap) => resultEvent({ ...(snap.data() as ResultDoc), id: snap.id }, fixtures.get(snap.id)));
    const matchEvents = fixturesSnap.docs
      .map((snap) => topLevelFixtureEvent({ ...(snap.data() as FixtureDoc), id: snap.id }))
      .filter((event): event is Omit<BanterEventView, "reactions" | "reactionTotal"> => !!event);
    const events = [...resultEvents, ...matchEvents]
      .map((event) => hydrateEventReactions(event, eventReactions, session.uid))
      .sort((a, b) => Date.parse(a.occurredAt) - Date.parse(b.occurredAt))
      .slice(-60);

    const items: BanterFeedItem[] = [...events, ...posts]
      .sort((a, b) => Date.parse(a.type === "event" ? a.occurredAt : a.createdAt) - Date.parse(b.type === "event" ? b.occurredAt : b.createdAt))
      .slice(-120);
    const unreadPostCount = posts.filter((post) => post.uid !== session.uid && Date.parse(post.createdAt) > lastSeenMs).length;
    const notificationCount = unreadPostCount + posts.reduce((sum, post) => sum + post.unreadReplyCount, 0);

    await userMetaRef.set({ lastSeenAt: FieldValue.serverTimestamp() }, { merge: true });

    const body: BanterFeedView = {
      items,
      posts,
      memberCount: playersSnap.size,
      notificationCount,
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

    const raw = (await req.json()) as { body?: unknown; parentId?: unknown };
    const body = cleanBanterBody(raw.body);
    if (!body) return NextResponse.json({ error: "Write something first." }, { status: 400 });
    if (body.length > 280) return NextResponse.json({ error: "Keep banter under 280 characters." }, { status: 400 });

    const parentId = typeof raw.parentId === "string" ? raw.parentId.trim() : "";
    const rateKey = parentId ? "lastReplyAt" : "lastPostAt";
    const rateRef = adminDb!.doc(`pools/${POOL_ID}/banterMeta/rate-${session.uid}`);
    const rateSnap = await rateRef.get();
    const lastAt = rateSnap.get(rateKey);
    const lastMs = lastAt instanceof Timestamp ? lastAt.toMillis() : 0;
    if (lastMs && Date.now() - lastMs < 4_000) {
      return NextResponse.json({ error: "Give it a few seconds before posting again." }, { status: 429 });
    }

    const baseDoc: BanterPostDoc = {
      uid: session.uid,
      name: session.player.name,
      short: session.player.short || initials(session.player.name),
      body,
      reactions: {},
    };

    if (parentId) {
      const parentRef = adminDb!.doc(`pools/${POOL_ID}/banter/${parentId}`);
      const parentSnap = await parentRef.get();
      if (!parentSnap.exists) return NextResponse.json({ error: "Post not found" }, { status: 404 });
      const replyRef = parentRef.collection("replies").doc();
      const batch = adminDb!.batch();
      batch.set(replyRef, {
        ...baseDoc,
        createdAt: FieldValue.serverTimestamp(),
        updatedAt: FieldValue.serverTimestamp(),
      });
      batch.set(parentRef, { updatedAt: FieldValue.serverTimestamp() }, { merge: true });
      batch.set(rateRef, { [rateKey]: FieldValue.serverTimestamp() }, { merge: true });
      await batch.commit();
      return NextResponse.json({ ok: true, parentId, replyId: replyRef.id });
    }

    const postRef = adminDb!.collection(`pools/${POOL_ID}/banter`).doc();
    const batch = adminDb!.batch();
    batch.set(postRef, {
      ...baseDoc,
      createdAt: FieldValue.serverTimestamp(),
      updatedAt: FieldValue.serverTimestamp(),
    });
    batch.set(rateRef, { [rateKey]: FieldValue.serverTimestamp() }, { merge: true });
    await batch.commit();

    const saved = await postRef.get();
    return NextResponse.json({ post: await serializePost(saved as FirebaseFirestore.QueryDocumentSnapshot, session.uid, session.isAdmin, Date.now()) });
  } catch (error) {
    return NextResponse.json({ error: (error as Error).message }, { status: 500 });
  }
}
