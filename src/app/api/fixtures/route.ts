import { NextRequest, NextResponse } from "next/server";
import { adminAuth, adminDb } from "@/lib/firebase-admin";
import { POOL_ID } from "@/lib/config";

function toJson(value: unknown): unknown {
  if (!value || typeof value !== "object") return value;
  if ("toDate" in value && typeof value.toDate === "function") {
    return value.toDate().toISOString();
  }
  if (Array.isArray(value)) return value.map(toJson);
  return Object.fromEntries(Object.entries(value).map(([key, child]) => [key, toJson(child)]));
}

function docData<T>(snap: FirebaseFirestore.QueryDocumentSnapshot): T & { id: string } {
  return { ...(toJson(snap.data()) as T), id: snap.id };
}

export async function GET(req: NextRequest) {
  if (!adminAuth || !adminDb) {
    return NextResponse.json({ error: "Admin SDK not configured" }, { status: 503 });
  }

  const token = req.headers.get("Authorization")?.replace("Bearer ", "");
  if (!token) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  try {
    const decoded = await adminAuth.verifyIdToken(token);
    if (!decoded.isAdmin && decoded.poolId !== POOL_ID) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const [fixturesSnap, liveStateSnap] = await Promise.all([
      adminDb.collection(`pools/${POOL_ID}/fixtures`).orderBy("kickoffAt", "asc").get(),
      adminDb.collection(`pools/${POOL_ID}/liveState`).get(),
    ]);

    return NextResponse.json({
      fixtures: fixturesSnap.docs.map((snap) => docData(snap)),
      liveState: liveStateSnap.docs.map((snap) => docData(snap)),
    });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Failed to load fixtures";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
