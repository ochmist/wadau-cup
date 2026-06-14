import { createHash } from "crypto";
import { NextRequest, NextResponse } from "next/server";
import { FieldValue } from "firebase-admin/firestore";
import { adminDb, adminStorage } from "@/lib/firebase-admin";
import { POOL_ID, matchDataConfig } from "@/lib/config";
import { AdminAuthError, verifyAdminToken } from "@/lib/server/admin-guard";
import type { PlayerDoc, PoolDoc } from "@/lib/types";

export const dynamic = "force-dynamic";

async function authorized(req: NextRequest) {
  const configured = matchDataConfig.syncCronSecret;
  const supplied =
    req.headers.get("x-cron-secret") ||
    req.headers.get("authorization")?.replace(/^Bearer\s+/i, "");

  if (configured) return supplied === configured;
  return Boolean(process.env.FIRESTORE_EMULATOR_HOST);
}

async function authorizedBackupRequest(req: NextRequest) {
  if (await authorized(req)) return true;
  try {
    await verifyAdminToken(req, { requireRecent: true });
    return true;
  } catch (error) {
    if (error instanceof AdminAuthError) throw error;
    return false;
  }
}

function isoFromTimestamp(value: unknown) {
  if (value && typeof value === "object" && "toDate" in value && typeof value.toDate === "function") {
    return value.toDate().toISOString();
  }
  return null;
}

function backupId(date = new Date()) {
  return date.toISOString().replace(/[:.]/g, "-");
}

function backupBucketCandidates() {
  const projectId = process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID ?? "wadau-cup";
  return Array.from(
    new Set(
      [
        process.env.PICKS_BACKUP_STORAGE_BUCKET,
        process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET,
        `${projectId}.appspot.com`,
        `${projectId}.firebasestorage.app`,
      ].filter(Boolean) as string[],
    ),
  );
}

export async function POST(req: NextRequest) {
  if (!adminDb) {
    return NextResponse.json({ error: "Admin SDK not configured" }, { status: 503 });
  }
  try {
    if (!(await authorizedBackupRequest(req))) {
      return NextResponse.json({ error: "Unauthorized backup request" }, { status: 401 });
    }

    const id = backupId();
    const [poolSnap, playersSnap] = await Promise.all([
      adminDb.doc(`pools/${POOL_ID}`).get(),
      adminDb.collection(`pools/${POOL_ID}/players`).get(),
    ]);
    const pool = poolSnap.data() as PoolDoc | undefined;
    const entries = playersSnap.docs
      .map((doc) => ({ uid: doc.id, ...(doc.data() as PlayerDoc) }))
      .filter((player) => player.picks && Object.keys(player.picks).length > 0)
      .map((player) => ({
        uid: player.uid,
        name: player.name,
        short: player.short,
        phone: player.phone,
        approvalStatus: player.approvalStatus ?? "approved",
        paid: player.paid,
        hasDrafted: player.hasDrafted,
        finalGoals: player.finalGoals,
        picks: player.picks,
        joinedAt: isoFromTimestamp(player.joinedAt),
      }))
      .sort((a, b) => a.uid.localeCompare(b.uid));

    const backup = {
      schemaVersion: 1,
      kind: "wadau-cup-picks-backup",
      poolId: POOL_ID,
      createdAt: new Date().toISOString(),
      pool: pool
        ? {
            name: pool.name,
            season: pool.season,
            lockAt: isoFromTimestamp(pool.lockAt),
            buyin: pool.buyin,
            payoutPct: pool.payoutPct,
          }
        : null,
      playerCount: playersSnap.size,
      draftedCount: entries.length,
      entries,
    };
    const json = JSON.stringify(backup, null, 2);
    const checksum = createHash("sha256").update(json).digest("hex");
    const objectPath = `backups/picks/${id}.json`;

    let storageBucket: string | null = null;
    let storagePath: string | null = null;
    let storageError: string | null = null;
    if (adminStorage) {
      for (const bucketName of backupBucketCandidates()) {
        try {
          const bucket = adminStorage.bucket(bucketName);
          await bucket.file(objectPath).save(json, {
            contentType: "application/json",
            metadata: {
              cacheControl: "private, max-age=0, no-cache",
              metadata: {
                poolId: POOL_ID,
                checksumSha256: checksum,
                kind: "wadau-cup-picks-backup",
              },
            },
          });
          storageBucket = bucket.name;
          storagePath = objectPath;
          storageError = null;
          break;
        } catch (error) {
          storageError = (error as Error).message;
        }
      }
    } else {
      storageError = "Admin Storage SDK not configured.";
    }
    if (storageError) {
      storageError = storageError.slice(0, 500);
    }

    const metadata: Record<string, unknown> = {
      kind: "picks",
      schemaVersion: 1,
      storageBucket,
      storagePath,
      checksumSha256: checksum,
      playerCount: playersSnap.size,
      draftedCount: entries.length,
      createdAt: FieldValue.serverTimestamp(),
    };
    if (storageError) metadata.storageError = storageError;
    // Local/emulator fallback: keep the payload when Storage is unavailable.
    if (!storagePath) metadata.payload = backup;

    await adminDb.doc(`pools/${POOL_ID}/backups/${id}`).set(metadata);

    return NextResponse.json({
      ok: true,
      id,
      storageBucket,
      storagePath,
      storageError,
      checksumSha256: checksum,
      playerCount: playersSnap.size,
      draftedCount: entries.length,
    });
  } catch (error) {
    if (error instanceof AdminAuthError) {
      return NextResponse.json({ error: error.message }, { status: error.status });
    }
    return NextResponse.json({ error: (error as Error).message }, { status: 500 });
  }
}

export async function GET(req: NextRequest) {
  return POST(req);
}
