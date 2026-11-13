import { NextRequest, NextResponse } from "next/server";
import { cookies } from "next/headers";
import { clearSessionCookie, SESSION_COOKIE, revokeSession } from "@/lib/auth/session";
import { isSameOriginRequest } from "@/lib/security/origin";

export async function POST(req: NextRequest) {
  if (!isSameOriginRequest(req)) {
    return NextResponse.json({ error: "Invalid request origin." }, { status: 403 });
  }
  const store = await cookies();
  const sessionId = store.get(SESSION_COOKIE)?.value;
  if (sessionId) {
    await revokeSession(sessionId).catch(() => {});
  }
  await clearSessionCookie();
  return NextResponse.json({ success: true });
}
