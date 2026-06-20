"use client";
// Firestore client-SDK helpers. All writes requiring admin privileges go through
// /api/admin/* routes. Subscriptions include error callbacks so silent Firestore
// failures don't leave the app hanging in a loading state.

import {
  collection,
  doc,
  getDoc,
  getDocs,
  onSnapshot,
  setDoc,
  serverTimestamp,
  query,
  orderBy,
  type Unsubscribe,
} from "firebase/firestore";
import { db, POOL_ID } from "./firebase";
import type { PlayerDoc, StandingsDoc, JoinRequestDoc, PoolDoc, FixtureDoc, LiveStateDoc, SyncStatusDoc, TeamProfileDoc } from "./types";
import type { ResultDoc } from "./types";
import { draftRemainingByTier, type Tier } from "./data";

function logSubscriptionError(label: string, err: { code?: string; message?: string }) {
  if (err.code === "permission-denied") {
    console.warn(label, err.code, err.message);
  } else {
    console.error(label, err.code, err.message);
  }
}

// ── Collection refs ────────────────────────────────────────────────────────
const poolRef = () => doc(db, "pools", POOL_ID);
const playersCol = () => collection(db, "pools", POOL_ID, "players");
const playerRef = (uid: string) => doc(db, "pools", POOL_ID, "players", uid);
const standingsRef = () => doc(db, "pools", POOL_ID, "standings", "current");
const resultsCol = () => collection(db, "pools", POOL_ID, "results");
const fixturesCol = () => collection(db, "pools", POOL_ID, "fixtures");
const liveStateCol = () => collection(db, "pools", POOL_ID, "liveState");
const teamsCol = () => collection(db, "pools", POOL_ID, "teams");
const syncStatusRef = () => doc(db, "pools", POOL_ID, "sync", "status");
const joinRequestsCol = () => collection(db, "joinRequests");

function normalizePlayerIdentity<T extends { phone: string; name: string; short: string }>(player: T): T {
  if (player.phone === "+254 700 000 000" && player.name === "Admin") {
    return { ...player, name: "Ochmist", short: "OC" };
  }
  return player;
}

function normalizeStandingsDoc(standings: StandingsDoc): StandingsDoc {
  return {
    ...standings,
    players: standings.players.map(normalizePlayerIdentity),
  };
}

// ── Standings real-time listener ──────────────────────────────────────────
export function subscribeStandings(
  cb: (data: StandingsDoc | null) => void,
  onError?: (err: Error) => void,
): Unsubscribe {
  return onSnapshot(
    standingsRef(),
    (snap) => cb(snap.exists() ? normalizeStandingsDoc(snap.data() as StandingsDoc) : null),
    (err) => {
      logSubscriptionError("[subscribeStandings]", err);
      onError?.(err);
    },
  );
}

// ── Pool config real-time listener ────────────────────────────────────────
export function subscribePool(
  cb: (data: PoolDoc | null) => void,
  onError?: (err: Error) => void,
): Unsubscribe {
  return onSnapshot(
    poolRef(),
    (snap) => cb(snap.exists() ? (snap.data() as PoolDoc) : null),
    (err) => {
      logSubscriptionError("[subscribePool]", err);
      onError?.(err);
    },
  );
}

// ── Player doc real-time listener ─────────────────────────────────────────
export function subscribePlayer(
  uid: string,
  cb: (data: PlayerDoc | null) => void,
  onError?: (err: Error) => void,
): Unsubscribe {
  return onSnapshot(
    playerRef(uid),
    (snap) => cb(snap.exists() ? normalizePlayerIdentity(snap.data() as PlayerDoc) : null),
    (err) => {
      logSubscriptionError("[subscribePlayer]", err);
      onError?.(err);
    },
  );
}

export type PlayerWithId = PlayerDoc & { uid: string };

export function subscribePlayers(
  cb: (data: PlayerWithId[]) => void,
  onError?: (err: Error) => void,
): Unsubscribe {
  return onSnapshot(
    query(playersCol(), orderBy("joinedAt", "asc")),
    (snap) => cb(snap.docs.map((d) => ({ uid: d.id, ...normalizePlayerIdentity(d.data() as PlayerDoc) }))),
    (err) => {
      logSubscriptionError("[subscribePlayers]", err);
      onError?.(err);
    },
  );
}

export type ResultWithId = ResultDoc & { id: string };

export function subscribeResults(
  cb: (data: ResultWithId[]) => void,
  onError?: (err: Error) => void,
): Unsubscribe {
  return onSnapshot(
    query(resultsCol(), orderBy("enteredAt", "desc")),
    (snap) => cb(snap.docs.map((d) => ({ ...(d.data() as ResultDoc), id: d.id }))),
    (err) => {
      logSubscriptionError("[subscribeResults]", err);
      onError?.(err);
    },
  );
}

export type FixtureWithId = FixtureDoc & { id: string };

export function subscribeFixtures(
  cb: (data: FixtureWithId[]) => void,
  onError?: (err: Error) => void,
): Unsubscribe {
  return onSnapshot(
    query(fixturesCol(), orderBy("kickoffAt", "asc")),
    (snap) => cb(snap.docs.map((d) => ({ ...(d.data() as FixtureDoc), id: d.id }))),
    (err) => {
      logSubscriptionError("[subscribeFixtures]", err);
      onError?.(err);
    },
  );
}

export type LiveStateWithId = LiveStateDoc & { id: string };

export function subscribeLiveState(
  cb: (data: LiveStateWithId[]) => void,
  onError?: (err: Error) => void,
): Unsubscribe {
  return onSnapshot(
    liveStateCol(),
    (snap) => cb(snap.docs.map((d) => ({ ...(d.data() as LiveStateDoc), id: d.id }))),
    (err) => {
      logSubscriptionError("[subscribeLiveState]", err);
      onError?.(err);
    },
  );
}

export type TeamProfileWithId = TeamProfileDoc & { id: string };

export function subscribeTeamProfiles(
  cb: (data: TeamProfileWithId[]) => void,
  onError?: (err: Error) => void,
): Unsubscribe {
  return onSnapshot(
    teamsCol(),
    (snap) => cb(snap.docs.map((d) => ({ ...(d.data() as TeamProfileDoc), id: d.id }))),
    (err) => {
      logSubscriptionError("[subscribeTeamProfiles]", err);
      onError?.(err);
    },
  );
}

export function subscribeSyncStatus(
  cb: (data: SyncStatusDoc | null) => void,
  onError?: (err: Error) => void,
): Unsubscribe {
  return onSnapshot(
    syncStatusRef(),
    (snap) => cb(snap.exists() ? (snap.data() as SyncStatusDoc) : null),
    (err) => {
      logSubscriptionError("[subscribeSyncStatus]", err);
      onError?.(err);
    },
  );
}

// ── Write draft picks ─────────────────────────────────────────────────────
export async function savePicks(
  uid: string,
  picks: Record<Tier, string>,
  finalGoals: number,
): Promise<void> {
  await setDoc(
    playerRef(uid),
    {
      picks: Object.fromEntries(
        Object.entries(picks).map(([t, code]) => [
          t,
          { code, pts: 0, rem: draftRemainingByTier[t as Tier] ?? 0, alive: true },
        ]),
      ),
      finalGoals,
      hasDrafted: true,
    },
    { merge: true },
  );
}

// ── Admin: fetch all players (one-shot) ───────────────────────────────────
export async function fetchAllPlayers(): Promise<(PlayerDoc & { uid: string })[]> {
  const snap = await getDocs(query(playersCol(), orderBy("rank")));
  return snap.docs.map((d) => ({ uid: d.id, ...normalizePlayerIdentity(d.data() as PlayerDoc) }));
}

// ── Fetch standings (one-shot) ────────────────────────────────────────────
export async function fetchStandings(): Promise<StandingsDoc | null> {
  const snap = await getDoc(standingsRef());
  return snap.exists() ? normalizeStandingsDoc(snap.data() as StandingsDoc) : null;
}

// ── Fetch results (one-shot) ──────────────────────────────────────────────
export async function fetchResults() {
  const snap = await getDocs(query(resultsCol(), orderBy("enteredAt", "desc")));
  return snap.docs.map((d) => ({ id: d.id, ...d.data() }));
}

// ── Admin: live pending join requests ─────────────────────────────────────
export type JoinRequestWithId = JoinRequestDoc & { id: string };

export function subscribePendingJoinRequests(
  cb: (data: JoinRequestWithId[]) => void,
  onError?: (err: Error) => void,
): Unsubscribe {
  return onSnapshot(
    query(joinRequestsCol(), orderBy("requestedAt", "desc")),
    (snap) => {
      const requests = snap.docs
        .map((d) => ({ id: d.id, ...(d.data() as JoinRequestDoc) }))
        .filter((r) => r.poolId === POOL_ID && r.status === "pending");
      cb(requests);
    },
    (err) => {
      console.error("[subscribePendingJoinRequests]", err.code, err.message);
      onError?.(err);
    },
  );
}

// ── Submit join request (public, client-side fallback) ────────────────────
export async function submitJoinRequest(
  name: string,
  cc: string,
  phone: string,
  password: string,
): Promise<void> {
  const res = await fetch("/api/join", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ name, cc, phone, password }),
  });
  if (!res.ok) {
    const data = await res.json().catch(() => null);
    throw new Error(data?.error ?? "Failed to submit request.");
  }
}
