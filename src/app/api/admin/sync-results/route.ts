import { NextRequest, NextResponse } from "next/server";
import { FieldValue } from "firebase-admin/firestore";
import { adminDb } from "@/lib/firebase-admin";
import { POOL_ID, matchDataConfig } from "@/lib/config";
import { getMatchAdapterState } from "@/lib/server/match-adapter";
import { buildResultDoc } from "@/lib/server/result-doc";
import { recomputeStandings } from "@/lib/server/recompute-standings";
import type { PlayerDoc, ResultDoc } from "@/lib/types";
import type { FixtureDoc } from "@/lib/types";

export const dynamic = "force-dynamic";

function authorized(req: NextRequest) {
  const configured = matchDataConfig.syncCronSecret;
  const supplied =
    req.headers.get("x-cron-secret") ||
    req.headers.get("authorization")?.replace(/^Bearer\s+/i, "");

  if (configured) return supplied === configured;

  // Keep local emulator development usable while making production require a secret.
  return Boolean(process.env.FIRESTORE_EMULATOR_HOST);
}

function sameLockedResult(existing: ResultDoc | undefined, next: Omit<ResultDoc, "enteredAt">) {
  return Boolean(
    existing &&
      existing.round === next.round &&
      existing.a === next.a &&
      existing.b === next.b &&
      existing.sa === next.sa &&
      existing.sb === next.sb &&
      existing.win === next.win &&
      existing.pens === next.pens &&
      existing.source === next.source &&
      existing.providerMatchId === next.providerMatchId,
  );
}

function quotaDateKey() {
  return new Date().toISOString().slice(0, 10);
}

function timestampMillis(value: unknown) {
  if (value && typeof value === "object" && "toDate" in value && typeof value.toDate === "function") {
    return value.toDate().getTime();
  }
  return 0;
}

function hasLiveWindow(fixtures: FixtureDoc[], now = Date.now()) {
  return fixtures.some((fixture) => {
    if (fixture.status === "live") return true;
    const kickoff = Date.parse(fixture.kickoffAt);
    if (Number.isNaN(kickoff)) return false;
    return now >= kickoff && now <= kickoff + 150 * 60 * 1000;
  });
}

export async function POST(req: NextRequest) {
  if (!adminDb) {
    return NextResponse.json({ error: "Admin SDK not configured" }, { status: 503 });
  }

  if (!authorized(req)) {
    return NextResponse.json({ error: "Unauthorized sync request" }, { status: 401 });
  }

  try {
    const statusRef = adminDb.doc(`pools/${POOL_ID}/sync/status`);
    const [statusSnap, existingFixturesSnap] = await Promise.all([
      statusRef.get(),
      adminDb.collection(`pools/${POOL_ID}/fixtures`).get(),
    ]);
    const cachedFixtures = existingFixturesSnap.docs.map((doc) => ({ ...(doc.data() as FixtureDoc), id: doc.id }));
    const lastFixtureSyncMs = timestampMillis(statusSnap.get("syncedAt"));
    const force = req.nextUrl.searchParams.get("force") === "1";
    const needsDailyFixtureRefresh = !lastFixtureSyncMs || Date.now() - lastFixtureSyncMs > 24 * 60 * 60 * 1000;
    const liveWindowOpen = hasLiveWindow(cachedFixtures);

    if (!force && cachedFixtures.length > 0 && !needsDailyFixtureRefresh && !liveWindowOpen) {
      return NextResponse.json({
        ok: true,
        skipped: true,
        reason: "No match is inside a live polling window and fixtures were refreshed in the last 24 hours.",
        fixtureCount: cachedFixtures.length,
      });
    }

    const quotaRef = adminDb.doc(`pools/${POOL_ID}/sync/apiFootball-${quotaDateKey()}`);
    const quotaSnap = await quotaRef.get();
    const apiFootballCalls = Number(quotaSnap.get("calls") ?? 0);
    const apiFootballConfigured = Boolean(matchDataConfig.enableLiveLayer && matchDataConfig.apiFootballApiKey);
    const apiFootballAllowed = !apiFootballConfigured || apiFootballCalls < matchDataConfig.apiFootballDailyCap;

    const [adapterState, playersSnap, existingResultsSnap] = await Promise.all([
      getMatchAdapterState({ enableApiFootball: apiFootballAllowed }),
      adminDb.collection(`pools/${POOL_ID}/players`).get(),
      adminDb.collection(`pools/${POOL_ID}/results`).get(),
    ]);

    const players = playersSnap.docs.map((doc) => doc.data() as PlayerDoc);
    const existingResults = new Map(
      existingResultsSnap.docs.map((doc) => [doc.id, { ...(doc.data() as ResultDoc), id: doc.id }]),
    );

    const batch = adminDb.batch();
    let fixtureCount = 0;
    let liveCount = 0;
    let lockedResultCount = 0;
    let skippedManualCount = 0;

    for (const fixture of adapterState.fixtures) {
      const { result: _result, liveState: _liveState, ...fixtureDoc } = fixture;
      batch.set(
        adminDb.doc(`pools/${POOL_ID}/fixtures/${fixture.id}`),
        {
          ...fixtureDoc,
          lastSyncedAt: FieldValue.serverTimestamp(),
        },
        { merge: true },
      );
      fixtureCount += 1;

      if (!fixture.result) continue;
      const existing = existingResults.get(fixture.id);
      if (existing?.manualOverride) {
        skippedManualCount += 1;
        continue;
      }
      const next = buildResultDoc({
        id: fixture.id,
        round: fixture.result.round,
        a: fixture.result.a,
        b: fixture.result.b,
        sa: fixture.result.sa,
        sb: fixture.result.sb,
        win: fixture.result.win,
        pens: fixture.result.pens,
        players,
        source: fixture.result.source,
        providerMatchId: fixture.result.providerMatchId,
        note: `Auto-locked from ${fixture.result.source}.`,
      });
      if (sameLockedResult(existing, next)) continue;
      batch.set(adminDb.doc(`pools/${POOL_ID}/results/${fixture.id}`), {
        ...next,
        enteredAt: FieldValue.serverTimestamp(),
      });
      lockedResultCount += 1;
    }

    for (const live of adapterState.liveState) {
      batch.set(
        adminDb.doc(`pools/${POOL_ID}/liveState/${live.fixtureId}`),
        {
          id: live.fixtureId,
          ...live,
          updatedAt: FieldValue.serverTimestamp(),
        },
        { merge: true },
      );
      liveCount += 1;
    }

    batch.set(
      adminDb.doc(`pools/${POOL_ID}/sync/status`),
      {
        providerConfigured: adapterState.providerConfigured,
        warnings: adapterState.warnings,
        fixtureCount,
        liveCount,
        lockedResultCount,
        skippedManualCount,
        syncedAt: FieldValue.serverTimestamp(),
      },
      { merge: true },
    );

    if (apiFootballConfigured && apiFootballAllowed) {
      batch.set(
        quotaRef,
        {
          date: quotaDateKey(),
          calls: FieldValue.increment(1),
          cap: matchDataConfig.apiFootballDailyCap,
          updatedAt: FieldValue.serverTimestamp(),
        },
        { merge: true },
      );
    }

    await batch.commit();
    const recompute = lockedResultCount > 0 ? await recomputeStandings(adminDb) : null;

    return NextResponse.json({
      ok: true,
      fixtureCount,
      liveCount,
      lockedResultCount,
      skippedManualCount,
      warningCount: adapterState.warnings.length,
      apiFootball: {
        configured: apiFootballConfigured,
        allowed: apiFootballAllowed,
        callsBeforeSync: apiFootballCalls,
        cap: matchDataConfig.apiFootballDailyCap,
      },
      recompute,
    });
  } catch (error) {
    return NextResponse.json({ error: (error as Error).message }, { status: 500 });
  }
}

export async function GET(req: NextRequest) {
  return POST(req);
}
