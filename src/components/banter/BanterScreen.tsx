"use client";

import { Fragment, useCallback, useEffect, useMemo, useState, type FormEvent, type ReactNode } from "react";
import Link from "next/link";
import { TeamEntityLink } from "@/components/entity-links";
import { useAuth } from "@/lib/auth";
import {
  BANTER_EMOJI_GROUPS,
  BANTER_REACTIONS,
  BANTER_STICKERS,
  mentionHandleForMember,
  memberMatchesMentionHandle,
  memberMentionKey,
  teamMentionMap,
  type BanterEventView,
  type BanterFeedItem,
  type BanterFeedView,
  type BanterMemberView,
  type BanterMessageView,
  type BanterReactionKey,
  type BanterReplyView,
  type BanterStickerView,
} from "@/lib/banter";
import { T } from "@/lib/data";

type BanterTargetType = "post" | "reply" | "event" | "eventReply";
type ReplyTarget = { type: "post" | "event"; id: string };

type MatchEventDetails = {
  state: string;
  round: string;
  home: { flag: string; name: string; score: string };
  away: { flag: string; name: string; score: string };
  status: "live" | "final";
};

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

function BanterText({ text, members = [] }: { text: string; members?: BanterMemberView[] }) {
  const value = String(text);
  const parts: ReactNode[] = [];
  let lastIndex = 0;
  const pattern = /@([A-Za-z0-9']{1,42})/g;
  let match: RegExpExecArray | null;
  while ((match = pattern.exec(value))) {
    const raw = match[1] ?? "";
    const token = match[0];
    if (match.index > lastIndex) parts.push(<Fragment key={`t-${match.index}`}>{value.slice(lastIndex, match.index)}</Fragment>);
    const key = memberMentionKey(raw);
    const code = teamMentionMap[key] ?? teamMentionMap[raw.toLowerCase()];
    if (code && T[code]) {
      parts.push(
        <TeamEntityLink key={`m-${match.index}`} code={code} stopPropagation={false} className="wc-bt-team">
          <span className="fl">{T[code].f}</span>
          {T[code].n}
        </TeamEntityLink>,
      );
    } else {
      const member = members.find((entry) => memberMatchesMentionHandle(raw, entry));
      parts.push(
        <span key={`m-${match.index}`} className="wc-bt-mention">
          {member ? `@${member.name}` : token}
        </span>,
      );
    }
    lastIndex = match.index + token.length;
  }
  if (lastIndex < value.length) parts.push(<Fragment key="tail">{value.slice(lastIndex)}</Fragment>);
  return (
    <span>
      {parts}
    </span>
  );
}

function codeForBanterTeam(side: Pick<MatchEventDetails["home"], "name" | "flag">) {
  return Object.entries(T).find(([, team]) => team.n === side.name || team.f === side.flag)?.[0] ?? null;
}

function splitEventTitle(title: string) {
  const pieces = title.split(" · ");
  if (pieces.length < 2) return { state: "", body: title };
  return { state: pieces[0] ?? "", body: pieces.slice(1).join(" · ") };
}

function parseMatchEvent(item: BanterEventView): MatchEventDetails | null {
  if (!item.fixtureId) return null;
  const { state, body } = splitEventTitle(item.title);
  const scoreMatch = body.match(/^(\S+)\s+(.+?)\s+(?:(\d+)-(\d+)|vs)\s+(.+?)\s+(\S+)$/u);
  if (!scoreMatch) return null;
  const [, homeFlag = "", homeName = "", homeScore, awayScore, awayName = "", awayFlag = ""] = scoreMatch;
  const status = item.accent === "gold" || /^FT$/i.test(state) ? "final" : "live";
  return {
    state: state || (status === "final" ? "FT" : "LIVE"),
    round: cleanEventStage(item.sub),
    home: { flag: homeFlag, name: homeName, score: homeScore ?? "–" },
    away: { flag: awayFlag, name: awayName, score: awayScore ?? "–" },
    status,
  };
}

function cleanEventStage(value: string) {
  const parts = value
    .split(" · ")
    .map((part) => part.replace(/\bGroup\s+Group\b/g, "Group").trim())
    .filter(Boolean);
  const group = parts.find((part) => /^Group\s+[A-H]$/i.test(part));
  return group ?? parts[0] ?? "";
}

function StickerBubble({ sticker }: { sticker: BanterStickerView }) {
  return (
    <span className="wc-bt-sticker-bubble" title={sticker.label} aria-label={sticker.label}>
      <span>{sticker.emoji}</span>
      <span>{sticker.label}</span>
    </span>
  );
}

function StickerPicker({
  open,
  onToggle,
  onSelect,
}: {
  open: boolean;
  onToggle: () => void;
  onSelect: (stickerId: string) => void;
}) {
  return (
    <span className="wc-bt-picker-wrap">
      <button type="button" className="wc-bt-add" onClick={onToggle} aria-label="Add sticker" title="Add sticker">
        <svg width="13" height="13" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
          <path d="M4.5 3.5h7l1 2.5-4 6.5-4-6.5 1-2.5Z" />
          <path d="M4.5 6h8" />
        </svg>
      </button>
      {open && (
        <span className="wc-bt-sticker-picker">
          {BANTER_STICKERS.map((sticker) => (
            <button key={sticker.id} type="button" onClick={() => onSelect(sticker.id)}>
              <span>{sticker.emoji}</span>
              <small>{sticker.label}</small>
            </button>
          ))}
        </span>
      )}
    </span>
  );
}

function activeMention(body: string) {
  const beforeCursor = body;
  const at = beforeCursor.lastIndexOf("@");
  if (at < 0) return null;
  const previous = at === 0 ? " " : beforeCursor[at - 1];
  if (!/\s|[([{.,!?;:]/.test(previous)) return null;
  const query = beforeCursor.slice(at + 1);
  if (!/^[A-Za-z0-9']{0,32}$/.test(query)) return null;
  return { start: at, end: beforeCursor.length, query };
}

function replaceActiveMention(body: string, member: BanterMemberView) {
  const mention = activeMention(body);
  if (!mention) return `${body}@${mentionHandleForMember(member)} `;
  return `${body.slice(0, mention.start)}@${mentionHandleForMember(member)} ${body.slice(mention.end)}`;
}

function MentionSuggestions({
  body,
  members,
  onChoose,
}: {
  body: string;
  members: BanterMemberView[];
  onChoose: (member: BanterMemberView) => void;
}) {
  const mention = activeMention(body);
  const query = mention?.query ?? null;
  if (query == null) return null;
  const key = memberMentionKey(query);
  const matches = members
    .filter((member) => {
      if (!key) return true;
      return memberMentionKey(member.name).includes(key) || memberMentionKey(member.short).includes(key);
    })
    .slice(0, 6);
  if (!matches.length) return null;
  return (
    <div className="wc-bt-mention-menu">
      {matches.map((member) => (
        <button key={member.uid} type="button" onClick={() => onChoose(member)}>
          <BtAvatar short={member.short} size={24} />
          <span>{member.name}</span>
        </button>
      ))}
    </div>
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
  compact = false,
}: {
  id: string;
  targetType: BanterTargetType;
  reactions: BanterMessageView["reactions"];
  busy: string | null;
  onReact: (id: string, reaction: BanterReactionKey, targetType: BanterTargetType, replyId?: string) => void;
  replyId?: string;
  compact?: boolean;
}) {
  const [open, setOpen] = useState(false);
  const [activeGroup, setActiveGroup] = useState<string>(BANTER_EMOJI_GROUPS[0].label);
  const visibleReactions = reactions.filter((reaction) => reaction.count > 0 || reaction.mine);
  const group = BANTER_EMOJI_GROUPS.find((entry) => entry.label === activeGroup) ?? BANTER_EMOJI_GROUPS[0];

  function choose(reaction: BanterReactionKey) {
    onReact(id, reaction, targetType, replyId);
    setOpen(false);
  }

  return (
    <div style={{ display: "flex", alignItems: "center", gap: 7, marginTop: compact ? 0 : 9, flexWrap: "wrap" }}>
      {visibleReactions.map((reaction) => (
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
      <span className="wc-bt-picker-wrap">
        <button
          type="button"
          className="wc-bt-add"
          onClick={() => setOpen((current) => !current)}
          aria-label="Add reaction"
        >
          <svg width="13" height="13" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round">
            <circle cx="8" cy="8" r="6" />
            <path d="M5.6 9.2a3 3 0 0 0 4.8 0M6 6.4h.01M10 6.4h.01" />
          </svg>
        </button>
        {open && (
          <span className="wc-bt-picker">
            <span className="wc-bt-picker-tabs">
              {BANTER_EMOJI_GROUPS.map((entry) => (
                <button
                  key={entry.label}
                  type="button"
                  className={entry.label === group.label ? "active" : ""}
                  onClick={() => setActiveGroup(entry.label)}
                >
                  {entry.label}
                </button>
              ))}
            </span>
            <span className="wc-bt-picker-grid">
              {group.emojis.map((emoji) => (
                <button key={emoji} type="button" onClick={() => choose(emoji)} aria-label={`React ${emoji}`}>
                  {emoji}
                </button>
              ))}
            </span>
          </span>
        )}
      </span>
    </div>
  );
}

function BanterReply({
  postId,
  reply,
  members,
  eventReply = false,
  busyReaction,
  onReact,
}: {
  postId: string;
  reply: BanterReplyView;
  members: BanterMemberView[];
  eventReply?: boolean;
  busyReaction: string | null;
  onReact: (id: string, reaction: BanterReactionKey, targetType: BanterTargetType, replyId?: string) => void;
}) {
  return (
    <div style={{ display: "flex", gap: 9, marginTop: 11 }}>
      <BtAvatar short={reply.short} active={reply.isMine} size={26} />
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ display: "flex", alignItems: "baseline", gap: 7, flexWrap: "wrap" }}>
          <span style={{ fontSize: 13, fontWeight: 700, letterSpacing: "-0.01em" }}>{reply.name}</span>
          <span className="wc-num" style={{ fontSize: 10, color: "var(--faint)" }}>{timeAgo(reply.createdAt)}</span>
        </div>
        <div style={{ fontSize: 13.5, lineHeight: 1.45, marginTop: 3, color: "var(--text)" }}>
          {reply.sticker ? <StickerBubble sticker={reply.sticker} /> : <BanterText text={reply.body} members={members} />}
        </div>
        <ReactionRow
          id={postId}
          replyId={reply.id}
          targetType={eventReply ? "eventReply" : "reply"}
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
  members,
  posting,
  onSubmit,
  onCancel,
}: {
  postId: string;
  members: BanterMemberView[];
  posting: boolean;
  onSubmit: (postId: string, body: string, stickerId?: string) => Promise<void>;
  onCancel: () => void;
}) {
  const [body, setBody] = useState("");
  const [stickerOpen, setStickerOpen] = useState(false);

  function insertMention(member: BanterMemberView) {
    setBody((current) => replaceActiveMention(current, member));
  }

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const next = body.trim();
    if (!next || posting) return;
    await onSubmit(postId, next);
    setBody("");
  }

  async function sendSticker(stickerId: string) {
    if (posting) return;
    setStickerOpen(false);
    await onSubmit(postId, "", stickerId);
  }

  return (
    <form onSubmit={handleSubmit} style={{ marginTop: 11, position: "relative" }}>
      <MentionSuggestions body={body} members={members} onChoose={insertMention} />
      <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
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
        <StickerPicker open={stickerOpen} onToggle={() => setStickerOpen((current) => !current)} onSelect={sendSticker} />
        <button className="wc-bt-send" style={{ width: 34, height: 34, borderRadius: 10 }} disabled={!body.trim() || posting} aria-label="Send reply">
          <svg width="15" height="15" viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round">
            <path d="M3.5 10h11M10 5l5 5-5 5" />
          </svg>
        </button>
        <button type="button" className="wc-bt-reply-btn" onClick={onCancel}>Cancel</button>
      </div>
    </form>
  );
}

function BanterMessage({
  post,
  members,
  busyReaction,
  replying,
  postingReply,
  onReact,
  onReply,
  onSubmitReply,
  onCancelReply,
}: {
  post: BanterMessageView;
  members: BanterMemberView[];
  busyReaction: string | null;
  replying: boolean;
  postingReply: boolean;
  onReact: (id: string, reaction: BanterReactionKey, targetType: BanterTargetType, replyId?: string) => void;
  onReply: (target: ReplyTarget) => void;
  onSubmitReply: (postId: string, body: string, stickerId?: string) => Promise<void>;
  onCancelReply: () => void;
}) {
  return (
    <article style={{ display: "flex", gap: 11, padding: "10px 0" }}>
      <BtAvatar short={post.short} active={post.isMine} />
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ display: "flex", alignItems: "baseline", gap: 8, flexWrap: "wrap" }}>
          <span style={{ fontSize: 14.5, fontWeight: 700, letterSpacing: "-0.01em" }}>
            {post.name}
          </span>
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
          {post.sticker ? <StickerBubble sticker={post.sticker} /> : <BanterText text={post.body} members={members} />}
        </div>
        <div style={{ display: "flex", alignItems: "center", gap: 10, flexWrap: "wrap" }}>
          <ReactionRow id={post.id} targetType="post" reactions={post.reactions} busy={busyReaction} onReact={onReact} />
          <button type="button" className="wc-bt-reply-btn" style={{ marginTop: 9 }} onClick={() => onReply({ type: "post", id: post.id })}>
            Reply{post.replyCount ? ` · ${post.replyCount}` : ""}
          </button>
        </div>
        {post.replies.length > 0 && (
          <div style={{ marginTop: 6, marginLeft: 6, paddingLeft: 13, borderLeft: "1.5px solid var(--line)" }}>
            {post.replies.map((reply) => (
              <BanterReply key={reply.id} postId={post.id} reply={reply} members={members} busyReaction={busyReaction} onReact={onReact} />
            ))}
          </div>
        )}
        {replying && (
          <ReplyComposer postId={post.id} members={members} posting={postingReply} onSubmit={onSubmitReply} onCancel={onCancelReply} />
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
  members,
  busyReaction,
  onReact,
  replying,
  postingReply,
  onReply,
  onSubmitReply,
  onCancelReply,
}: {
  item: BanterEventView;
  members: BanterMemberView[];
  busyReaction: string | null;
  onReact: (id: string, reaction: BanterReactionKey, targetType: BanterTargetType, replyId?: string) => void;
  replying: boolean;
  postingReply: boolean;
  onReply: (target: ReplyTarget) => void;
  onSubmitReply: (postId: string, body: string, stickerId?: string) => Promise<void>;
  onCancelReply: () => void;
}) {
  const colors = eventColors(item.accent);
  const { state, body } = splitEventTitle(item.title);
  const icon = item.icon || item.title.trim().split(/\s+/)[0] || "•";
  const displayTitle = state ? body : item.title;
  const fixtureHref = item.fixtureId ? `/fixtures/${encodeURIComponent(item.fixtureId)}` : null;
  return (
    <div style={{ padding: "9px 0" }}>
      <div style={{ display: "flex", justifyContent: "center" }}>
      <div className="wc-card" style={{ width: "100%", maxWidth: 560, padding: "13px 15px 12px", position: "relative", overflow: "hidden" }}>
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
              fontSize: 16,
              background: colors.soft,
              border: `1px solid ${colors.line}`,
            }}
          >
            {icon}
          </div>
          <div style={{ flex: 1, minWidth: 0, position: "relative" }}>
            <span className="wc-num" style={{ position: "absolute", top: 1, right: 0, fontSize: 10.5, color: "var(--faint)", whiteSpace: "nowrap" }}>
              {timeAgo(item.occurredAt)}
            </span>
            <div style={{ fontSize: 14.5, fontWeight: 700, letterSpacing: "-0.01em", lineHeight: 1.3, paddingRight: 82 }}>
              {displayTitle}
            </div>
            <div style={{ fontSize: 12.5, color: "var(--dim)", marginTop: 4, lineHeight: 1.45 }}>{item.sub}</div>
            {fixtureHref && (
              <Link href={fixtureHref} className="wc-bt-reply-btn" style={{ display: "inline-flex", textDecoration: "none", marginTop: 8, color: "var(--lime-ink)" }}>
                Open match →
              </Link>
            )}
            <div style={{ display: "flex", alignItems: "center", gap: 10, flexWrap: "wrap" }}>
              <ReactionRow id={item.id} targetType="event" reactions={item.reactions} busy={busyReaction} onReact={onReact} />
              <button type="button" className="wc-bt-reply-btn" style={{ marginTop: 9 }} onClick={() => onReply({ type: "event", id: item.id })}>
                Reply{item.replyCount ? ` · ${item.replyCount}` : ""}
              </button>
            </div>
          </div>
        </div>
      </div>
      </div>
      {(item.replies.length > 0 || replying) && (
        <div style={{ maxWidth: 560, margin: "7px auto 0", padding: "0 6px" }}>
          {item.replies.map((reply) => (
            <BanterReply
              key={reply.id}
              postId={item.id}
              reply={reply}
              members={members}
              eventReply
              busyReaction={busyReaction}
              onReact={onReact}
            />
          ))}
          {replying && (
            <ReplyComposer postId={item.id} members={members} posting={postingReply} onSubmit={onSubmitReply} onCancel={onCancelReply} />
          )}
        </div>
      )}
    </div>
  );
}

function EventReplyPreview({
  event,
}: {
  event: BanterEventView;
}) {
  const latest = event.replies[event.replies.length - 1];
  if (!latest) return null;
  const repliers = [...new Map(event.replies.map((reply) => [reply.uid, reply])).values()].slice(-3);
  return (
    <div style={{ display: "flex", alignItems: "center", gap: 10, width: "100%" }}>
      <div style={{ display: "flex", flex: "none" }}>
        {repliers.map((reply, i) => (
          <span key={reply.uid} style={{ marginLeft: i ? -8 : 0, borderRadius: 7, boxShadow: "0 0 0 2px var(--surface-2)" }}>
            <BtAvatar short={reply.short} active={reply.isMine} size={22} />
          </span>
        ))}
      </div>
      <span style={{ flex: 1, minWidth: 0, fontSize: 12.5, color: "var(--dim)", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
        <b style={{ color: "var(--text)" }}>{latest.isMine ? "You" : latest.name}:</b>{" "}
        {latest.sticker ? latest.sticker.label : latest.body}
      </span>
      <span className="wc-num" style={{ flex: "none", fontSize: 11, fontWeight: 600, color: "var(--lime-ink)", display: "inline-flex", alignItems: "center", gap: 5 }}>
        {event.replyCount} {event.replyCount === 1 ? "reply" : "replies"}
        <svg width="11" height="11" viewBox="0 0 12 12" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round">
          <path d="M3 4.5L6 7.5l3-3" />
        </svg>
      </span>
    </div>
  );
}

function LiveMatchThread({
  event,
  members,
  busyReaction,
  replyingTo,
  postingReply,
  onReact,
  onReply,
  onSubmitReply,
  onCancelReply,
}: {
  event: BanterEventView;
  members: BanterMemberView[];
  busyReaction: string | null;
  replyingTo: ReplyTarget | null;
  postingReply: boolean;
  onReact: (id: string, reaction: BanterReactionKey, targetType: BanterTargetType, replyId?: string) => void;
  onReply: (target: ReplyTarget) => void;
  onSubmitReply: (postId: string, body: string, stickerId?: string) => Promise<void>;
  onCancelReply: () => void;
}) {
  const details = parseMatchEvent(event);
  const isExpanded = replyingTo?.type === "event" && replyingTo.id === event.id;
  const live = details?.status !== "final";
  const fixtureHref = event.fixtureId ? `/fixtures/${encodeURIComponent(event.fixtureId)}` : null;

  if (!details) {
    return (
      <div className="wc-bt-live-stack">
        <div className="wc-eyebrow" style={{ color: "var(--lime-ink)", marginBottom: 6 }}>Live now</div>
        <BanterEvent
          item={event}
          members={members}
          busyReaction={busyReaction}
          replying={isExpanded}
          postingReply={postingReply}
          onReact={onReact}
          onReply={onReply}
          onSubmitReply={onSubmitReply}
          onCancelReply={onCancelReply}
        />
      </div>
    );
  }

  const TeamSide = ({ side, align }: { side: MatchEventDetails["home"]; align: "left" | "right" }) => (
    <div
      style={{
        flex: 1,
        minWidth: 0,
        display: "flex",
        flexDirection: "column",
        alignItems: align === "right" ? "flex-end" : "flex-start",
        gap: 7,
      }}
    >
      <div style={{ display: "flex", alignItems: "center", gap: 8, flexDirection: align === "right" ? "row-reverse" : "row" }}>
        <TeamEntityLink code={codeForBanterTeam(side)} stopPropagation={false}>
          <span style={{ fontSize: 24, lineHeight: 1 }}>{side.flag}</span>
        </TeamEntityLink>
        <TeamEntityLink code={codeForBanterTeam(side)} stopPropagation={false}>
          <span style={{ fontSize: 16, fontWeight: 800, letterSpacing: "-0.02em", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{side.name}</span>
        </TeamEntityLink>
      </div>
    </div>
  );

  return (
    <div style={{ marginBottom: 18 }}>
      <div
        className="wc-card"
        style={{
          padding: 0,
          overflow: "hidden",
          borderColor: live ? "var(--lime-line)" : "var(--line-2)",
          boxShadow: live ? "0 0 0 1px var(--lime-line), 0 18px 40px -24px var(--lime-line)" : undefined,
        }}
      >
        <LiveMatchMain event={event} details={details} live={live} fixtureHref={fixtureHref} TeamSide={TeamSide} />
        <div style={{ padding: "12px 16px 14px", borderTop: "1px solid var(--line)" }}>
          <ReactionRow id={event.id} targetType="event" reactions={event.reactions} busy={busyReaction} onReact={onReact} compact />
          {event.replies.length > 0 && !isExpanded ? (
            <button
              type="button"
              onClick={() => onReply({ type: "event", id: event.id })}
              style={{
                display: "flex",
                alignItems: "center",
                gap: 10,
                width: "100%",
                background: "var(--surface-2)",
                border: "1px solid var(--line)",
                borderRadius: 11,
                padding: "9px 12px",
                cursor: "pointer",
                fontFamily: "inherit",
                textAlign: "left",
                marginTop: 11,
              }}
            >
              <EventReplyPreview event={event} />
            </button>
          ) : (
            event.replies.length > 0 && (
              <div style={{ marginLeft: 6, paddingLeft: 13, borderLeft: "1.5px solid var(--line)", marginTop: 11 }}>
                {event.replies.map((reply) => (
                  <BanterReply key={reply.id} postId={event.id} reply={reply} members={members} eventReply busyReaction={busyReaction} onReact={onReact} />
                ))}
              </div>
            )
          )}
          {isExpanded && (
            <ReplyComposer postId={event.id} members={members} posting={postingReply} onSubmit={onSubmitReply} onCancel={onCancelReply} />
          )}
          {!isExpanded && (
            <button type="button" className="wc-bt-reply-btn" style={{ marginTop: event.replies.length ? 11 : 9, color: "var(--lime-ink)" }} onClick={() => onReply({ type: "event", id: event.id })}>
              Reply to the match
            </button>
          )}
        </div>
      </div>
    </div>
  );
}

function LiveMatchMain({
  event,
  details,
  live,
  fixtureHref,
  TeamSide,
}: {
  event: BanterEventView;
  details: MatchEventDetails;
  live: boolean;
  fixtureHref: string | null;
  TeamSide: ({ side, align }: { side: MatchEventDetails["home"]; align: "left" | "right" }) => ReactNode;
}) {
  return (
    <>
      <div
        style={{
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          padding: "9px 14px",
          background: live ? "var(--lime-soft)" : "var(--surface-2)",
          borderBottom: "1px solid " + (live ? "var(--lime-line)" : "var(--line)"),
        }}
      >
        <span style={{ display: "inline-flex", alignItems: "center", gap: 8, whiteSpace: "nowrap" }}>
          {live ? (
            <>
              <span className="wc-bt-livedot" />
              <span className="wc-eyebrow" style={{ color: "var(--lime-ink)" }}>Live now</span>
            </>
          ) : (
            <>
              <span style={{ width: 7, height: 7, borderRadius: 2, background: "var(--faint)" }} />
              <span className="wc-eyebrow">Full time</span>
            </>
          )}
        </span>
        <span className="wc-num" style={{ fontSize: 12, fontWeight: 600, color: live ? "var(--lime-ink)" : "var(--faint)", whiteSpace: "nowrap" }}>
          {details.round}{details.round ? " · " : ""}{details.state}
        </span>
      </div>
      <div style={{ display: "flex", alignItems: "center", gap: 16, padding: "16px 18px" }}>
        <TeamSide side={details.home} align="left" />
        <div style={{ display: "flex", alignItems: "center", gap: 10, flex: "none" }}>
          <span className="wc-num" style={{ fontSize: 34, fontWeight: 600, lineHeight: 1, letterSpacing: "-0.02em" }}>{details.home.score}</span>
          <span className="wc-num" style={{ fontSize: 16, color: "var(--faint)" }}>–</span>
          <span className="wc-num" style={{ fontSize: 34, fontWeight: 600, lineHeight: 1, letterSpacing: "-0.02em", color: live ? "var(--text)" : "var(--faint)" }}>{details.away.score}</span>
        </div>
        <TeamSide side={details.away} align="right" />
      </div>
      <div
        style={{
          display: "flex",
          alignItems: "center",
          gap: 10,
          padding: "11px 16px",
          borderTop: "1px solid var(--line)",
          background: live ? "var(--surface-2)" : "var(--gold-soft)",
        }}
      >
        <span style={{ fontSize: 13, flex: "none" }}>{live ? "💸" : "🏆"}</span>
        <span style={{ fontSize: 12.5, color: "var(--dim)", flex: 1, lineHeight: 1.4, minWidth: 0 }}>
          {live ? `${details.round || "Live match"} · reply with match banter` : event.sub}
        </span>
        {fixtureHref && (
          <Link href={fixtureHref} className="wc-bt-open" style={{ fontSize: 12.5, fontWeight: 700, color: live ? "var(--lime-ink)" : "var(--gold)", flex: "none", textDecoration: "none" }}>
            {live ? "Open match" : "Match report"}
            <svg width="14" height="14" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
              <path d="M3 8h9M8 4l4 4-4 4" />
            </svg>
          </Link>
        )}
      </div>
    </>
  );
}

function BanterComposer({
  me,
  members,
  posting,
  onSubmit,
}: {
  me: BanterFeedView["me"] | null;
  members: BanterMemberView[];
  posting: boolean;
  onSubmit: (body: string, stickerId?: string) => Promise<void>;
}) {
  const [body, setBody] = useState("");
  const [stickerOpen, setStickerOpen] = useState(false);
  const remaining = 280 - body.length;

  function insertMention(member: BanterMemberView) {
    setBody((current) => replaceActiveMention(current, member));
  }

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const next = body.trim();
    if (!next || posting) return;
    await onSubmit(next);
    setBody("");
  }

  async function sendSticker(stickerId: string) {
    if (posting) return;
    setStickerOpen(false);
    await onSubmit("", stickerId);
  }

  return (
    <form
      onSubmit={handleSubmit}
      style={{
        position: "relative",
        background: "var(--surface)",
        border: "1px solid var(--line)",
        borderRadius: 16,
        padding: 12,
        margin: "12px 0 14px",
      }}
    >
      <MentionSuggestions body={body} members={members} onChoose={insertMention} />
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
            placeholder="Unasemaje..."
            value={body}
            maxLength={280}
            onChange={(event) => setBody(event.target.value)}
          />
          <span
            className="wc-num"
            style={{
              flex: "0 0 32px",
              textAlign: "right",
              fontSize: 10.5,
              color: remaining < 30 ? "var(--down)" : "var(--faint)",
            }}
          >
            {remaining}
          </span>
        </div>
        <StickerPicker open={stickerOpen} onToggle={() => setStickerOpen((current) => !current)} onSelect={sendSticker} />
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
  const latest = items[0] ?? null;

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

function BanterHeader({
  memberCount,
  notificationCount,
  compact = false,
}: {
  memberCount: number;
  notificationCount: number;
  compact?: boolean;
}) {
  return (
    <div style={{ display: "flex", alignItems: "flex-end", justifyContent: "space-between", marginBottom: 6, gap: 12 }}>
      <div>
        <div style={{ fontSize: compact ? 19 : 22, fontWeight: 800, letterSpacing: "-0.02em" }}>Banter</div>
        <div style={{ fontSize: 13, color: "var(--dim)", marginTop: 3 }}>
          <span style={{ color: "var(--lime-ink)", fontWeight: 600 }}>{memberCount} in the pool</span> · live pool chat
          {notificationCount > 0 && (
            <span className="wc-num" style={{ color: "var(--lime-ink)", fontWeight: 800 }}>
              {" "}· {notificationCount} new
            </span>
          )}
        </div>
      </div>
      <div style={{ display: "flex", gap: 6, flexWrap: "wrap", justifyContent: "flex-end" }}>
        <button className="wc-bt-iconbtn" aria-label="Notifications" style={{ width: 36, height: 36, position: "relative" }}>
          <svg width="17" height="17" viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round">
            <path d="M10 2.5a4.5 4.5 0 0 0-4.5 4.5c0 4-1.5 5.5-1.5 5.5h12s-1.5-1.5-1.5-5.5A4.5 4.5 0 0 0 10 2.5zM8.5 16a1.5 1.5 0 0 0 3 0" />
          </svg>
          {notificationCount > 0 && (
            <span className="wc-num" style={{ position: "absolute", top: -6, right: -6, minWidth: 17, height: 17, borderRadius: 999, background: "var(--lime)", color: "var(--on-lime)", display: "inline-flex", alignItems: "center", justifyContent: "center", fontSize: 9, fontWeight: 800 }}>
              {notificationCount > 9 ? "9+" : notificationCount}
            </span>
          )}
        </button>
        {BANTER_REACTIONS.map((reaction) => (
          <span key={reaction.key} className="wc-bt-react" style={{ pointerEvents: "none" }}>
            <span className="em">{reaction.emoji}</span>
          </span>
        ))}
      </div>
    </div>
  );
}

function searchText(item: BanterFeedItem) {
  if (item.type === "event") {
    return [
      item.title,
      item.sub,
      ...item.replies.flatMap((reply) => [reply.name, reply.short, reply.body, reply.sticker?.label ?? ""]),
    ].join(" ");
  }
  return [
    item.name,
    item.short,
    item.body,
    item.sticker?.label ?? "",
    ...item.replies.flatMap((reply) => [reply.name, reply.short, reply.body, reply.sticker?.label ?? ""]),
  ].join(" ");
}

function matchesBanterSearch(item: BanterFeedItem, query: string) {
  const needle = query.trim().toLowerCase();
  if (!needle) return true;
  return searchText(item).toLowerCase().includes(needle);
}

function BanterSearch({ value, onChange }: { value: string; onChange: (value: string) => void }) {
  const [open, setOpen] = useState(Boolean(value));
  return (
    <span className="wc-bt-search-wrap">
      <button
        type="button"
        className={"wc-bt-search-toggle" + (open || value ? " active" : "")}
        onClick={() => setOpen((current) => !current)}
        aria-label={open ? "Close banter search" : "Search banter"}
        title="Search banter"
      >
        <svg width="15" height="15" viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round">
          <circle cx="9" cy="9" r="5.5" />
          <path d="m13.5 13.5 3 3" />
        </svg>
      </button>
      {open && (
        <span className="wc-bt-search-popover">
          <svg width="15" height="15" viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round">
            <circle cx="9" cy="9" r="5.5" />
            <path d="m13.5 13.5 3 3" />
          </svg>
          <input
            value={value}
            onChange={(event) => onChange(event.target.value)}
            placeholder="Search banter..."
            aria-label="Search banter"
            autoFocus
          />
          {value && (
            <button type="button" onClick={() => onChange("")} aria-label="Clear banter search">
              <svg width="13" height="13" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round">
                <path d="M4 4l8 8M12 4l-8 8" />
              </svg>
            </button>
          )}
        </span>
      )}
    </span>
  );
}

export function BanterScreen() {
  const { user } = useAuth();
  const [feed, setFeed] = useState<BanterFeedView | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [search, setSearch] = useState("");
  const [posting, setPosting] = useState(false);
  const [postingReply, setPostingReply] = useState(false);
  const [busyReaction, setBusyReaction] = useState<string | null>(null);
  const [replyingTo, setReplyingTo] = useState<ReplyTarget | null>(null);

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

  const submitPost = useCallback(async (body: string, stickerId?: string) => {
    if (!user) return;
    setPosting(true);
    try {
      const token = await user.getIdToken();
      const res = await fetch("/api/banter", {
        method: "POST",
        headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
        body: JSON.stringify({ body, stickerId }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "Failed to post");
      await loadFeed();
    } finally {
      setPosting(false);
    }
  }, [loadFeed, user]);

  const submitReply = useCallback(async (parentId: string, body: string, stickerId?: string, parentType: "post" | "event" = "post") => {
    if (!user) return;
    setPostingReply(true);
    try {
      const token = await user.getIdToken();
      const res = await fetch("/api/banter", {
        method: "POST",
        headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
        body: JSON.stringify({ parentId, parentType, body, stickerId }),
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
    targetType: BanterTargetType,
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
  const searchedItems = useMemo(() => items.filter((item) => matchesBanterSearch(item, search)), [items, search]);
  const posts = feed?.posts ?? items.filter((item): item is BanterMessageView => item.type === "message");
  const members = feed?.members ?? [];
  const liveEvents = searchedItems.filter((item): item is BanterEventView => item.type === "event" && item.accent === "lime");
  const pinnedEventThreads = useMemo(
    () => new Set(liveEvents.map((item) => item.id.replace(/-(live|finished)$/i, ""))),
    [liveEvents],
  );
  const streamItems = searchedItems.filter((item) => {
    if (item.type !== "event") return true;
    if (liveEvents.some((event) => event.id === item.id)) return false;
    return !pinnedEventThreads.has(item.id.replace(/-(live|finished)$/i, ""));
  });
  const renderContent = () => {
    if (loading) {
      return <div className="wc-card" style={{ padding: 28, marginTop: 16, color: "var(--dim)" }}>Loading banter...</div>;
    }
    if (!items.length) {
      return (
        <>
          <BanterComposer me={feed?.me ?? null} members={members} posting={posting} onSubmit={submitPost} />
          <BanterEmpty />
        </>
      );
    }
    if (!searchedItems.length) {
      return (
        <div className="wc-card" style={{ padding: 28, marginTop: 16, color: "var(--dim)", textAlign: "center" }}>
          No banter matches “{search.trim()}”.
        </div>
      );
    }
    return (
      <div>
        {liveEvents.map((event) => (
          <LiveMatchThread
            key={event.id}
            event={event}
            members={members}
            busyReaction={busyReaction}
            replyingTo={replyingTo}
            postingReply={postingReply}
            onReact={react}
            onReply={setReplyingTo}
            onSubmitReply={(postId, body, stickerId) => submitReply(postId, body, stickerId, "event")}
            onCancelReply={() => setReplyingTo(null)}
          />
        ))}
        <BanterComposer me={feed?.me ?? null} members={members} posting={posting} onSubmit={submitPost} />
        {streamItems.map((item) => item.type === "event" ? (
          <BanterEvent
            key={item.id}
            item={item}
            members={members}
            busyReaction={busyReaction}
            replying={replyingTo?.type === "event" && replyingTo.id === item.id}
            postingReply={postingReply}
            onReact={react}
            onReply={setReplyingTo}
            onSubmitReply={(postId, body, stickerId) => submitReply(postId, body, stickerId, "event")}
            onCancelReply={() => setReplyingTo(null)}
          />
        ) : (
          <BanterMessage
            key={item.id}
            post={item}
            members={members}
            busyReaction={busyReaction}
            replying={replyingTo?.type === "post" && replyingTo.id === item.id}
            postingReply={postingReply}
            onReact={react}
            onReply={setReplyingTo}
            onSubmitReply={(postId, body, stickerId) => submitReply(postId, body, stickerId, "post")}
            onCancelReply={() => setReplyingTo(null)}
          />
        ))}
        {!streamItems.length && liveEvents.length > 0 && (
          <div className="wc-card" style={{ padding: 22, marginTop: 14, color: "var(--dim)", textAlign: "center" }}>
            No banter yet. Live match threads are pinned above.
          </div>
        )}
      </div>
    );
  };

  return (
    <>
      <div className="wc-desktop-only" style={{ maxWidth: 1120, margin: "0 auto", padding: "22px 28px 0" }}>
        <div style={{ display: "grid", gridTemplateColumns: "minmax(0, 1fr) 320px", gap: 28, alignItems: "start" }}>
          <div style={{ display: "flex", flexDirection: "column", minHeight: 0 }}>
            <BanterHeader
              memberCount={feed?.memberCount ?? 0}
              notificationCount={feed?.notificationCount ?? 0}
            />
            {error && <div className="wc-notice" style={{ margin: "12px 0" }}>{error}</div>}
            {renderContent()}
          </div>
          <BanterRail items={items} posts={posts} />
        </div>
      </div>

      <div className="wc-mobile-only" style={{ display: "flex", flexDirection: "column", minHeight: "100%", padding: "10px 16px 0" }}>
        <BanterHeader
          memberCount={feed?.memberCount ?? 0}
          notificationCount={feed?.notificationCount ?? 0}
          compact
        />
        {error && <div className="wc-notice" style={{ margin: "12px 0" }}>{error}</div>}
        {renderContent()}
      </div>
    </>
  );
}
