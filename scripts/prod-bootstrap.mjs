#!/usr/bin/env node
// Production bootstrap for Wadau Cup.
//
// This script is intentionally separate from scripts/seed.mjs. It does not
// create sample players or sample results. It creates real admin-player
// accounts with one-time temp passwords, seeds the pool and team dictionary,
// and optionally triggers the deployed fixture sync endpoint.
//
// Usage:
//   PROD_BOOTSTRAP=1 node scripts/prod-bootstrap.mjs

import { existsSync, readFileSync } from "fs";
import { randomInt } from "crypto";
import { initializeApp, getApps, cert } from "firebase-admin/app";
import { getAuth } from "firebase-admin/auth";
import { getFirestore, FieldValue, Timestamp } from "firebase-admin/firestore";

const IGNORED_LOCAL_KEYS = new Set([
  "FIRESTORE_EMULATOR_HOST",
  "FIREBASE_AUTH_EMULATOR_HOST",
  "NEXT_PUBLIC_USE_EMULATOR",
  "NEXT_PUBLIC_FIREBASE_EMULATOR_PROJECT_ID",
  "FIREBASE_EMULATOR_PROJECT_ID",
]);

function stripQuotes(value) {
  const trimmed = value.trim();
  if (
    (trimmed.startsWith('"') && trimmed.endsWith('"')) ||
    (trimmed.startsWith("'") && trimmed.endsWith("'"))
  ) {
    return trimmed.slice(1, -1);
  }
  return trimmed;
}

function loadEnvLocal() {
  if (!existsSync(".env.local")) return;
  for (const line of readFileSync(".env.local", "utf8").split("\n")) {
    const m = line.match(/^([^#=]+)=(.*)$/);
    if (!m) continue;
    const key = m[1].trim();
    if (IGNORED_LOCAL_KEYS.has(key) || process.env[key]) continue;
    process.env[key] = stripQuotes(m[2]);
  }
}

loadEnvLocal();

if (process.env.PROD_BOOTSTRAP !== "1" && !process.argv.includes("--yes")) {
  console.error("Refusing to run without PROD_BOOTSTRAP=1.");
  console.error("This script writes production Auth and Firestore data.");
  process.exit(1);
}

delete process.env.FIRESTORE_EMULATOR_HOST;
delete process.env.FIREBASE_AUTH_EMULATOR_HOST;

const POOL_ID = process.env.NEXT_PUBLIC_POOL_ID ?? "default";
const PROJECT_ID = process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID ?? "wadau-cup";
const BUYIN = 1000;
const WORLD_CUP_FIRST_KICKOFF_ISO = "2026-06-11T19:00:00.000Z";

const ADMINS = [
  { name: "Ochmist", phone: "+254746497618" },
  { name: "Waswa", phone: "+254722178454" },
  { name: "Kenergy", phone: "254725417607" },
];

const TEAMS = [
  ["FRA", "France", "🇫🇷", "A", "I"], ["ESP", "Spain", "🇪🇸", "A", "H"],
  ["ARG", "Argentina", "🇦🇷", "A", "J"], ["ENG", "England", "🏴", "A", "L"],
  ["POR", "Portugal", "🇵🇹", "A", "K"], ["BRA", "Brazil", "🇧🇷", "A", "C"],
  ["NED", "Netherlands", "🇳🇱", "A", "F"], ["GER", "Germany", "🇩🇪", "A", "E"],
  ["BEL", "Belgium", "🇧🇪", "B", "G"], ["MAR", "Morocco", "🇲🇦", "B", "C"],
  ["CRO", "Croatia", "🇭🇷", "B", "L"], ["COL", "Colombia", "🇨🇴", "B", "K"],
  ["SEN", "Senegal", "🇸🇳", "B", "I"], ["MEX", "Mexico", "🇲🇽", "B", "A"],
  ["SUI", "Switzerland", "🇨🇭", "B", "B"], ["URU", "Uruguay", "🇺🇾", "B", "H"],
  ["JPN", "Japan", "🇯🇵", "C", "F"], ["USA", "USA", "🇺🇸", "C", "D"],
  ["IRN", "Iran", "🇮🇷", "C", "G"], ["TUR", "Türkiye", "🇹🇷", "C", "D"],
  ["ECU", "Ecuador", "🇪🇨", "C", "E"], ["AUT", "Austria", "🇦🇹", "C", "J"],
  ["KOR", "South Korea", "🇰🇷", "C", "A"], ["AUS", "Australia", "🇦🇺", "C", "D"],
  ["ALG", "Algeria", "🇩🇿", "D", "J"], ["EGY", "Egypt", "🇪🇬", "D", "G"],
  ["CAN", "Canada", "🇨🇦", "D", "B"], ["NOR", "Norway", "🇳🇴", "D", "I"],
  ["PAN", "Panama", "🇵🇦", "D", "L"], ["CIV", "Côte d'Ivoire", "🇨🇮", "D", "E"],
  ["SWE", "Sweden", "🇸🇪", "D", "F"], ["PAR", "Paraguay", "🇵🇾", "D", "D"],
  ["CZE", "Czechia", "🇨🇿", "E", "A"], ["SCO", "Scotland", "🏴", "E", "C"],
  ["TUN", "Tunisia", "🇹🇳", "E", "F"], ["COD", "DR Congo", "🇨🇩", "E", "K"],
  ["UZB", "Uzbekistan", "🇺🇿", "E", "K"], ["QAT", "Qatar", "🇶🇦", "E", "B"],
  ["IRQ", "Iraq", "🇮🇶", "E", "I"], ["RSA", "South Africa", "🇿🇦", "E", "A"],
  ["KSA", "Saudi Arabia", "🇸🇦", "F", "H"], ["BIH", "Bosnia", "🇧🇦", "F", "B"],
  ["CPV", "Cabo Verde", "🇨🇻", "F", "H"], ["GHA", "Ghana", "🇬🇭", "F", "L"],
  ["CUW", "Curaçao", "🇨🇼", "F", "E"], ["HAI", "Haiti", "🇭🇹", "F", "C"],
  ["NZL", "New Zealand", "🇳🇿", "F", "G"], ["JOR", "Jordan", "🇯🇴", "F", "J"],
];

function init() {
  if (getApps().length) return;
  const json = process.env.FIREBASE_SERVICE_ACCOUNT_JSON;
  if (json) {
    initializeApp({ credential: cert(JSON.parse(json)), projectId: PROJECT_ID });
    return;
  }
  initializeApp({ projectId: PROJECT_ID });
}

function digitsOnly(value) {
  return String(value ?? "").replace(/\D/g, "");
}

function phoneDigits(cc, phone) {
  const country = digitsOnly(cc || "254");
  let local = digitsOnly(phone);
  if (local.startsWith(`00${country}`)) local = local.slice(2);
  if (local.startsWith(country)) return local;
  if (local.startsWith("0")) local = local.slice(1);
  return `${country}${local}`;
}

function formatPhoneDigits(digits) {
  if (digits.startsWith("254") && digits.length === 12) {
    const local = digits.slice(3);
    return `+254 ${local.slice(0, 3)} ${local.slice(3, 6)} ${local.slice(6)}`;
  }
  return digits ? `+${digits}` : "";
}

function normalizePhone(phone) {
  const digits = phoneDigits("+254", phone);
  const local = digits.startsWith("254") ? digits.slice(3) : digits;
  if (local.length !== 9) throw new Error(`Expected Kenyan phone number, got ${phone}`);
  return formatPhoneDigits(digits);
}

function phoneToEmail(phone) {
  return `${phoneDigits("+254", phone)}@pool.wadau.app`;
}

function initials(name) {
  const parts = name.trim().split(/\s+/);
  return (parts[0][0] + (parts[1]?.[0] ?? parts[0][1] ?? "")).toUpperCase().slice(0, 2);
}

function genTempPassword() {
  const chars = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
  return Array.from({ length: 8 }, () => chars[randomInt(chars.length)]).join("");
}

async function upsertAdminPlayer(auth, db, admin) {
  const phone = normalizePhone(admin.phone);
  const email = phoneToEmail(phone);
  const tempPassword = genTempPassword();
  let record;
  let existed = false;
  try {
    record = await auth.getUserByEmail(email);
    existed = true;
    await auth.updateUser(record.uid, { password: tempPassword, displayName: admin.name });
  } catch {
    record = await auth.createUser({ email, password: tempPassword, displayName: admin.name });
  }

  await auth.setCustomUserClaims(record.uid, {
    poolId: POOL_ID,
    isAdmin: true,
    passwordSet: false,
    approvalStatus: "approved",
  });
  await auth.revokeRefreshTokens(record.uid);

  const playerRef = db.doc(`pools/${POOL_ID}/players/${record.uid}`);
  const existing = await playerRef.get();
  const existingData = existing.exists ? existing.data() : {};
  await playerRef.set(
    {
      name: admin.name,
      short: initials(admin.name),
      phone,
      paid: existingData?.paid ?? true,
      approvalStatus: "approved",
      passwordSet: false,
      hasDrafted: existingData?.hasDrafted ?? false,
      finalGoals: existingData?.finalGoals ?? null,
      picks: existingData?.picks ?? null,
      points: existingData?.points ?? 0,
      ceiling: existingData?.ceiling ?? 0,
      rank: existingData?.rank ?? 0,
      prevRank: existingData?.prevRank ?? 0,
      mover: existingData?.mover ?? 0,
      payout: existingData?.payout ?? 0,
      aliveCount: existingData?.aliveCount ?? 0,
      joinedAt: existingData?.joinedAt ?? FieldValue.serverTimestamp(),
      updatedAt: FieldValue.serverTimestamp(),
    },
    { merge: true },
  );

  return { name: admin.name, phone, uid: record.uid, tempPassword, existed };
}

async function seedPool(db, adminUids) {
  await db.doc(`pools/${POOL_ID}`).set(
    {
      name: "Wadau Cup",
      season: "2026",
      buyin: BUYIN,
      payoutPct: [50, 30, 20],
      lockAt: Timestamp.fromDate(new Date(WORLD_CUP_FIRST_KICKOFF_ISO)),
      round: "Group",
      adminUid: adminUids[0],
      adminUids,
      createdAt: FieldValue.serverTimestamp(),
      updatedAt: FieldValue.serverTimestamp(),
    },
    { merge: true },
  );
}

async function seedTeams(db) {
  const batch = db.batch();
  for (const [code, name, flag, tier, group] of TEAMS) {
    batch.set(
      db.doc(`pools/${POOL_ID}/teams/${code}`),
      { code, name, flag, tier, group, updatedAt: FieldValue.serverTimestamp() },
      { merge: true },
    );
  }
  await batch.commit();
}

async function triggerFixtureSync() {
  const baseUrl = process.env.PROD_BASE_URL?.replace(/\/$/, "");
  const secret = process.env.SYNC_CRON_SECRET;
  if (!baseUrl || !secret) {
    return { skipped: true, reason: "Set PROD_BASE_URL and SYNC_CRON_SECRET to trigger the deployed fixture sync." };
  }
  const res = await fetch(`${baseUrl}/api/admin/sync-results?force=1`, {
    method: "POST",
    headers: { "x-cron-secret": secret },
  });
  const json = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(`Fixture sync failed: ${res.status} ${JSON.stringify(json)}`);
  return json;
}

async function main() {
  init();
  const auth = getAuth();
  const db = getFirestore();

  console.log(`Bootstrapping production project ${PROJECT_ID}, pool ${POOL_ID}`);
  const creds = [];
  for (const admin of ADMINS) {
    const result = await upsertAdminPlayer(auth, db, admin);
    creds.push(result);
    console.log(`${result.existed ? "~" : "+"} ${result.name} (${result.phone})`);
  }

  await seedPool(db, creds.map((c) => c.uid));
  console.log(`✓ Pool seeded`);

  await seedTeams(db);
  console.log(`✓ ${TEAMS.length} teams seeded`);

  const syncResult = await triggerFixtureSync();
  if (syncResult.skipped) {
    console.log(`! Fixture sync skipped: ${syncResult.reason}`);
  } else {
    console.log(`✓ Fixture sync completed: ${syncResult.fixtureCount ?? 0} fixtures, ${syncResult.warningCount ?? 0} warnings`);
  }

  console.log("\nTEMP PASSWORDS");
  for (const c of creds) {
    console.log(`${c.name.padEnd(8)} ${c.phone}  ${c.tempPassword}`);
  }
}

main().catch((error) => {
  console.error(error instanceof Error ? error.message : error);
  process.exit(1);
});
