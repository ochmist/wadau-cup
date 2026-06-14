import { NextRequest, NextResponse } from "next/server";
import { FieldValue } from "firebase-admin/firestore";
import { adminDb } from "@/lib/firebase-admin";
import { POOL_ID, matchDataConfig } from "@/lib/config";
import { AdminAuthError, verifyAdminToken } from "@/lib/server/admin-guard";
import { getKnownFixtureUpdates, getMatchAdapterState } from "@/lib/server/match-adapter";
import { buildResultDoc } from "@/lib/server/result-doc";
import { recomputeStandings } from "@/lib/server/recompute-standings";
import type { PlayerDoc, ResultDoc } from "@/lib/types";
import type { FixtureDoc } from "@/lib/types";

export const dynamic = "force-dynamic";

const MIN_COMPLETE_FIXTURE_COUNT = 64;

async function authorized(req: NextRequest) {
  const configured = matchDataConfig.syncCronSecret;
  const supplied =
    req.headers.get("x-cron-secret") ||
    req.headers.get("authorization")?.replace(/^Bearer\s+/i, "");

  if (configured) return supplied === configured;
  if (process.env.FIRESTORE_EMULATOR_HOST) return true;
  return false;
}

async function authorizedSyncRequest(req: NextRequest) {
  if (await authorized(req)) return true;
  try {
    await verifyAdminToken(req, { requireRecent: true });
    return true;
  } catch (error) {
    if (error instanceof AdminAuthError) throw error;
    return false;
  }
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

function withoutUndefined<T>(value: T): T {
  if (Array.isArray(value)) return value.map(withoutUndefined) as T;
  if (!value || typeof value !== "object") return value;
  return Object.fromEntries(
    Object.entries(value as Record<string, unknown>)
      .filter(([, child]) => child !== undefined)
      .map(([key, child]) => [key, withoutUndefined(child)]),
  ) as T;
}

function hasLiveWindow(fixtures: FixtureDoc[], now = Date.now()) {
  return fixtures.some((fixture) => {
    if (fixture.status === "live") return true;
    const kickoff = Date.parse(fixture.kickoffAt);
    if (Number.isNaN(kickoff)) return false;
    return now >= kickoff - 20 * 60 * 1000 && now <= kickoff + 150 * 60 * 1000;
  });
}

function hasUnrecordedPastFixture(fixtures: FixtureDoc[], resultIds: Set<string>, now = Date.now()) {
  return fixtures.some((fixture) => {
    if (resultIds.has(fixture.id)) return false;
    const kickoff = Date.parse(fixture.kickoffAt);
    if (Number.isNaN(kickoff)) return false;
    return now > kickoff + 120 * 60 * 1000;
  });
}

function pollableKnownFixtureCount(fixtures: (FixtureDoc & { id: string })[], resultIds: Set<string>, now = Date.now()) {
  return fixtures.filter((fixture) => {
    if (!fixture.sourceIds?.apiFootball) return false;
    if (fixture.status === "live") return true;
    if (resultIds.has(fixture.id)) return false;
    const kickoff = Date.parse(fixture.kickoffAt);
    return !Number.isNaN(kickoff) && now >= kickoff - 20 * 60 * 1000 && now <= kickoff + 36 * 60 * 60 * 1000;
  }).length;
}

export async function POST(req: NextRequest) {
  if (!adminDb) {
    return NextResponse.json({ error: "Admin SDK not configured" }, { status: 503 });
  }

  try {
    if (!(await authorizedSyncRequest(req))) {
      return NextResponse.json({ error: "Unauthorized sync request" }, { status: 401 });
    }

    const statusRef = adminDb.doc(`pools/${POOL_ID}/sync/status`);
    const [statusSnap, existingFixturesSnap, existingResultsSnap, existingLiveSnap] = await Promise.all([
      statusRef.get(),
      adminDb.collection(`pools/${POOL_ID}/fixtures`).get(),
      adminDb.collection(`pools/${POOL_ID}/results`).get(),
      adminDb.collection(`pools/${POOL_ID}/liveState`).get(),
    ]);
    const cachedFixtures = existingFixturesSnap.docs.map((doc) => ({ ...(doc.data() as FixtureDoc), id: doc.id }));
    const existingResults = new Map(
      existingResultsSnap.docs.map((doc) => [doc.id, { ...(doc.data() as ResultDoc), id: doc.id }]),
    );
    const existingResultIds = new Set(existingResults.keys());
    const lastFixtureSyncMs = timestampMillis(statusSnap.get("fixtureSyncedAt") ?? statusSnap.get("syncedAt"));
    const mode = req.nextUrl.searchParams.get("mode");
    const force = req.nextUrl.searchParams.get("force") === "1";
    const needsDailyFixtureRefresh = !lastFixtureSyncMs || Date.now() - lastFixtureSyncMs > 24 * 60 * 60 * 1000;
    const liveWindowOpen = hasLiveWindow(cachedFixtures);
    const needsResultCatchup = hasUnrecordedPastFixture(cachedFixtures, existingResultIds);

    const useFullFixtureRefresh = force || mode === "fixtures" || (!mode && needsDailyFixtureRefresh);

    if (!useFullFixtureRefresh && cachedFixtures.length > 0 && !liveWindowOpen && !needsResultCatchup) {
      return NextResponse.json({
        ok: true,
        skipped: true,
        syncMode: "live",
        reason: "No match is inside a live polling window.",
        fixtureCount: cachedFixtures.length,
        needsResultCatchup,
      });
    }

    const quotaRef = adminDb.doc(`pools/${POOL_ID}/sync/apiFootball-${quotaDateKey()}`);
    const quotaSnap = await quotaRef.get();
    const apiFootballCalls = Number(quotaSnap.get("calls") ?? 0);
    const apiFootballConfigured = Boolean(matchDataConfig.enableLiveLayer && matchDataConfig.apiFootballApiKey);
    const pollableCount = pollableKnownFixtureCount(cachedFixtures, existingResultIds);
    const estimatedApiFootballCalls = useFullFixtureRefresh ? 800 : Math.max(1, pollableCount) * 4;
    const apiFootballAllowed = !apiFootballConfigured || apiFootballCalls + estimatedApiFootballCalls <= matchDataConfig.apiFootballDailyCap;

    const [adapterState, playersSnap] = await Promise.all([
      useFullFixtureRefresh
        ? getMatchAdapterState({
            enableApiFootball: apiFootballAllowed,
            enableApiFootballFixtures: true,
          })
        : apiFootballAllowed
          ? getKnownFixtureUpdates({
              fixtures: cachedFixtures,
              resultIds: existingResultIds,
            })
          : Promise.resolve({
              fixtures: [],
              liveState: [],
              teamProfiles: [],
              apiFootballCalls: 0,
              warnings: [{ provider: "api-football", message: "Daily live-score quota reached; live poll skipped until tomorrow." }],
              providerConfigured: {
                footballData: Boolean(matchDataConfig.footballDataApiKey),
                apiFootball: Boolean(matchDataConfig.apiFootballApiKey && matchDataConfig.enableLiveLayer),
                openfootball: Boolean(matchDataConfig.openfootballFixturesUrl),
              },
            }),
      adminDb.collection(`pools/${POOL_ID}/players`).get(),
    ]);

    const players = playersSnap.docs.map((doc) => doc.data() as PlayerDoc);

    const batch = adminDb.batch();
    let fixtureCount = 0;
    let liveCount = 0;
    let lockedResultCount = 0;
    let skippedManualCount = 0;
    let clearedFixtureCount = 0;
    let clearedLiveCount = 0;

    const adapterHasCompleteSchedule = useFullFixtureRefresh && adapterState.fixtures.length >= MIN_COMPLETE_FIXTURE_COUNT;
    const preserveCachedFixtures =
      useFullFixtureRefresh &&
      !adapterHasCompleteSchedule &&
      cachedFixtures.length >= MIN_COMPLETE_FIXTURE_COUNT;
    const fixturesToWrite = preserveCachedFixtures ? [] : adapterState.fixtures;

    for (const fixture of fixturesToWrite) {
      const { result: _result, liveState: _liveState, ...fixtureDoc } = fixture;
      batch.set(
        adminDb.doc(`pools/${POOL_ID}/fixtures/${fixture.id}`),
        withoutUndefined({
          ...fixtureDoc,
          lastSyncedAt: FieldValue.serverTimestamp(),
        }),
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

    const nextFixtureIds = new Set(fixturesToWrite.map((fixture) => fixture.id));
    for (const fixtureDoc of existingFixturesSnap.docs) {
      if (nextFixtureIds.has(fixtureDoc.id)) continue;
      if (!useFullFixtureRefresh) continue;
      if (!force && !adapterHasCompleteSchedule && fixtureDoc.get("source") !== "temporary") continue;
      batch.delete(fixtureDoc.ref);
      clearedFixtureCount += 1;
    }

    for (const live of adapterState.liveState) {
      batch.set(
        adminDb.doc(`pools/${POOL_ID}/liveState/${live.fixtureId}`),
        withoutUndefined({
          id: live.fixtureId,
          ...live,
          updatedAt: FieldValue.serverTimestamp(),
        }),
        { merge: true },
      );
      liveCount += 1;
    }
    for (const team of adapterState.teamProfiles) {
      batch.set(
        adminDb.doc(`pools/${POOL_ID}/teams/${team.code}`),
        withoutUndefined({
          ...team,
          updatedAt: FieldValue.serverTimestamp(),
        }),
        { merge: true },
      );
    }
    const nextLiveIds = new Set(adapterState.liveState.map((live) => live.fixtureId));
    for (const liveDoc of existingLiveSnap.docs) {
      if (nextLiveIds.has(liveDoc.id)) continue;
      batch.delete(liveDoc.ref);
      clearedLiveCount += 1;
    }

    batch.set(
      adminDb.doc(`pools/${POOL_ID}/sync/status`),
      {
        providerConfigured: adapterState.providerConfigured,
        warnings: preserveCachedFixtures
          ? [
              ...adapterState.warnings,
              {
                provider: "sync",
                message: `Preserved cached schedule because provider refresh returned only ${adapterState.fixtures.length} fixtures.`,
              },
            ]
          : adapterState.warnings,
        fixtureCount: useFullFixtureRefresh && adapterHasCompleteSchedule ? fixtureCount : cachedFixtures.length,
        liveCount,
        teamProfileCount: adapterState.teamProfiles.length,
        clearedFixtureCount,
        clearedLiveCount,
        lockedResultCount,
        skippedManualCount,
        syncMode: useFullFixtureRefresh ? "fixtures" : "live",
        livePollSeconds: matchDataConfig.livePollSeconds,
        fullTimePollSeconds: matchDataConfig.fullTimePollSeconds,
        syncedAt: FieldValue.serverTimestamp(),
        ...(useFullFixtureRefresh ? { fixtureSyncedAt: FieldValue.serverTimestamp() } : {}),
      },
      { merge: true },
    );

    if (apiFootballConfigured && apiFootballAllowed) {
      batch.set(
        quotaRef,
        {
          date: quotaDateKey(),
          calls: FieldValue.increment(adapterState.apiFootballCalls),
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
      syncMode: useFullFixtureRefresh ? "fixtures" : "live",
      fixtureCount,
      liveCount,
      teamProfileCount: adapterState.teamProfiles.length,
      clearedFixtureCount,
      clearedLiveCount,
      lockedResultCount,
      skippedManualCount,
      warningCount: adapterState.warnings.length,
      apiFootball: {
        configured: apiFootballConfigured,
        allowed: apiFootballAllowed,
        callsBeforeSync: apiFootballCalls,
        callsThisSync: apiFootballConfigured && apiFootballAllowed ? adapterState.apiFootballCalls : 0,
        cap: matchDataConfig.apiFootballDailyCap,
      },
      recompute,
    });
  } catch (error) {
    if (error instanceof AdminAuthError) {
      return NextResponse.json({ error: error.message }, { status: error.status });
    }
    console.error("[sync-results]", error);
    return NextResponse.json({ error: (error as Error).message }, { status: 500 });
  }
}

export async function GET(req: NextRequest) {
  return POST(req);
}
