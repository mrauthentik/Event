import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { eq } from "drizzle-orm";
import { db } from "@/db";
import { staffUsers } from "@/db/schema";
import { verifyPassword } from "@/lib/auth/password";
import { rateLimit, clientIp } from "@/lib/rate-limit";
import crypto from "node:crypto";

const loginSchema = z.object({
  username: z.string().min(1),
  password: z.string().min(1),
});

// Short-lived TOTP challenge tokens (5 min), stored in memory.
// For multi-instance deployments move to Redis.
const totpChallenges = new Map<string, { userId: string; expiresAt: number }>();

export async function POST(req: NextRequest) {
  const ip = clientIp(req);
  const rl = rateLimit(`auth_login:${ip}`, 10, 10 * 60 * 1000);
  if (!rl.allowed) {
    return NextResponse.json(
      { error: `Too many login attempts. Try again in ${rl.retryAfterSeconds}s.` },
      { status: 429 }
    );
  }

  try {
    const { username, password } = loginSchema.parse(await req.json());

    const [user] = await db
      .select()
      .from(staffUsers)
      .where(eq(staffUsers.username, username.trim().toLowerCase()))
      .limit(1);

    // Generic error to prevent user enumeration
    const invalid = { error: "Invalid username or password." };

    if (!user || !user.isActive) {
      return NextResponse.json(invalid, { status: 401 });
    }

    const ok = await verifyPassword(password, user.passwordHash);
    if (!ok) {
      return NextResponse.json(invalid, { status: 401 });
    }

    // If TOTP is enabled, issue a short-lived challenge instead of a session
    if (user.totpEnabled && user.totpSecret) {
      const challenge = crypto.randomBytes(24).toString("hex");
      totpChallenges.set(challenge, {
        userId: user.id,
        expiresAt: Date.now() + 5 * 60 * 1000,
      });
      return NextResponse.json({ requiresTotp: true, challenge });
    }

    // No TOTP — create session directly
    const { createSession, setSessionCookie } = await import("@/lib/auth/session");
    const sessionId = await createSession(user.id);
    await setSessionCookie(sessionId);

    return NextResponse.json({
      success: true,
      user: { id: user.id, fullName: user.fullName, username: user.username, role: user.role },
    });
  } catch (error: any) {
    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: "Username and password are required." }, { status: 422 });
    }
    console.error("Login error:", error);
    return NextResponse.json({ error: "Login failed." }, { status: 500 });
  }
}

/** Exported for the TOTP verify route. */
export function consumeTotpChallenge(challenge: string): string | null {
  const entry = totpChallenges.get(challenge);
  if (!entry) return null;
  totpChallenges.delete(challenge);
  if (entry.expiresAt < Date.now()) return null;
  return entry.userId;
}
