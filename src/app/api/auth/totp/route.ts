import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { eq } from "drizzle-orm";
import { db } from "@/db";
import { staffUsers } from "@/db/schema";
import { verifyTotp } from "@/lib/auth/totp";
import { rateLimit, clientIp } from "@/lib/rate-limit";
import { consumeTotpChallenge } from "../login/route";

const totpSchema = z.object({
  challenge: z.string().min(10),
  token: z.string().min(6).max(8),
});

export async function POST(req: NextRequest) {
  const ip = clientIp(req);
  const rl = rateLimit(`auth_totp:${ip}`, 10, 10 * 60 * 1000);
  if (!rl.allowed) {
    return NextResponse.json({ error: "Too many attempts." }, { status: 429 });
  }

  try {
    const { challenge, token } = totpSchema.parse(await req.json());

    const userId = consumeTotpChallenge(challenge);
    if (!userId) {
      return NextResponse.json({ error: "Session expired. Please log in again." }, { status: 401 });
    }

    const [user] = await db.select().from(staffUsers).where(eq(staffUsers.id, userId)).limit(1);
    if (!user || !user.totpSecret || !user.isActive) {
      return NextResponse.json({ error: "Invalid session." }, { status: 401 });
    }

    if (!verifyTotp(token, user.totpSecret)) {
      return NextResponse.json({ error: "Invalid authenticator code." }, { status: 401 });
    }

    const { createSession, setSessionCookie } = await import("@/lib/auth/session");
    const sessionId = await createSession(user.id);
    await setSessionCookie(sessionId);

    return NextResponse.json({
      success: true,
      user: { id: user.id, fullName: user.fullName, username: user.username, role: user.role },
    });
  } catch (error: any) {
    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: "Challenge and token are required." }, { status: 422 });
    }
    console.error("TOTP verify error:", error);
    return NextResponse.json({ error: "Verification failed." }, { status: 500 });
  }
}
