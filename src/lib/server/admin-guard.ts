import { NextRequest } from "next/server";
import type { DecodedIdToken } from "firebase-admin/auth";
import { adminAuth } from "@/lib/firebase-admin";

const RECENT_ADMIN_AUTH_SECONDS = 5 * 60;

export class AdminAuthError extends Error {
  status: number;

  constructor(message: string, status: number) {
    super(message);
    this.status = status;
  }
}

export function bearerToken(req: NextRequest) {
  return req.headers.get("authorization")?.replace(/^Bearer\s+/i, "") ?? "";
}

export async function verifyAdminToken(
  req: NextRequest,
  { requireRecent = false }: { requireRecent?: boolean } = {},
): Promise<DecodedIdToken> {
  if (!adminAuth) throw new AdminAuthError("Admin SDK not configured", 503);
  const token = bearerToken(req);
  if (!token) throw new AdminAuthError("Unauthorized", 401);

  const decoded = await adminAuth.verifyIdToken(token);
  if (!decoded.isAdmin) throw new AdminAuthError("Not admin", 403);

  if (requireRecent) {
    const authTime = typeof decoded.auth_time === "number" ? decoded.auth_time : 0;
    const ageSeconds = Math.floor(Date.now() / 1000) - authTime;
    if (!authTime || ageSeconds > RECENT_ADMIN_AUTH_SECONDS) {
      throw new AdminAuthError("Enter your admin password to continue.", 401);
    }
  }

  return decoded;
}
