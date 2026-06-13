"use client";

import { Fragment, useCallback, useEffect, useMemo, useState, type FormEvent, type ReactNode } from "react";
import { useAuth } from "@/lib/auth";
import { BANTER_REACTIONS, teamMentionMap, type BanterFeedView, type BanterPostView, type BanterReactionKey } from "@/lib/banter";
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
  post,
  busy,
  onReact,
}: {
  post: BanterPostView;
  busy: string | null;
  onReact: (postId: string, reaction: BanterReactionKey) => void;
}) {
  return (
    <div style={{ display: "flex", alignItems: "center", gap: 7, marginTop: 9, flexWrap: "wrap" }}>
      {post.reactions.map((reaction) => (
        <button
          key={reaction.key}
          type="button"
          className={"wc-bt-react" + (reaction.mine ? " mine" : "")}
          onClick={() => onReact(post.id, reaction.key)}
          disabled={busy === `${post.id}:${reaction.key}`}
          aria-label={`${reaction.label} reaction`}
        >
          <span className="em">{reaction.emoji}</span>
          {reaction.count}
        </button>
      ))}
    </div>
  );
}

function BanterMessage({
  post,
  busyReaction,
  onReact,
}: {
  post: BanterPostView;
  busyReaction: string | null;
  onReact: (postId: string, reaction: BanterReactionKey) => void;
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
        <ReactionRow post={post} busy={busyReaction} onReact={onReact} />
      </div>
    </article>
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

function BanterRail({ posts }: { posts: BanterPostView[] }) {
  const loudest = useMemo(() => {
    const counts = new Map<string, { name: string; short: string; count: number }>();
    for (const post of posts) {
      const current = counts.get(post.uid) ?? { name: post.name, short: post.short, count: 0 };
      current.count += 1;
      counts.set(post.uid, current);
    }
    return [...counts.values()].sort((a, b) => b.count - a.count || a.name.localeCompare(b.name)).slice(0, 5);
  }, [posts]);
  const top = posts.reduce<BanterPostView | null>((best, post) => (!best || post.reactionTotal > best.reactionTotal ? post : best), null);
  const latest = posts[posts.length - 1] ?? null;

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 14, position: "sticky", top: 18 }}>
      <RailCard label="Heating up" accent="var(--gold)">
        <div style={{ fontSize: 15, fontWeight: 700, letterSpacing: "-0.01em" }}>
          {latest ? latest.body : "Quiet for now"}
        </div>
        <div className="wc-num" style={{ fontSize: 11.5, color: "var(--dim)", marginTop: 4 }}>
          {latest ? `${timeAgo(latest.createdAt)} ago` : "No posts yet"}
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
  const [busyReaction, setBusyReaction] = useState<string | null>(null);

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

  const react = useCallback(async (postId: string, reaction: BanterReactionKey) => {
    if (!user) return;
    setBusyReaction(`${postId}:${reaction}`);
    try {
      const token = await user.getIdToken();
      const res = await fetch(`/api/banter/${postId}/reaction`, {
        method: "POST",
        headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
        body: JSON.stringify({ reaction }),
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

  const posts = feed?.posts ?? [];
  const renderContent = () => {
    if (loading) {
      return <div className="wc-card" style={{ padding: 28, marginTop: 16, color: "var(--dim)" }}>Loading banter...</div>;
    }
    if (!posts.length) return <BanterEmpty />;
    return <div>{posts.map((post) => <BanterMessage key={post.id} post={post} busyReaction={busyReaction} onReact={react} />)}</div>;
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
          <BanterRail posts={posts} />
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
