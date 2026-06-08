// Firebase Admin SDK — server-only. Never import this in client components.
import { getApps, initializeApp } from "firebase-admin/app";
import { getAuth } from "firebase-admin/auth";
import { getFirestore } from "firebase-admin/firestore";

function initAdmin() {
  if (getApps().length) return;

  // Emulator mode: FIRESTORE_EMULATOR_HOST is set (via .env.local or shell).
  // The Admin SDK connects automatically; no real credentials required.
  if (process.env.FIRESTORE_EMULATOR_HOST) {
    initializeApp({
      projectId: process.env.FIREBASE_EMULATOR_PROJECT_ID ?? "demo-wadau",
    });
    return;
  }

  // Production: prefer an explicit service account if provided, otherwise use
  // Application Default Credentials from the App Hosting runtime service account.
  const json = process.env.FIREBASE_SERVICE_ACCOUNT_JSON;
  if (json) {
    const { cert } = require("firebase-admin/app");
    initializeApp({ credential: cert(JSON.parse(json)) });
    return;
  }

  initializeApp({
    projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID ?? "wadau-cup",
  });
}

initAdmin();

export const adminAuth = getApps().length ? getAuth() : null;
export const adminDb = getApps().length ? getFirestore() : null;
