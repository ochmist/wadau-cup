import { T } from "@/lib/data";

export const BANTER_REACTIONS = [
  { key: "laugh", emoji: "😂", label: "Laugh" },
  { key: "fire", emoji: "🔥", label: "Fire" },
  { key: "eyes", emoji: "👀", label: "Eyes" },
  { key: "ball", emoji: "⚽", label: "Ball" },
] as const;

export type BanterReactionKey = (typeof BANTER_REACTIONS)[number]["key"];

export type BanterReactionView = {
  key: BanterReactionKey;
  emoji: string;
  label: string;
  count: number;
  mine: boolean;
};

export type BanterReplyView = {
  id: string;
  uid: string;
  name: string;
  short: string;
  body: string;
  createdAt: string;
  reactions: BanterReactionView[];
  reactionTotal: number;
  isMine: boolean;
};

export type BanterMessageView = {
  type: "message";
  id: string;
  uid: string;
  name: string;
  short: string;
  body: string;
  createdAt: string;
  updatedAt?: string | null;
  reactions: BanterReactionView[];
  reactionTotal: number;
  replies: BanterReplyView[];
  replyCount: number;
  unreadReplyCount: number;
  isMine: boolean;
  canDelete: boolean;
};

export type BanterEventAccent = "neutral" | "lime" | "gold" | "down" | "violet";

export type BanterEventView = {
  type: "event";
  id: string;
  icon: string;
  accent: BanterEventAccent;
  title: string;
  sub: string;
  occurredAt: string;
  reactions: BanterReactionView[];
  reactionTotal: number;
};

export type BanterFeedItem = BanterMessageView | BanterEventView;

export type BanterFeedView = {
  items: BanterFeedItem[];
  posts: BanterMessageView[];
  memberCount: number;
  notificationCount: number;
  me: {
    uid: string;
    name: string;
    short: string;
    isAdmin: boolean;
  };
};

export function isBanterReactionKey(value: unknown): value is BanterReactionKey {
  return BANTER_REACTIONS.some((reaction) => reaction.key === value);
}

export function initials(name: string) {
  const parts = name.trim().split(/\s+/).filter(Boolean);
  return (parts[0]?.[0] + (parts[1]?.[0] ?? parts[0]?.[1] ?? "W")).toUpperCase().slice(0, 2);
}

export function cleanBanterBody(value: unknown) {
  if (typeof value !== "string") return "";
  return value.replace(/\s+/g, " ").trim().slice(0, 280);
}

export const teamMentionMap = Object.fromEntries(
  Object.entries(T).flatMap(([code, team]) => {
    const keys = new Set([
      code.toLowerCase(),
      team.n.toLowerCase(),
      team.n.toLowerCase().replace(/[^a-z0-9]+/g, ""),
    ]);
    return [...keys].filter(Boolean).map((key) => [key, code]);
  }),
) as Record<string, string>;
