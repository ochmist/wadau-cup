"use client";
// Firebase client SDK init. Emulator connection is handled in auth.tsx
// so it fires before the first onAuthStateChanged call.
import { initializeApp, getApps, getApp } from "firebase/app";
import { getAuth } from "firebase/auth";
import { getFirestore } from "firebase/firestore";
export { POOL_ID } from "./config";

const firebaseConfig = {
  apiKey: process.env.NEXT_PUBLIC_FIREBASE_API_KEY,
  authDomain: process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN,
  projectId:
    process.env.NEXT_PUBLIC_USE_EMULATOR === "true"
      ? process.env.NEXT_PUBLIC_FIREBASE_EMULATOR_PROJECT_ID ?? "demo-wadau"
      : process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID,
  storageBucket: process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: process.env.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID,
  appId: process.env.NEXT_PUBLIC_FIREBASE_APP_ID,
};

// Return null on the server or when API key isn't present (build time / SSR).
// Firebase client SDK accesses browser globals (location, indexedDB) at init time,
// which throws during static generation. Auth is set up client-side via AuthProvider.
function buildApp() {
  if (typeof window === "undefined") return null;
  if (!firebaseConfig.apiKey) return null;
  return getApps().length ? getApp() : initializeApp(firebaseConfig);
}

const app = buildApp();

export const auth = app ? getAuth(app) : (null as never);
export const db = app ? getFirestore(app) : (null as never);
