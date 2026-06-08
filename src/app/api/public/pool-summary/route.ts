import { NextResponse } from "next/server";
import { adminDb } from "@/lib/firebase-admin";
import { POOL_ID, WORLD_CUP_FIRST_KICKOFF_ISO } from "@/lib/config";
import { digitsOnly } from "@/lib/phone";
import type { PlayerDoc, PoolDoc } from "@/lib/types";

function phoneKey(player: Pick<PlayerDoc, "phone">) {
  return digitsOnly(player.phone);
}

function dedupePlayers(players: PlayerDoc[]) {
  const byPhone = new Map<string, PlayerDoc>();
  for (const player of players) {
    const key = phoneKey(player);
    const existing = byPhone.get(key);
    if (!existing) {
      byPhone.set(key, player);
      continue;
    }
    if (player.hasDrafted && !existing.hasDrafted) byPhone.set(key, player);
    else if (player.paid && !existing.paid) byPhone.set(key, player);
  }
  return Array.from(byPhone.values());
}

export async function GET() {
  if (!adminDb) {
    return NextResponse.json({
      buyin: 1000,
      entries: 0,
      paidEntries: 0,
      pot: 0,
      payoutPct: [50, 30, 20],
      lockAt: WORLD_CUP_FIRST_KICKOFF_ISO,
    });
  }

  const [poolSnap, playersSnap] = await Promise.all([
    adminDb.doc(`pools/${POOL_ID}`).get(),
    adminDb.collection(`pools/${POOL_ID}/players`).get(),
  ]);
  const pool = poolSnap.data() as PoolDoc | undefined;
  const buyin = pool?.buyin ?? 1000;
  const payoutPct = pool?.payoutPct ?? [50, 30, 20];
  const players = dedupePlayers(playersSnap.docs.map((doc) => doc.data() as PlayerDoc))
    .filter((player) => (player.approvalStatus ?? "approved") === "approved");
  const entries = players.length;
  const paidEntries = players.filter((player) => player.paid).length;
  const lockAt = pool?.lockAt && "toDate" in pool.lockAt
    ? pool.lockAt.toDate().toISOString()
    : WORLD_CUP_FIRST_KICKOFF_ISO;

  return NextResponse.json({
    buyin,
    entries,
    paidEntries,
    pot: paidEntries * buyin,
    payoutPct,
    lockAt,
  });
}
