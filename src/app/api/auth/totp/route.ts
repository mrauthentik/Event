import { NextRequest, NextResponse } from "next/server";
import { and, eq, gt } from "drizzle-orm";
import { z } from "zod";
import { db } from "@/db";
import { auditLog, sessions, staffUsers } from "@/db/schema";
import { verifyTotp } from "@/lib/auth/totp";
import { rateLimit, clientIp } from "@/lib/rate-limit";
import { isSameOriginRequest } from "@/lib/security/origin";

const totpSchema = z.object({
  challenge: z.string().length(48),
  token: z.string().regex(/^\d{6}$/),
});

export async function POST(req: NextRequest) {
  if (!isSameOriginRequest(req)) {
    return NextResponse.json({ error: "Invalid request origin." }, { status: 403 });
  }
  const ip = clientIp(req);
  const rl = await rateLimit(`auth_totp:${ip}`, 10, 10 * 60 * 1000);
  if (!rl.allowed) return NextResponse.json({ error: "Too many attempts." }, { status: 429 });

  try {
    const { challenge, token } = totpSchema.parse(await req.json());
    const [pending] = await db.select({ session: sessions, user: staffUsers })
      .from(sessions)
      .innerJoin(staffUsers, eq(sessions.userId, staffUsers.id))
      .where(and(
        eq(sessions.id, challenge),
        eq(sessions.revoked, true),
        gt(sessions.expiresAt, new Date())
      )).limit(1);
    if (!pending) return NextResponse.json({ error: "Session expired. Please log in again." }, { status: 401 });
    const user = pending.user;
    if (!user?.isActive) return NextResponse.json({ error: "Invalid session." }, { status: 401 });

    const requiresTotp = user.role === "admin" || user.role === "finance";
    const secret = user.totpSecret;
    if (requiresTotp && (!user.totpEnabled || !secret)) {
      return NextResponse.json(
        { error: "Authenticator access must be provisioned by the system administrator." },
        { status: 403, headers: { "Cache-Control": "no-store" } }
      );
    }
    if (!secret || !verifyTotp(token, secret)) {
      return NextResponse.json({ error: "Invalid authenticator code." }, { status: 401 });
    }

    await db.transaction(async (tx) => {
      const [consumed] = await tx.delete(sessions).where(and(
        eq(sessions.id, challenge),
        eq(sessions.revoked, true),
        gt(sessions.expiresAt, new Date())
      )).returning({ id: sessions.id });
      if (!consumed) throw new Error("Challenge was already used.");

      await tx.insert(auditLog).values({
        staffId: user.id,
        action: "staff_login_totp_verified",
        entityType: "staff_users",
        entityId: user.id,
        oldState: null,
        newState: { role: user.role },
        ipAddress: ip === "unknown" ? null : ip,
        userAgent: req.headers.get("user-agent"),
      });
    });

    const { createSession, setSessionCookie } = await import("@/lib/auth/session");
    const sessionId = await createSession(user.id);
    await setSessionCookie(sessionId);
    return NextResponse.json({
      success: true,
      user: { id: user.id, fullName: user.fullName, username: user.username, role: user.role },
    }, { headers: { "Cache-Control": "no-store" } });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: "A valid challenge and six-digit code are required." }, { status: 422 });
    }
    console.error("TOTP verification failed:", error);
    return NextResponse.json({ error: "Verification failed." }, { status: 500 });
  }
}
