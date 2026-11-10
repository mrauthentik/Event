import { cookies } from "next/headers";
import { db } from "@/db";
import { sessions, staffUsers } from "@/db/schema";
import { eq, and } from "drizzle-orm";
import crypto from "node:crypto";

export const SESSION_COOKIE = "ihgc_session";
const SESSION_TTL_MS = 12 * 60 * 60 * 1000; // 12 hours (short sessions per brief)

export type SessionUser = {
  id: string;
  fullName: string;
  username: string;
  role: "attendant" | "supervisor" | "finance" | "admin";
  totpEnabled: boolean;
};

export async function createSession(userId: string): Promise<string> {
  const id = crypto.randomBytes(32).toString("hex");
  await db.insert(sessions).values({
    id,
    userId,
    expiresAt: new Date(Date.now() + SESSION_TTL_MS),
  });
  return id;
}

export async function setSessionCookie(sessionId: string) {
  const store = await cookies();
  store.set(SESSION_COOKIE, sessionId, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    maxAge: SESSION_TTL_MS / 1000,
  });
}

export async function clearSessionCookie() {
  const store = await cookies();
  store.delete(SESSION_COOKIE);
}

/** Resolve the current session to a user, or null. */
export async function getSessionUser(): Promise<SessionUser | null> {
  const store = await cookies();
  const sessionId = store.get(SESSION_COOKIE)?.value;

  // Dev bypass: no DB/session yet — grant mock admin so the console is usable locally.
  // NEVER active in production.
  if (!sessionId && process.env.NODE_ENV !== "production") {
    return {
      id: "dev-bypass",
      fullName: "Dev Administrator",
      username: "admin",
      role: "admin",
      totpEnabled: false,
    };
  }

  if (!sessionId) return null;

  const [row] = await db
    .select({
      sessionId: sessions.id,
      userId: staffUsers.id,
      fullName: staffUsers.fullName,
      username: staffUsers.username,
      role: staffUsers.role,
      totpEnabled: staffUsers.totpEnabled,
      isActive: staffUsers.isActive,
      expiresAt: sessions.expiresAt,
      revoked: sessions.revoked,
    })
    .from(sessions)
    .innerJoin(staffUsers, eq(sessions.userId, staffUsers.id))
    .where(and(eq(sessions.id, sessionId), eq(sessions.revoked, false)))
    .limit(1);

  if (!row || !row.isActive) return null;
  if (row.expiresAt.getTime() < Date.now()) return null;

  return {
    id: row.userId,
    fullName: row.fullName,
    username: row.username,
    role: row.role,
    totpEnabled: row.totpEnabled,
  };
}

/** Revoke a session by id (logout / device revoke). */
export async function revokeSession(sessionId: string) {
  await db.update(sessions).set({ revoked: true }).where(eq(sessions.id, sessionId));
}

/** Require an authenticated user; returns user or null. */
export async function requireUser(): Promise<SessionUser | null> {
  return getSessionUser();
}

/** Require a minimum role. Role hierarchy: attendant < supervisor < finance < admin */
const ROLE_RANK: Record<string, number> = {
  attendant: 1,
  supervisor: 2,
  finance: 3,
  admin: 4,
};

export async function requireRole(minRole: SessionUser["role"]): Promise<SessionUser | null> {
  const user = await getSessionUser();
  if (!user) return null;
  if ((ROLE_RANK[user.role] ?? 0) < (ROLE_RANK[minRole] ?? 99)) return null;
  return user;
}
