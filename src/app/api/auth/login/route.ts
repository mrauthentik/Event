import { NextRequest, NextResponse } from "next/server";
import { eq } from "drizzle-orm";
import { z } from "zod";
import crypto from "node:crypto";
import { db } from "@/db";
import { sessions, staffUsers } from "@/db/schema";
import { verifyPassword } from "@/lib/auth/password";
import { rateLimit, clientIp } from "@/lib/rate-limit";
import { isSameOriginRequest } from "@/lib/security/origin";

const loginSchema = z.object({
  username: z.string().trim().min(1).max(64),
  password: z.string().min(1).max(1024),
});

export async function POST(req: NextRequest) {
  if (!isSameOriginRequest(req)) {
    return NextResponse.json({ error: "Invalid request origin." }, { status: 403 });
  }
  const ip = clientIp(req);
  const ipLimit = await rateLimit(`auth_login:${ip}`, 10, 10 * 60 * 1000);
  if (!ipLimit.allowed) {
    return NextResponse.json(
      { error: "Too many login attempts. Try again later." },
      { status: 429, headers: { "Retry-After": String(ipLimit.retryAfterSeconds) } }
    );
  }

  try {
    const { username, password } = loginSchema.parse(await req.json());
    const normalizedUsername = username.toLowerCase();
    const userLimit = await rateLimit(`auth_login_user:${normalizedUsername}`, 8, 10 * 60 * 1000);
    if (!userLimit.allowed) return NextResponse.json({ error: "Too many login attempts." }, { status: 429 });

    const [user] = await db.select().from(staffUsers)
      .where(eq(staffUsers.username, normalizedUsername)).limit(1);
    const invalid = { error: "Invalid username or password." };
    if (!user || !user.isActive || !(await verifyPassword(password, user.passwordHash))) {
      return NextResponse.json(invalid, { status: 401 });
    }

    const requiresTotp = user.role === "admin" || user.role === "finance";
    if (requiresTotp && (!user.totpEnabled || !user.totpSecret)) {
      return NextResponse.json(
        { error: "Authenticator access must be provisioned by the system administrator." },
        { status: 403, headers: { "Cache-Control": "no-store" } }
      );
    }

    if (requiresTotp) {
      const challenge = crypto.randomBytes(24).toString("hex");
      await db.insert(sessions).values({
        id: challenge,
        userId: user.id,
        expiresAt: new Date(Date.now() + 5 * 60 * 1000),
        revoked: true,
      });
      return NextResponse.json({
        requiresTotp: true,
        challenge,
      }, { headers: { "Cache-Control": "no-store" } });
    }

    const { createSession, setSessionCookie } = await import("@/lib/auth/session");
    const sessionId = await createSession(user.id);
    await setSessionCookie(sessionId);
    return NextResponse.json({
      success: true,
      user: { id: user.id, fullName: user.fullName, username: user.username, role: user.role },
    }, { headers: { "Cache-Control": "no-store" } });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: "Username and password are required." }, { status: 422 });
    }
    console.error("Login failed:", error);
    return NextResponse.json({ error: "Login failed." }, { status: 500 });
  }
}
