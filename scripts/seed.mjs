#!/usr/bin/env node
// Seed script — initialises a fresh Firestore (emulator or production) with
// Wadau Cup pool data, sample players, and an admin account.
//
// LOCAL EMULATOR (recommended for dev):
//   1. Start emulators:  firebase emulators:start --only auth,firestore
//   2. In another tab:   npm run seed
//   (The .env.local file sets FIRESTORE_EMULATOR_HOST + FIREBASE_AUTH_EMULATOR_HOST)
//
// PRODUCTION (first deploy):
//   FIREBASE_SERVICE_ACCOUNT_JSON="$(cat serviceAccount.json)" npm run seed

// Load .env.local so emulator env vars are available when run directly
import { readFileSync, existsSync } from "fs";
import { randomInt } from "crypto";
if (existsSync(".env.local")) {
  for (const line of readFileSync(".env.local", "utf8").split("\n")) {
    const m = line.match(/^([^#=]+)=(.*)$/);
    if (m) process.env[m[1].trim()] = m[2].trim();
  }
}

import { initializeApp, getApps, cert } from "firebase-admin/app";
import { getFirestore, Timestamp } from "firebase-admin/firestore";
import { getAuth } from "firebase-admin/auth";

const POOL_ID = process.env.NEXT_PUBLIC_POOL_ID ?? "default";
const PROJECT_ID = process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID ?? "demo-wadau";
const BUYIN = 1000;
const IN_EMULATOR = !!process.env.FIRESTORE_EMULATOR_HOST;
const WORLD_CUP_FIRST_KICKOFF_ISO = "2026-06-11T19:00:00.000Z";

// ── Init ────────────────────────────────────────────────────────────────────
function init() {
  if (getApps().length) return;
  if (IN_EMULATOR) {
    console.log(`📡 Connecting to emulators (Firestore: ${process.env.FIRESTORE_EMULATOR_HOST}, Auth: ${process.env.FIREBASE_AUTH_EMULATOR_HOST})`);
    initializeApp({ projectId: PROJECT_ID });
  } else {
    const json = process.env.FIREBASE_SERVICE_ACCOUNT_JSON;
    if (!json) { console.error("❌ FIREBASE_SERVICE_ACCOUNT_JSON required in production mode"); process.exit(1); }
    initializeApp({ credential: cert(JSON.parse(json)) });
  }
}
init();
const db = getFirestore();
const adminAuth = getAuth();

// ── Sample players (mirrors data.ts) ─────────────────────────────────────────
const PLAYERS = [
  { name: "Wanjiru", short: "WN", phone: "+254 710 200 100", paid: true,  finalGoals: 3, picks: { A:"FRA", B:"MAR", C:"JPN", D:"EGY", E:"CZE", F:"GHA" } },
  { name: "Brayo",   short: "BR", phone: "+254 711 207 103", paid: true,  finalGoals: 2, picks: { A:"ESP", B:"BEL", C:"USA", D:"NOR", E:"SCO", F:"KSA" } },
  { name: "Otieno",  short: "OT", phone: "+254 712 214 106", paid: true,  finalGoals: 4, picks: { A:"ARG", B:"URU", C:"ECU", D:"CIV", E:"TUN", F:"CPV" } },
  { name: "Achieng", short: "AC", phone: "+254 713 221 109", paid: true,  finalGoals: 2, picks: { A:"ENG", B:"SEN", C:"KOR", D:"CAN", E:"UZB", F:"HAI" } },
  { name: "Kimani",  short: "KM", phone: "+254 714 228 112", paid: true,  finalGoals: 3, picks: { A:"POR", B:"MEX", C:"IRN", D:"SWE", E:"QAT", F:"BIH" } },
  { name: "Njoro",   short: "NJ", phone: "+254 715 235 115", paid: true,  finalGoals: 5, picks: { A:"BRA", B:"COL", C:"AUT", D:"PAN", E:"IRQ", F:"NZL" } },
  { name: "Mwangi",  short: "MW", phone: "+254 716 242 118", paid: true,  finalGoals: 2, picks: { A:"GER", B:"SUI", C:"TUR", D:"ALG", E:"COD", F:"JOR" } },
  { name: "Aisha",   short: "AI", phone: "+254 717 249 121", paid: true,  finalGoals: 3, picks: { A:"NED", B:"SEN", C:"AUS", D:"EGY", E:"SCO", F:"GHA" } },
  { name: "Dennoh",  short: "DN", phone: "+254 718 256 124", paid: false, finalGoals: 1, picks: { A:"FRA", B:"URU", C:"JPN", D:"NOR", E:"TUN", F:"CUW" } },
  { name: "Faith",   short: "FT", phone: "+254 719 263 127", paid: true,  finalGoals: 4, picks: { A:"ESP", B:"BEL", C:"IRN", D:"PAR", E:"UZB", F:"KSA" } },
  { name: "Maxie",   short: "MX", phone: "+254 720 270 130", paid: false, finalGoals: 2, picks: { A:"POR", B:"MAR", C:"ECU", D:"CIV", E:"RSA", F:"JOR" } },
  { name: "Shiro",   short: "SH", phone: "+254 721 277 133", paid: true,  finalGoals: 3, picks: { A:"ARG", B:"SUI", C:"KOR", D:"SWE", E:"QAT", F:"HAI" } },
  { name: "Baraka",  short: "BA", phone: "+254 722 284 136", paid: true,  finalGoals: 3, picks: { A:"GER", B:"COL", C:"AUT", D:"CAN", E:"SCO", F:"NZL" } },
  { name: "Trevor",  short: "TR", phone: "+254 723 291 139", paid: false, finalGoals: 2, picks: { A:"NED", B:"MEX", C:"USA", D:"PAN", E:"IRQ", F:"CPV" } },
];

// Admin account (can log in and access /admin)
const ADMIN = { name: "Ochmist", phone: "+254 700 000 000", password: "admin123" };

function phoneToEmail(phone) {
  return `${phone.replace(/\D/g, "")}@pool.wadau.app`;
}

function genTempPassword() {
  const chars = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
  return Array.from({ length: 6 }, () => chars[randomInt(chars.length)]).join("");
}

function initials(name) {
  const parts = name.trim().split(/\s+/);
  return (parts[0][0] + (parts[1]?.[0] ?? parts[0][1] ?? "")).toUpperCase().slice(0, 2);
}

async function upsertUser(email, password, displayName) {
  try {
    const existing = await adminAuth.getUserByEmail(email);
    return { uid: existing.uid, existed: true };
  } catch {
    const user = await adminAuth.createUser({ email, password, displayName });
    return { uid: user.uid, existed: false };
  }
}

async function seedPool() {
  console.log(`\n🏆 Seeding pool "${POOL_ID}" in project "${PROJECT_ID}"…`);
  await db.doc(`pools/${POOL_ID}`).set({
    name: "Wadau Cup",
    season: "2026",
    buyin: BUYIN,
    payoutPct: [50, 30, 20],
    lockAt: Timestamp.fromDate(new Date(WORLD_CUP_FIRST_KICKOFF_ISO)),
    round: "Round of 16",
    adminUid: "",        // updated after admin user is created
    createdAt: Timestamp.now(),
  }, { merge: true });
  console.log("  ✓ Pool document");
}

async function seedAdmin() {
  console.log("\n👑 Creating admin account…");
  const email = phoneToEmail(ADMIN.phone);
  const { uid, existed } = await upsertUser(email, ADMIN.password, ADMIN.name);

  await adminAuth.setCustomUserClaims(uid, {
    poolId: POOL_ID,
    isAdmin: true,
    passwordSet: true,   // admin doesn't need to reset
  });

  // Store admin in players collection too (so they appear in the pool)
  await db.doc(`pools/${POOL_ID}/players/${uid}`).set({
    name: ADMIN.name,
    short: initials(ADMIN.name),
    phone: ADMIN.phone,
    paid: true,
    passwordSet: true,
    hasDrafted: false,
    finalGoals: null,
    picks: null,
    points: 0, ceiling: 0, rank: 0, prevRank: 0, mover: 0, payout: 0, aliveCount: 0,
    joinedAt: Timestamp.now(),
  }, { merge: true });

  // Backfill adminUid into pool doc
  await db.doc(`pools/${POOL_ID}`).update({ adminUid: uid });

  if (existed) {
    console.log(`  ~ Admin already existed (${uid})`);
  } else {
    console.log(`  + Admin created (${uid})`);
  }
  console.log(`  📱 Phone: ${ADMIN.phone}`);
  console.log(`  🔑 Password: ${ADMIN.password}`);
  return uid;
}

async function seedPlayers() {
  console.log(`\n👥 Seeding ${PLAYERS.length} players…`);
  const creds = [];

  for (const p of PLAYERS) {
    const email = phoneToEmail(p.phone);
    const tempPw = genTempPassword();
    const { uid, existed } = await upsertUser(email, tempPw, p.name);

    if (!existed) {
      await adminAuth.setCustomUserClaims(uid, {
        poolId: POOL_ID,
        isAdmin: false,
        passwordSet: false,   // force password reset on first login
      });
    }

    // Picks stored as PickEntry objects with placeholder pts/rem
    const picks = Object.fromEntries(
      Object.entries(p.picks).map(([tier, code]) => [tier, { code, pts: 0, rem: 0, alive: true }])
    );

    const playerDoc = {
      name: p.name,
      short: p.short,
      phone: p.phone,
      paid: p.paid,
      hasDrafted: true,
      finalGoals: p.finalGoals,
      picks,
      points: 0, ceiling: 0, rank: 0, prevRank: 0, mover: 0, payout: 0, aliveCount: 6,
      joinedAt: Timestamp.now(),
    };
    if (!existed) playerDoc.passwordSet = false;
    await db.doc(`pools/${POOL_ID}/players/${uid}`).set(playerDoc, { merge: true });

    if (existed) {
      console.log(`  ~ ${p.name.padEnd(8)} already existed`);
    } else {
      console.log(`  + ${p.name.padEnd(8)} uid:${uid.slice(0,8)}…  temp-pw: ${tempPw}`);
      creds.push({ name: p.name, phone: p.phone, tempPw });
    }
  }

  if (creds.length) {
    console.log("\n  ─── Credentials to share with new players ───");
    creds.forEach(c => console.log(`  ${c.name.padEnd(10)} ${c.phone}  pw: ${c.tempPw}`));
  }
}

async function seedSampleResults() {
  console.log("\n⚽ Seeding sample match results (R16 — 2 entered)…");
  // pts stored as objects (Firestore doesn't allow arrays-of-arrays)
  const results = [
    { id: "m49", round: "Round of 16", a: "FRA", b: "COD", sa: 3, sb: 0, win: "FRA", pts: [{ code:"FRA", tier:"A", points:1 }], held: 2, note: "France stroll into the Quarters.", pens: null },
    { id: "m50", round: "Round of 16", a: "ARG", b: "NOR", sa: 2, sb: 1, win: "ARG", pts: [{ code:"ARG", tier:"A", points:1 }], held: 1, note: "Late winner sends Argentina through.", pens: null },
  ];
  for (const r of results) {
    const { id, ...data } = r;
    await db.doc(`pools/${POOL_ID}/results/${id}`).set({ ...data, enteredAt: Timestamp.now() }, { merge: true });
    console.log(`  ✓ ${r.a} vs ${r.b} → ${r.win}`);
  }
}

async function main() {
  await seedPool();
  const adminUid = await seedAdmin();
  await seedPlayers();
  await seedSampleResults();

  console.log("\n✅ Seed complete!\n");
  console.log("Next steps:");
  console.log("  1.  npm run dev       (in a separate tab, if not already running)");
  console.log(`  2.  Open http://localhost:3000/login`);
  console.log(`  3.  Log in as Ochmist: phone ${ADMIN.phone}, password ${ADMIN.password}`);
  console.log(`      (Admin skips password-reset and draft gates)`);
  console.log(`  4.  Go to /admin and click "Recompute standings" to compute initial rankings`);
  if (IN_EMULATOR) {
    console.log("\n  🔥 Emulator UI: http://localhost:4000");
    console.log("     See all data in Firestore → pools/default and Auth → users");
  }
  process.exit(0);
}

main().catch((e) => { console.error("❌", e.message); process.exit(1); });
