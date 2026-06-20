import { NextRequest, NextResponse } from "next/server";
import { FieldValue, Timestamp } from "firebase-admin/firestore";
import { adminAuth, adminDb } from "@/lib/firebase-admin";
import { POOL_ID } from "@/lib/config";
import {
  banterStickerById,
  banterReactionMeta,
  cleanBanterBody,
  initials,
  memberMatchesMentionHandle,
  type BanterMemberView,
  type BanterEventView,
  type BanterFeedItem,
  type BanterFeedView,
  type BanterMessageView,
  type BanterReactionKey,
  type BanterReplyView,
} from "@/lib/banter";
import { T } from "@/lib/data";
import type { FixtureDoc, LiveStateDoc, PlayerDoc, ResultDoc } from "@/lib/types";

type ReactionMap = Partial<Record<BanterReactionKey, string[]>>;

type BanterPostDoc = {
  uid: string;
  name: string;
  short: string;
  kind?: "text" | "sticker";
  body: string;
  stickerId?: string | null;
  mentions?: string[];
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

function mentionsForDoc(data: Pick<BanterPostDoc, "mentions">, membersByUid: Map<string, BanterMemberView>) {
  return (Array.isArray(data.mentions) ? data.mentions : [])
    .map((uid) => membersByUid.get(uid))
    .filter((member): member is BanterMemberView => !!member);
}

function extractMentionUids(body: string, members: BanterMemberView[]) {
  const found = new Set<string>();
  const tags = body.matchAll(/@([A-Za-z0-9']{1,42})/g);
  for (const tag of tags) {
    const raw = tag[1] ?? "";
    const member = members.find((entry) => memberMatchesMentionHandle(raw, entry));
    if (member) found.add(member.uid);
  }
  return [...found].slice(0, 12);
}

function serializeReply(
  doc: FirebaseFirestore.QueryDocumentSnapshot,
  uid: string,
  membersByUid: Map<string, BanterMemberView>,
): BanterReplyView {
  const data = docData<BanterReplyDoc>(doc);
  const reactions = serializeReactions(data.reactions, uid);
  const sticker = banterStickerById(data.stickerId);
  return {
    id: doc.id,
    uid: data.uid,
    name: data.name,
    short: data.short,
    kind: sticker ? "sticker" : "text",
    body: data.body,
    sticker,
    mentions: mentionsForDoc(data, membersByUid),
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
  membersByUid: Map<string, BanterMemberView>,
): Promise<BanterMessageView> {
  const data = docData<BanterPostDoc>(doc);
  const reactions = serializeReactions(data.reactions, uid);
  const repliesSnap = await doc.ref.collection("replies").orderBy("createdAt", "asc").limit(40).get();
  const replies = repliesSnap.docs.map((reply) => serializeReply(reply, uid, membersByUid));
  const userMentioned = Array.isArray(data.mentions) && data.mentions.includes(uid);
  const userParticipated = data.uid === uid || userMentioned || repliesSnap.docs.some((reply) => reply.get("uid") === uid && timestampMs(reply.get("createdAt")) <= lastSeenMs);
  const unreadReplyCount = userParticipated
    ? repliesSnap.docs.filter((reply) => reply.get("uid") !== uid && timestampMs(reply.get("createdAt")) > lastSeenMs).length
    : 0;
  const sticker = banterStickerById(data.stickerId);
  return {
    type: "message",
    id: doc.id,
    uid: data.uid,
    name: data.name,
    short: data.short,
    kind: sticker ? "sticker" : "text",
    body: data.body,
    sticker,
    mentions: mentionsForDoc(data, membersByUid),
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

function estimatedFinishedAt(fixture?: FixtureDoc) {
  const kickoff = fixture?.kickoffAt ? Date.parse(fixture.kickoffAt) : Number.NaN;
  if (Number.isNaN(kickoff)) return null;
  return new Date(kickoff + 2 * 60 * 60 * 1000).toISOString();
}

type BareBanterEvent = Omit<BanterEventView, "reactions" | "reactionTotal" | "replies" | "replyCount" | "unreadReplyCount">;

function resultEvent(result: ResultDoc, fixture?: FixtureDoc): BareBanterEvent {
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
  const occurredAt = estimatedFinishedAt(fixture) ?? result.enteredAt;
  return {
    type: "event",
    id: safeId(`result-${result.id}`),
    icon: result.win === "draw" ? "🤝" : "🏁",
    accent: "gold",
    title: score,
    sub: points || result.round,
    occurredAt: timestampIso(occurredAt, fallbackDate),
  };
}

function liveMinuteLabel(live?: LiveStateDoc) {
  if (!live) return null;
  if (live.statusShort === "HT") return "HT";
  if (live.minute == null) return live.statusShort ?? live.statusLong ?? null;
  return `${live.minute}${live.extra ? `+${live.extra}` : ""}'`;
}

function topLevelFixtureEvent(fixture: FixtureDoc, live?: LiveStateDoc): BareBanterEvent | null {
  const isLive = fixture.status === "live" || live?.status === "live" || live?.status === "paused";
  const isFinished = fixture.status === "finished" || live?.status === "finished";
  if (!isLive && !isFinished) return null;
  const a = teamName(fixture.a, fixture.aName);
  const b = teamName(fixture.b, fixture.bName);
  const aFlag = teamFlag(fixture.a);
  const bFlag = teamFlag(fixture.b);
  const sa = live?.sa ?? null;
  const sb = live?.sb ?? null;
  const hasLiveScore = sa != null && sb != null;
  const clock = liveMinuteLabel(live);
  const state = isFinished ? "FT" : clock ?? "LIVE";
  const score = hasLiveScore ? `${aFlag} ${a} ${sa}-${sb} ${b} ${bFlag}` : `${aFlag} ${a} vs ${b} ${bFlag}`;
  const occurredAt = isFinished
    ? estimatedFinishedAt(fixture) ?? fixture.kickoffAt
    : live?.updatedAt ?? fixture.lastSyncedAt ?? fixture.kickoffAt;
  return {
    type: "event",
    id: safeId(`fixture-state-${fixture.id}-${isFinished ? "finished" : "live"}`),
    fixtureId: fixture.id,
    icon: isFinished ? "🏁" : "🟢",
    accent: isFinished ? "gold" : "lime",
    title: `${state} · ${score}`.trim(),
    sub: `${live?.statusLong ?? live?.statusShort ?? fixture.round}${fixture.group ? ` · Group ${fixture.group}` : ""}`,
    occurredAt: timestampIso(occurredAt, fixture.kickoffAt ? new Date(fixture.kickoffAt) : new Date()),
  };
}

async function hydrateEvent(
  event: BareBanterEvent,
  reactionDocs: Map<string, ReactionMap>,
  uid: string,
  membersByUid: Map<string, BanterMemberView>,
  lastSeenMs: number,
): Promise<BanterEventView> {
  const reactions = serializeReactions(reactionDocs.get(event.id), uid);
  const repliesSnap = await adminDb!
    .collection(`pools/${POOL_ID}/banterEventReplies/${event.id}/replies`)
    .orderBy("createdAt", "asc")
    .limit(40)
    .get();
  const replies = repliesSnap.docs.map((reply) => serializeReply(reply, uid, membersByUid));
  const userParticipated = repliesSnap.docs.some((reply) => reply.get("uid") === uid && timestampMs(reply.get("createdAt")) <= lastSeenMs);
  const unreadReplyCount = userParticipated
    ? repliesSnap.docs.filter((reply) => reply.get("uid") !== uid && timestampMs(reply.get("createdAt")) > lastSeenMs).length
    : 0;
  return {
    ...event,
    reactions,
    reactionTotal: reactionTotal(reactions),
    replies,
    replyCount: replies.length,
    unreadReplyCount,
  };
}

export async function GET(req: NextRequest) {
  try {
    const session = await requireBanterUser(req);
    if ("error" in session) return session.error;

    const userMetaRef = adminDb!.doc(`pools/${POOL_ID}/banterMeta/seen-${session.uid}`);
    const [postsSnap, playersSnap, fixturesSnap, liveStateSnap, resultsSnap, eventReactionSnap, userMetaSnap] = await Promise.all([
      adminDb!
        .collection(`pools/${POOL_ID}/banter`)
        .orderBy("createdAt", "desc")
        .limit(80)
        .get(),
      adminDb!.collection(`pools/${POOL_ID}/players`).get(),
      adminDb!.collection(`pools/${POOL_ID}/fixtures`).get(),
      adminDb!.collection(`pools/${POOL_ID}/liveState`).get(),
      adminDb!.collection(`pools/${POOL_ID}/results`).get(),
      adminDb!.collection(`pools/${POOL_ID}/banterEventReactions`).get(),
      userMetaRef.get(),
    ]);

    const lastSeenMs = timestampMs(userMetaSnap.get("lastSeenAt"));
    const members: BanterMemberView[] = playersSnap.docs
      .map((doc) => {
        const data = doc.data() as PlayerDoc;
        return {
          uid: doc.id,
          name: data.name,
          short: data.short || initials(data.name),
        };
      })
      .filter((member) => !!member.name)
      .sort((a, b) => a.name.localeCompare(b.name));
    const membersByUid = new Map(members.map((member) => [member.uid, member]));
    const posts = await Promise.all(postsSnap.docs.map((doc) => serializePost(doc, session.uid, session.isAdmin, lastSeenMs, membersByUid)));
    const fixtures = new Map(fixturesSnap.docs.map((snap) => [snap.id, snap.data() as FixtureDoc]));
    const liveByFixtureId = new Map(liveStateSnap.docs.map((snap) => {
      const data = { ...(snap.data() as LiveStateDoc), id: snap.id };
      return [data.fixtureId, data] as const;
    }));
    const eventReactions = new Map(eventReactionSnap.docs.map((snap) => [snap.id, (snap.get("reactions") ?? {}) as ReactionMap]));
    const resultIds = new Set(resultsSnap.docs.map((snap) => snap.id));
    const resultEvents = resultsSnap.docs.map((snap) => resultEvent({ ...(snap.data() as ResultDoc), id: snap.id }, fixtures.get(snap.id)));
    const matchEvents = fixturesSnap.docs
      .filter((snap) => !resultIds.has(snap.id))
      .map((snap) => topLevelFixtureEvent({ ...(snap.data() as FixtureDoc), id: snap.id }, liveByFixtureId.get(snap.id)))
      .filter((event): event is BareBanterEvent => !!event);
    const events = (await Promise.all([...resultEvents, ...matchEvents]
      .map((event) => hydrateEvent(event, eventReactions, session.uid, membersByUid, lastSeenMs))))
      .sort((a, b) => Date.parse(b.occurredAt) - Date.parse(a.occurredAt))
      .slice(0, 60);

    const items: BanterFeedItem[] = [...events, ...posts]
      .sort((a, b) => Date.parse(b.type === "event" ? b.occurredAt : b.createdAt) - Date.parse(a.type === "event" ? a.occurredAt : a.createdAt))
      .slice(0, 120);
    const unreadPostCount = posts.filter((post) => post.uid !== session.uid && Date.parse(post.createdAt) > lastSeenMs).length;
    const unreadMentionCount = posts.filter((post) => post.uid !== session.uid && post.mentions.some((mention) => mention.uid === session.uid) && Date.parse(post.createdAt) > lastSeenMs).length;
    const notificationCount = unreadPostCount + unreadMentionCount + posts.reduce((sum, post) => sum + post.unreadReplyCount, 0) + events.reduce((sum, event) => sum + event.unreadReplyCount, 0);

    await userMetaRef.set({ lastSeenAt: FieldValue.serverTimestamp() }, { merge: true });

    const body: BanterFeedView = {
      items,
      posts,
      members,
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

    const raw = (await req.json()) as { body?: unknown; parentId?: unknown; parentType?: unknown; stickerId?: unknown };
    const body = cleanBanterBody(raw.body);
    const sticker = banterStickerById(raw.stickerId);
    if (!body && !sticker) return NextResponse.json({ error: "Write something first." }, { status: 400 });
    if (body.length > 280) return NextResponse.json({ error: "Keep banter under 280 characters." }, { status: 400 });

    const parentId = typeof raw.parentId === "string" ? raw.parentId.trim() : "";
    const parentType = raw.parentType === "event" ? "event" : "post";
    const rateKey = parentId ? "lastReplyAt" : "lastPostAt";
    const rateRef = adminDb!.doc(`pools/${POOL_ID}/banterMeta/rate-${session.uid}`);
    const rateSnap = await rateRef.get();
    const lastAt = rateSnap.get(rateKey);
    const lastMs = lastAt instanceof Timestamp ? lastAt.toMillis() : 0;
    if (lastMs && Date.now() - lastMs < 4_000) {
      return NextResponse.json({ error: "Give it a few seconds before posting again." }, { status: 429 });
    }

    const playersSnap = await adminDb!.collection(`pools/${POOL_ID}/players`).get();
    const members = playersSnap.docs
      .map((doc) => {
        const data = doc.data() as PlayerDoc;
        return { uid: doc.id, name: data.name, short: data.short || initials(data.name) };
      })
      .filter((member) => !!member.name);
    const baseDoc: BanterPostDoc = {
      uid: session.uid,
      name: session.player.name,
      short: session.player.short || initials(session.player.name),
      kind: sticker ? "sticker" : "text",
      body: body || sticker?.label || "",
      stickerId: sticker?.id ?? null,
      mentions: body ? extractMentionUids(body, members) : [],
      reactions: {},
    };

    if (parentId) {
      const parentRef = parentType === "event"
        ? adminDb!.doc(`pools/${POOL_ID}/banterEventReplies/${parentId}`)
        : adminDb!.doc(`pools/${POOL_ID}/banter/${parentId}`);
      if (parentType === "post") {
        const parentSnap = await parentRef.get();
        if (!parentSnap.exists) return NextResponse.json({ error: "Post not found" }, { status: 404 });
      }
      const replyRef = parentRef.collection("replies").doc();
      const batch = adminDb!.batch();
      if (parentType === "event") {
        batch.set(parentRef, {
          eventId: parentId,
          updatedAt: FieldValue.serverTimestamp(),
        }, { merge: true });
      }
      batch.set(replyRef, {
        ...baseDoc,
        createdAt: FieldValue.serverTimestamp(),
        updatedAt: FieldValue.serverTimestamp(),
      });
      batch.set(parentRef, { updatedAt: FieldValue.serverTimestamp() }, { merge: true });
      batch.set(rateRef, { [rateKey]: FieldValue.serverTimestamp() }, { merge: true });
      await batch.commit();
      return NextResponse.json({ ok: true, parentId, parentType, replyId: replyRef.id });
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
    const membersByUid = new Map(members.map((member) => [member.uid, member] as const));
    return NextResponse.json({ post: await serializePost(saved as FirebaseFirestore.QueryDocumentSnapshot, session.uid, session.isAdmin, Date.now(), membersByUid) });
  } catch (error) {
    return NextResponse.json({ error: (error as Error).message }, { status: 500 });
  }
}
