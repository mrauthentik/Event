import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { clearSessionCookie, SESSION_COOKIE, revokeSession } from "@/lib/auth/session";

export async function POST() {
  const store = await cookies();
  const sessionId = store.get(SESSION_COOKIE)?.value;
  if (sessionId) {
    await revokeSession(sessionId).catch(() => {});
  }
  await clearSessionCookie();
  return NextResponse.json({ success: true });
}
