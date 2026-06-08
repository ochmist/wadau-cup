import { FieldValue, type Firestore } from "firebase-admin/firestore";
import { POOL_ID } from "@/lib/config";
import { T } from "@/lib/data";
import { computeStandings, type RawPick } from "@/lib/standings";
import type { PlayerDoc, PoolDoc, ResultDoc, Tier } from "@/lib/types";

function displayIdentity(p: Pick<PlayerDoc, "phone" | "name" | "short">) {
  if (p.phone === "+254 700 000 000" && p.name === "Admin") {
    return { name: "Ochmist", short: "OC" };
  }
  return { name: p.name, short: p.short };
}

function playerPhoneKey(p: Pick<RawPick, "uid" | "phone">) {
  return p.phone.replace(/\D/g, "") || p.uid;
}

function pickCount(p: RawPick) {
  return Object.keys(p.picks).length;
}

function preferRawPlayer(existing: RawPick, next: RawPick) {
  const existingPickCount = pickCount(existing);
  const nextPickCount = pickCount(next);
  if (nextPickCount !== existingPickCount) return nextPickCount > existingPickCount ? next : existing;
  if (next.paid !== existing.paid) return next.paid ? next : existing;
  if ((next.prevRank > 0) !== (existing.prevRank > 0)) return next.prevRank > 0 ? next : existing;
  return existing;
}

function uniqueRawPlayersByPhone(players: RawPick[]) {
  const byPhone = new Map<string, RawPick>();
  for (const player of players) {
    const key = playerPhoneKey(player);
    const existing = byPhone.get(key);
    byPhone.set(key, existing ? preferRawPlayer(existing, player) : player);
  }
  return Array.from(byPhone.values());
}

export async function recomputeStandings(db: Firestore, poolId = POOL_ID) {
  const poolSnap = await db.doc(`pools/${poolId}`).get();
  const pool = poolSnap.data() as PoolDoc | undefined;
  const payoutPct: [number, number, number] = pool?.payoutPct ?? [50, 30, 20];
  const buyin = pool?.buyin ?? 1000;
  const round = pool?.round ?? "Round of 16";

  const playersSnap = await db.collection(`pools/${poolId}/players`).get();
  const rawPlayers = uniqueRawPlayersByPhone(playersSnap.docs.map((d) => {
    const p = d.data() as PlayerDoc;
    const identity = displayIdentity(p);
    const picks: Partial<Record<Tier, string>> = {};
    if (p.picks) {
      for (const [tier, entry] of Object.entries(p.picks)) {
        picks[tier as Tier] = entry.code;
      }
    }
    return {
      uid: d.id,
      name: identity.name,
      short: identity.short,
      phone: p.phone,
      paid: p.paid,
      approvalStatus: p.approvalStatus ?? "approved",
      finalGoals: p.finalGoals,
      picks,
      prevRank: p.rank || 0,
    };
  }));

  const resultsSnap = await db.collection(`pools/${poolId}/results`).get();
  const results = resultsSnap.docs.map((d) => ({ ...(d.data() as ResultDoc), id: d.id }));

  const { players, scaleMax } = computeStandings(rawPlayers, results, T, payoutPct, buyin, round);
  const serialized = players.map((p) => ({
    ...p,
    teams: p.teams.map((t) => ({
      ...t,
      name: T[t.code]?.n ?? t.code,
      flag: T[t.code]?.f ?? "🏳",
    })),
  }));

  await db.doc(`pools/${poolId}/standings/current`).set({
    players: serialized,
    scaleMax,
    round,
    computedAt: FieldValue.serverTimestamp(),
  });

  const batch = db.batch();
  for (const p of players) {
    batch.update(db.doc(`pools/${poolId}/players/${p.uid}`), {
      points: p.points,
      ceiling: p.ceiling,
      rank: p.rank,
      prevRank: p.prevRank,
      mover: p.mover,
      payout: p.payout,
      aliveCount: p.aliveCount,
    });
  }
  await batch.commit();

  return { playerCount: players.length, resultCount: results.length, scaleMax, round };
}
