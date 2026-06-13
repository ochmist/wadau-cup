"use client";

import { Fragment, useCallback, useEffect, useMemo, useState, type FormEvent, type ReactNode } from "react";
import { useAuth } from "@/lib/auth";
import {
  BANTER_REACTIONS,
  teamMentionMap,
  type BanterEventView,
  type BanterFeedItem,
  type BanterFeedView,
  type BanterMessageView,
  type BanterReactionKey,
  type BanterReplyView,
} from "@/lib/banter";
import { T } from "@/lib/data";

function timeAgo(iso: string) {
  const diff = Date.now() - Date.parse(iso);
  if (!Number.isFinite(diff) || diff < 15_000) return "now";
  const minutes = Math.floor(diff / 60_000);
  if (minutes < 60) return `${minutes}m`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours}h`;
  const days = Math.floor(hours / 24);
  return `${days}d`;
}

function BanterText({ text }: { text: string }) {
  const parts = String(text).split(/(@[A-Za-z0-9' -]+)/g);
  return (
    <span>
      {parts.map((token, i) => {
        if (!token.startsWith("@")) return <Fragment key={i}>{token}</Fragment>;
        const raw = token.slice(1).trim();
        const key = raw.toLowerCase().replace(/[^a-z0-9]+/g, "");
        const code = teamMentionMap[key] ?? teamMentionMap[raw.toLowerCase()];
        if (code && T[code]) {
          return (
            <span key={i} className="wc-bt-team">
              <span className="fl">{T[code].f}</span>
              {T[code].n}
            </span>
          );
        }
        return <span key={i} className="wc-bt-mention">@{raw}</span>;
      })}
    </span>
  );
}

function BtAvatar({ short, active = false, size = 36 }: { short: string; active?: boolean; size?: number }) {
  return (
    <div
      className="wc-avatar"
      style={{
        width: size,
        height: size,
        borderRadius: Math.round(size * 0.3),
        fontSize: Math.round(size * 0.35),
        flex: "none",
        background: active ? "var(--lime)" : "var(--surface-3)",
        color: active ? "var(--on-lime)" : "var(--dim)",
      }}
    >
      {short || "WC"}
    </div>
  );
}

function ReactionRow({
  id,
  targetType,
  reactions,
  busy,
  onReact,
  replyId,
}: {
  id: string;
  targetType: "post" | "reply" | "event";
  reactions: BanterMessageView["reactions"];
  busy: string | null;
  onReact: (id: string, reaction: BanterReactionKey, targetType: "post" | "reply" | "event", replyId?: string) => void;
  replyId?: string;
}) {
  return (
    <div style={{ display: "flex", alignItems: "center", gap: 7, marginTop: 9, flexWrap: "wrap" }}>
      {reactions.map((reaction) => (
        <button
          key={reaction.key}
          type="button"
          className={"wc-bt-react" + (reaction.mine ? " mine" : "")}
          onClick={() => onReact(id, reaction.key, targetType, replyId)}
          disabled={busy === `${targetType}:${id}:${replyId ?? ""}:${reaction.key}`}
          aria-label={`${reaction.label} reaction`}
        >
          <span className="em">{reaction.emoji}</span>
          {reaction.count}
        </button>
      ))}
    </div>
  );
}

function BanterReply({
  postId,
  reply,
  busyReaction,
  onReact,
}: {
  postId: string;
  reply: BanterReplyView;
  busyReaction: string | null;
  onReact: (id: string, reaction: BanterReactionKey, targetType: "post" | "reply" | "event", replyId?: string) => void;
}) {
  return (
    <div style={{ display: "flex", gap: 9, marginTop: 11 }}>
      <BtAvatar short={reply.short} active={reply.isMine} size={26} />
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ display: "flex", alignItems: "baseline", gap: 7, flexWrap: "wrap" }}>
          <span style={{ fontSize: 13, fontWeight: 700, letterSpacing: "-0.01em" }}>{reply.isMine ? "You" : reply.name}</span>
          <span className="wc-num" style={{ fontSize: 10, color: "var(--faint)" }}>{timeAgo(reply.createdAt)}</span>
        </div>
        <div style={{ fontSize: 13.5, lineHeight: 1.45, marginTop: 3, color: "var(--text)" }}>
          <BanterText text={reply.body} />
        </div>
        <ReactionRow
          id={postId}
          replyId={reply.id}
          targetType="reply"
          reactions={reply.reactions}
          busy={busyReaction}
          onReact={onReact}
        />
      </div>
    </div>
  );
}

function ReplyComposer({
  postId,
  posting,
  onSubmit,
  onCancel,
}: {
  postId: string;
  posting: boolean;
  onSubmit: (postId: string, body: string) => Promise<void>;
  onCancel: () => void;
}) {
  const [body, setBody] = useState("");

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const next = body.trim();
    if (!next || posting) return;
    await onSubmit(postId, next);
    setBody("");
  }

  return (
    <form onSubmit={handleSubmit} style={{ display: "flex", alignItems: "center", gap: 8, marginTop: 11 }}>
      <input
        className="wc-bt-input"
        style={{
          background: "var(--surface-2)",
          border: "1px solid var(--line-2)",
          borderRadius: 11,
          padding: "9px 11px",
        }}
        placeholder="Reply..."
        value={body}
        maxLength={280}
        onChange={(event) => setBody(event.target.value)}
      />
      <button className="wc-bt-send" style={{ width: 34, height: 34, borderRadius: 10 }} disabled={!body.trim() || posting} aria-label="Send reply">
        <svg width="15" height="15" viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round">
          <path d="M3.5 10h11M10 5l5 5-5 5" />
        </svg>
      </button>
      <button type="button" className="wc-bt-reply-btn" onClick={onCancel}>Cancel</button>
    </form>
  );
}

function BanterMessage({
  post,
  busyReaction,
  replying,
  postingReply,
  onReact,
  onReply,
  onSubmitReply,
  onCancelReply,
}: {
  post: BanterMessageView;
  busyReaction: string | null;
  replying: boolean;
  postingReply: boolean;
  onReact: (id: string, reaction: BanterReactionKey, targetType: "post" | "reply" | "event", replyId?: string) => void;
  onReply: (postId: string) => void;
  onSubmitReply: (postId: string, body: string) => Promise<void>;
  onCancelReply: () => void;
}) {
  return (
    <article style={{ display: "flex", gap: 11, padding: "10px 0" }}>
      <BtAvatar short={post.short} active={post.isMine} />
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ display: "flex", alignItems: "baseline", gap: 8, flexWrap: "wrap" }}>
          <span style={{ fontSize: 14.5, fontWeight: 700, letterSpacing: "-0.01em" }}>
            {post.isMine ? "You" : post.name}
          </span>
          {post.isMine && <span className="wc-tag-you">You</span>}
          <span className="wc-num" style={{ fontSize: 10.5, color: "var(--faint)" }}>
            {timeAgo(post.createdAt)}
          </span>
        </div>
        <div
          style={{
            display: "inline-block",
            marginTop: 6,
            padding: "9px 13px",
            borderRadius: "4px 14px 14px 14px",
            background: post.isMine ? "var(--lime-soft)" : "var(--surface-2)",
            border: "1px solid " + (post.isMine ? "var(--lime-line)" : "var(--line)"),
            fontSize: 14.5,
            lineHeight: 1.5,
            color: "var(--text)",
            maxWidth: "100%",
          }}
        >
          <BanterText text={post.body} />
        </div>
        <div style={{ display: "flex", alignItems: "center", gap: 10, flexWrap: "wrap" }}>
          <ReactionRow id={post.id} targetType="post" reactions={post.reactions} busy={busyReaction} onReact={onReact} />
          <button type="button" className="wc-bt-reply-btn" style={{ marginTop: 9 }} onClick={() => onReply(post.id)}>
            Reply{post.replyCount ? ` · ${post.replyCount}` : ""}
          </button>
        </div>
        {post.replies.length > 0 && (
          <div style={{ marginTop: 6, marginLeft: 6, paddingLeft: 13, borderLeft: "1.5px solid var(--line)" }}>
            {post.replies.map((reply) => (
              <BanterReply key={reply.id} postId={post.id} reply={reply} busyReaction={busyReaction} onReact={onReact} />
            ))}
          </div>
        )}
        {replying && (
          <ReplyComposer postId={post.id} posting={postingReply} onSubmit={onSubmitReply} onCancel={onCancelReply} />
        )}
      </div>
    </article>
  );
}

function eventColors(accent: BanterEventView["accent"]) {
  if (accent === "lime") return { line: "var(--lime-line)", soft: "var(--lime-soft)" };
  if (accent === "gold") return { line: "var(--gold-line)", soft: "var(--gold-soft)" };
  if (accent === "down") return { line: "var(--down)", soft: "var(--down-soft)" };
  if (accent === "violet") return { line: "var(--violet)", soft: "var(--violet-soft)" };
  return { line: "var(--line-2)", soft: "var(--surface-2)" };
}

function BanterEvent({
  item,
  busyReaction,
  onReact,
}: {
  item: BanterEventView;
  busyReaction: string | null;
  onReact: (id: string, reaction: BanterReactionKey, targetType: "post" | "reply" | "event", replyId?: string) => void;
}) {
  const colors = eventColors(item.accent);
  return (
    <div style={{ display: "flex", justifyContent: "center", padding: "9px 0" }}>
      <div className="wc-card" style={{ width: "100%", maxWidth: 600, padding: "13px 15px 12px", position: "relative", overflow: "hidden" }}>
        <div style={{ position: "absolute", left: 0, top: 0, bottom: 0, width: 3, background: colors.line }} />
        <div style={{ display: "flex", alignItems: "flex-start", gap: 11 }}>
          <div
            style={{
              width: 30,
              height: 30,
              borderRadius: 9,
              flex: "none",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              fontSize: 15,
              background: colors.soft,
              border: "1px solid " + colors.line,
            }}
          >
            {item.icon}
          </div>
          <div style={{ flex: 1, minWidth: 0, position: "relative" }}>
            <span className="wc-num" style={{ position: "absolute", top: 1, right: 0, fontSize: 10.5, color: "var(--faint)", whiteSpace: "nowrap" }}>
              {timeAgo(item.occurredAt)}
            </span>
            <div style={{ fontSize: 14.5, fontWeight: 700, letterSpacing: "-0.01em", lineHeight: 1.3, paddingRight: 64 }}>{item.title}</div>
            <div style={{ fontSize: 12.5, color: "var(--dim)", marginTop: 4, lineHeight: 1.45 }}>{item.sub}</div>
            <ReactionRow id={item.id} targetType="event" reactions={item.reactions} busy={busyReaction} onReact={onReact} />
          </div>
        </div>
      </div>
    </div>
  );
}

function BanterComposer({
  me,
  posting,
  onSubmit,
  sticky = false,
}: {
  me: BanterFeedView["me"] | null;
  posting: boolean;
  onSubmit: (body: string) => Promise<void>;
  sticky?: boolean;
}) {
  const [body, setBody] = useState("");
  const remaining = 280 - body.length;

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const next = body.trim();
    if (!next || posting) return;
    await onSubmit(next);
    setBody("");
  }

  return (
    <form
      onSubmit={handleSubmit}
      style={{
        position: sticky ? "sticky" : "static",
        bottom: 0,
        background: "var(--bg)",
        borderTop: "1px solid var(--line)",
        padding: "12px 0 14px",
        marginTop: 6,
      }}
    >
      <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
        <BtAvatar short={me?.short ?? "WC"} active size={36} />
        <div
          style={{
            flex: 1,
            display: "flex",
            alignItems: "center",
            gap: 8,
            background: "var(--surface-2)",
            border: "1px solid var(--line-2)",
            borderRadius: 13,
            padding: "9px 12px",
            minWidth: 0,
          }}
        >
          <input
            className="wc-bt-input"
            placeholder="Drop your take..."
            value={body}
            maxLength={280}
            onChange={(event) => setBody(event.target.value)}
          />
          <span className="wc-num" style={{ fontSize: 10.5, color: remaining < 30 ? "var(--down)" : "var(--faint)" }}>
            {remaining}
          </span>
        </div>
        <button className="wc-bt-send" title="Send" aria-label="Send banter" disabled={!body.trim() || posting}>
          <svg width="17" height="17" viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round">
            <path d="M3.5 10h11M10 5l5 5-5 5" />
          </svg>
        </button>
      </div>
    </form>
  );
}

function BanterEmpty() {
  return (
    <div className="wc-card" style={{ padding: 34, textAlign: "center", marginTop: 16 }}>
      <div className="wc-avatar" style={{ margin: "0 auto", width: 50, height: 50, borderRadius: 14 }}>
        BT
      </div>
      <div style={{ fontSize: 20, fontWeight: 800, marginTop: 16 }}>No banter yet</div>
      <div style={{ color: "var(--dim)", marginTop: 8, lineHeight: 1.5 }}>
        Start the pool chatter. Posts and reactions are saved for everyone in the pool.
      </div>
    </div>
  );
}

function RailCard({ label, accent, children }: { label: string; accent?: string; children: ReactNode }) {
  return (
    <div className="wc-card" style={{ padding: "15px 16px" }}>
      <div className="wc-eyebrow" style={{ color: accent ?? "var(--faint)" }}>{label}</div>
      <div style={{ marginTop: 11 }}>{children}</div>
    </div>
  );
}

function BanterRail({ items, posts }: { items: BanterFeedItem[]; posts: BanterMessageView[] }) {
  const loudest = useMemo(() => {
    const counts = new Map<string, { name: string; short: string; count: number }>();
    for (const post of posts) {
      const current = counts.get(post.uid) ?? { name: post.name, short: post.short, count: 0 };
      current.count += 1;
      counts.set(post.uid, current);
    }
    return [...counts.values()].sort((a, b) => b.count - a.count || a.name.localeCompare(b.name)).slice(0, 5);
  }, [posts]);
  const top = posts.reduce<BanterMessageView | null>((best, post) => (!best || post.reactionTotal > best.reactionTotal ? post : best), null);
  const latest = items[items.length - 1] ?? null;

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 14, position: "sticky", top: 18 }}>
      <RailCard label="Heating up" accent="var(--gold)">
        <div style={{ fontSize: 15, fontWeight: 700, letterSpacing: "-0.01em" }}>
          {latest ? latest.type === "event" ? latest.title : latest.body : "Quiet for now"}
        </div>
        <div className="wc-num" style={{ fontSize: 11.5, color: "var(--dim)", marginTop: 4 }}>
          {latest ? `${timeAgo(latest.type === "event" ? latest.occurredAt : latest.createdAt)} ago` : "No posts yet"}
        </div>
      </RailCard>

      <RailCard label="Top banter today">
        {top && top.reactionTotal > 0 ? (
          <>
            <div style={{ display: "flex", alignItems: "center", gap: 9, marginBottom: 9 }}>
              <BtAvatar short={top.short} size={28} />
              <span style={{ fontSize: 13.5, fontWeight: 700 }}>{top.name}</span>
            </div>
            <div style={{ fontSize: 13, color: "var(--text)", lineHeight: 1.5, fontStyle: "italic" }}>
              "{top.body}"
            </div>
            <div className="wc-num" style={{ fontSize: 11, color: "var(--lime-ink)", fontWeight: 600, marginTop: 9 }}>
              {top.reactionTotal} reactions
            </div>
          </>
        ) : (
          <div style={{ fontSize: 13, color: "var(--dim)", lineHeight: 1.5 }}>Reactions will surface the best posts here.</div>
        )}
      </RailCard>

      <RailCard label="Loudest in the pool">
        {loudest.length ? (
          <div style={{ display: "flex", flexDirection: "column", gap: 11 }}>
            {loudest.map((person, i) => (
              <div key={person.name} style={{ display: "flex", alignItems: "center", gap: 10 }}>
                <span className="wc-num" style={{ fontSize: 12, color: "var(--faint)", width: 12 }}>{i + 1}</span>
                <BtAvatar short={person.short} size={26} />
                <span style={{ fontSize: 13.5, fontWeight: 600, flex: 1 }}>{person.name}</span>
                <span className="wc-num" style={{ fontSize: 12, color: "var(--dim)" }}>{person.count} msgs</span>
              </div>
            ))}
          </div>
        ) : (
          <div style={{ fontSize: 13, color: "var(--dim)", lineHeight: 1.5 }}>Post counts unlock once people start talking.</div>
        )}
      </RailCard>
    </div>
  );
}

function BanterHeader({ memberCount, compact = false }: { memberCount: number; compact?: boolean }) {
  return (
    <div style={{ display: "flex", alignItems: "flex-end", justifyContent: "space-between", marginBottom: 6, gap: 12 }}>
      <div>
        <div style={{ fontSize: compact ? 19 : 22, fontWeight: 800, letterSpacing: "-0.02em" }}>Banter</div>
        <div style={{ fontSize: 13, color: "var(--dim)", marginTop: 3 }}>
          <span style={{ color: "var(--lime-ink)", fontWeight: 600 }}>{memberCount} in the pool</span> · live pool chat
        </div>
      </div>
      <div style={{ display: "flex", gap: 6, flexWrap: "wrap", justifyContent: "flex-end" }}>
        {BANTER_REACTIONS.map((reaction) => (
          <span key={reaction.key} className="wc-bt-react" style={{ pointerEvents: "none" }}>
            <span className="em">{reaction.emoji}</span>
          </span>
        ))}
      </div>
    </div>
  );
}

export function BanterScreen() {
  const { user } = useAuth();
  const [feed, setFeed] = useState<BanterFeedView | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [posting, setPosting] = useState(false);
  const [postingReply, setPostingReply] = useState(false);
  const [busyReaction, setBusyReaction] = useState<string | null>(null);
  const [replyingTo, setReplyingTo] = useState<string | null>(null);

  const loadFeed = useCallback(async () => {
    if (!user) return;
    const token = await user.getIdToken();
    const res = await fetch("/api/banter", { headers: { Authorization: `Bearer ${token}` } });
    const data = await res.json();
    if (!res.ok) throw new Error(data.error ?? "Failed to load banter");
    setFeed(data);
    setError(null);
  }, [user]);

  useEffect(() => {
    let cancelled = false;
    async function run() {
      try {
        await loadFeed();
      } catch (err) {
        if (!cancelled) setError((err as Error).message);
      } finally {
        if (!cancelled) setLoading(false);
      }
    }
    run();
    const id = setInterval(run, 15_000);
    return () => {
      cancelled = true;
      clearInterval(id);
    };
  }, [loadFeed]);

  const submitPost = useCallback(async (body: string) => {
    if (!user) return;
    setPosting(true);
    try {
      const token = await user.getIdToken();
      const res = await fetch("/api/banter", {
        method: "POST",
        headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
        body: JSON.stringify({ body }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "Failed to post");
      await loadFeed();
    } finally {
      setPosting(false);
    }
  }, [loadFeed, user]);

  const submitReply = useCallback(async (parentId: string, body: string) => {
    if (!user) return;
    setPostingReply(true);
    try {
      const token = await user.getIdToken();
      const res = await fetch("/api/banter", {
        method: "POST",
        headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
        body: JSON.stringify({ parentId, body }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "Failed to reply");
      setReplyingTo(null);
      await loadFeed();
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setPostingReply(false);
    }
  }, [loadFeed, user]);

  const react = useCallback(async (
    id: string,
    reaction: BanterReactionKey,
    targetType: "post" | "reply" | "event",
    replyId?: string,
  ) => {
    if (!user) return;
    setBusyReaction(`${targetType}:${id}:${replyId ?? ""}:${reaction}`);
    try {
      const token = await user.getIdToken();
      const res = await fetch(`/api/banter/${encodeURIComponent(id)}/reaction`, {
        method: "POST",
        headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
        body: JSON.stringify({ reaction, targetType, replyId }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "Failed to react");
      await loadFeed();
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setBusyReaction(null);
    }
  }, [loadFeed, user]);

  const items = feed?.items ?? feed?.posts ?? [];
  const posts = feed?.posts ?? items.filter((item): item is BanterMessageView => item.type === "message");
  const renderContent = () => {
    if (loading) {
      return <div className="wc-card" style={{ padding: 28, marginTop: 16, color: "var(--dim)" }}>Loading banter...</div>;
    }
    if (!items.length) return <BanterEmpty />;
    return (
      <div>
        {items.map((item) => item.type === "event" ? (
          <BanterEvent key={item.id} item={item} busyReaction={busyReaction} onReact={react} />
        ) : (
          <BanterMessage
            key={item.id}
            post={item}
            busyReaction={busyReaction}
            replying={replyingTo === item.id}
            postingReply={postingReply}
            onReact={react}
            onReply={setReplyingTo}
            onSubmitReply={submitReply}
            onCancelReply={() => setReplyingTo(null)}
          />
        ))}
      </div>
    );
  };

  return (
    <>
      <div className="wc-desktop-only" style={{ maxWidth: 1120, margin: "0 auto", padding: "22px 28px 0" }}>
        <div style={{ display: "grid", gridTemplateColumns: "minmax(0, 1fr) 320px", gap: 28, alignItems: "start" }}>
          <div style={{ display: "flex", flexDirection: "column", minHeight: 0 }}>
            <BanterHeader memberCount={feed?.memberCount ?? 0} />
            {error && <div className="wc-notice" style={{ margin: "12px 0" }}>{error}</div>}
            {renderContent()}
            <BanterComposer me={feed?.me ?? null} posting={posting} onSubmit={submitPost} sticky />
          </div>
          <BanterRail items={items} posts={posts} />
        </div>
      </div>

      <div className="wc-mobile-only" style={{ display: "flex", flexDirection: "column", minHeight: "100%", padding: "10px 16px 0" }}>
        <BanterHeader memberCount={feed?.memberCount ?? 0} compact />
        {error && <div className="wc-notice" style={{ margin: "12px 0" }}>{error}</div>}
        {renderContent()}
        <BanterComposer me={feed?.me ?? null} posting={posting} onSubmit={submitPost} />
      </div>
    </>
  );
}
