import { NextRequest, NextResponse } from "next/server";
import { db } from "@/db";
import { attendees, orders } from "@/db/schema";
import { gt, and, eq, isNull, ne } from "drizzle-orm";
import { requireRole } from "@/lib/auth/session";
import { deriveTicketId } from "@/lib/crypto/ed25519";
import { clientIp, rateLimit } from "@/lib/rate-limit";

export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
  const user = await requireRole("attendant");
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const ip = clientIp(req);
  const limit = await rateLimit(`scanner_manifest:${user.id}:${ip}`, 30, 5 * 60 * 1000);
  if (!limit.allowed) {
    return NextResponse.json({ error: "Too many roster syncs. Try again shortly." }, {
      status: 429,
      headers: { "Retry-After": String(limit.retryAfterSeconds), "Cache-Control": "no-store" },
    });
  }
  try {
    const searchParams = req.nextUrl.searchParams;
    const sinceParam = searchParams.get("since");

    let queryConditions = and(
      ne(attendees.status, "unconfirmed"),
      eq(orders.status, "paid"),
      isNull(attendees.deletedAt)
    )!;

    if (sinceParam) {
      const sinceDate = new Date(sinceParam);
      if (!isNaN(sinceDate.getTime())) {
        queryConditions = and(queryConditions, gt(attendees.updatedAt, sinceDate))!;
      }
    }

    const attendeeList = await db
      .select({
        id: attendees.id,
        orderId: attendees.orderId,
        refCode: attendees.refCode,
        name: attendees.name,
        parish: attendees.parish,
        status: attendees.status,
        qrTokenHash: attendees.qrTokenHash,
        checkedInAt: attendees.checkedInAt,
        bookletIssuedAt: attendees.bookletIssuedAt,
        updatedAt: attendees.updatedAt,
      })
      .from(attendees)
      .innerJoin(orders, eq(attendees.orderId, orders.id))
      .where(queryConditions);

    return NextResponse.json({
      serverTimestamp: new Date().toISOString(),
      count: attendeeList.length,
      attendees: await Promise.all(attendeeList.map(async (a) => ({
        tokenHash: a.qrTokenHash,
        ticketId: await deriveTicketId(a.id),
        attendeeId: a.id,
        orderId: a.orderId,
        refCode: a.refCode,
        name: a.name,
        parish: a.parish,
        status: a.status,
        checkedInAt: a.checkedInAt ? a.checkedInAt.toISOString() : null,
        bookletIssuedAt: a.bookletIssuedAt ? a.bookletIssuedAt.toISOString() : null,
        updatedAt: a.updatedAt.toISOString(),
      }))),
    }, { headers: { "Cache-Control": "private, no-store" } });
  } catch {
    console.error("Scanner manifest sync failed.");
    return NextResponse.json(
      { error: "Failed to generate scanner manifest." },
      { status: 500 }
    );
  }
}

