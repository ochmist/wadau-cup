import { NextRequest, NextResponse } from "next/server";
import { FieldValue } from "firebase-admin/firestore";
import { adminAuth, adminDb } from "@/lib/firebase-admin";
import { POOL_ID } from "@/lib/config";
import { recomputeStandings } from "@/lib/server/recompute-standings";

function initials(name: string) {
  const parts = name.trim().split(/\s+/);
  return (parts[0]?.[0] + (parts[1]?.[0] ?? parts[0]?.[1] ?? "")).toUpperCase().slice(0, 2);
}

function cleanName(value: unknown) {
  if (typeof value !== "string") return "";
  return value.replace(/\s+/g, " ").trim();
}

export async function POST(req: NextRequest) {
  if (!adminAuth || !adminDb) {
    return NextResponse.json({ error: "Admin SDK not configured" }, { status: 503 });
  }

  const token = req.headers.get("Authorization")?.replace(/^Bearer\s+/i, "");
  if (!token) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  try {
    const decoded = await adminAuth.verifyIdToken(token);
    if (decoded.poolId !== POOL_ID) {
      return NextResponse.json({ error: "Wrong pool" }, { status: 403 });
    }

    const body = (await req.json()) as { name?: unknown };
    const name = cleanName(body.name);
    if (name.length < 2) {
      return NextResponse.json({ error: "Name must be at least 2 characters." }, { status: 400 });
    }
    if (name.length > 40) {
      return NextResponse.json({ error: "Name must be 40 characters or less." }, { status: 400 });
    }

    const short = initials(name);
    await Promise.all([
      adminAuth.updateUser(decoded.uid, { displayName: name }),
      adminDb.doc(`pools/${POOL_ID}/players/${decoded.uid}`).set(
        {
          name,
          short,
          updatedAt: FieldValue.serverTimestamp(),
        },
        { merge: true },
      ),
    ]);

    try {
      await recomputeStandings(adminDb);
    } catch (error) {
      console.error("[profile] standings recompute failed", error);
    }

    return NextResponse.json({ ok: true, name, short });
  } catch (error) {
    return NextResponse.json({ error: (error as Error).message }, { status: 500 });
  }
}
