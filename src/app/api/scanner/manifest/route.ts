import { NextRequest, NextResponse } from "next/server";
import { db } from "@/db";
import { attendees, orders } from "@/db/schema";
import { gt, and, eq, isNull, ne } from "drizzle-orm";
import { requireRole } from "@/lib/auth/session";

export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
  const user = await requireRole("attendant");
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
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
      attendees: attendeeList.map((a) => ({
        tokenHash: a.qrTokenHash,
        attendeeId: a.id,
        refCode: a.refCode,
        name: a.name,
        parish: a.parish,
        status: a.status,
        checkedInAt: a.checkedInAt ? a.checkedInAt.toISOString() : null,
        bookletIssuedAt: a.bookletIssuedAt ? a.bookletIssuedAt.toISOString() : null,
        updatedAt: a.updatedAt.toISOString(),
      })),
    });
  } catch (error: any) {
    console.error("Scanner manifest sync error:", error);
    return NextResponse.json(
      { error: error?.message || "Failed to generate scanner manifest." },
      { status: 500 }
    );
  }
}

