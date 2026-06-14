import { T } from "@/lib/data";

export const BANTER_REACTIONS = [
  { key: "laugh", emoji: "😂", label: "Laugh" },
  { key: "fire", emoji: "🔥", label: "Fire" },
  { key: "eyes", emoji: "👀", label: "Eyes" },
  { key: "ball", emoji: "⚽", label: "Ball" },
] as const satisfies readonly { key: string; emoji: string; label: string }[];

export const BANTER_EMOJI_GROUPS = [
  {
    label: "Smileys",
    emojis: "😀 😃 😄 😁 😆 😅 😂 🤣 🥲 😊 😇 🙂 🙃 😉 😌 😍 🥰 😘 😗 😙 😚 😋 😛 😜 🤪 😝 🤑 🤗 🤭 🫢 🫣 🤫 🤔 🫡 🤐 🤨 😐 😑 😶 🫥 😏 😒 🙄 😬 😮‍💨 🤥 😌 😔 😪 🤤 😴 😷 🤒 🤕 🤢 🤮 🤧 🥵 🥶 🥴 😵 🤯 🤠 🥳 🥸 😎 🤓 🧐 😕 🫤 😟 🙁 ☹️ 😮 😯 😲 😳 🥺 🥹 😦 😧 😨 😰 😥 😢 😭 😱 😖 😣 😞 😓 😩 😫 🥱 😤 😡 😠 🤬 😈 👿 💀 ☠️ 💩 🤡 👻 👽 🤖".split(" "),
  },
  {
    label: "People",
    emojis: "👋 🤚 🖐️ ✋ 🖖 🫱 🫲 🫳 🫴 👌 🤌 🤏 ✌️ 🤞 🫰 🤟 🤘 🤙 👈 👉 👆 🖕 👇 ☝️ 👍 👎 ✊ 👊 🤛 🤜 👏 🙌 🫶 👐 🤲 🤝 🙏 ✍️ 💅 🤳 💪 🦾 🦵 🦶 👂 👃 🧠 🫀 🫁 🦷 🦴 👀 👁️ 👅 👄 🫦 👶 🧒 👦 👧 🧑 👱 👨 🧔 👩 🧓 👴 👵 🙍 🙎 🙅 🙆 💁 🙋 🧏 🙇 🤦 🤷 🧑‍⚕️ 🧑‍🎓 🧑‍🏫 🧑‍⚖️ 🧑‍🌾 🧑‍🍳 🧑‍🔧 🧑‍🏭 🧑‍💼 🧑‍🔬 🧑‍💻 🧑‍🎤 🧑‍🎨 🧑‍✈️ 🧑‍🚀 🧑‍🚒 🥷 🦸 🦹 🧙 🧚 🧛 🧜 🧝 🧞 🧟".split(" "),
  },
  {
    label: "Animals",
    emojis: "🐶 🐱 🐭 🐹 🐰 🦊 🐻 🐼 🐻‍❄️ 🐨 🐯 🦁 🐮 🐷 🐽 🐸 🐵 🙈 🙉 🙊 🐒 🐔 🐧 🐦 🐤 🐣 🐥 🦆 🦅 🦉 🦇 🐺 🐗 🐴 🦄 🫎 🐝 🪱 🐛 🦋 🐌 🐞 🐜 🪰 🪲 🪳 🦟 🦗 🕷️ 🕸️ 🦂 🐢 🐍 🦎 🦖 🦕 🐙 🦑 🦐 🦞 🦀 🪼 🐡 🐠 🐟 🐬 🐳 🐋 🦈 🦭 🐊 🐅 🐆 🦓 🦍 🦧 🦣 🐘 🦛 🦏 🐪 🐫 🦒 🦘 🦬 🐃 🐂 🐄 🐎 🐖 🐏 🐑 🦙 🐐 🦌 🐕 🐩 🦮 🐕‍🦺 🐈 🐈‍⬛ 🪶 🐓 🦃 🦤 🦚 🦜 🪽 🐇 🦝 🦨 🦡 🦫 🦦 🦥 🐁 🐀 🐿️ 🦔".split(" "),
  },
  {
    label: "Food",
    emojis: "🍏 🍎 🍐 🍊 🍋 🍌 🍉 🍇 🍓 🫐 🍈 🍒 🍑 🥭 🍍 🥥 🥝 🍅 🫒 🥑 🍆 🥔 🥕 🌽 🌶️ 🫑 🥒 🥬 🥦 🧄 🧅 🥜 🫘 🌰 🫚 🫛 🍞 🥐 🥖 🫓 🥨 🥯 🥞 🧇 🧀 🍖 🍗 🥩 🥓 🍔 🍟 🍕 🌭 🥪 🌮 🌯 🫔 🥙 🧆 🥚 🍳 🥘 🍲 🫕 🥣 🥗 🍿 🧈 🧂 🥫 🍱 🍘 🍙 🍚 🍛 🍜 🍝 🍠 🍢 🍣 🍤 🍥 🥮 🍡 🥟 🥠 🥡 🦪 🍦 🍧 🍨 🍩 🍪 🎂 🍰 🧁 🥧 🍫 🍬 🍭 🍮 🍯 🍼 🥛 ☕ 🫖 🍵 🍶 🍾 🍷 🍸 🍹 🍺 🍻 🥂 🥃 🫗 🥤 🧋 🧃 🧉 🧊".split(" "),
  },
  {
    label: "Activity",
    emojis: "⚽ 🏀 🏈 ⚾ 🥎 🎾 🏐 🏉 🥏 🎱 🪀 🏓 🏸 🏒 🏑 🥍 🏏 🪃 🥅 ⛳ 🪁 🏹 🎣 🤿 🥊 🥋 🎽 🛹 🛼 🛷 ⛸️ 🥌 🎿 ⛷️ 🏂 🪂 🏋️ 🤼 🤸 ⛹️ 🤺 🤾 🏌️ 🏇 🧘 🏄 🏊 🤽 🚣 🧗 🚵 🚴 🏆 🥇 🥈 🥉 🏅 🎖️ 🏵️ 🎗️ 🎫 🎟️ 🎪 🤹 🎭 🩰 🎨 🎬 🎤 🎧 🎼 🎹 🥁 🪘 🎷 🎺 🪗 🎸 🪕 🎻 🎲 ♟️ 🎯 🎳 🎮 🎰 🧩".split(" "),
  },
  {
    label: "Travel",
    emojis: "🚗 🚕 🚙 🚌 🚎 🏎️ 🚓 🚑 🚒 🚐 🛻 🚚 🚛 🚜 🦯 🦽 🦼 🛴 🚲 🛵 🏍️ 🛺 🚨 🚔 🚍 🚘 🚖 🚡 🚠 🚟 🚃 🚋 🚞 🚝 🚄 🚅 🚈 🚂 🚆 🚇 🚊 🚉 ✈️ 🛫 🛬 🛩️ 💺 🛰️ 🚀 🛸 🚁 🛶 ⛵ 🚤 🛥️ 🛳️ ⛴️ 🚢 ⚓ 🛟 🗽 🗿 🗼 🏰 🏯 🏟️ 🎡 🎢 🎠 ⛲ ⛱️ 🏖️ 🏝️ 🏜️ 🌋 ⛰️ 🏔️ 🗻 🏕️ ⛺ 🛖 🏠 🏡 🏘️ 🏚️ 🏗️ 🏭 🏢 🏬 🏣 🏤 🏥 🏦 🏨 🏪 🏫 🏩 💒 🏛️ ⛪ 🕌 🕍 🛕 🕋 ⛩️".split(" "),
  },
  {
    label: "Objects",
    emojis: "⌚ 📱 📲 💻 ⌨️ 🖥️ 🖨️ 🖱️ 🖲️ 🕹️ 🗜️ 💽 💾 💿 📀 📼 📷 📸 📹 🎥 📽️ 🎞️ 📞 ☎️ 📟 📠 📺 📻 🎙️ 🎚️ 🎛️ 🧭 ⏱️ ⏲️ ⏰ 🕰️ ⌛ ⏳ 📡 🔋 🪫 🔌 💡 🔦 🕯️ 🪔 🧯 🛢️ 💸 💵 💴 💶 💷 🪙 💰 💳 🧾 💎 ⚖️ 🪜 🧰 🪛 🔧 🔨 ⚒️ 🛠️ ⛏️ 🪚 🔩 ⚙️ 🪤 🧱 ⛓️ 🧲 🔫 💣 🧨 🪓 🔪 🗡️ ⚔️ 🛡️ 🚬 ⚰️ 🪦 ⚱️ 🏺 🔮 📿 🧿 🪬 💈 ⚗️ 🔭 🔬 🕳️ 🩹 🩺 🩻 🩼 💊 💉 🩸 🧬 🦠 🧫 🧪 🌡️ 🧹 🪠 🧺 🧻 🚽 🚿 🛁 🛀 🪥 🪒 🧽 🪣 🧴 🛎️ 🔑 🗝️ 🚪 🪑 🛋️ 🛏️ 🪞 🪟 🧳".split(" "),
  },
  {
    label: "Symbols",
    emojis: "❤️ 🧡 💛 💚 💙 💜 🖤 🤍 🤎 💔 ❤️‍🔥 ❤️‍🩹 ❣️ 💕 💞 💓 💗 💖 💘 💝 💟 ☮️ ✝️ ☪️ 🕉️ ☸️ ✡️ 🔯 🕎 ☯️ ☦️ 🛐 ⛎ ♈ ♉ ♊ ♋ ♌ ♍ ♎ ♏ ♐ ♑ ♒ ♓ 🆔 ⚛️ 🉑 ☢️ ☣️ 📴 📳 🈶 🈚 🈸 🈺 🈷️ ✴️ 🆚 💮 🉐 ㊙️ ㊗️ 🈴 🈵 🈹 🈲 🅰️ 🅱️ 🆎 🆑 🅾️ 🆘 ❌ ⭕ 🛑 ⛔ 📛 🚫 💯 💢 ♨️ 🚷 🚯 🚳 🚱 🔞 📵 🚭 ❗ ❕ ❓ ❔ ‼️ ⁉️ 🔅 🔆 〽️ ⚠️ 🚸 🔱 ⚜️ 🔰 ♻️ ✅ 🈯 💹 ❇️ ✳️ ❎ 🌐 💠 Ⓜ️ 🌀 💤 🏧 🚾 ♿ 🅿️ 🛗 🈳 🈂️ 🛂 🛃 🛄 🛅 🚹 🚺 🚼 ⚧️ 🚻 🚮 🎦 📶 🈁 🔣 ℹ️ 🔤 🔡 🔠 🆖 🆗 🆙 🆒 🆕 🆓 0️⃣ 1️⃣ 2️⃣ 3️⃣ 4️⃣ 5️⃣ 6️⃣ 7️⃣ 8️⃣ 9️⃣ 🔟 🔢 #️⃣ *️⃣ ⏏️ ▶️ ⏸️ ⏯️ ⏹️ ⏺️ ⏭️ ⏮️ ⏩ ⏪ 🔀 🔁 🔂 ◀️ 🔼 🔽 ⬆️ ⬇️ ⬅️ ➡️ ↗️ ↘️ ↙️ ↖️ ↕️ ↔️ 🔄 🔃 🎵 🎶 ➕ ➖ ➗ ✖️ 🟰 ♾️ 💲 💱 ™️ ©️ ®️ 〰️ ➰ ➿ 🔚 🔙 🔛 🔝 🔜 ✔️ ☑️ 🔘 🔴 🟠 🟡 🟢 🔵 🟣 ⚫ ⚪ 🟤 🔺 🔻 🔸 🔹 🔶 🔷 🔳 🔲 ▪️ ▫️ ◾ ◽ ◼️ ◻️ 🟥 🟧 🟨 🟩 🟦 🟪 ⬛ ⬜ 🟫".split(" "),
  },
  {
    label: "Flags",
    emojis: "🇰🇪 🇺🇸 🇨🇦 🇲🇽 🇧🇷 🇦🇷 🇨🇴 🇪🇨 🇺🇾 🇵🇾 🇬🇧 🇫🇷 🇪🇸 🇵🇹 🇩🇪 🇳🇱 🇧🇪 🇭🇷 🇨🇭 🇮🇹 🇳🇴 🇸🇪 🇨🇿 🇧🇦 🇹🇷 🇲🇦 🇸🇳 🇨🇮 🇬🇭 🇹🇳 🇩🇿 🇪🇬 🇿🇦 🇨🇩 🇨🇻 🇶🇦 🇸🇦 🇮🇶 🇯🇴 🇮🇷 🇺🇿 🇯🇵 🇰🇷 🇦🇺 🇳🇿 🇭🇹 🇨🇼 🇵🇦 🏴 🏳️ 🏁 🚩 🏳️‍🌈 🏳️‍⚧️".split(" "),
  },
] as const;

export type BanterReactionKey = string;

export const BANTER_STICKERS = [
  { id: "wueh", emoji: "😮‍💨", label: "Wueh" },
  { id: "goal", emoji: "⚽", label: "Goal!" },
  { id: "var-check", emoji: "📺", label: "VAR check" },
  { id: "cooked", emoji: "🍳", label: "Cooked" },
  { id: "dust", emoji: "💨", label: "Dust" },
  { id: "receipts", emoji: "🧾", label: "Receipts" },
  { id: "pain", emoji: "😭", label: "Pain" },
  { id: "fire", emoji: "🔥", label: "On fire" },
  { id: "eyes", emoji: "👀", label: "Watching" },
  { id: "trophy", emoji: "🏆", label: "Trophy" },
  { id: "clap", emoji: "👏", label: "Clap" },
  { id: "lock", emoji: "🔒", label: "Locked" },
] as const satisfies readonly { id: string; emoji: string; label: string }[];

export type BanterContentKind = "text" | "sticker";

export type BanterStickerView = {
  id: string;
  emoji: string;
  label: string;
};

export type BanterMemberView = {
  uid: string;
  name: string;
  short: string;
};

export type BanterMentionView = BanterMemberView;

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
  kind: BanterContentKind;
  body: string;
  sticker: BanterStickerView | null;
  mentions: BanterMentionView[];
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
  kind: BanterContentKind;
  body: string;
  sticker: BanterStickerView | null;
  mentions: BanterMentionView[];
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
  fixtureId?: string;
  icon: string;
  accent: BanterEventAccent;
  title: string;
  sub: string;
  occurredAt: string;
  reactions: BanterReactionView[];
  reactionTotal: number;
  replies: BanterReplyView[];
  replyCount: number;
  unreadReplyCount: number;
};

export type BanterFeedItem = BanterMessageView | BanterEventView;

export type BanterFeedView = {
  items: BanterFeedItem[];
  posts: BanterMessageView[];
  members: BanterMemberView[];
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
  if (typeof value !== "string") return false;
  if (BANTER_REACTIONS.some((reaction) => reaction.key === value)) return true;
  const knownEmoji = BANTER_EMOJI_GROUPS.some((group) => group.emojis.includes(value));
  if (knownEmoji) return true;
  return value.length <= 16 && /[\p{Extended_Pictographic}\p{Regional_Indicator}]/u.test(value);
}

export function banterReactionMeta(key: string) {
  const preset = BANTER_REACTIONS.find((reaction) => reaction.key === key);
  if (preset) return preset;
  return { key, emoji: key, label: key };
}

export function banterStickerById(value: unknown): BanterStickerView | null {
  if (typeof value !== "string") return null;
  return BANTER_STICKERS.find((sticker) => sticker.id === value) ?? null;
}

export function initials(name: string) {
  const parts = name.trim().split(/\s+/).filter(Boolean);
  return (parts[0]?.[0] + (parts[1]?.[0] ?? parts[0]?.[1] ?? "W")).toUpperCase().slice(0, 2);
}

export function cleanBanterBody(value: unknown) {
  if (typeof value !== "string") return "";
  return value.replace(/\s+/g, " ").trim().slice(0, 280);
}

export function memberMentionKey(value: string) {
  return value.toLowerCase().replace(/[^a-z0-9]+/g, "");
}

export function mentionHandleForMember(member: Pick<BanterMemberView, "name" | "short">) {
  const fromName = member.name.replace(/[^A-Za-z0-9]+/g, "");
  const fromShort = member.short.replace(/[^A-Za-z0-9]+/g, "");
  return fromName || fromShort || "Wadau";
}

export function memberMatchesMentionHandle(rawHandle: string, member: Pick<BanterMemberView, "name" | "short">) {
  const key = memberMentionKey(rawHandle);
  if (!key) return false;
  const fullName = memberMentionKey(member.name);
  const short = memberMentionKey(member.short);
  const first = memberMentionKey(member.name.trim().split(/\s+/)[0] ?? "");
  return key === fullName || key === short || key === first;
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
