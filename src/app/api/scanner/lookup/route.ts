import { NextRequest, NextResponse } from "next/server";
import { and, eq, ilike, isNull, or } from "drizzle-orm";
import { z } from "zod";
import { db } from "@/db";
import { attendees, orders } from "@/db/schema";
import { requireRole } from "@/lib/auth/session";
import { clientIp, rateLimit } from "@/lib/rate-limit";

export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
  const user = await requireRole("attendant");
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const ip = clientIp(req);
  const limit = await rateLimit(`scanner_lookup:${user.id}:${ip}`, 60, 60 * 1000);
  if (!limit.allowed) {
    return NextResponse.json({ error: "Too many lookups. Try again shortly." }, {
      status: 429,
      headers: { "Retry-After": String(limit.retryAfterSeconds), "Cache-Control": "no-store" },
    });
  }

  const parsed = z.string().trim().min(1).max(100).safeParse(req.nextUrl.searchParams.get("q"));
  if (!parsed.success) {
    return NextResponse.json({ attendee: null }, { headers: { "Cache-Control": "no-store" } });
  }
  const query = parsed.data;
  const escapedPrefix = query.replace(/[\\%_]/g, "\\$&");

  try {
    const [result] = await db.select({ attendee: attendees })
      .from(attendees)
      .innerJoin(orders, eq(attendees.orderId, orders.id))
      .where(and(
        eq(orders.status, "paid"),
        isNull(attendees.deletedAt),
        or(
          eq(attendees.refCode, query.toUpperCase()),
          eq(attendees.phoneE164, query.replace(/[\s()-]/g, "")),
          ilike(attendees.name, `${escapedPrefix}%`),
        ),
      ))
      .limit(1);

    if (!result) return NextResponse.json({ attendee: null }, { headers: { "Cache-Control": "no-store" } });
    const attendee = result.attendee;
    return NextResponse.json({
      attendee: {
        id: attendee.id,
        refCode: attendee.refCode,
        name: attendee.name,
        status: attendee.status,
        checkedInAt: attendee.checkedInAt?.toISOString() || null,
        bookletIssuedAt: attendee.bookletIssuedAt?.toISOString() || null,
      },
    }, { headers: { "Cache-Control": "no-store" } });
  } catch {
    console.error("Scanner lookup failed.");
    return NextResponse.json({ error: "Lookup failed." }, { status: 500 });
  }
}
